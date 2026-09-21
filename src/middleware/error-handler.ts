import { Context, ErrorHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ContentfulStatusCode } from 'hono/utils/http-status';
import {
  AppError,
  ConflictError,
  ExternalServiceError,
  ForbiddenError,
  InvalidInputError,
  NotFoundError,
  ServiceUnavailableError,
  UnauthorizedError,
} from '../core/exceptions';
import { logger } from '../core/logger';
import { ErrorResponse } from '../schemas/error.schema';

// Most specific classes first; any other AppError is a 400
const STATUS_CODES: [new (...args: any[]) => AppError, ContentfulStatusCode][] = [
  [UnauthorizedError, 401],
  [ForbiddenError, 403],
  [NotFoundError, 404],
  [ConflictError, 409],
  [InvalidInputError, 400],
  [ExternalServiceError, 502],
  [ServiceUnavailableError, 503],
];

function errorResponse(c: Context, status: ContentfulStatusCode, body: ErrorResponse) {
  if (status === 401) c.header('WWW-Authenticate', 'Bearer');
  return c.json(body, status);
}

/**
 * Global error handler (app.onError): AppError subclasses map to their status
 * code, HTTPException passes through, anything else becomes a generic 500 whose
 * details are logged, never sent to the client.
 */
export const handleError: ErrorHandler = (err, c) => {
  if (err instanceof AppError) {
    const status = STATUS_CODES.find(([cls]) => err instanceof cls)?.[1] ?? 400;
    return errorResponse(c, status, { error: err.name, message: err.message });
  }
  if (err instanceof HTTPException) {
    return err.getResponse();
  }
  logger.error('Unhandled error', {
    method: c.req.method,
    path: c.req.path,
    error: `${err.name}: ${err.message}`,
    stack: err.stack,
  });
  return errorResponse(c, 500, { error: 'InternalServerError', message: 'Internal server error' });
};

/** OpenAPIHono defaultHook: request validation failures become 422 with the usual error body. */
export function validationHook(
  result: { success: boolean; error?: { issues: { path: (string | number)[]; message: string }[] } },
  c: Context,
) {
  if (result.success) return;
  const message = (result.error?.issues ?? [])
    .map((issue) => (issue.path.length ? `${issue.path.join('.')}: ${issue.message}` : issue.message))
    .join('; ');
  return errorResponse(c, 422, { error: 'ValidationError', message });
}
