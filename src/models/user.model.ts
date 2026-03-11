import { z } from '@hono/zod-openapi';

export const UserSchema = z.object({
  id: z.string().uuid().openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
  subject: z.string().min(1).openapi({ example: 'auth|abc123' }),
  email: z.string().email().openapi({ example: 'user@example.com' }),
  name: z.string().min(1).openapi({ example: 'Mario Rossi' }),
  roles: z.array(z.string()).openapi({ example: ['user'] }),
  active_services: z.array(z.string()).openapi({ example: ['service_a'] }),
  created_at: z.string().datetime().openapi({ example: '2024-01-01T12:00:00Z' }),
  updated_at: z.string().datetime().openapi({ example: '2024-01-01T12:00:00Z' }),
});

export type User = z.infer<typeof UserSchema>;

export const UserCreateSchema = z.object({
  name: z.string().min(1).openapi({ example: 'Mario Rossi' }),
});

export type UserCreateInput = z.infer<typeof UserCreateSchema>;

export function fromDbRow(row: Record<string, any>): User {
  return {
    ...row,
    roles: JSON.parse(row.roles || '["user"]'),
    active_services: JSON.parse(row.active_services || '[]'),
  } as User;
}

export const UserUpdateSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  roles: z.array(z.string()).optional(),
  active_services: z.array(z.string()).optional(),
});

export type UserUpdateInput = z.infer<typeof UserUpdateSchema>;