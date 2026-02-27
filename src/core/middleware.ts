import { MiddlewareHandler } from 'hono';
import { getRepository } from '../db/database';

export function withAuditLog(action: string): MiddlewareHandler {
  return async (c, next) => {
    const start = performance.now();
    await next();
    const repo = getRepository(c.env.DB, 'audit_logs');
    await repo.insertOne({
      id: crypto.randomUUID(),
      action,
      endpoint: c.req.path,
      method: c.req.method,
      status: c.res.status,
      duration_ms: Math.round(performance.now() - start),
      timestamp: new Date().toISOString(),
    });
  };
}