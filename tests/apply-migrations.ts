import { applyD1Migrations, env } from 'cloudflare:test';

// Runs before every test file: brings the local D1 to the latest schema
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
