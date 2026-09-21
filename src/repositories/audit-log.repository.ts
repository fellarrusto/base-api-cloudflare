import { and, desc, gte, lt } from 'drizzle-orm';
import { Database, getDb } from '../db/database';
import { AuditLogInDB, auditLogs } from '../models/audit-log.model';

export class AuditLogRepository {
  private db: Database;

  constructor(d1: D1Database) {
    this.db = getDb(d1);
  }

  async create(log: AuditLogInDB): Promise<AuditLogInDB> {
    await this.db.insert(auditLogs).values(log).run();
    return log;
  }

  /** Logs with start <= timestamp < end (ISO strings), newest first. */
  async findByTimeRange(start: string, end: string, limit = 100, skip = 0): Promise<AuditLogInDB[]> {
    return await this.db
      .select()
      .from(auditLogs)
      .where(and(gte(auditLogs.timestamp, start), lt(auditLogs.timestamp, end)))
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit)
      .offset(skip)
      .all();
  }

  /** Returns the number of deleted logs. */
  async deleteOlderThan(cutoff: string): Promise<number> {
    const result = await this.db.delete(auditLogs).where(lt(auditLogs.timestamp, cutoff)).run();
    return result.meta.changes;
  }
}
