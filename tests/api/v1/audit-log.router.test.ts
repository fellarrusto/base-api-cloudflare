import { describe, expect, it } from 'vitest';
import { auth, call, uniqueId } from '../helpers';

const URL = '/api/v1/audit-logs';
const ADMIN = auth('admin-user', 'admin');
const today = () => new Date().toISOString().slice(0, 10);

interface AuditLogBody {
  action: string;
  status: number;
  user_id: string | null;
  timestamp: string;
  metadata: Record<string, unknown>;
}

async function logsOf(userId: string): Promise<AuditLogBody[]> {
  const response = await call(`${URL}?start_date=${today()}&end_date=${today()}&limit=1000`, { headers: ADMIN });
  expect(response.status).toBe(200);
  return (await response.json<AuditLogBody[]>()).filter((log) => log.user_id === userId);
}

describe('audit log router', () => {
  it('getAuditLogs returns the calls of the day with their user, newest first', async () => {
    const userId = uniqueId();
    await call('/api/v1/auth/me', { headers: auth(userId) });
    await call('/api/v1/auth/me', { headers: auth(userId) });

    const logs = await logsOf(userId);

    expect(logs).toHaveLength(2);
    expect(logs[0]).toMatchObject({ action: 'me', status: 200, metadata: { service: 'auth' } });
    expect(logs[0].timestamp >= logs[1].timestamp).toBe(true);
  });

  it('getAuditLogs also records calls rejected with 403, with the error', async () => {
    const userId = uniqueId();
    await call(`${URL}?start_date=${today()}&end_date=${today()}`, { headers: auth(userId) });

    const [log] = await logsOf(userId);

    expect(log).toMatchObject({ action: 'getAuditLogs', status: 403 });
    expect(log.metadata.error).toBe('ForbiddenError: Insufficient role');
  });

  it('getAuditLogs does not record health probes', async () => {
    await call('/api/v1/health/live');

    const response = await call(`${URL}?start_date=${today()}&end_date=${today()}&limit=1000`, { headers: ADMIN });

    const actions = (await response.json<AuditLogBody[]>()).map((log) => log.action);
    expect(actions).not.toContain('live');
  });

  it('getAuditLogs rejects an end date before the start date', async () => {
    const response = await call(`${URL}?start_date=2024-02-01&end_date=2024-01-01`, { headers: ADMIN });

    expect(response.status).toBe(400);
  });

  it('getAuditLogs requires the date range', async () => {
    const response = await call(URL, { headers: ADMIN });

    expect(response.status).toBe(422);
  });

  it('getAuditLogs requires a token', async () => {
    const response = await call(`${URL}?start_date=${today()}&end_date=${today()}`);

    expect(response.status).toBe(401);
  });

  it('getAuditLogs requires the admin role', async () => {
    const response = await call(`${URL}?start_date=${today()}&end_date=${today()}`, { headers: auth(uniqueId()) });

    expect(response.status).toBe(403);
  });
});
