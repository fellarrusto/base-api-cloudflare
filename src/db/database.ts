import { BaseRepository } from './base.repository';
import { D1Repository } from './d1.repository';

export function getRepository(db: D1Database, table: string): BaseRepository {
  return new D1Repository(db, table);
}