import { createExecutionContext, createScheduledController, env, waitOnExecutionContext } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import worker from '../../src/index';
import { AuditLogRepository } from '../../src/repositories/audit-log.repository';

const DAY_MS = 86_400_000;

// The API cannot create old logs: arrange them through the repository
function logAt(daysAgo: number) {
  return {
    id: crypto.randomUUID(),
    action: 'retention-test',
    endpoint: '/test',
    method: 'GET',
    status: 200,
    duration_ms: 1,
    timestamp: new Date(Date.now() - daysAgo * DAY_MS).toISOString(),
    user_id: null,
    metadata: '{}',
  };
}

async function runCron(retentionDays: string) {
  const ctx = createExecutionContext();
  await worker.scheduled(
    createScheduledController({ cron: '0 3 * * *', scheduledTime: Date.now() }),
    { ...env, AUDIT_LOG_RETENTION_DAYS: retentionDays },
    ctx,
  );
  await waitOnExecutionContext(ctx);
}

async function exists(id: string): Promise<boolean> {
  const all = await new AuditLogRepository(env.DB).findByTimeRange('0000', '9999', 10_000);
  return all.some((log) => log.id === id);
}

describe('audit log retention job', () => {
  it('deletes logs older than the retention and keeps the recent ones', async () => {
    const repository = new AuditLogRepository(env.DB);
    const old = await repository.create(logAt(100));
    const recent = await repository.create(logAt(1));

    await runCron('90');

    expect(await exists(old.id)).toBe(false);
    expect(await exists(recent.id)).toBe(true);
  });

  it('keeps everything when the retention is 0', async () => {
    const old = await new AuditLogRepository(env.DB).create(logAt(1000));

    await runCron('0');

    expect(await exists(old.id)).toBe(true);
  });
});
