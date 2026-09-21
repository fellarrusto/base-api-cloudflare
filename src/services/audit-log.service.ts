import { InvalidInputError } from '../core/exceptions';
import { AuditLogInDB } from '../models/audit-log.model';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { AuditLog, AuditLogQuery } from '../schemas/audit-log.schema';

const DAY_MS = 86_400_000;

export interface AuditEntry {
  action: string;
  endpoint: string;
  method: string;
  status: number;
  duration_ms: number;
  user_id: string | null;
  metadata: Record<string, unknown>;
}

/** Persist one audit entry for an endpoint call. */
export async function record(db: D1Database, entry: AuditEntry): Promise<void> {
  await new AuditLogRepository(db).create({
    ...entry,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    metadata: JSON.stringify(entry.metadata),
  });
}

/**
 * Audit logs between two dates (both inclusive, UTC), newest first.
 *
 * @throws InvalidInputError end_date is before start_date
 */
export async function getByDateRange(db: D1Database, query: AuditLogQuery): Promise<AuditLog[]> {
  if (query.end_date < query.start_date) {
    throw new InvalidInputError('end_date must be on or after start_date');
  }
  const start = new Date(`${query.start_date}T00:00:00.000Z`).toISOString();
  const end = new Date(Date.parse(`${query.end_date}T00:00:00.000Z`) + DAY_MS).toISOString();
  const logs = await new AuditLogRepository(db).findByTimeRange(start, end, query.limit, query.skip);
  return logs.map(toResponse);
}

/** Delete logs older than `retentionDays` (0 keeps everything). Returns the number deleted. */
export async function deleteExpired(db: D1Database, retentionDays: number, now = new Date()): Promise<number> {
  if (!(retentionDays > 0)) return 0;
  const cutoff = new Date(now.getTime() - retentionDays * DAY_MS).toISOString();
  return await new AuditLogRepository(db).deleteOlderThan(cutoff);
}

function toResponse(log: AuditLogInDB): AuditLog {
  return { ...log, metadata: JSON.parse(log.metadata || '{}') };
}
