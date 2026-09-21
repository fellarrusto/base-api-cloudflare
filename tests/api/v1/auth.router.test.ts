import { describe, expect, it } from 'vitest';
import { auth, call, jsonBody, uniqueId } from '../helpers';

const URL = '/api/v1/auth';

describe('auth router', () => {
  it('register creates the user with the default role', async () => {
    const userId = uniqueId();

    const response = await call(`${URL}/register`, { method: 'POST', ...jsonBody({ name: 'Mario' }, auth(userId)) });

    expect(response.status).toBe(201);
    const user = await response.json<Record<string, unknown>>();
    expect(user.subject).toBe(userId);
    expect(user.name).toBe('Mario');
    expect(user.roles).toEqual(['user']);
    expect(user.active_services).toEqual([]);
  });

  it('register twice is a conflict', async () => {
    const headers = auth(uniqueId());
    await call(`${URL}/register`, { method: 'POST', ...jsonBody({ name: 'Mario' }, headers) });

    const response = await call(`${URL}/register`, { method: 'POST', ...jsonBody({ name: 'Mario' }, headers) });

    expect(response.status).toBe(409);
    expect((await response.json<{ error: string }>()).error).toBe('ConflictError');
  });

  it('register requires a token', async () => {
    const response = await call(`${URL}/register`, { method: 'POST', ...jsonBody({ name: 'Mario' }) });

    expect(response.status).toBe(401);
    expect(response.headers.get('WWW-Authenticate')).toBe('Bearer');
  });

  it('register rejects an empty name', async () => {
    const response = await call(`${URL}/register`, { method: 'POST', ...jsonBody({ name: '' }, auth(uniqueId())) });

    expect(response.status).toBe(422);
    expect((await response.json<{ error: string }>()).error).toBe('ValidationError');
  });

  it('me returns the authenticated user', async () => {
    const userId = uniqueId();

    const response = await call(`${URL}/me`, { headers: auth(userId, 'editor') });

    expect(response.status).toBe(200);
    const user = await response.json<Record<string, unknown>>();
    expect(user.id).toBe(userId);
    expect(user.roles).toEqual(['editor']);
  });

  it('me requires a token', async () => {
    const response = await call(`${URL}/me`);

    expect(response.status).toBe(401);
  });

  it('me rejects a malformed token with 401, not 500', async () => {
    const response = await call(`${URL}/me`, { headers: { Authorization: 'Bearer not-a-jwt' } });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'UnauthorizedError', message: 'Invalid token format' });
  });
});
