import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

export default defineConfig(async () => {
  const migrations = await readD1Migrations('./migrations');

  return {
    test: {
      projects: [
        {
          // Static and pure tests: architecture rules, schemas, connectors with a stubbed fetch
          test: {
            name: 'unit',
            environment: 'node',
            include: ['tests/**/*.test.ts'],
            exclude: ['tests/api/**', 'tests/jobs/**'],
          },
        },
        {
          // Endpoint and job tests inside the Workers runtime, on a local D1 with the migrations applied
          plugins: [
            cloudflareTest({
              wrangler: { configPath: './wrangler.toml' },
              miniflare: {
                bindings: {
                  TEST_MIGRATIONS: migrations,
                  AUTH_MOCK_ENABLED: 'true',
                  CORS_ORIGINS: '',
                  EXAMPLE_SECRET: 'test-secret',
                },
              },
            }),
          ],
          test: {
            name: 'workers',
            include: ['tests/api/**/*.test.ts', 'tests/jobs/**/*.test.ts'],
            setupFiles: ['./tests/apply-migrations.ts'],
          },
        },
      ],
      coverage: {
        provider: 'v8',
        include: ['src/**/*.ts'],
      },
    },
  };
});
