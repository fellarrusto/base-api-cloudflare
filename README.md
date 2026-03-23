# Sybilla Base API — Cloudflare Workers

API REST scalabile su Cloudflare Workers con architettura a layer, validazione OpenAPI e database D1.

## Stack Tecnologico

| Tecnologia | Versione | Scopo |
|------------|----------|-------|
| **Hono** | ^4.4.0 | Framework web leggero e veloce |
| **Zod + Zod OpenAPI** | ^3.22.4 + ^0.14.9 | Validazione e generazione docs OpenAPI 3.0 |
| **Cloudflare D1** | Binding `DB` | Database SQL (SQLite) serverless |
| **Wrangler** | ^3.57.0 | CLI per sviluppo e deployment |
| **TypeScript** | ^5.3.3 | Type safety |

## Struttura del Progetto

```
base-api-cloudflare/
├── package.json                      # Dipendenze e script
├── tsconfig.json                     # Configurazione TypeScript
├── wrangler.toml                     # Configurazione Cloudflare
├── migrations/                       # Migrazioni SQL
│   └── 0001_create_audit_logs.sql
└── src/
    ├── index.ts                      # Entry point
    ├── api/                          # Router e endpoint definitions
    │   ├── index.ts                  # Registrazione route
    │   ├── health.router.ts          # Router health check
    │   └── log.router.ts             # Router audit logs
    ├── services/                     # Logica di business
    │   ├── health.service.ts
    │   └── log.service.ts
    ├── models/                       # Schemi Zod + type definitions
    │   ├── health.model.ts
    │   ├── log.model.ts
    │   ├── user.model.ts
    │   └── helpers.ts                # Helper Zod per booleani D1 (boolIntIn/Out)
    ├── db/                           # Layer database
    │   ├── database.ts               # Factory pattern
    │   ├── base.repository.ts        # Interfaccia repository
    │   └── d1.repository.ts          # Implementazione D1
    └── core/                         # Configurazioni e utility
        ├── types.ts                  # Type Env e types globali
        ├── config.ts                 # Configurazioni app
        └── middleware.ts             # Middleware custom
```

## Regole Architetturali

### 1. Flusso Richiesta-Risposta

```
HTTP Request
    ↓
API Router (createRoute + Zod schema)
    ↓
Handler (validazione Zod automatica)
    ↓
Service (logica di business)
    ↓
Repository (data access layer)
    ↓
D1 Database (SQL query execution)
    ↓
HTTP Response (JSON serializzato)
```

### 2. Pattern di Architettura

- **Router**: Definisce endpoint OpenAPI, riceve richieste
- **Service**: Contiene logica di business, non conosce HTTP
- **Repository**: Accede al database tramite interfaccia `BaseRepository`
- **Models**: Schemi Zod per validazione e type inference
- **Middleware**: Cross-cutting concerns (audit, logging, auth)

### 3. Vincoli Assoluti

✅ **OBBLIGATORIO**:
- Tutte le rotte devono usare `createRoute()` di Hono OpenAPI
- Tutti i payload/response devono avere schemi Zod `z.object(...)`
- I router devono delegare logica ai service
- Service deve usare repository per data access
- Ogni tabella del database ha un repository dedicated
- Migrazioni SQL versionati con prefisso `NNNN_`
- Response sempre serializzati con `.json()` di Hono
- Types globali definiti in `src/core/types.ts`

❌ **VIETATO**:
- Query SQL direttamente nei router
- Logica di business nei middleware
- Database access senza usare repository
- Response in plain text (solo JSON)
- Schemi Zod inline nei router
- Export di default nei moduli (solo named exports)

## Come Scrivere le Rotte

### Template di Router

```typescript
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { Env } from '../core/types';
import { withAuditLog } from '../core/middleware';
import { ResourceSchema } from '../models/resource.model';
import * as resourceService from '../services/resource.service';

const resourceRouter = new OpenAPIHono<{ Bindings: Env }>();

// Definire route con createRoute()
const getOneRoute = createRoute({
  method: 'get',
  path: '/:id',
  tags: ['Resources'],
  description: 'Get a single resource by ID',
  request: {
    params: z.object({
      id: z.string().min(1).openapi({ example: 'res_123' }),
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: ResourceSchema } },
      description: 'Resource found',
    },
    404: {
      content: { 'application/json': { 
        schema: z.object({ error: z.string() }) 
      } },
      description: 'Resource not found',
    },
  },
});

// Applicare middleware PRIMA dell'handler
resourceRouter.use('/*', withAuditLog('resource_operation'));

// Handler con openapi()
resourceRouter.openapi(getOneRoute, async (c) => {
  const { id } = c.req.valid('param');
  const resource = await resourceService.getOne(c.env.DB, id);
  
  if (!resource) {
    return c.json({ error: 'Resource not found' }, 404);
  }
  
  return c.json(resource, 200);
});

export { resourceRouter };
```

### Convenzioni Routing

- **Path patterns**: Usare verbi HTTP RESTful
  - `GET /api/v1/resources` → lista
  - `GET /api/v1/resources/:id` → dettaglio
  - `POST /api/v1/resources` → crea
  - `PATCH /api/v1/resources/:id` → aggiorna
  - `DELETE /api/v1/resources/:id` → elimina

- **Tagging OpenAPI**: 
  - Usare categoria singolare es. `tags: ['Resource']`
  - Coerente con il nome del router

- **Description**: 
  - Descrizione breve in inglese dell'endpoint
  - Deve chiarire what vs how

- **Validazione**: 
  - Usare `c.req.valid('param')` per parametri
  - Usare `c.req.valid('query')` per query string
  - Usare `c.req.valid('json')` per body JSON

## Come Usare i Service

I service contengono **tutta la logica di business** e sono **agnostici HTTP**.

### Template Service

```typescript
// src/services/resource.service.ts
import { getRepository } from '../db/database';
import { Resource, ResourceCreateInput } from '../models/resource.model';

export async function getOne(db: D1Database, id: string): Promise<Resource | null> {
  const repo = getRepository(db, 'resources');
  return await repo.findOne(id) as Resource | null;
}

export async function getAll(db: D1Database, limit = 100): Promise<Resource[]> {
  const repo = getRepository(db, 'resources');
  return await repo.findMany({}, limit) as Resource[];
}

export async function create(
  db: D1Database,
  input: ResourceCreateInput
): Promise<string> {
  // Logica di business: validazione, trasformazioni, etc
  const id = crypto.randomUUID();
  const data = {
    id,
    ...input,
    created_at: new Date().toISOString(),
  };
  
  const repo = getRepository(db, 'resources');
  return await repo.insertOne(data);
}

export async function update(
  db: D1Database,
  id: string,
  updates: Partial<ResourceCreateInput>
): Promise<boolean> {
  const repo = getRepository(db, 'resources');
  return await repo.updateOne(id, {
    ...updates,
    updated_at: new Date().toISOString(),
  });
}

export async function delete(db: D1Database, id: string): Promise<boolean> {
  const repo = getRepository(db, 'resources');
  return await repo.deleteOne(id);
}
```

### Regole Service

- No HTTP context (`c`, `ctx`) in service
- Prende `db: D1Database` come parametro
- Ritorna tipi semplici (non Hono Response)
- Può usare repository
- Può contenere validazione/trasformazione dati
- Funzioni pubbliche con `export`
- Nome file: `{entity}.service.ts`

## Come Definire i Models

I models sono schemi **Zod** che servono sia per validazione che per type inference.

### Template Model

```typescript
// src/models/resource.model.ts
import { z } from '@hono/zod-openapi';

// Schema di base (quello salvato in DB)
export const ResourceSchema = z.object({
  id: z.string().uuid().openapi({ 
    example: '550e8400-e29b-41d4-a716-446655440000' 
  }),
  name: z.string().min(1).max(255).openapi({ 
    example: 'My Resource' 
  }),
  description: z.string().optional().openapi({ 
    example: 'Resource description' 
  }),
  status: z.enum(['active', 'archived']).openapi({ 
    example: 'active' 
  }),
  created_at: z.string().datetime().openapi({ 
    example: '2024-01-01T12:00:00Z' 
  }),
  updated_at: z.string().datetime().optional().openapi({ 
    example: '2024-01-02T12:00:00Z' 
  }),
});

// Type inference da schema
export type Resource = z.infer<typeof ResourceSchema>;

// Schema per creazione (without id/timestamps)
export const ResourceCreateSchema = ResourceSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type ResourceCreateInput = z.infer<typeof ResourceCreateSchema>;

// Schema per aggiornamento (tutti i campi opzionali)
export const ResourceUpdateSchema = ResourceCreateSchema.partial();

export type ResourceUpdateInput = z.infer<typeof ResourceUpdateSchema>;
```

### Campi Booleani con D1

D1/SQLite non ha un tipo booleano nativo — i booleani vengono salvati come `INTEGER` (`0`/`1`). Usa gli helper in `src/models/helpers.ts` per gestire la conversione automaticamente tramite Zod:

```typescript
import { boolIntIn, boolIntInOptional, boolIntOut } from './helpers';

export const ResourceSchema = z.object({
  id: z.string().uuid(),
  attivo: boolIntOut.openapi({ example: true }),   // DB 0/1 → response true/false
});

export const ResourceCreateSchema = z.object({
  attivo: boolIntIn.default(1).openapi({ example: true }),  // API bool → DB 0/1
});

export const ResourceUpdateSchema = z.object({
  attivo: boolIntInOptional,  // opzionale
});
```

- `boolIntOut` — usato negli schema di **response**: converte `0`/`1` dal DB a `true`/`false`
- `boolIntIn` — usato negli schema di **input** (create): converte `true`/`false` dall'API a `0`/`1`
- `boolIntInOptional` — come `boolIntIn` ma il campo è opzionale (update)

La conversione avviene automaticamente quando il service chiama `Schema.parse(dbRow)`.

### Convenzioni Models

- **File naming**: `{entity}.model.ts`
- **Export naming**: `{Entity}Schema`, `{Entity}CreateSchema`, ecc.
- **Type naming**: `{Entity}`, `{Entity}CreateInput`, `{Entity}UpdateInput`
- **OpenAPI metadata**: `.openapi({ example: '...' })`
- **Reusable schemas**: Creare varianti con `.pick()`, `.omit()`, `.partial()`
- **Documentazione**: description nei z.fields se necessario

```typescript
export const ResourceDetailsSchema = ResourceSchema.extend({
  author: z.object({
    id: z.string(),
    name: z.string(),
  }).optional(),
});
```

## Layer Database

### Flusso Data Access

```
Service
   ↓
getRepository(db, 'table_name')  ← Factory pattern
   ↓
D1Repository implements BaseRepository
   ↓
D1Database.prepare(sql).bind(...).run()
   ↓
Risultati SQL
```

### Interfaccia BaseRepository

```typescript
// src/db/base.repository.ts
export interface BaseRepository {
  findOne(id: string): Promise<Record<string, any> | null>;
  findOneBy(field: string, value: string): Promise<Record<string, any> | null>;

  findMany(filters?: Record<string, any>, limit?: number): Promise<Record<string, any>[]>;
  findManyBy(filters: Record<string, any>, limit?: number): Promise<Record<string, any>[]>;

  insertOne(data: Record<string, any>): Promise<string>;

  updateOne(id: string, data: Record<string, any>): Promise<boolean>;
  updateManyBy(filters: Record<string, any>, data: Record<string, any>): Promise<number>;

  deleteOne(id: string): Promise<boolean>;
}
```

### Usando le Repository

```typescript
// In un service
import { getRepository } from '../db/database';

export async function getResource(db: D1Database, id: string) {
  const repo = getRepository(db, 'resources');
  return await repo.findOne(id);
}

export async function listResources(db: D1Database) {
  const repo = getRepository(db, 'resources');
  return await repo.findMany({}, 50);
}

export async function createResource(db: D1Database, data: any) {
  const repo = getRepository(db, 'resources');
  return await repo.insertOne(data);
}
```

### Implementazione D1Repository

```typescript
// src/db/d1.repository.ts — NON MODIFICARE
export class D1Repository implements BaseRepository {
  constructor(private db: D1Database, private table: string) {}

  async findOne(id: string) {
    return await this.db
      .prepare(`SELECT * FROM ${this.table} WHERE id = ?`)
      .bind(id)
      .first();
  }

  async findMany(_filters?: Record<string, any>, limit = 100) {
    return (await this.db
      .prepare(`SELECT * FROM ${this.table} LIMIT ?`)
      .bind(limit)
      .all()).results;
  }

  async insertOne(data: Record<string, any>) {
    const keys = Object.keys(data);
    const placeholders = keys.map(() => '?').join(', ');
    await this.db
      .prepare(`INSERT INTO ${this.table} (${keys.join(', ')}) VALUES (${placeholders})`)
      .bind(...Object.values(data))
      .run();
    return data.id;
  }

  async updateOne(id: string, data: Record<string, any>) {
    const sets = Object.keys(data).map(k => `${k} = ?`).join(', ');
    const result = await this.db
      .prepare(`UPDATE ${this.table} SET ${sets} WHERE id = ?`)
      .bind(...Object.values(data), id)
      .run();
    return result.meta.changes > 0;
  }

  async deleteOne(id: string) {
    const result = await this.db
      .prepare(`DELETE FROM ${this.table} WHERE id = ?`)
      .bind(id)
      .run();
    return result.meta.changes > 0;
  }
}
```

## Migrazioni Database

### Struttura Migrazioni

```
migrations/
├── 0001_create_audit_logs.sql
├── 0002_create_resources.sql
├── 0003_add_index_to_resources.sql
└── 0004_add_user_table.sql
```

### Convenzioni

- **Prefisso sequenziale**: `NNNN_` (4 digit zero-padded)
- **Naming**: snake_case descrittivo `create_table`, `add_column`, `add_index`
- **Una responsabilità per migration**: non mescolare CREATE TABLE con ALTER
- **SQL idempotente**: Usare `IF NOT EXISTS` dove appropriato
- **Commenti**: Aggiungere descrizione all'inizio

### Template Migration

```sql
-- 0002_create_resources.sql
-- Create the main resources table with timestamps and status
CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_resources_status ON resources(status);
CREATE INDEX IF NOT EXISTS idx_resources_created_at ON resources(created_at);
```

### Eseguire Migrazioni

```bash
# Migrazioni si eseguono automaticamente con Wrangler
wrangler d1 migrations apply sybilla-db --local
wrangler d1 migrations apply sybilla-db                    # Production
```

### Esempio Completo: Aggiungere Nuova Tabella

1. **Create migration file** `migrations/NNNN_create_table.sql`:
```sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_users_email ON users(email);
```

2. **Create model** `src/models/user.model.ts`:
```typescript
import { z } from '@hono/zod-openapi';

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  created_at: z.string().datetime(),
});

export type User = z.infer<typeof UserSchema>;

export const UserCreateSchema = UserSchema.omit({ id: true, created_at: true });
export type UserCreateInput = z.infer<typeof UserCreateSchema>;
```

3. **Create service** `src/services/user.service.ts`:
```typescript
import { getRepository } from '../db/database';
import { User, UserCreateInput } from '../models/user.model';

export async function getUser(db: D1Database, id: string): Promise<User | null> {
  const repo = getRepository(db, 'users');
  return await repo.findOne(id) as User | null;
}

export async function createUser(db: D1Database, input: UserCreateInput): Promise<string> {
  const id = crypto.randomUUID();
  const repo = getRepository(db, 'users');
  return await repo.insertOne({
    id,
    ...input,
    created_at: new Date().toISOString(),
  });
}
```

4. **Create router** `src/api/user.router.ts`:
```typescript
import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { Env } from '../core/types';
import { UserSchema, UserCreateSchema } from '../models/user.model';
import * as userService from '../services/user.service';

const userRouter = new OpenAPIHono<{ Bindings: Env }>();

const createRoute_user = createRoute({
  method: 'post',
  path: '/',
  tags: ['Users'],
  request: { body: { content: { 'application/json': { schema: UserCreateSchema } } } },
  responses: {
    201: { content: { 'application/json': { schema: UserSchema } }, description: 'User created' },
  },
});

userRouter.openapi(createRoute_user, async (c) => {
  const input = c.req.valid('json');
  const id = await userService.createUser(c.env.DB, input);
  return c.json({ id, ...input, created_at: new Date().toISOString() }, 201);
});

export { userRouter };
```

5. **Register router** in `src/api/index.ts`:
```typescript
import { userRouter } from './user.router';
export function registerRoutes(app: OpenAPIHono<{ Bindings: Env }>) {
  app.route('/api/v1/users', userRouter);
}
```

## Middleware e Cross-Cutting Concerns

### Middleware di Audit Logging

```typescript
// src/core/middleware.ts
import { MiddlewareHandler } from 'hono';
import { getRepository } from '../db/database';

export function withAuditLog(action: string): MiddlewareHandler {
  return async (c, next) => {
    const start = performance.now();
    
    // Continua nell'execution chain
    await next();
    
    // Log dopo la response
    const repo = getRepository(c.env.DB, 'audit_logs');
    await repo.insertOne({
      id: crypto.randomUUID(),
      action,
      endpoint: c.req.path,
      method: c.req.method,
      status: c.res.status,
      duration_ms: Math.round(performance.now() - start),
      timestamp: new Date().toISOString(),
    });
  };
}
```

### Applicazione nei Router

```typescript
// Applica prima degli handler
resourceRouter.use('/*', withAuditLog('resource_operation'));

// Oppure su route specifica
resourceRouter.use('/delete', withAuditLog('resource_delete'));
```

### Scrivere Middleware Custom

```typescript
export function withLogger(label: string): MiddlewareHandler {
  return async (c, next) => {
    console.log(`[${label}] ${c.req.method} ${c.req.path}`);
    await next();
    console.log(`[${label}] Response: ${c.res.status}`);
  };
}

export function withErrorHandler(): MiddlewareHandler {
  return async (c, next) => {
    try {
      await next();
    } catch (err) {
      console.error(err);
      return c.json({ error: 'Internal Server Error' }, 500);
    }
  };
}
```

## Configurazione e Environment

### wrangler.toml

```toml
name = "sybilla-base-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
LOG_LEVEL = "info"
API_VERSION = "1.1.0"

[[d1_databases]]
binding = "DB"
database_name = "sybilla-db"
database_id = "5dfeef5a-9a22-4735-a35c-8dcb21a23c33"

[env.production]
vars = { API_VERSION = "1.1.0" }
[[env.production.d1_databases]]
binding = "DB"
database_name = "sybilla-db-prod"
database_id = "prod-id-here"

[dev]
port = 3000
```

### Types Globali

```typescript
// src/core/types.ts
export type Env = {
  LOG_LEVEL: string;
  API_VERSION: string;
  DB: D1Database;
};
```

### Accedere a Environment

```typescript
// In un router handler
resourceRouter.openapi(route, (c) => {
  const apiVersion = c.env.API_VERSION;        // env variable
  const db = c.env.DB;                         // D1 binding
  return c.json({ version: apiVersion }, 200);
});

// In un service
export function getVersion(env: Env): string {
  return env.API_VERSION;
}
```

## Entry Point

```typescript
// src/index.ts
import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { Env } from './core/types';
import { registerRoutes } from './api';

const app = new OpenAPIHono<{ Bindings: Env }>();

// Registra tutte le rotte
registerRoutes(app);

// Genera OpenAPI spec
app.doc('/openapi.json', {
  openapi: '3.0.0',
  info: { 
    title: 'Sybilla API', 
    version: '1.1.0',
    description: 'API REST per Sybilla'
  },
});

// Swagger UI
app.get('/docs', swaggerUI({ url: '/openapi.json' }));

export default app;
```

### Routing Registration

```typescript
// src/api/index.ts
import { OpenAPIHono } from '@hono/zod-openapi';
import { Env } from '../core/types';
import { healthRouter } from './health.router';
import { logRouter } from './log.router';
import { resourceRouter } from './resource.router';

export function registerRoutes(app: OpenAPIHono<{ Bindings: Env }>) {
  app.route('/api/v1/health', healthRouter);
  app.route('/api/v1/logs', logRouter);
  app.route('/api/v1/resources', resourceRouter);
  // ... aggiungi nuovi router qui
}
```

## Stile di Codice e Convenzioni

### Naming Conventions

| Elemento | Convenzione | Esempio |
|----------|------------|---------|
| File modello | snake_case | `user.model.ts` |
| File service | snake_case | `user.service.ts` |
| File router | snake_case | `user.router.ts` |
| Variabili/funzioni | camelCase | `getUserById` |
| Costanti | UPPER_SNAKE_CASE | `MAX_LIMIT` |
| Tipi | PascalCase | `UserSchema`, `User` |
| Enum | PascalCase | `UserStatus` |
| DB table | snake_case | `audit_logs` |
| DB column | snake_case | `created_at` |

### Import Order

```typescript
// 1. Imports from hono
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';

// 2. Imports from core
import { Env } from '../core/types';
import { withAuditLog } from '../core/middleware';

// 3. Imports from models
import { ResourceSchema } from '../models/resource.model';

// 4. Imports from services/db
import * as resourceService from '../services/resource.service';
```

### Commenti

```typescript
// ✅ BENE: Spiega il "perché" non il "cosa"
// Raggruppa i risorse attive per evitare query N+1
const activeResources = await resourceService.getActiveGrouped(db);

// ❌ MALE: Commento ridondante
const resources = foo.filter(r => r.status === 'active');  // Filter active resources

// ✅ BENE: Funzioni self-documenting
export async function getActiveFooWithEagerLoadedBar(db: D1Database) {
  // ...
}
```

## Sviluppo e Deployment

### Comandi

```bash
# Installa dipendenze
npm install

# Ambiente locale con live reload
npm run dev

# Build per production
npm run build

# Deploy a Cloudflare
npm run deploy

# Migrazioni locali
wrangler d1 migrations apply sybilla-db --local

# Migrazioni production
wrangler d1 migrations apply sybilla-db
```

### CORS e Security

```typescript
// src/core/middleware.ts
export function withCORS(): MiddlewareHandler {
  return async (c, next) => {
    c.header('Access-Control-Allow-Origin', '*');
    c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (c.req.method === 'OPTIONS') {
      return c.text('', 204);
    }
    await next();
  };
}

// Applicare nel main app
app.use('*', withCORS());
```

## Checklist Implementazione Nuova Feature

Quando aggiungi una nuova feature segui questi step in ordine:

- [ ] **1. Crea migration** SQL in `migrations/NNNN_*.sql`
- [ ] **2. Definisci model** in `src/models/feature.model.ts` con Zod schema
- [ ] **3. Scrivi service** in `src/services/feature.service.ts` con logica business
- [ ] **4. Crea router** in `src/api/feature.router.ts` con OpenAPI routes
- [ ] **5. Registra router** in `src/api/index.ts`
- [ ] **6. Test localmente** con `npm run dev` e Swagger UI at `/docs`
- [ ] **7. Deploy** con `npm run deploy`

## Troubleshooting

### Query Errors

```typescript
// ❌ ERRORE: SQL injection risk
const result = db.prepare(`SELECT * FROM users WHERE id = ${id}`);

// ✅ CORRETTO: Parametri bindati
const result = db.prepare(`SELECT * FROM users WHERE id = ?`).bind(id);
```

### Type Safety

```typescript
// ❌ ERRORE: Loose typing
const user = await repo.findOne(id);  // Type: Record<string, any> | null

// ✅ CORRETTO: Type-safe casting
const user = await repo.findOne(id) as User | null;
```

### Async Handling

```typescript
// ❌ ERRORE: Missing await
export async function getResource(db: D1Database, id: string) {
  return repo.findOne(id);  // Promise non risolta
}

// ✅ CORRETTO: Await promise
export async function getResource(db: D1Database, id: string) {
  return await repo.findOne(id);
}
```

## References

- **Hono Docs**: https://hono.dev
- **Zod Docs**: https://zod.dev
- **Cloudflare D1**: https://developers.cloudflare.com/d1/
- **OpenAPI 3.0**: https://spec.openapis.org/oas/v3.0.3
- **Wrangler CLI**: https://developers.cloudflare.com/workers/wrangler/