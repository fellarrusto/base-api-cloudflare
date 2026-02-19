import { MiddlewareHandler } from 'hono';

export function withAuditLog(action: string): MiddlewareHandler {
  return async (c, next) => {
    const start = performance.now();
    await next();
    const duration = performance.now() - start;
    console.log(JSON.stringify({
      action,
      path: c.req.path,
      method: c.req.method,
      status: c.res.status,
      duration_ms: Math.round(duration),
      timestamp: new Date().toISOString(),
    }));
  };
}