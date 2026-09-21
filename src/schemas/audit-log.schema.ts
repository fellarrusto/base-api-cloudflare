import { z } from '@hono/zod-openapi';

export const AuditLogSchema = z.object({
  id: z.string().openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
  action: z.string().openapi({ example: 'getAuditLogs' }),
  endpoint: z.string().nullable().openapi({ example: '/api/v1/audit-logs' }),
  method: z.string().nullable().openapi({ example: 'GET' }),
  status: z.number().nullable().openapi({ example: 200 }),
  duration_ms: z.number().nullable().openapi({ example: 3 }),
  timestamp: z.string().openapi({ example: '2024-01-01T00:00:00.000Z' }),
  user_id: z.string().nullable().openapi({ example: 'alice' }),
  metadata: z.record(z.unknown()).openapi({ example: { service: 'audit-logs' } }),
});

export type AuditLog = z.infer<typeof AuditLogSchema>;

export const AuditLogQuerySchema = z.object({
  start_date: z.string().date().openapi({ description: 'Start date, inclusive (YYYY-MM-DD, UTC)', example: '2024-01-01' }),
  end_date: z.string().date().openapi({ description: 'End date, inclusive (YYYY-MM-DD, UTC)', example: '2024-01-31' }),
  limit: z.coerce.number().int().min(1).max(1000).default(100).openapi({ description: 'Max results' }),
  skip: z.coerce.number().int().min(0).default(0).openapi({ description: 'Results to skip' }),
});

export type AuditLogQuery = z.infer<typeof AuditLogQuerySchema>;
