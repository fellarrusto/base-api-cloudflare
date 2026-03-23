import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getBySubject, create, update } from './user.service';

// Mock del modulo database per iniettare un repo fake
vi.mock('../db/database', () => ({
  getRepository: vi.fn(),
}));

import { getRepository } from '../db/database';

function makeDb(firstResult: any = null, runResult = { meta: { changes: 1 } }) {
  return {
    prepare: vi.fn(() => ({
      bind: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue(firstResult),
      run: vi.fn().mockResolvedValue(runResult),
    })),
  } as unknown as D1Database;
}

describe('user.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getBySubject', () => {
    it('returns null when user not found', async () => {
      const db = makeDb(null);
      const result = await getBySubject(db, 'auth|missing');
      expect(result).toBeNull();
    });

    it('returns parsed user when found', async () => {
      const dbRow = {
        id: 'uuid-1',
        subject: 'auth|abc',
        email: 'a@b.com',
        name: 'Mario',
        roles: '["admin"]',
        active_services: '["svc_a"]',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };
      const db = makeDb(dbRow);

      const result = await getBySubject(db, 'auth|abc');

      expect(result).not.toBeNull();
      expect(result!.roles).toEqual(['admin']);
      expect(result!.active_services).toEqual(['svc_a']);
    });
  });

  describe('create', () => {
    it('inserts a new user and returns it with defaults', async () => {
      const db = makeDb();
      const fakeRepo = { insertOne: vi.fn().mockResolvedValue('new-uuid') };
      vi.mocked(getRepository).mockReturnValue(fakeRepo as any);

      const result = await create(db, 'auth|new', 'new@example.com', { name: 'Luigi' });

      expect(fakeRepo.insertOne).toHaveBeenCalledOnce();
      expect(result.subject).toBe('auth|new');
      expect(result.email).toBe('new@example.com');
      expect(result.name).toBe('Luigi');
      expect(result.roles).toEqual(['user']);
      expect(result.active_services).toEqual([]);
    });

    it('assigns a UUID as id', async () => {
      const db = makeDb();
      const fakeRepo = { insertOne: vi.fn().mockResolvedValue('x') };
      vi.mocked(getRepository).mockReturnValue(fakeRepo as any);

      const result = await create(db, 'auth|x', 'x@y.com', { name: 'Test' });

      expect(result.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });
  });

  describe('update', () => {
    it('does nothing when input is empty', async () => {
      const db = makeDb();
      await update(db, 'uuid-1', {});
      expect(db.prepare).not.toHaveBeenCalled();
    });

    it('builds the UPDATE query with provided fields', async () => {
      const db = makeDb();
      await update(db, 'uuid-1', { name: 'Nuovo Nome' });
      expect(db.prepare).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET'),
      );
    });

    it('serializes array fields to JSON', async () => {
      const db = makeDb();
      await update(db, 'uuid-1', { roles: ['admin', 'user'] });

      const bindCall = (db.prepare as any).mock.results[0].value.bind.mock.calls[0];
      expect(bindCall).toContain('["admin","user"]');
    });
  });
});
