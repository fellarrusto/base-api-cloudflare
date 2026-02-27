# Sybilla Base API — Cloudflare Workers

API REST con Hono, Cloudflare D1 e OpenAPI.

## Stack

| Tecnologia | Scopo |
|------------|-------|
| Hono | Framework web |
| Zod OpenAPI | Validazione e docs |
| Cloudflare D1 | Database SQL (SQLite) |
| Wrangler | CLI dev/deploy |

## Struttura

```
src/
├── api/                  # Router (endpoints)
│   ├── index.ts
│   ├── health.router.ts
│   └── log.router.ts
├── core/                 # Config e utilities
│   ├── types.ts
│   └── middleware.ts
├── db/                   # Database layer
│   ├── base.repository.ts
│   ├── d1.repository.ts
│   └── database.ts
├── models/               # Zod schemas
│   ├── health.model.ts
│   └── log.model.ts
├── services/             # Business logic
│   ├── health.service.ts
│   └── log.service.ts
└── index.ts              # Entry point

migrations/               # SQL migrations per D1
```

---

## Setup Locale

### 1. Installa dipendenze

```bash
npm install
```

### 2. Crea il database D1

```bash
npx wrangler d1 create sybilla-db
```

Copia il `database_id` restituito nel `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "sybilla-db"
database_id = "<il-tuo-database-id>"
```

### 3. Applica le migrations

```bash
npx wrangler d1 migrations apply sybilla-db --local
```

### 4. Avvia il server

```bash
npx wrangler dev
```

Servizi disponibili:
- API: `http://localhost:3000/api/v1`
- Swagger UI: `http://localhost:3000/docs`
- OpenAPI spec: `http://localhost:3000/openapi.json`

---

## Deployment

### 1. Applica migrations in produzione

```bash
npx wrangler d1 migrations apply sybilla-db --remote
```

### 2. Deploy

```bash
npx wrangler deploy
```

---

## API Endpoints

| Method | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/api/v1/health/check` | Health check |
| GET | `/api/v1/logs/audit` | Audit logs |

---

## Migrations

Per aggiungere o modificare tabelle:

```bash
# Crea una nuova migration
npx wrangler d1 migrations create sybilla-db nome_migration

# Scrivi l'SQL nel file generato in migrations/

# Applica in locale
npx wrangler d1 migrations apply sybilla-db --local

# Applica in produzione
npx wrangler d1 migrations apply sybilla-db --remote
```

---

## Secrets

Per variabili sensibili (API key, token, ecc.):

```bash
npx wrangler secret put NOME_SEGRETO
```

Accessibili nel codice via `c.env.NOME_SEGRETO`.

Le variabili non sensibili vanno in `wrangler.toml` sotto `[vars]`.