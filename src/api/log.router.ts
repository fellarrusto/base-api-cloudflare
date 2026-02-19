import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { Env } from '../core/types';
import { withAuditLog } from '../core/middleware';
import { AuditLogSchema } from '../models/log.model';
import * as logService from '../services/log.service';

const logRouter = new OpenAPIHono<{ Bindings: Env }>();

const auditRoute = createRoute({
  method: 'get',
  path: '/audit',
  tags: ['Logs'],
  description: 'Get audit logs',
  responses: {
    200: {
      content: { 'application/json': { schema: z.array(AuditLogSchema) } },
      description: 'List of audit logs',
    },
  },
});

logRouter.use('/*', withAuditLog('logs'));

logRouter.openapi(auditRoute, (c) => {
  return c.json(logService.getLogs(), 200);
});

export { logRouter };