import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { configureLogger } from './core/logger';
import { AppEnv, Env } from './core/types';
import { registerRoutes } from './api/v1';
import { scheduled } from './jobs';
import { handleError, validationHook, withCors } from './middleware';

const app = new OpenAPIHono<AppEnv>({ defaultHook: validationHook });

app.use('*', async (c, next) => {
  configureLogger(c.env.LOG_LEVEL);
  await next();
});
app.use('*', withCors());

// AppError → mapped status, anything else → generic 500 (see src/middleware/error-handler.ts)
app.onError(handleError);
app.notFound((c) => c.json({ error: 'NotFoundError', message: 'Route not found' }, 404));

registerRoutes(app);

// OpenAPI spec — title and version are read from env vars
app.doc('/openapi.json', (c) => ({
  openapi: '3.0.0',
  info: { title: c.env.API_TITLE ?? 'Worker API', version: c.env.API_VERSION ?? '1.0.0' },
}));

// JWT Bearer security scheme, used by the routes that declare `security: bearerSecurity`
app.openAPIRegistry.registerComponent('securitySchemes', 'Bearer', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});

// Swagger UI at /docs — enabled only if SWAGGER_ENABLED=true
app.use('/docs', async (c, next) => {
  if (c.env.SWAGGER_ENABLED !== 'true') {
    return c.json({ error: 'NotFoundError', message: 'Route not found' }, 404);
  }
  await next();
});
app.get('/docs', swaggerUI({ url: '/openapi.json' }));

export { app };

export default {
  fetch: app.fetch,
  scheduled,
} satisfies ExportedHandler<Env>;
