import { OpenAPIHono } from '@hono/zod-openapi';
import { AppEnv } from '../../core/types';
import { validationHook } from '../../middleware';
import { ErrorResponseSchema } from '../../schemas/error.schema';

/** Every router is created here: invalid requests answer 422 with the standard error body. */
export function createRouter() {
  return new OpenAPIHono<AppEnv>({ defaultHook: validationHook });
}

/** Security requirement for routes protected by withAuth (lock icon in Swagger). */
export const bearerSecurity = [{ Bearer: [] }];

const ERROR_DESCRIPTIONS = {
  400: 'Business rule violated',
  401: 'Missing or invalid bearer token',
  403: 'Missing required role',
  404: 'Not found',
  409: 'Conflict with an existing entity',
  422: 'Invalid request',
  502: 'External service failure',
  503: 'Dependency unavailable',
} as const;

type ErrorStatus = keyof typeof ERROR_DESCRIPTIONS;

/** OpenAPI `responses` entries for the given error status codes. */
export function errorResponses<S extends ErrorStatus>(...statuses: S[]) {
  return Object.fromEntries(
    statuses.map((status) => [
      status,
      { content: { 'application/json': { schema: ErrorResponseSchema } }, description: ERROR_DESCRIPTIONS[status] },
    ]),
  ) as unknown as Record<S, { content: { 'application/json': { schema: typeof ErrorResponseSchema } }; description: string }>;
}
