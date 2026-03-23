import { z } from '@hono/zod-openapi';

export const HealthCheckResponseSchema = z.object({
  status: z.string().openapi({ example: 'healthy' }),
  timestamp: z.string().openapi({ example: '2024-01-01T00:00:00.000Z' }),
  uptime_ms: z.number().openapi({ example: 12345 }),
  version: z.string().openapi({ example: '1.0.0' }),
  example_secret: z.string().openapi({ example: 'abc123' }),
});

export type HealthCheckResponse = z.infer<typeof HealthCheckResponseSchema>;