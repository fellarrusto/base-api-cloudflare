import { MiddlewareHandler } from 'hono';
import { logger } from '../core/logger';
import { AppEnv } from '../core/types';
import * as auditLogService from '../services/audit-log.service';

interface AuditLogOptions {
  metadata?: Record<string, unknown>;
  /** false records nothing: only for very frequent technical calls such as health probes. */
  enabled?: boolean;
}

/**
 * Record every call of a route in audit_logs: status, duration, user (with
 * withAuth after it) and `metadata`, plus the error on failure.
 *
 * Must be the first route middleware so it also sees 401/403 from withAuth.
 * The write runs after the response (waitUntil) and never affects it.
 */
export function withAuditLog(action: string, options: AuditLogOptions = {}): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    if (options.enabled === false) return next();

    const start = performance.now();
    await next();

    const metadata: Record<string, unknown> = { ...options.metadata };
    if (c.error) metadata.error = `${c.error.name}: ${c.error.message}`;

    const write = auditLogService
      .record(c.env.DB, {
        action,
        endpoint: c.req.path,
        method: c.req.method,
        status: c.res.status,
        duration_ms: Math.round(performance.now() - start),
        user_id: c.get('currentUser')?.id ?? null,
        metadata,
      })
      .catch((err: Error) => {
        logger.error('Failed to write audit log', { method: c.req.method, path: c.req.path, error: err.message });
      });

    try {
      c.executionCtx.waitUntil(write);
    } catch {
      await write; // no ExecutionContext (e.g. app.request() in a script)
    }
  };
}
