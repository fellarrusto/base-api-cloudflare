import { z } from '@hono/zod-openapi';

export const LivenessResponseSchema = z.object({
  status: z.string().openapi({ example: 'alive' }),
  timestamp: z.string().openapi({ example: '2024-01-01T00:00:00.000Z' }),
  uptime_ms: z.number().openapi({ example: 12345 }),
  version: z.string().openapi({ example: '1.0.0' }),
  example_secret: z.string().openapi({ example: 'abc123' }),
});

export type LivenessResponse = z.infer<typeof LivenessResponseSchema>;

export const ReadinessResponseSchema = z.object({
  status: z.string().openapi({ example: 'ready' }),
  database: z.string().openapi({ example: 'up' }),
});

export type ReadinessResponse = z.infer<typeof ReadinessResponseSchema>;
