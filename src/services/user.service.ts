import { getRepository } from '../db/database';
import { User, UserCreateInput, UserUpdateInput, fromDbRow } from '../models/user.model';

export async function getBySubject(db: D1Database, subject: string): Promise<User | null> {
  const row = await db
    .prepare('SELECT * FROM users WHERE subject = ?')
    .bind(subject)
    .first();
  return row ? fromDbRow(row) : null;
}

export async function create(
  db: D1Database,
  subject: string,
  email: string,
  input: UserCreateInput,
): Promise<User> {
  const now = new Date().toISOString();
  const data = {
    id: crypto.randomUUID(),
    subject,
    email,
    name: input.name,
    roles: JSON.stringify(['user']),
    active_services: JSON.stringify([]),
    created_at: now,
    updated_at: now,
  };
  const repo = getRepository(db, 'users');
  await repo.insertOne(data);
  return fromDbRow(data);
}

export async function update(db: D1Database, id: string, input: UserUpdateInput): Promise<void> {
  const fields: string[] = [];
  const values: any[] = [];

  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(Array.isArray(value) ? JSON.stringify(value) : value);
    }
  }

  if (fields.length === 0) return;

  fields.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  await db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();
}