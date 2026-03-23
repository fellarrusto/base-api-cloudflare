import { describe, it, expect } from 'vitest';
import { fromDbRow, UserSchema, UserCreateSchema, UserUpdateSchema } from './user.model';

const BASE_ROW = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  subject: 'auth|abc123',
  email: 'user@example.com',
  name: 'Mario Rossi',
  roles: '["user","admin"]',
  active_services: '["svc_a"]',
  created_at: '2024-01-01T12:00:00.000Z',
  updated_at: '2024-01-01T12:00:00.000Z',
};

describe('user.model', () => {
  describe('fromDbRow', () => {
    it('parses roles from JSON string', () => {
      const user = fromDbRow(BASE_ROW);
      expect(user.roles).toEqual(['user', 'admin']);
    });

    it('parses active_services from JSON string', () => {
      const user = fromDbRow(BASE_ROW);
      expect(user.active_services).toEqual(['svc_a']);
    });

    it('falls back to ["user"] when roles is missing', () => {
      const user = fromDbRow({ ...BASE_ROW, roles: undefined });
      expect(user.roles).toEqual(['user']);
    });

    it('falls back to [] when active_services is missing', () => {
      const user = fromDbRow({ ...BASE_ROW, active_services: undefined });
      expect(user.active_services).toEqual([]);
    });
  });

  describe('UserSchema', () => {
    it('validates a correct user object', () => {
      const user = fromDbRow(BASE_ROW);
      expect(() => UserSchema.parse(user)).not.toThrow();
    });

    it('rejects an invalid email', () => {
      const user = { ...fromDbRow(BASE_ROW), email: 'not-an-email' };
      expect(() => UserSchema.parse(user)).toThrow();
    });
  });

  describe('UserCreateSchema', () => {
    it('accepts a valid name', () => {
      expect(() => UserCreateSchema.parse({ name: 'Mario' })).not.toThrow();
    });

    it('rejects an empty name', () => {
      expect(() => UserCreateSchema.parse({ name: '' })).toThrow();
    });
  });

  describe('UserUpdateSchema', () => {
    it('accepts an empty object (all fields optional)', () => {
      expect(() => UserUpdateSchema.parse({})).not.toThrow();
    });

    it('rejects an invalid email', () => {
      expect(() => UserUpdateSchema.parse({ email: 'bad' })).toThrow();
    });

    it('accepts valid roles array', () => {
      const result = UserUpdateSchema.parse({ roles: ['admin'] });
      expect(result.roles).toEqual(['admin']);
    });
  });
});
