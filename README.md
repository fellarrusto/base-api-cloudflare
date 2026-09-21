# Sybilla Base API — Cloudflare Workers

API REST su Cloudflare Workers con architettura a layer rigida, validazione OpenAPI e database D1. Porting TypeScript di [BaseApi](https://github.com/fellarrusto/BaseApi) (FastAPI).

## Setup Nuovo Progetto

### 1. Prerequisiti

```bash
npm install -g wrangler
wrangler login
```

### 2. Configura wrangler.toml

Aggiorna `name`, `database_name` e le variabili in `[vars]`:

```toml
name = "my-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
LOG_LEVEL = "info"
API_VERSION = "1.0.0"
API_TITLE = "My API"
SWAGGER_ENABLED = "true"
CORS_ORIGINS = "https://myapp.com"
AUDIT_LOG_RETENTION_DAYS = "90"
AUTH_JWKS_URL = "..."
AUTH_ISSUER = "..."
AUTH_AUDIENCE = "..."

[[d1_databases]]
binding = "DB"
database_name = "my-db"
database_id = ""        # lascia vuoto, lo ottieni al passo successivo

[triggers]
crons = ["0 3 * * *"]      # retention degli audit log

[observability]
enabled = true

[dev]
port = 3000
```

### 3. Crea il Database D1

```bash
wrangler d1 create my-db
```

Copia il `database_id` restituito e incollalo in `wrangler.toml`.

### 4. Esegui le Migrazioni

```bash
# Locale
wrangler d1 migrations apply my-db --local

# Production
wrangler d1 migrations apply my-db
```

### 5. Configura i Secret

I secret **non** vanno in `wrangler.toml` (è pubblico su git). Usa `.dev.vars` per locale e `wrangler secret put` per production.

**Locale** — copia [.dev.vars.example](.dev.vars.example) in `.dev.vars` (già in `.gitignore`):
```bash
cp .dev.vars.example .dev.vars
```
`AUTH_MOCK_ENABLED=true` abilita i token `mock:<utente>:<ruoli>` per provare le rotte protette senza IDP: solo in locale.

**Production**:
```bash
wrangler secret put MY_SECRET
# ti chiede il valore interattivamente
```

Dichiarali nel tipo `Env` di `src/core/types.ts`:
```typescript
export type Env = {
  MY_SECRET: string;
  // ...
};
```

### 6. Sviluppo Locale

```bash
npm install
npm run dev
# API disponibile su http://localhost:3000
# Swagger UI su http://localhost:3000/docs

npm test            # test di architettura + endpoint su D1 locale
npm run typecheck
```

### 7. Deploy

Il deploy del Worker viene eseguito dalla Cloudflare UI. Assicurati che:
- Le migrazioni production siano applicate (`wrangler d1 migrations apply my-db`)
- I secret production siano impostati (`wrangler secret put ...`)

---

## Funzionalità

- **Architettura a layer** Router → Service → Repository → D1, con Schemas (contratto API) separati dai Models (tabelle Drizzle)
- **Repository per entità** su Drizzle ORM, migrazioni generate con Drizzle Kit
- **Integrations** per i servizi esterni: connettori dietro interfacce e factory (incluso il verificatore JWT via JWKS)
- **Middleware per rotta**: audit log non bloccante, autenticazione con ruoli (e token mock per i test), errori di dominio con risposte uniformi
- **Job schedulati** con Cron Trigger (retention degli audit log)
- **Health probe** `/health/live` e `/health/ready`
- **Test** degli endpoint nel runtime Workers su D1 locale, più test di architettura che fanno rispettare i confini tra layer

## Documentazione

Architettura, regole, convenzioni e la guida passo passo per aggiungere una feature sono in [AGENTS.md](AGENTS.md), che fa anche da istruzioni per gli agenti AI (Claude Code lo legge tramite [CLAUDE.md](CLAUDE.md)).
