import { ServiceUnavailableError } from '../core/exceptions';
import { HealthRepository } from '../repositories/health.repository';
import { LivenessResponse, ReadinessResponse } from '../schemas/health.schema';

const startTime = Date.now();

/** The Worker answers: no dependency is checked. */
export function live(version: string, exampleSecret: string): LivenessResponse {
  return {
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime_ms: Date.now() - startTime,
    version,
    example_secret: exampleSecret,
  };
}

/**
 * The Worker can serve requests.
 *
 * @throws ServiceUnavailableError the database is unreachable
 */
export async function ready(db: D1Database): Promise<ReadinessResponse> {
  if (!(await new HealthRepository(db).ping())) {
    throw new ServiceUnavailableError('Database unreachable');
  }
  return { status: 'ready', database: 'up' };
}
