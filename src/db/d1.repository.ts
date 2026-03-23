import { BaseRepository, WhereCondition } from './base.repository';

export class D1Repository implements BaseRepository {
  constructor(private db: D1Database, private table: string) {}

  async findOne(id: string) {
    return await this.db.prepare(`SELECT * FROM ${this.table} WHERE id = ?`).bind(id).first();
  }

  async findOneBy(field: string, value: string) {
    return await this.db.prepare(`SELECT * FROM ${this.table} WHERE ${field} = ?`).bind(value).first();
  }

  async findMany(_filters?: Record<string, any>, limit = 100) {
    return (await this.db.prepare(`SELECT * FROM ${this.table} LIMIT ?`).bind(limit).all()).results;
  }

  async findManyBy(filters: Record<string, any>, limit = 100) {
    const keys = Object.keys(filters);
    if (keys.length === 0) return this.findMany({}, limit);
    const where = keys.map((k) => `${k} = ?`).join(' AND ');
    const values = Object.values(filters);
    return (
      await this.db
        .prepare(`SELECT * FROM ${this.table} WHERE ${where} LIMIT ?`)
        .bind(...values, limit)
        .all()
    ).results;
  }

  async insertOne(data: Record<string, any>) {
    const keys = Object.keys(data);
    const placeholders = keys.map(() => '?').join(', ');
    await this.db
      .prepare(`INSERT INTO ${this.table} (${keys.join(', ')}) VALUES (${placeholders})`)
      .bind(...Object.values(data))
      .run();
    return data.id;
  }

  async updateOne(id: string, data: Record<string, any>) {
    const sets = Object.keys(data).map((k) => `${k} = ?`).join(', ');
    const result = await this.db
      .prepare(`UPDATE ${this.table} SET ${sets} WHERE id = ?`)
      .bind(...Object.values(data), id)
      .run();
    return result.meta.changes > 0;
  }

  async updateManyBy(filters: Record<string, any>, data: Record<string, any>) {
    const sets = Object.keys(data).map((k) => `${k} = ?`).join(', ');
    const where = Object.keys(filters).map((k) => `${k} = ?`).join(' AND ');
    const sql = Object.keys(filters).length > 0
      ? `UPDATE ${this.table} SET ${sets} WHERE ${where}`
      : `UPDATE ${this.table} SET ${sets}`;
    const values = Object.keys(filters).length > 0
      ? [...Object.values(data), ...Object.values(filters)]
      : Object.values(data);
    const result = await this.db.prepare(sql).bind(...values).run();
    return result.meta.changes;
  }

  async findManyByIn(field: string, values: any[], limit = 100) {
    if (values.length === 0) return [];
    const placeholders = values.map(() => '?').join(', ');
    return (
      await this.db
        .prepare(`SELECT * FROM ${this.table} WHERE ${field} IN (${placeholders}) LIMIT ?`)
        .bind(...values, limit)
        .all()
    ).results;
  }

  async findManyWhere(conditions: WhereCondition[], limit = 100) {
    const clauses: string[] = [];
    const bindings: any[] = [];

    for (const c of conditions) {
      if (c.op === 'IN') {
        if (c.values.length === 0) return [];
        const placeholders = c.values.map(() => '?').join(', ');
        clauses.push(`${c.field} IN (${placeholders})`);
        bindings.push(...c.values);
      } else {
        clauses.push(`${c.field} ${c.op} ?`);
        bindings.push(c.value);
      }
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    return (
      await this.db
        .prepare(`SELECT * FROM ${this.table} ${where} LIMIT ?`)
        .bind(...bindings, limit)
        .all()
    ).results;
  }

  async countBy(groupByField: string) {
    const rows = (
      await this.db
        .prepare(
          `SELECT ${groupByField}, COUNT(*) as count FROM ${this.table} GROUP BY ${groupByField} ORDER BY count DESC`,
        )
        .all()
    ).results;
    const result: Record<string, number> = {};
    for (const r of rows) {
      result[r[groupByField] as string] = r.count as number;
    }
    return result;
  }

  async deleteOne(id: string) {
    const result = await this.db.prepare(`DELETE FROM ${this.table} WHERE id = ?`).bind(id).run();
    return result.meta.changes > 0;
  }
}