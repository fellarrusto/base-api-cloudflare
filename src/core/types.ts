import { User } from '../schemas/user.schema';

export type Env = {
  DB: D1Database;
  LOG_LEVEL: string;
  API_VERSION: string;
  API_TITLE: string;
  SWAGGER_ENABLED: string;
  // Comma-separated browser origins allowed to call the API; empty = CORS disabled, "*" = any origin
  CORS_ORIGINS: string;
  AUTH_JWKS_URL: string;
  AUTH_ISSUER: string;
  AUTH_AUDIENCE: string;
  // "true" accepts "mock:<user_id>:<role1>,<role2>" bearer tokens. Local testing only (.dev.vars)
  AUTH_MOCK_ENABLED?: string;
  // Days audit logs are kept, deleted by the daily cron; "0" = keep forever
  AUDIT_LOG_RETENTION_DAYS: string;
  EXAMPLE_SECRET: string;
};

export type AppVariables = {
  currentUser: User;
};

export type AppEnv = { Bindings: Env; Variables: AppVariables };
