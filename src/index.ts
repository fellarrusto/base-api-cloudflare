import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { Env, AppVariables } from './core/types';
import { registerRoutes } from './api';

const app = new OpenAPIHono<{ Bindings: Env; Variables: AppVariables }>();

registerRoutes(app);

app.doc('/openapi.json', {
  openapi: '3.0.0',
  info: { title: 'Worker API', version: '1.0.0' },
  security: [{ Bearer: [] }],
});

app.openAPIRegistry.registerComponent('securitySchemes', 'Bearer', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});

app.get('/docs', swaggerUI({ url: '/openapi.json' }));

export default app;