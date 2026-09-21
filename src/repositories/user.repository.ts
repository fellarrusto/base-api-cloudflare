import { eq } from 'drizzle-orm';
import { Database, getDb } from '../db/database';
import { UserInDB, users } from '../models/user.model';

export class UserRepository {
  private db: Database;

  constructor(d1: D1Database) {
    this.db = getDb(d1);
  }

  async findById(id: string): Promise<UserInDB | null> {
    return (await this.db.select().from(users).where(eq(users.id, id)).get()) ?? null;
  }

  async findBySubject(subject: string): Promise<UserInDB | null> {
    return (await this.db.select().from(users).where(eq(users.subject, subject)).get()) ?? null;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const row = await this.db.select({ id: users.id }).from(users).where(eq(users.email, email)).get();
    return row !== undefined;
  }

  async create(user: UserInDB): Promise<UserInDB> {
    await this.db.insert(users).values(user).run();
    return user;
  }

  /** Returns false if the user does not exist. */
  async update(id: string, fields: Partial<Omit<UserInDB, 'id'>>): Promise<boolean> {
    const result = await this.db.update(users).set(fields).where(eq(users.id, id)).run();
    return result.meta.changes > 0;
  }
}
