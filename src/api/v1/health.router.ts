import { createRoute } from '@hono/zod-openapi';
import { withAuditLog } from '../../middleware';
import { LivenessResponseSchema, ReadinessResponseSchema } from '../../schemas/health.schema';
import * as healthService from '../../services/health.service';
import { createRouter, errorResponses } from './openapi';

const healthRouter = createRouter();

const liveRoute = createRoute({
  method: 'get',
  path: '/live',
  tags: ['Health'],
  description: 'Liveness probe: the Worker answers (no dependency checks)',
  // Probes run every few seconds: keep them out of the audit log
  middleware: [withAuditLog('live', { enabled: false })],
  responses: {
    200: {
      content: { 'application/json': { schema: LivenessResponseSchema } },
      description: 'Worker is alive',
    },
  },
});

healthRouter.openapi(liveRoute, (c) => {
  return c.json(healthService.live(c.env.API_VERSION, c.env.EXAMPLE_SECRET), 200);
});

const readyRoute = createRoute({
  method: 'get',
  path: '/ready',
  tags: ['Health'],
  description: 'Readiness probe: 503 when the database is unreachable',
  middleware: [withAuditLog('ready', { enabled: false })],
  responses: {
    200: {
      content: { 'application/json': { schema: ReadinessResponseSchema } },
      description: 'Worker and database are ready',
    },
    ...errorResponses(503),
  },
});

healthRouter.openapi(readyRoute, async (c) => {
  return c.json(await healthService.ready(c.env.DB), 200);
});

export { healthRouter };
