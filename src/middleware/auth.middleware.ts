import { Context, MiddlewareHandler } from 'hono';
import { ForbiddenError, UnauthorizedError } from '../core/exceptions';
import { AppEnv } from '../core/types';
import * as authService from '../services/auth.service';

/** The bearer token of the request. @throws UnauthorizedError when missing */
export function getBearerToken(c: Context): string {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ') || header.length === 'Bearer '.length) {
    throw new UnauthorizedError('Missing bearer token');
  }
  return header.slice('Bearer '.length);
}

/**
 * Require a registered user and, if `roles` are given, at least one of them.
 *
 * The user is stored in c.get('currentUser') before the role check, so the
 * audit log records who was rejected with 403.
 */
export function withAuth(...roles: string[]): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const user = await authService.authenticate(c.env, getBearerToken(c));
    c.set('currentUser', user);
    if (roles.length > 0 && !user.roles.some((role) => roles.includes(role))) {
      throw new ForbiddenError('Insufficient role');
    }
    await next();
  };
}
