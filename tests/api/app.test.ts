import { describe, expect, it } from 'vitest';
import { call } from './helpers';

describe('app', () => {
  it('unknown routes answer 404 with the standard error body', async () => {
    const response = await call('/api/v1/nope');

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'NotFoundError', message: 'Route not found' });
  });

  it('openapi.json documents every route, with the bearer lock only on protected ones', async () => {
    const response = await call('/openapi.json');

    expect(response.status).toBe(200);
    const spec = await response.json<{ paths: Record<string, Record<string, { security?: unknown }>> }>();
    expect(Object.keys(spec.paths).sort()).toEqual([
      '/api/v1/audit-logs',
      '/api/v1/auth/me',
      '/api/v1/auth/register',
      '/api/v1/health/live',
      '/api/v1/health/ready',
      '/api/v1/users/{id}',
    ]);
    expect(spec.paths['/api/v1/audit-logs'].get.security).toEqual([{ Bearer: [] }]);
    expect(spec.paths['/api/v1/health/live'].get.security).toBeUndefined();
  });

  it('CORS reflects only an allowed origin when several are configured', async () => {
    const env = { CORS_ORIGINS: 'https://a.example, https://b.example' };

    const allowed = await call('/api/v1/health/live', { headers: { Origin: 'https://b.example' } }, env);
    const denied = await call('/api/v1/health/live', { headers: { Origin: 'https://evil.example' } }, env);

    expect(allowed.headers.get('Access-Control-Allow-Origin')).toBe('https://b.example');
    expect(denied.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('CORS with "*" allows any origin', async () => {
    const response = await call(
      '/api/v1/health/live',
      { headers: { Origin: 'https://any.example' } },
      { CORS_ORIGINS: '*' },
    );

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});
