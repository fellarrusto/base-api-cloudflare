import { describe, expect, it } from 'vitest';
import { call } from '../helpers';

const URL = '/api/v1/health';

// Every query fails, as when D1 is unreachable
const unreachableDb = {
  prepare() {
    throw new Error('D1 unreachable');
  },
} as unknown as D1Database;

describe('health router', () => {
  it('live returns alive with version and uptime', async () => {
    const response = await call(`${URL}/live`);

    expect(response.status).toBe(200);
    const body = await response.json<Record<string, unknown>>();
    expect(body.status).toBe('alive');
    expect(body.version).toBeTypeOf('string');
    expect(body.uptime_ms).toBeGreaterThanOrEqual(0);
    expect(body.example_secret).toBe('test-secret');
  });

  it('live answers even when the database is unreachable', async () => {
    const response = await call(`${URL}/live`, {}, { DB: unreachableDb });

    expect(response.status).toBe(200);
  });

  it('ready returns ready when the database answers', async () => {
    const response = await call(`${URL}/ready`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ready', database: 'up' });
  });

  it('ready returns 503 when the database is unreachable', async () => {
    const response = await call(`${URL}/ready`, {}, { DB: unreachableDb });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'ServiceUnavailableError', message: 'Database unreachable' });
  });
});
