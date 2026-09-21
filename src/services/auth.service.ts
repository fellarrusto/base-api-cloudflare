import { InvalidInputError, UnauthorizedError } from '../core/exceptions';
import { logger } from '../core/logger';
import { Env } from '../core/types';
import { getTokenVerifier } from '../integrations/clients';
import { User, UserCreateInput } from '../schemas/user.schema';
import * as userService from './user.service';

const MOCK_TOKEN_PREFIX = 'mock:';

/** Who the token belongs to, according to the identity provider. */
export interface Identity {
  subject: string;
  email: string;
}

/**
 * Resolve the registered user behind a bearer token.
 *
 * With AUTH_MOCK_ENABLED=true, "mock:<user_id>:<role1>,<role2>" tokens return a
 * synthetic user with those roles, without touching the database.
 *
 * @throws UnauthorizedError invalid token or user not registered
 */
export async function authenticate(env: Env, token: string): Promise<User> {
  if (isMockToken(env, token)) {
    return mockUser(token);
  }
  const identity = await verifyIdentity(env, token);
  const user = await userService.getBySubject(env.DB, identity.subject);
  if (!user) throw new UnauthorizedError('User not registered');
  return user;
}

/**
 * Register the caller of an identity provider token as a new user.
 *
 * @throws UnauthorizedError invalid token
 * @throws InvalidInputError the token has no email claim
 * @throws ConflictError already registered
 */
export async function register(env: Env, token: string, input: UserCreateInput): Promise<User> {
  const identity = await verifyIdentity(env, token);
  return await userService.register(env.DB, identity, input);
}

async function verifyIdentity(env: Env, token: string): Promise<Identity> {
  if (isMockToken(env, token)) {
    const { userId } = parseMockToken(token);
    return { subject: userId, email: `${userId}@mock.local` };
  }
  const payload = await getTokenVerifier(env).verify(token);
  if (!payload.email) throw new InvalidInputError('The token has no email claim');
  return { subject: payload.sub, email: payload.email };
}

function isMockToken(env: Env, token: string): boolean {
  if (env.AUTH_MOCK_ENABLED !== 'true' || !token.startsWith(MOCK_TOKEN_PREFIX)) return false;
  logger.warn('Mock bearer token accepted: AUTH_MOCK_ENABLED must never be set in production');
  return true;
}

function parseMockToken(token: string): { userId: string; roles: string[] } {
  const [userId, roles = ''] = token.slice(MOCK_TOKEN_PREFIX.length).split(':');
  if (!userId) throw new UnauthorizedError('Invalid mock token, expected mock:<user_id>:<role1>,<role2>');
  return { userId, roles: roles.split(',').map((r) => r.trim()).filter(Boolean) };
}

function mockUser(token: string): User {
  const { userId, roles } = parseMockToken(token);
  const now = new Date().toISOString();
  return {
    id: userId,
    subject: userId,
    email: `${userId}@mock.local`,
    name: userId,
    roles,
    active_services: [],
    created_at: now,
    updated_at: now,
  };
}
