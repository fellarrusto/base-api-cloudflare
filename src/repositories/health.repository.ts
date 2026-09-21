import { sql } from 'drizzle-orm';
import { getDb } from '../db/database';

/** Health has no persisted entity: the repository only probes the database. */
export class HealthRepository {
  constructor(private d1: D1Database) {}

  async ping(): Promise<boolean> {
    try {
      await getDb(this.d1).run(sql`SELECT 1`);
      return true;
    } catch {
      return false;
    }
  }
}
