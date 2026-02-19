import { z } from '@hono/zod-openapi';

export const AuditLogSchema = z.object({
  action: z.string().openapi({ example: 'health_check' }),
  endpoint: z.string().openapi({ example: '/api/v1/health/check' }),
  method: z.string().openapi({ example: 'GET' }),
  status: z.number().openapi({ example: 200 }),
  duration_ms: z.number().openapi({ example: 3 }),
  timestamp: z.string().openapi({ example: '2024-01-01T00:00:00.000Z' }),
});

export type AuditLog = z.infer<typeof AuditLogSchema>;