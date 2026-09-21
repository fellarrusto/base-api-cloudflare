import { configureLogger, logger } from '../core/logger';
import { Env } from '../core/types';
import { auditLogRetentionJob } from './audit-log-retention.job';

type Job = (env: Env) => Promise<void>;

// Jobs run by the Cron Triggers in wrangler.toml ([triggers] crons). Like routers, they only call services.
const JOBS: Record<string, Job[]> = {
  '0 3 * * *': [auditLogRetentionJob],
};

export async function scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
  configureLogger(env.LOG_LEVEL);
  const jobs = JOBS[controller.cron] ?? [];
  if (jobs.length === 0) logger.warn('No job registered for cron', { cron: controller.cron });

  // One failing job must not stop the others
  const results = await Promise.allSettled(jobs.map((job) => job(env)));
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      logger.error('Scheduled job failed', { cron: controller.cron, job: jobs[i].name, error: String(result.reason) });
    }
  });
}
