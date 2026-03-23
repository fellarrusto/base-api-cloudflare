import { describe, it, expect, vi, beforeEach } from 'vitest';
import { D1Repository } from './d1.repository';

function makeDb(overrides: { first?: any; all?: any; run?: number } = {}) {
  const stmt = {
    bind: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue(overrides.first ?? null),
    all: vi.fn().mockResolvedValue({ results: overrides.all ?? [] }),
    run: vi.fn().mockResolvedValue({ meta: { changes: overrides.run ?? 1 } }),
  };
  return { prepare: vi.fn(() => stmt) };
}

describe('D1Repository', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let db: any;
  let repo: D1Repository;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findOne', () => {
    it('returns the row when found', async () => {
      const row = { id: '1', name: 'test' };
      db = makeDb({ first: row });
      repo = new D1Repository(db, 'users');

      const result = await repo.findOne('1');

      expect(result).toEqual(row);
      expect(db.prepare).toHaveBeenCalledWith('SELECT * FROM users WHERE id = ?');
    });

    it('returns null when not found', async () => {
      db = makeDb({ first: null });
      repo = new D1Repository(db, 'users');

      const result = await repo.findOne('999');

      expect(result).toBeNull();
    });
  });

  describe('findOneBy', () => {
    it('queries by the given field and value', async () => {
      const row = { id: '1', email: 'a@b.com' };
      db = makeDb({ first: row });
      repo = new D1Repository(db, 'users');

      const result = await repo.findOneBy('email', 'a@b.com');

      expect(result).toEqual(row);
      expect(db.prepare).toHaveBeenCalledWith('SELECT * FROM users WHERE email = ?');
    });
  });

  describe('findMany', () => {
    it('returns all rows with default limit', async () => {
      const rows = [{ id: '1' }, { id: '2' }];
      db = makeDb({ all: rows });
      repo = new D1Repository(db, 'users');

      const result = await repo.findMany();

      expect(result).toEqual(rows);
      expect(db.prepare).toHaveBeenCalledWith('SELECT * FROM users LIMIT ?');
    });
  });

  describe('findManyBy', () => {
    it('returns rows matching filters', async () => {
      const rows = [{ id: '1', role: 'admin' }];
      db = makeDb({ all: rows });
      repo = new D1Repository(db, 'users');

      const result = await repo.findManyBy({ role: 'admin' });

      expect(result).toEqual(rows);
      expect(db.prepare).toHaveBeenCalledWith('SELECT * FROM users WHERE role = ? LIMIT ?');
    });

    it('falls back to findMany when filters are empty', async () => {
      const rows = [{ id: '1' }];
      db = makeDb({ all: rows });
      repo = new D1Repository(db, 'users');

      const result = await repo.findManyBy({});

      expect(result).toEqual(rows);
    });

    it('builds WHERE with multiple filters joined by AND', async () => {
      db = makeDb({ all: [] });
      repo = new D1Repository(db, 'users');

      await repo.findManyBy({ role: 'admin', active: '1' });

      expect(db.prepare).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE role = ? AND active = ? LIMIT ?',
      );
    });
  });

  describe('insertOne', () => {
    it('inserts and returns the id', async () => {
      db = makeDb();
      repo = new D1Repository(db, 'users');

      const result = await repo.insertOne({ id: 'abc', name: 'Mario' });

      expect(result).toBe('abc');
      expect(db.prepare).toHaveBeenCalledWith(
        'INSERT INTO users (id, name) VALUES (?, ?)',
      );
    });
  });

  describe('updateOne', () => {
    it('returns true when row was updated', async () => {
      db = makeDb({ run: 1 });
      repo = new D1Repository(db, 'users');

      const result = await repo.updateOne('1', { name: 'Updated' });

      expect(result).toBe(true);
      expect(db.prepare).toHaveBeenCalledWith('UPDATE users SET name = ? WHERE id = ?');
    });

    it('returns false when no row matched', async () => {
      db = makeDb({ run: 0 });
      repo = new D1Repository(db, 'users');

      const result = await repo.updateOne('999', { name: 'X' });

      expect(result).toBe(false);
    });
  });

  describe('updateManyBy', () => {
    it('updates matching rows and returns change count', async () => {
      db = makeDb({ run: 3 });
      repo = new D1Repository(db, 'users');

      const result = await repo.updateManyBy({ role: 'user' }, { active: '1' });

      expect(result).toBe(3);
      expect(db.prepare).toHaveBeenCalledWith(
        'UPDATE users SET active = ? WHERE role = ?',
      );
    });

    it('updates all rows when filters are empty', async () => {
      db = makeDb({ run: 5 });
      repo = new D1Repository(db, 'users');

      const result = await repo.updateManyBy({}, { active: '0' });

      expect(result).toBe(5);
      expect(db.prepare).toHaveBeenCalledWith('UPDATE users SET active = ?');
    });
  });

  describe('deleteOne', () => {
    it('returns true when row was deleted', async () => {
      db = makeDb({ run: 1 });
      repo = new D1Repository(db, 'users');

      const result = await repo.deleteOne('1');

      expect(result).toBe(true);
    });

    it('returns false when no row matched', async () => {
      db = makeDb({ run: 0 });
      repo = new D1Repository(db, 'users');

      const result = await repo.deleteOne('999');

      expect(result).toBe(false);
    });
  });
});
