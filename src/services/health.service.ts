import { HealthCheckResponse } from '../models/health.model';

const startTime = Date.now();

export function check(version: string, exampleSecret: string): HealthCheckResponse {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime_ms: Date.now() - startTime,
    version,
    example_secret: exampleSecret,
  };
}