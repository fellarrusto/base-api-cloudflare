import { drizzle } from 'drizzle-orm/d1';

// Storage factory: the only place that knows which driver is active. Used by repositories only.
export function getDb(d1: D1Database) {
  return drizzle(d1);
}

export type Database = ReturnType<typeof getDb>;
