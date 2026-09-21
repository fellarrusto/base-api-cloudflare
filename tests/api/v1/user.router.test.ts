import { describe, expect, it } from 'vitest';
import { auth, call, jsonBody, uniqueId } from '../helpers';

const URL = '/api/v1/users';
const ADMIN = auth('admin-user', 'admin');

async function registerUser(): Promise<{ id: string; name: string; email: string }> {
  const response = await call('/api/v1/auth/register', {
    method: 'POST',
    ...jsonBody({ name: 'Mario' }, auth(uniqueId())),
  });
  expect(response.status).toBe(201);
  return await response.json();
}

describe('user router', () => {
  it('updateUser changes only the fields sent', async () => {
    const user = await registerUser();

    const response = await call(`${URL}/${user.id}`, {
      method: 'PATCH',
      ...jsonBody({ roles: ['admin', 'user'] }, ADMIN),
    });

    expect(response.status).toBe(200);
    const updated = await response.json<Record<string, unknown>>();
    expect(updated.roles).toEqual(['admin', 'user']);
    expect(updated.name).toBe('Mario');
    expect(updated.email).toBe(user.email);
  });

  it('updateUser unknown id is not found', async () => {
    const response = await call(`${URL}/missing-id`, { method: 'PATCH', ...jsonBody({ name: 'Luigi' }, ADMIN) });

    expect(response.status).toBe(404);
  });

  it('updateUser rejects an invalid email', async () => {
    const user = await registerUser();

    const response = await call(`${URL}/${user.id}`, { method: 'PATCH', ...jsonBody({ email: 'bad' }, ADMIN) });

    expect(response.status).toBe(422);
  });

  it('updateUser requires a token', async () => {
    const response = await call(`${URL}/any-id`, { method: 'PATCH', ...jsonBody({ name: 'Luigi' }) });

    expect(response.status).toBe(401);
  });

  it('updateUser requires the admin role', async () => {
    const user = await registerUser();

    const response = await call(`${URL}/${user.id}`, {
      method: 'PATCH',
      ...jsonBody({ name: 'Luigi' }, auth(uniqueId(), 'user')),
    });

    expect(response.status).toBe(403);
  });
});
