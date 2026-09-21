import { createExecutionContext, env, waitOnExecutionContext } from 'cloudflare:test';
import worker from '../../src/index';
import type { Env } from '../../src/core/types';

/**
 * Call the Worker in-process, as Cloudflare would, and wait for its waitUntil
 * work (audit log writes) before returning. `envOverrides` replaces bindings/vars.
 */
export async function call(path: string, init: RequestInit = {}, envOverrides: Partial<Env> = {}): Promise<Response> {
  const ctx = createExecutionContext();
  const response = await worker.fetch(new Request(`http://test${path}`, init), { ...env, ...envOverrides }, ctx);
  await waitOnExecutionContext(ctx);
  return response;
}

/** Authorization header with a mock token: auth('alice', 'admin'). */
export function auth(userId: string, ...roles: string[]): Record<string, string> {
  const token = roles.length ? `mock:${userId}:${roles.join(',')}` : `mock:${userId}`;
  return { Authorization: `Bearer ${token}` };
}

/** A user id no other test uses: tests share the database, never their data. */
export function uniqueId(prefix = 'user'): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function jsonBody(body: unknown, headers: Record<string, string> = {}): RequestInit {
  return { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json', ...headers } };
}
