import { describe, it, expect } from 'vitest';
import { UserSchema, UserCreateSchema, UserUpdateSchema } from '../../src/schemas/user.schema';

const BASE_USER = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  subject: 'auth|abc123',
  email: 'user@example.com',
  name: 'Mario Rossi',
  roles: ['user', 'admin'],
  active_services: ['svc_a'],
  created_at: '2024-01-01T12:00:00.000Z',
  updated_at: '2024-01-01T12:00:00.000Z',
};

describe('user.schema', () => {
  describe('UserSchema', () => {
    it('validates a correct user object', () => {
      expect(() => UserSchema.parse(BASE_USER)).not.toThrow();
    });

    it('rejects an invalid email', () => {
      const user = { ...BASE_USER, email: 'not-an-email' };
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
