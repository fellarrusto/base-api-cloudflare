import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { cors } from 'hono/cors';
import { Env, AppVariables } from './core/types';
import { registerRoutes } from './api';

const app = new OpenAPIHono<{ Bindings: Env; Variables: AppVariables }>();

// CORS — allowed origins are read from the CORS_ORIGINS env var (comma-separated)
app.use('/*', cors({
  origin: (_origin, c) => (c.env.CORS_ORIGINS ?? '').split(',').map((s: string) => s.trim()).filter(Boolean),
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Global error handler — logs the error and returns a JSON response with the status code
app.onError((err, c) => {
  console.error(`[ERROR] ${c.req.method} ${c.req.path}:`, err.message);
  const status = (err as any).status || 500;
  return c.json({ error: err.message }, status);
});

// Register all API routes
registerRoutes(app);

// OpenAPI spec — title and version are read from env vars
app.doc('/openapi.json', (c) => ({
  openapi: '3.0.0',
  info: { title: c.env.API_TITLE ?? 'Worker API', version: c.env.API_VERSION ?? '1.0.0' },
  security: [{ Bearer: [] }],
}));

// JWT Bearer security scheme
app.openAPIRegistry.registerComponent('securitySchemes', 'Bearer', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});

// Swagger UI at /docs — enabled only if SWAGGER_ENABLED=true
app.use('/docs', async (c, next) => {
  if (c.env.SWAGGER_ENABLED !== 'true') {
    c.res = c.json({ error: 'Not Found' }, 404);
    return;
  }
  await next();
});
app.get('/docs', swaggerUI({ url: '/openapi.json' }));

export default app;
