import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const auditLogs = sqliteTable(
  'audit_logs',
  {
    id: text('id').primaryKey(),
    action: text('action').notNull(),
    endpoint: text('endpoint'),
    method: text('method'),
    status: integer('status'),              // HTTP status of the response
    duration_ms: real('duration_ms'),
    timestamp: text('timestamp').notNull(), // ISO 8601 UTC: sorts and compares as text
    user_id: text('user_id'),               // set when the route uses withAuth
    metadata: text('metadata').notNull().default('{}'), // JSON: withAuditLog metadata, plus "error" on failure
  },
  (table) => [
    // Date range queries and retention deletes
    index('audit_logs_timestamp_idx').on(table.timestamp),
  ],
);

export type AuditLogInDB = typeof auditLogs.$inferSelect;
