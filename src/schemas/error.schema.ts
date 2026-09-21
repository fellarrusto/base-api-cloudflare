import { z } from '@hono/zod-openapi';

/** Body of every error response produced by the global error handler. */
export const ErrorResponseSchema = z.object({
  error: z.string().openapi({ example: 'NotFoundError' }),
  message: z.string().openapi({ example: 'User not found' }),
}).openapi('ErrorResponse');

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
