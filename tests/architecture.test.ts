/// <reference types="node" />
/**
 * Enforces the layer boundaries described in AGENTS.md.
 * If it fails, fix the code, never this test.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(__dirname, '..');
const SRC = join(ROOT, 'src');

// layer folder -> src layers and packages it must never import
const FORBIDDEN_IMPORTS: Record<string, string[]> = {
  api: ['db', 'repositories', 'models', 'integrations', 'jobs', 'drizzle-orm'],
  services: ['db', 'api', 'middleware', 'jobs', 'hono', 'drizzle-orm'],
  repositories: ['api', 'services', 'integrations', 'schemas', 'middleware', 'jobs', 'hono'],
  integrations: ['api', 'services', 'repositories', 'db', 'models', 'middleware', 'jobs', 'hono', 'drizzle-orm'],
  schemas: ['api', 'services', 'repositories', 'db', 'integrations', 'models', 'middleware', 'jobs', 'drizzle-orm'],
  models: ['api', 'services', 'repositories', 'db', 'integrations', 'schemas', 'middleware', 'jobs'],
  // Cross-cutting concerns call services, never data access or connectors
  middleware: ['api', 'repositories', 'db', 'integrations', 'models', 'jobs', 'drizzle-orm'],
  // Cron jobs are entry points like routers: they only call services
  jobs: ['api', 'middleware', 'repositories', 'db', 'integrations', 'hono', 'drizzle-orm'],
  db: ['api', 'services', 'repositories', 'integrations', 'schemas', 'models', 'middleware', 'jobs', 'hono'],
  core: ['api', 'middleware', 'services', 'repositories', 'db', 'integrations', 'jobs', 'hono', 'drizzle-orm'],
};

function filesIn(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? filesIn(path) : path.endsWith('.ts') ? [path] : [];
  });
}

function rel(path: string): string {
  return relative(ROOT, path).split(sep).join('/');
}

/** The src layer (first folder under src/) or the package name an import points to. */
function importTargets(file: string): string[] {
  const source = readFileSync(file, 'utf-8');
  const specifiers = [...source.matchAll(/(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g)]
    .map((m) => m[1] ?? m[2]);
  return specifiers.map((spec) => {
    if (!spec.startsWith('.')) {
      return spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
    }
    const target = relative(SRC, resolve(dirname(file), spec)).split(sep);
    return target[0];
  });
}

describe('architecture', () => {
  it('layers respect import boundaries', () => {
    const violations: string[] = [];
    for (const [layer, forbidden] of Object.entries(FORBIDDEN_IMPORTS)) {
      for (const file of filesIn(join(SRC, layer))) {
        for (const target of importTargets(file)) {
          if (forbidden.includes(target)) violations.push(`${rel(file)}: imports ${target}`);
        }
      }
    }
    expect(violations, 'Layer boundary violations (see AGENTS.md)').toEqual([]);
  });

  it('external HTTP calls live only in integrations', () => {
    const violations = filesIn(SRC)
      .filter((file) => !rel(file).startsWith('src/integrations/'))
      .filter((file) => /(?<![\w.])fetch\(/.test(readFileSync(file, 'utf-8')))
      .map(rel);
    expect(violations, 'fetch() outside src/integrations').toEqual([]);
  });

  it('routes use createRoute with withAuditLog first and withAuth right after it', () => {
    const violations: string[] = [];
    for (const file of filesIn(join(SRC, 'api'))) {
      const source = readFileSync(file, 'utf-8');
      if (/Router\.(get|post|put|patch|delete|all)\(/.test(source)) {
        violations.push(`${rel(file)}: routes must be declared with createRoute() and .openapi()`);
      }
      for (const [, name, body] of source.matchAll(/const (\w+)Route = createRoute\(\{([\s\S]*?)\n\}\);/g)) {
        const middleware = body.match(/middleware:\s*\[([\s\S]*?)\]\s*,/)?.[1] ?? '';
        const names = [...middleware.matchAll(/(with\w+)\(/g)].map((m) => m[1]);
        const auditFirst = names[0] === 'withAuditLog';
        const authAfterAudit = !names.includes('withAuth') || names.indexOf('withAuth') === 1;
        if (!auditFirst || !authAfterAudit) {
          violations.push(`${rel(file)}: ${name}Route middleware must be [withAuditLog(...), withAuth(...)?, ...]`);
        }
      }
    }
    expect(violations, 'Route middleware violations').toEqual([]);
  });

  it('every route has tests', () => {
    // src/api/v1/x.router.ts -> tests/api/v1/x.router.test.ts with an it('<route> ...') per route
    const violations: string[] = [];
    for (const file of filesIn(join(SRC, 'api')).filter((f) => f.endsWith('.router.ts'))) {
      const testFile = join(ROOT, 'tests', relative(SRC, file)).replace(/\.ts$/, '.test.ts');
      if (!existsSync(testFile)) {
        violations.push(`${rel(file)}: missing ${rel(testFile)}`);
        continue;
      }
      const tests = readFileSync(testFile, 'utf-8');
      const routes = [...readFileSync(file, 'utf-8').matchAll(/const (\w+)Route = createRoute\(/g)].map((m) => m[1]);
      for (const route of routes) {
        if (!new RegExp(`\\bit\\(\\s*['"\`]${route} `).test(tests)) {
          violations.push(`${rel(testFile)}: no it('${route} ...') test`);
        }
      }
    }
    expect(violations, 'Routes without tests (see Testing in AGENTS.md)').toEqual([]);
  });
});
