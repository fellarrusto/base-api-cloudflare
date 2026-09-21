import { OpenAPIHono } from '@hono/zod-openapi';
import { AppEnv } from '../../core/types';
import { auditLogRouter } from './audit-log.router';
import { authRouter } from './auth.router';
import { healthRouter } from './health.router';
import { userRouter } from './user.router';

export function registerRoutes(app: OpenAPIHono<AppEnv>) {
  app.route('/api/v1/health', healthRouter);
  app.route('/api/v1/audit-logs', auditLogRouter);
  app.route('/api/v1/auth', authRouter);
  app.route('/api/v1/users', userRouter);
}
