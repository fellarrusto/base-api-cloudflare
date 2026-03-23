import { User } from '../models/user.model';

export type Env = {
  LOG_LEVEL: string;
  API_VERSION: string;
  DB: D1Database;
  AUTH_JWKS_URL: string;
  AUTH_ISSUER: string;
  AUTH_AUDIENCE: string;
  CORS_ORIGINS: string;
  API_TITLE: string;
  SWAGGER_ENABLED: string;
  EXAMPLE_SECRET: string;
};

export type AppVariables = {
  currentUser: User;
};