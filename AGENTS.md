# Base API Cloudflare — Regole di progetto

Boilerplate per API REST su **Cloudflare Workers** (Hono + Zod OpenAPI + D1 via Drizzle) con architettura a layer rigida: Router → Service → Repository → Database. È il porting TypeScript di [BaseApi](https://github.com/fellarrusto/BaseApi) (FastAPI) e ne segue struttura e regole, adattate alle primitive di Workers.

Questo file è la fonte delle regole sia per gli sviluppatori sia per gli agenti AI (Claude Code lo legge tramite [CLAUDE.md](CLAUDE.md)).

## Stack

| Tecnologia | Scopo |
|------------|-------|
| Hono + `@hono/zod-openapi` | Framework, routing, validazione, spec OpenAPI |
| Zod | Contratto API (schemas) |
| Cloudflare D1 + Drizzle ORM | Database e query type-safe |
| Drizzle Kit | Migrazioni generate dai models |
| Vitest + `@cloudflare/vitest-pool-workers` | Test degli endpoint nel runtime Workers, test di architettura |

---

## Architettura — pattern a layer OBBLIGATORIO

**Ogni feature segue il pattern Schema / Model / Router / Service / Repository. Nessuna eccezione.**

```
                 Schemas (contratto API)
                         ↕
Router (HTTP) → Service (logica) → Repository (accesso ai dati) → db (Drizzle) → D1
                   │                        ↕
                   │                  Models (tabelle)
                   └──→ Integrations (servizi esterni)
```

| Layer | Cartella | Fa | Non fa MAI |
|-------|----------|----|------------|
| **Schema** | `src/schemas` | Contratto API in Zod: `Create`, `Update`, response | Logica, campi di persistenza |
| **Model** | `src/models` | Tabelle Drizzle e tipo `{Feature}InDB` | Logica, concetti API |
| **Router** | `src/api/v1` | `createRoute` + handler che chiama il suo service | Logica di business, accesso ai dati |
| **Service** | `src/services` | Logica di business, conversione `InDB` → response | SQL/Drizzle, `fetch`, risposte HTTP |
| **Repository** | `src/repositories` | Query di una entità con metodi di dominio | Logica di business, HTTP |
| **db** | `src/db` | Factory del client Drizzle (`getDb`) | Qualsiasi cosa specifica di un'entità |
| **Integration** | `src/integrations` | Connettori a servizi esterni (IDP, pagamenti, email, AI…) | Logica di business, accesso ai dati |
| **Middleware** | `src/middleware` | Concern trasversali: errori, audit, auth, CORS | Logica di business, accesso ai dati |
| **Jobs** | `src/jobs` | Job schedulati (Cron Trigger) | Accesso ai dati, HTTP (chiamano solo service) |
| **Core** | `src/core` | Tipi `Env`, eccezioni, logger | Dipendenze dagli altri layer |

**Regole da non violare mai:**

1. Un router chiama solo il suo service. Importa da `schemas`, `services`, `middleware`, mai da `models`, `repositories`, `db`, `integrations`.
2. **Un service accede ai dati solo tramite i repository.** Non importa `db` né `drizzle-orm`.
3. Ogni query (filtri, ordinamenti, paginazione) sta in un metodo di dominio del repository (`findBySubject`, `findByTimeRange`), mai nel service.
4. Drizzle (`drizzle-orm`) si usa solo in `db`, `models` e `repositories`.
5. Le chiamate HTTP esterne (`fetch`) stanno solo in `src/integrations`; i service prendono i connettori dalle factory in `integrations/clients.ts`.
6. I service lanciano eccezioni di `src/core/exceptions.ts`, mai risposte HTTP: devono funzionare anche fuori da una richiesta (cron).
7. Models e schemas sono strutture dati pure.
8. Vietato saltare un layer, anche per endpoint "semplici".
9. Ogni rotta dichiara `middleware: [withAuditLog(...)]` come **primo** middleware; le rotte protette aggiungono `withAuth(...)` **subito dopo** (vedi [Middleware](#middleware)).
10. Le rotte si dichiarano solo con `createRoute()` + `.openapi()`; niente `router.get(...)`.

**Queste regole sono verificate da [tests/architecture.test.ts](tests/architecture.test.ts). Esegui `npm test` dopo ogni modifica. Se fallisce, correggi il codice, mai il test.**

## Struttura del progetto

```
src/
├── index.ts                     # Entry point: logger, CORS, onError, route, OpenAPI, Swagger, cron
├── api/
│   └── v1/
│       ├── index.ts             # registerRoutes(): monta ogni router
│       ├── openapi.ts           # createRouter(), errorResponses(), bearerSecurity
│       ├── health.router.ts     # GET /health/live, GET /health/ready
│       ├── auth.router.ts       # POST /auth/register, GET /auth/me
│       ├── user.router.ts       # PATCH /users/{id}
│       └── audit-log.router.ts  # GET /audit-logs
├── core/
│   ├── types.ts                 # Env (binding e vars), AppVariables, AppEnv
│   ├── exceptions.ts            # AppError e sottoclassi (400, 401, 403, 404, 409, 502, 503)
│   └── logger.ts                # logger JSON strutturato, livello da LOG_LEVEL
├── middleware/
│   ├── index.ts
│   ├── error-handler.ts         # handleError (app.onError), validationHook (422)
│   ├── audit-log.middleware.ts  # withAuditLog
│   ├── auth.middleware.ts       # withAuth, getBearerToken
│   └── cors.middleware.ts       # withCors
├── db/
│   └── database.ts              # getDb(d1): client Drizzle
├── integrations/
│   ├── clients.ts               # Factory dei connettori
│   └── auth/
│       ├── base-token-verifier.ts   # Interfaccia TokenVerifier
│       └── jwks-token-verifier.ts   # Verifica JWT via JWKS (Firebase, Auth0, Keycloak…)
├── jobs/
│   ├── index.ts                 # scheduled(): cron → job
│   └── audit-log-retention.job.ts
├── models/                      # Tabelle Drizzle (fonte delle migrazioni)
│   ├── index.ts
│   ├── audit-log.model.ts
│   └── user.model.ts
├── repositories/
│   ├── audit-log.repository.ts
│   ├── health.repository.ts
│   └── user.repository.ts
├── schemas/                     # Contratto API (Zod)
│   ├── audit-log.schema.ts
│   ├── error.schema.ts
│   ├── health.schema.ts
│   ├── helpers.ts               # boolIntIn/Out per i booleani D1
│   └── user.schema.ts
└── services/
    ├── audit-log.service.ts
    ├── auth.service.ts
    ├── health.service.ts
    └── user.service.ts
tests/
├── architecture.test.ts         # Layer, middleware, test per ogni rotta
├── apply-migrations.ts          # Applica le migrazioni al D1 locale dei test
├── api/
│   ├── helpers.ts               # call(), auth(), uniqueId(), jsonBody()
│   ├── app.test.ts              # 404, OpenAPI, CORS
│   └── v1/*.router.test.ts      # Un file per router
├── jobs/                        # Test dei job cron
├── integrations/                # Test dei connettori (fetch finto)
└── schemas/
migrations/                      # SQL generato da Drizzle Kit
```

---

## Models e migrazioni

Un model è la tabella Drizzle più il tipo della riga:

```typescript
// src/models/product.model.ts
import { index, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const products = sqliteTable(
  'products',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    category: text('category').notNull(),
    price: real('price').notNull(),
    tags: text('tags').notNull().default('[]'),  // JSON: D1 non ha array
    created_at: text('created_at').notNull(),    // ISO 8601 UTC
    updated_at: text('updated_at'),
  },
  (table) => [index('products_category_idx').on(table.category)],
);

export type ProductInDB = typeof products.$inferSelect;
```

- Esportalo da `src/models/index.ts`, poi `npm run db:generate` crea `migrations/NNNN_*.sql`. Non scrivere SQL a mano.
- Date come testo ISO 8601 UTC (`new Date().toISOString()`): si ordinano e confrontano come stringhe.
- Array/oggetti come JSON in una colonna `text`; booleani come `integer` 0/1 (vedi [Booleani](#booleani-con-d1)).
- **Indici**: aggiungine uno per ogni filtro/ordinamento usato da un metodo di dominio su una tabella che cresce.
- Una colonna `NOT NULL` aggiunta a una tabella esistente deve avere un `.default(...)`.

## Repository

Un repository per entità. Riceve il `D1Database`, crea il client con `getDb()` e espone **metodi di dominio** con nomi che dicono cosa significano (`findByCategory`, `existsByName`), mai query generiche.

```typescript
// src/repositories/product.repository.ts
import { desc, eq } from 'drizzle-orm';
import { Database, getDb } from '../db/database';
import { ProductInDB, products } from '../models/product.model';

export class ProductRepository {
  private db: Database;

  constructor(d1: D1Database) {
    this.db = getDb(d1);
  }

  async findById(id: string): Promise<ProductInDB | null> {
    return (await this.db.select().from(products).where(eq(products.id, id)).get()) ?? null;
  }

  /** Products in a category (all if undefined), newest first. */
  async findByCategory(category: string | undefined, limit = 100, skip = 0): Promise<ProductInDB[]> {
    return await this.db
      .select()
      .from(products)
      .where(category ? eq(products.category, category) : undefined)
      .orderBy(desc(products.created_at))
      .limit(limit)
      .offset(skip)
      .all();
  }

  async existsByName(name: string): Promise<boolean> {
    return (await this.db.select({ id: products.id }).from(products).where(eq(products.name, name)).get()) !== undefined;
  }

  async create(product: ProductInDB): Promise<ProductInDB> {
    await this.db.insert(products).values(product).run();
    return product;
  }

  /** Returns false if the product does not exist. */
  async update(id: string, fields: Partial<Omit<ProductInDB, 'id'>>): Promise<boolean> {
    return (await this.db.update(products).set(fields).where(eq(products.id, id)).run()).meta.changes > 0;
  }

  /** Returns false if the product does not exist. */
  async delete(id: string): Promise<boolean> {
    return (await this.db.delete(products).where(eq(products.id, id)).run()).meta.changes > 0;
  }
}
```

Su Workers il binding D1 arriva con ogni richiesta (`c.env.DB`): i repository si istanziano per chiamata (`new ProductRepository(db)`), non come singleton globali. Un feature senza tabella ha comunque un repository per ciò che legge (vedi [health.repository.ts](src/repositories/health.repository.ts), che fa solo `SELECT 1`).

## Integrations

I connettori a servizi esterni stanno in `src/integrations`, una cartella per capability (`auth/`, `payments/`, `geocoding/`…):

1. `src/integrations/{capability}/base-{capability}.client.ts`: interfaccia, oggetti semplici in/out (niente tipi dell'SDK).
2. `src/integrations/{capability}/{provider}.client.ts`: implementazione con `fetch` (timeout con `AbortSignal.timeout`) o con un binding Cloudflare (`env.AI`, `env.BUCKET`…). Ogni errore del fornitore diventa `ExternalServiceError` (502).
3. Una factory in [clients.ts](src/integrations/clients.ts) che riceve `env`: l'unico punto che sa quale fornitore è attivo.
4. Configurazione in `Env` (`src/core/types.ts`): URL come `[vars]`, API key come secret (`wrangler secret put`, `.dev.vars` in locale).

```typescript
// src/integrations/geocoding/nominatim.client.ts
export class NominatimClient implements GeocodingClient {
  constructor(private baseUrl: string) {}

  async geocode(address: string): Promise<{ lat: number; lon: number } | null> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/search?format=json&limit=1&q=${encodeURIComponent(address)}`, {
        signal: AbortSignal.timeout(5000),
      });
    } catch (e) {
      throw new ExternalServiceError(`Geocoding failed: ${(e as Error).name}`);
    }
    if (!res.ok) throw new ExternalServiceError(`Geocoding returned HTTP ${res.status}`);
    const [first] = (await res.json()) as { lat: string; lon: string }[];
    return first ? { lat: Number(first.lat), lon: Number(first.lon) } : null;
  }
}

// src/integrations/clients.ts
export const getGeocodingClient = (env: Env): GeocodingClient => new NominatimClient(env.GEOCODING_BASE_URL);

// src/services/store.service.ts — i service usano solo la factory
const location = await getGeocodingClient(env).geocode(input.address);
```

L'esempio completo già presente è la verifica dei token: [jwks-token-verifier.ts](src/integrations/auth/jwks-token-verifier.ts) dietro `getTokenVerifier(env)`. Per cambiare IDP basta un'altra implementazione di `TokenVerifier`.

## Middleware

Ogni rotta dichiara i suoi middleware in `createRoute`, in quest'ordine (controllato dal test di architettura):

```typescript
const getProductRoute = createRoute({
  // ...
  security: bearerSecurity,                                                    // solo se protetta
  middleware: [
    withAuditLog('getProduct', { metadata: { service: 'products' } }),         // obbligatorio, primo
    withAuth('admin'),                                                         // opzionale, subito dopo
  ],
  // ...
});
```

### Errori (`handleError`, `validationHook`)

Il gestore globale (`app.onError`) converte le eccezioni in risposte con body `{ "error": "<Classe>", "message": "..." }`. I service lanciano eccezioni di [exceptions.ts](src/core/exceptions.ts):

| Eccezione | Status |
|-----------|--------|
| `UnauthorizedError` | 401 (con `WWW-Authenticate: Bearer`) |
| `ForbiddenError` | 403 |
| `NotFoundError` | 404 |
| `ConflictError` | 409 |
| `InvalidInputError` | 400 |
| `ExternalServiceError` | 502 |
| `ServiceUnavailableError` | 503 |
| Altro `AppError` | 400 |
| `HTTPException` di Hono | passa invariata |
| Errore inatteso | 500 con messaggio generico; dettagli e stack solo nei log |
| Validazione della richiesta (Zod) | 422 `ValidationError` |

Per aggiungere un tipo di errore: sottoclasse di `AppError` con `override name = '...'` e una riga in `STATUS_CODES` di [error-handler.ts](src/middleware/error-handler.ts). Nei router crea sempre i router con `createRouter()` ([openapi.ts](src/api/v1/openapi.ts)) e documenta gli errori con `...errorResponses(401, 403, 404)`.

### `withAuditLog(action, { metadata?, enabled? })`

Registra ogni chiamata in `audit_logs`: `action`, `endpoint`, `method`, `status` (HTTP), `duration_ms`, `timestamp` (UTC), `user_id` (con `withAuth`), `metadata` (quello passato, più `error` in caso di errore). Essendo il primo middleware registra anche i 401/403 di `withAuth`, con l'utente per i 403.

La scrittura avviene dopo la risposta (`executionCtx.waitUntil`): non aggiunge latenza e un errore di scrittura viene loggato senza toccare la risposta. `enabled: false` non registra nulla: solo per chiamate tecniche molto frequenti come le health probe.

### `withAuth(...roles)`

```typescript
middleware: [withAuditLog('getMe'), withAuth()],                  // qualsiasi utente registrato
middleware: [withAuditLog('updateUser'), withAuth('admin')],      // almeno uno dei ruoli
```

- Legge `Authorization: Bearer <token>` e lo risolve con `authService.authenticate()`: token assente/non valido o utente non registrato → 401, nessuno dei ruoli → 403.
- L'utente è in `c.get('currentUser')`; passalo al service come argomento normale.
- Aggiungi `security: bearerSecurity` alla rotta per il lucchetto e il bottone **Authorize** in Swagger.

### CORS

`CORS_ORIGINS` è una lista separata da virgole: vuota = nessuna origine browser ammessa, `*` = qualsiasi origine. Le credenziali (cookie) non sono mai abilitate: l'auth passa dall'header `Authorization`.

## Autenticazione

- `POST /auth/register`: verifica il token dell'IDP ([integrazione JWKS](src/integrations/auth/jwks-token-verifier.ts), configurata da `AUTH_JWKS_URL`, `AUTH_ISSUER`, `AUTH_AUDIENCE`) e crea l'utente con ruolo `user`.
- Le rotte protette risolvono il token nell'utente registrato (con i ruoli salvati nel DB).

### Token mock (test locali)

Con `AUTH_MOCK_ENABLED=true` l'API accetta anche token finti, per provare le rotte protette senza un IDP:

| Token | Utente | Ruoli |
|-------|--------|-------|
| `mock:alice` | `alice` | nessuno |
| `mock:alice:admin` | `alice` | `admin` |
| `mock:bob:admin,editor` | `bob` | `admin`, `editor` |

Un token mock restituisce un utente sintetico con quei ruoli, senza leggere il DB; su `/auth/register` crea un utente con subject `<id>` ed email `<id>@mock.local`. Si abilita solo in `.dev.vars` (e nei test): **mai** in `wrangler.toml` né in produzione. Ogni uso scrive un warning nei log.

```bash
curl -H "Authorization: Bearer mock:bob:admin" \
  "http://localhost:3000/api/v1/audit-logs?start_date=2026-01-01&end_date=2026-12-31"
```

## Logging

```typescript
import { logger } from '../core/logger';

logger.info('Order created', { order_id: id });
```

Log JSON su una riga, livello minimo da `LOG_LEVEL` (`debug`, `info`, `warn`, `error`), raccolti da Workers Logs (`[observability]` in `wrangler.toml`). Non usare `console.log` direttamente e non loggare mai segreti (token, API key, password).

## Job schedulati

I lavori periodici girano con i **Cron Trigger** di Cloudflare: la stringa cron in `wrangler.toml` (`[triggers] crons`) deve corrispondere a una chiave di `JOBS` in [src/jobs/index.ts](src/jobs/index.ts).

```typescript
// src/jobs/report.job.ts — i job chiamano solo service
export async function weeklyReportJob(env: Env): Promise<void> {
  await reportService.sendWeekly(env.DB);
}

// src/jobs/index.ts
const JOBS: Record<string, Job[]> = {
  '0 3 * * *': [auditLogRetentionJob],
  '0 8 * * 1': [weeklyReportJob],
};
```

Un job che fallisce viene loggato e non blocca gli altri. In locale: `npx wrangler dev --test-scheduled`, poi `curl "http://localhost:3000/__scheduled?cron=0+3+*+*+*"`.

Il boilerplate include la **retention degli audit log**: ogni notte cancella quelli più vecchi di `AUDIT_LOG_RETENTION_DAYS` (default 90, `0` = conserva tutto). D1 non ha TTL: per altre tabelle che crescono aggiungi un job analogo.

> Per lavori lunghi avviati da una richiesta (import, elaborazioni, chiamate lente) Cron non basta: la strada su Workers è Cloudflare Workflows o Queues, non ancora inclusi nel boilerplate.

---

## Test

```bash
npm test               # tutti
npm run test:watch
```

Due progetti Vitest ([vitest.config.mts](vitest.config.mts)):

- **unit** (Node): test di architettura, schemas, integrations con `fetch` finto (`vi.stubGlobal`).
- **workers** (runtime Workers): test degli endpoint e dei job su un **D1 locale reale** con tutte le migrazioni applicate, token mock abilitati. Nessuna rete e nessun DB remoto.

Helper in [tests/api/helpers.ts](tests/api/helpers.ts):

| Helper | Uso |
|--------|-----|
| `call(path, init?, envOverrides?)` | Chiama il Worker in-process e attende i `waitUntil` (audit) |
| `auth(userId, ...roles)` | Header con token mock: `auth('alice', 'admin')` |
| `uniqueId()` | Id mai usato da altri test (il DB è condiviso tra i test di un file) |
| `jsonBody(body, headers?)` | `body` + `Content-Type` per POST/PATCH |

### Regole dei test degli endpoint

1. **Un file per router**, stesso percorso: `src/api/v1/product.router.ts` → `tests/api/v1/product.router.test.ts`.
2. **Test via HTTP** con `call()`, mai chiamando i service direttamente. I repository si usano solo per preparare dati che l'API non può creare (es. log vecchi di 100 giorni).
3. **Niente rete né DB remoto**: per un connettore esterno sostituisci la factory (`vi.mock('../../src/integrations/clients', ...)`) o intercetta `fetch`.
4. **Ogni rotta copre**, quando applicabile: successo (status e campi rilevanti), input non valido (422), rotte protette (401 senza token, 403 senza ruolo), errori di business (404, 409, 400…).
5. **Nomi**: `it('<nomeRotta> <scenario>')`, dove `<nomeRotta>` è il nome della costante senza `Route` (`getProductRoute` → `it('getProduct returns the product')`).
6. **Test indipendenti**: ogni test prepara i suoi dati con id univoci; nessun ordine, nessuno stato condiviso.

Il test di architettura fallisce se un router non ha il file di test o una rotta non ha nessun `it('<nomeRotta> ...')`.

---

## Convenzioni di naming

| Tipo | File | Export |
|------|------|--------|
| Model | `src/models/{feature}.model.ts` | tabella `products`, tipo `ProductInDB` |
| Schema | `src/schemas/{feature}.schema.ts` | `ProductSchema`, `ProductCreateSchema`, `ProductUpdateSchema` + tipi |
| Repository | `src/repositories/{feature}.repository.ts` | `ProductRepository` |
| Service | `src/services/{feature}.service.ts` | funzioni (`import * as productService`) |
| Router | `src/api/v1/{feature}.router.ts` | `productRouter`, rotte `{nome}Route` |
| Integration | `src/integrations/{capability}/{provider}.client.ts` | `{Provider}Client` |
| Job | `src/jobs/{nome}.job.ts` | `{nome}Job` |
| Tabella / colonne | snake_case plurale | `products`, `created_at` |
| Prefisso URL | kebab-case plurale | `/api/v1/products`, `/api/v1/audit-logs` |

File in kebab-case, variabili e funzioni in camelCase, tipi in PascalCase, costanti in UPPER_SNAKE_CASE. Solo named export (tranne l'entry point `src/index.ts`).

---

## Aggiungere una feature

Esempio: `Product`. **Tutti i passi sono obbligatori.**

### 1. Model — `src/models/product.model.ts`

Vedi [Models e migrazioni](#models-e-migrazioni). Esportalo da `src/models/index.ts`, poi:

```bash
npm run db:generate
npm run db:migrate:local
```

### 2. Schemas — `src/schemas/product.schema.ts`

```typescript
import { z } from '@hono/zod-openapi';

export const ProductSchema = z.object({
  id: z.string().openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
  name: z.string().openapi({ example: 'Pen' }),
  category: z.string().openapi({ example: 'office' }),
  price: z.number().openapi({ example: 2.5 }),
  tags: z.array(z.string()).openapi({ example: ['blue'] }),
  created_at: z.string().openapi({ example: '2024-01-01T12:00:00.000Z' }),
  updated_at: z.string().nullable().openapi({ example: null }),
});
export type Product = z.infer<typeof ProductSchema>;

export const ProductCreateSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  price: z.number().positive(),
  tags: z.array(z.string()).default([]),
});
export type ProductCreateInput = z.infer<typeof ProductCreateSchema>;

export const ProductUpdateSchema = ProductCreateSchema.partial();
export type ProductUpdateInput = z.infer<typeof ProductUpdateSchema>;

export const ProductListQuerySchema = z.object({
  category: z.string().optional().openapi({ description: 'Filter by category' }),
  limit: z.coerce.number().int().min(1).max(1000).default(100).openapi({ description: 'Max results' }),
  skip: z.coerce.number().int().min(0).default(0).openapi({ description: 'Results to skip' }),
});
```

- Gli schemas non importano mai da `models`; i router non espongono mai righe `InDB`.

### 3. Repository — `src/repositories/product.repository.ts`

Vedi [Repository](#repository).

### 4. Service — `src/services/product.service.ts`

```typescript
import { InvalidInputError, NotFoundError } from '../core/exceptions';
import { ProductInDB } from '../models/product.model';
import { ProductRepository } from '../repositories/product.repository';
import { Product, ProductCreateInput, ProductUpdateInput } from '../schemas/product.schema';

/** @throws InvalidInputError a product with the same name exists */
export async function create(db: D1Database, input: ProductCreateInput): Promise<Product> {
  const repository = new ProductRepository(db);
  if (await repository.existsByName(input.name)) {
    throw new InvalidInputError(`Product '${input.name}' already exists`);
  }
  const product = await repository.create({
    id: crypto.randomUUID(),
    ...input,
    tags: JSON.stringify(input.tags),
    created_at: new Date().toISOString(),
    updated_at: null,
  });
  return toResponse(product);
}

/** @throws NotFoundError */
export async function getById(db: D1Database, id: string): Promise<Product> {
  const product = await new ProductRepository(db).findById(id);
  if (!product) throw new NotFoundError('Product not found');
  return toResponse(product);
}

export async function list(db: D1Database, category: string | undefined, limit: number, skip: number): Promise<Product[]> {
  return (await new ProductRepository(db).findByCategory(category, limit, skip)).map(toResponse);
}

/** @throws NotFoundError */
export async function update(db: D1Database, id: string, input: ProductUpdateInput): Promise<Product> {
  const { tags, ...rest } = input;
  const fields = { ...rest, ...(tags && { tags: JSON.stringify(tags) }), updated_at: new Date().toISOString() };
  if (!(await new ProductRepository(db).update(id, fields))) throw new NotFoundError('Product not found');
  return await getById(db, id);
}

/** @throws NotFoundError */
export async function remove(db: D1Database, id: string): Promise<void> {
  if (!(await new ProductRepository(db).delete(id))) throw new NotFoundError('Product not found');
}

function toResponse(product: ProductInDB): Product {
  return { ...product, tags: JSON.parse(product.tags) };
}
```

- Funzioni esportate, tutte async, primo argomento `db: D1Database` (o `env: Env` se servono connettori).
- Restituisce tipi degli schemas; converte con una `toResponse()` privata.
- Le regole di business (unicità, range, permessi) stanno qui; le query nel repository.

### 5. Router — `src/api/v1/product.router.ts`

```typescript
import { createRoute, z } from '@hono/zod-openapi';
import { withAuditLog, withAuth } from '../../middleware';
import { ProductCreateSchema, ProductListQuerySchema, ProductSchema, ProductUpdateSchema } from '../../schemas/product.schema';
import * as productService from '../../services/product.service';
import { bearerSecurity, createRouter, errorResponses } from './openapi';

const productRouter = createRouter();
const audit = (action: string) => withAuditLog(action, { metadata: { service: 'products' } });
const IdParam = z.object({ id: z.string().min(1) });

const createProductRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Products'],
  description: 'Create a product. Requires role admin',
  security: bearerSecurity,
  middleware: [audit('createProduct'), withAuth('admin')],
  request: { body: { content: { 'application/json': { schema: ProductCreateSchema } } } },
  responses: {
    201: { content: { 'application/json': { schema: ProductSchema } }, description: 'Created product' },
    ...errorResponses(400, 401, 403, 422),
  },
});

productRouter.openapi(createProductRoute, async (c) => {
  return c.json(await productService.create(c.env.DB, c.req.valid('json')), 201);
});

const getProductRoute = createRoute({
  method: 'get',
  path: '/{id}',
  tags: ['Products'],
  description: 'Fetch a product by id',
  middleware: [audit('getProduct')],
  request: { params: IdParam },
  responses: {
    200: { content: { 'application/json': { schema: ProductSchema } }, description: 'Product' },
    ...errorResponses(404, 422),
  },
});

productRouter.openapi(getProductRoute, async (c) => {
  return c.json(await productService.getById(c.env.DB, c.req.valid('param').id), 200);
});

const getProductsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Products'],
  description: 'Products, optionally filtered by category, newest first',
  middleware: [audit('getProducts')],
  request: { query: ProductListQuerySchema },
  responses: {
    200: { content: { 'application/json': { schema: z.array(ProductSchema) } }, description: 'Products' },
    ...errorResponses(422),
  },
});

productRouter.openapi(getProductsRoute, async (c) => {
  const { category, limit, skip } = c.req.valid('query');
  return c.json(await productService.list(c.env.DB, category, limit, skip), 200);
});

const updateProductRoute = createRoute({
  method: 'patch',
  path: '/{id}',
  tags: ['Products'],
  description: 'Update the fields sent. Requires role admin',
  security: bearerSecurity,
  middleware: [audit('updateProduct'), withAuth('admin')],
  request: { params: IdParam, body: { content: { 'application/json': { schema: ProductUpdateSchema } } } },
  responses: {
    200: { content: { 'application/json': { schema: ProductSchema } }, description: 'Updated product' },
    ...errorResponses(401, 403, 404, 422),
  },
});

productRouter.openapi(updateProductRoute, async (c) => {
  return c.json(await productService.update(c.env.DB, c.req.valid('param').id, c.req.valid('json')), 200);
});

const deleteProductRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  tags: ['Products'],
  description: 'Delete a product. Requires role admin',
  security: bearerSecurity,
  middleware: [audit('deleteProduct'), withAuth('admin')],
  request: { params: IdParam },
  responses: {
    204: { description: 'Deleted' },
    ...errorResponses(401, 403, 404),
  },
});

productRouter.openapi(deleteProductRoute, async (c) => {
  await productService.remove(c.env.DB, c.req.valid('param').id);
  return c.body(null, 204);
});

export { productRouter };
```

- Sempre `createRouter()`, `tags`, `description`, schema di ogni risposta ed `errorResponses(...)` per gli errori possibili.
- Query string con `.openapi({ description })`; le liste paginate accettano `limit` e `skip`.
- Nessun try/catch e nessuna logica nell'handler: chiama il service e restituisce `c.json(...)`.

### 6. Registrazione — `src/api/v1/index.ts`

```typescript
app.route('/api/v1/products', productRouter);
```

### 7. Test — `tests/api/v1/product.router.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import { auth, call, jsonBody, uniqueId } from '../helpers';

const URL = '/api/v1/products';
const ADMIN = auth('admin-user', 'admin');
const pen = () => ({ name: uniqueId('pen'), category: 'office', price: 2.5 });

async function createProduct(overrides = {}) {
  const response = await call(URL, { method: 'POST', ...jsonBody({ ...pen(), ...overrides }, ADMIN) });
  expect(response.status).toBe(201);
  return await response.json<{ id: string; name: string }>();
}

describe('product router', () => {
  it('createProduct returns the created product', async () => {
    const response = await call(URL, { method: 'POST', ...jsonBody(pen(), ADMIN) });

    expect(response.status).toBe(201);
    expect((await response.json<{ category: string }>()).category).toBe('office');
  });

  it('createProduct with a duplicate name is rejected', async () => {
    const product = await createProduct();

    const response = await call(URL, { method: 'POST', ...jsonBody({ ...pen(), name: product.name }, ADMIN) });

    expect(response.status).toBe(400);
  });

  it('createProduct rejects an invalid price', async () => {
    const response = await call(URL, { method: 'POST', ...jsonBody({ ...pen(), price: -1 }, ADMIN) });

    expect(response.status).toBe(422);
  });

  it('createProduct requires the admin role', async () => {
    const response = await call(URL, { method: 'POST', ...jsonBody(pen(), auth(uniqueId())) });

    expect(response.status).toBe(403);
  });

  it('getProduct unknown id is not found', async () => {
    expect((await call(`${URL}/missing`)).status).toBe(404);
  });

  // ...getProducts, updateProduct, deleteProduct: successo, 401, 403, 404, 422
});
```

---

## Configurazione

Variabili e binding sono tipizzati in `Env` ([src/core/types.ts](src/core/types.ts)):

| Variabile | Dove | Descrizione |
|-----------|------|-------------|
| `DB` | `[[d1_databases]]` | Binding D1 |
| `LOG_LEVEL` | `[vars]` | `debug`, `info`, `warn`, `error` |
| `API_VERSION`, `API_TITLE` | `[vars]` | Info della spec OpenAPI |
| `SWAGGER_ENABLED` | `[vars]` | `true` espone `/docs` |
| `CORS_ORIGINS` | `[vars]` | Origini separate da virgola, `*` per tutte, vuoto per nessuna |
| `AUTH_JWKS_URL`, `AUTH_ISSUER`, `AUTH_AUDIENCE` | `[vars]` | Verifica dei token dell'IDP |
| `AUDIT_LOG_RETENTION_DAYS` | `[vars]` | Giorni di conservazione degli audit log (`0` = sempre) |
| `AUTH_MOCK_ENABLED` | solo `.dev.vars` | `true` abilita i token mock |
| Segreti (API key…) | `.dev.vars` / `wrangler secret put` | Mai in `wrangler.toml` |

Ogni nuova variabile va aggiunta a `Env` e, se è un segreto, a [.dev.vars.example](.dev.vars.example).

### Booleani con D1

D1/SQLite non ha booleani: si salvano come `integer` 0/1. Gli helper in [src/schemas/helpers.ts](src/schemas/helpers.ts) convertono in automatico:

- `boolIntOut` negli schemi di **response**: `0`/`1` → `false`/`true`;
- `boolIntIn` negli schemi di **input**: `true`/`false` → `1`/`0`;
- `boolIntInOptional` come `boolIntIn`, ma opzionale (update).

La conversione avviene quando il service fa `Schema.parse(riga)`.

## Health probe

`GET /api/v1/health/live` risponde 200 finché il Worker gira. `GET /api/v1/health/ready` risponde 503 se D1 non è raggiungibile: da usare per i monitor di uptime. Nessuna delle due entra nell'audit log.

## Stile del codice

- Import: pacchetti esterni, poi moduli locali.
- Tipi completi, compresi i tipi di ritorno delle funzioni pubbliche.
- JSDoc brevi sulle funzioni pubbliche, con `@throws` per le eccezioni di dominio.
- Tutto l'I/O è `async`/`await`.
- Date sempre UTC in ISO 8601 (`new Date().toISOString()`).

## Checklist nuova feature

- [ ] `src/models/{feature}.model.ts`: tabella + `{Feature}InDB`, indici; export in `models/index.ts`; `npm run db:generate`
- [ ] `src/schemas/{feature}.schema.ts`: response, `Create`, `Update` (se serve), query
- [ ] `src/repositories/{feature}.repository.ts`: metodi di dominio, nessuna logica
- [ ] `src/services/{feature}.service.ts`: solo repository/integrations, lancia sottoclassi di `AppError`
- [ ] `src/api/v1/{feature}.router.ts`: `createRouter()`, `middleware: [withAuditLog(...), withAuth(...)?]`, `errorResponses(...)`
- [ ] Router registrato in `src/api/v1/index.ts`
- [ ] `tests/api/v1/{feature}.router.test.ts`: ogni rotta testata (successo, 422, 401/403, errori di business)
- [ ] `npm test` e `npm run typecheck` passano

## Endpoint esistenti

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/api/v1/health/live` | Liveness: 200 finché il Worker gira |
| GET | `/api/v1/health/ready` | Readiness: 200 se D1 risponde, 503 altrimenti |
| POST | `/api/v1/auth/register` | Registra l'utente del token IDP (ruolo `user`) |
| GET | `/api/v1/auth/me` | Utente autenticato |
| PATCH | `/api/v1/users/{id}` | Aggiorna un utente. Ruolo `admin` |
| GET | `/api/v1/audit-logs` | Audit log in un intervallo di date, dal più recente. Ruolo `admin` |

`/audit-logs` accetta: `start_date`, `end_date` (`YYYY-MM-DD`, inclusi, UTC), `limit` (1-1000, default 100), `skip` (default 0).
