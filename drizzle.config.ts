import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/models/index.ts',
  out: './migrations',
  driver: 'd1-http',
});
