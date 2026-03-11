import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { Env, AppVariables } from '../core/types';
import { withAuditLog, withAuth, withRole } from '../core/middleware';
import { AuditLogSchema } from '../models/log.model';
import * as logService from '../services/log.service';

const logRouter = new OpenAPIHono<{ Bindings: Env; Variables: AppVariables }>();

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

logRouter.use('/*', withAuth(), withRole('admin'), withAuditLog('logs'));

logRouter.openapi(auditRoute, async (c) => {
  const logs = await logService.getLogs(c.env.DB);
  return c.json(logs, 200);
});

export { logRouter };