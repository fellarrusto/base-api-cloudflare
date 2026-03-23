import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  action: text('action').notNull(),
  endpoint: text('endpoint'),
  method: text('method'),
  status: integer('status'),
  duration_ms: real('duration_ms'),
  timestamp: text('timestamp').notNull(),
});
