import { MiddlewareHandler } from 'hono';
import { cors } from 'hono/cors';
import { AppEnv } from '../core/types';

/**
 * CORS from CORS_ORIGINS (comma-separated). Empty = no browser origin allowed,
 * "*" = any origin. Credentials are never allowed: auth uses the Authorization header.
 */
export function withCors(): MiddlewareHandler<AppEnv> {
  return cors({
    origin: (origin, c) => {
      const allowed = (c.env.CORS_ORIGINS ?? '').split(',').map((s: string) => s.trim()).filter(Boolean);
      if (allowed.includes('*')) return '*';
      return allowed.includes(origin) ? origin : null;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  });
}
