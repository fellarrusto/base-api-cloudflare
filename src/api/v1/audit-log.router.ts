import { createRoute, z } from '@hono/zod-openapi';
import { withAuditLog, withAuth } from '../../middleware';
import { AuditLogQuerySchema, AuditLogSchema } from '../../schemas/audit-log.schema';
import * as auditLogService from '../../services/audit-log.service';
import { bearerSecurity, createRouter, errorResponses } from './openapi';

const auditLogRouter = createRouter();

const getAuditLogsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Audit Logs'],
  description: 'Audit logs in a date range, newest first. Requires role admin',
  security: bearerSecurity,
  middleware: [withAuditLog('getAuditLogs', { metadata: { service: 'audit-logs' } }), withAuth('admin')],
  request: { query: AuditLogQuerySchema },
  responses: {
    200: {
      content: { 'application/json': { schema: z.array(AuditLogSchema) } },
      description: 'Audit logs',
    },
    ...errorResponses(400, 401, 403, 422),
  },
});

auditLogRouter.openapi(getAuditLogsRoute, async (c) => {
  return c.json(await auditLogService.getByDateRange(c.env.DB, c.req.valid('query')), 200);
});

export { auditLogRouter };
