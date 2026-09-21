import { ConflictError, NotFoundError } from '../core/exceptions';
import { UserInDB } from '../models/user.model';
import { UserRepository } from '../repositories/user.repository';
import { User, UserCreateInput, UserUpdateInput } from '../schemas/user.schema';
import type { Identity } from './auth.service';

export async function getBySubject(db: D1Database, subject: string): Promise<User | null> {
  const user = await new UserRepository(db).findBySubject(subject);
  return user ? toResponse(user) : null;
}

/**
 * Create the user for an identity. New users get the "user" role.
 *
 * @throws ConflictError subject or email already registered
 */
export async function register(db: D1Database, identity: Identity, input: UserCreateInput): Promise<User> {
  const repository = new UserRepository(db);
  if (await repository.findBySubject(identity.subject)) {
    throw new ConflictError('User already registered');
  }
  if (await repository.existsByEmail(identity.email)) {
    throw new ConflictError('Email already registered');
  }

  const now = new Date().toISOString();
  const user = await repository.create({
    id: crypto.randomUUID(),
    subject: identity.subject,
    email: identity.email,
    name: input.name,
    roles: JSON.stringify(['user']),
    active_services: JSON.stringify([]),
    created_at: now,
    updated_at: now,
  });
  return toResponse(user);
}

/**
 * Update the fields sent and return the updated user.
 *
 * @throws NotFoundError the user does not exist
 */
export async function update(db: D1Database, id: string, input: UserUpdateInput): Promise<User> {
  const repository = new UserRepository(db);
  const fields: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      fields[key] = Array.isArray(value) ? JSON.stringify(value) : value;
    }
  }

  if (Object.keys(fields).length > 0) {
    fields.updated_at = new Date().toISOString();
    if (!(await repository.update(id, fields))) throw new NotFoundError('User not found');
  }

  const user = await repository.findById(id);
  if (!user) throw new NotFoundError('User not found');
  return toResponse(user);
}

function toResponse(user: UserInDB): User {
  return {
    ...user,
    roles: JSON.parse(user.roles || '["user"]'),
    active_services: JSON.parse(user.active_services || '[]'),
  };
}
