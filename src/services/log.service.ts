import { getRepository } from '../db/database';
import { AuditLog } from '../models/log.model';

export async function getLogs(db: D1Database) {
  const repo = getRepository(db, 'audit_logs');
  return await repo.findMany() as AuditLog[];
}