import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { Env, AppVariables } from '../core/types';
import { withAuditLog, withAuth } from '../core/middleware';
import { HealthCheckResponseSchema } from '../models/health.model';
import * as healthService from '../services/health.service';

const healthRouter = new OpenAPIHono<{ Bindings: Env; Variables: AppVariables }>();

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
  return c.json(healthService.check(c.env.API_VERSION, c.env.EXAMPLE_SECRET), 200);
});

export { healthRouter };