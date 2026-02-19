import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { Env } from '../core/types';
import { withAuditLog } from '../core/middleware';
import { HealthCheckResponseSchema } from '../models/health.model';
import * as healthService from '../services/health.service';

const healthRouter = new OpenAPIHono<{ Bindings: Env }>();

const checkRoute = createRoute({
  method: 'get',
  path: '/check',
  tags: ['Health'],
  description: 'Health check endpoint',
  responses: {
    200: {
      content: { 'application/json': { schema: HealthCheckResponseSchema } },
      description: 'Service is healthy',
    },
  },
});

healthRouter.use('/check', withAuditLog('health_check'));

healthRouter.openapi(checkRoute, (c) => {
  return c.json(healthService.check(c.env.API_VERSION), 200);
});

export { healthRouter };