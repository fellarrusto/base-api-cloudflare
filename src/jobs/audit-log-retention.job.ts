import { logger } from '../core/logger';
import { Env } from '../core/types';
import * as auditLogService from '../services/audit-log.service';

/** Delete audit logs older than AUDIT_LOG_RETENTION_DAYS ("0" keeps them forever). */
export async function auditLogRetentionJob(env: Env): Promise<void> {
  const days = Number(env.AUDIT_LOG_RETENTION_DAYS ?? '0');
  const deleted = await auditLogService.deleteExpired(env.DB, days);
  logger.info('Audit log retention done', { retention_days: days, deleted });
}
