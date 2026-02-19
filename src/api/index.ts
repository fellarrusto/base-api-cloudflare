import { OpenAPIHono } from '@hono/zod-openapi';
import { Env } from '../core/types';
import { healthRouter } from './health.router';
import { logRouter } from './log.router';

export function registerRoutes(app: OpenAPIHono<{ Bindings: Env }>) {
  app.route('/api/v1/health', healthRouter);
  app.route('/api/v1/logs', logRouter);
}