/**
 * Expected application errors.
 *
 * Services, repositories and integrations throw these instead of building HTTP
 * responses, so they also work outside a request (cron jobs, queues). The global
 * error handler (src/middleware/error-handler.ts) maps each class to a status code.
 * `name` is set explicitly so it survives bundling and ends up in the response body.
 */
export class AppError extends Error {
  override name = 'AppError';
}

/** Missing or invalid credentials (401). */
export class UnauthorizedError extends AppError {
  override name = 'UnauthorizedError';
}

/** Authenticated, but not allowed to do this (403). */
export class ForbiddenError extends AppError {
  override name = 'ForbiddenError';
}

/** The requested entity does not exist (404). */
export class NotFoundError extends AppError {
  override name = 'NotFoundError';
}

/** The entity already exists or clashes with the current state (409). */
export class ConflictError extends AppError {
  override name = 'ConflictError';
}

/** The input violates a business rule (400). */
export class InvalidInputError extends AppError {
  override name = 'InvalidInputError';
}

/** An external integration failed or is not configured (502). */
export class ExternalServiceError extends AppError {
  override name = 'ExternalServiceError';
}

/** A required dependency (e.g. the database) is unreachable (503). */
export class ServiceUnavailableError extends AppError {
  override name = 'ServiceUnavailableError';
}
