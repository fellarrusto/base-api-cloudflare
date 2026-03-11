import { OpenAPIHono } from '@hono/zod-openapi';
import { Env, AppVariables } from '../core/types';
import { healthRouter } from './health.router';
import { logRouter } from './log.router';
import { authRouter } from './auth.router';

export function registerRoutes(app: OpenAPIHono<{ Bindings: Env; Variables: AppVariables }>) {
  app.route('/api/v1/health', healthRouter);
  app.route('/api/v1/logs', logRouter);
  app.route('/api/v1/auth', authRouter);
}