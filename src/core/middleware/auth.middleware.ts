import { MiddlewareHandler } from 'hono';
import { verifyToken } from '../../services/auth.service';
import * as userService from '../../services/user.service';
import { User } from '../../models/user.model';

export function withAuth(): MiddlewareHandler {
  return async (c, next) => {
    const header = c.req.header('Authorization');
    if (!header?.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid Authorization header' }, 401);
    }

    const payload = await verifyToken(header.slice(7), {
      jwksUrl: c.env.AUTH_JWKS_URL,
      issuer: c.env.AUTH_ISSUER,
      audience: c.env.AUTH_AUDIENCE,
    });

    const user = await userService.getBySubject(c.env.DB, payload.sub);
    if (!user) {
      return c.json({ error: 'User not registered' }, 401);
    }

    c.set('currentUser', user);
    await next();
  };
}

export function withRole(...roles: string[]): MiddlewareHandler {
  return async (c, next) => {
    const user = c.get('currentUser') as User;
    const hasRole = user.roles.some(r => roles.includes(r));
    if (!hasRole) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }
    await next();
  };
}