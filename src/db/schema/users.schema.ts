import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  subject: text('subject').notNull().unique(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  roles: text('roles').notNull().default('["user"]'),
  active_services: text('active_services').notNull().default('[]'),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
});
