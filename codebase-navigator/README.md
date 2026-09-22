# Codebase Navigator — investigation API

A modular Express order-management API prepared as the repository your future
Codebase Navigator Agent will investigate. The agent itself is not implemented here.

This is a production-style **learning fixture**, with real password hashing,
revocable sessions and business rules. It deliberately uses in-memory storage:
all accounts, sessions, products, orders and audit events reset on restart.
No database, frontend, email provider, payment processor or external account is required.

## Run it with Docker

Run these commands from the `codebase-navigator` directory.
Node and npm run inside Docker.

```sh
docker compose up -d --build
docker compose exec node npm ci
docker compose exec node npm run dev
```

Keep the final command running in that terminal. The API listens at
[http://localhost:3000](http://localhost:3000).
The container stays alive when you stop the API with Ctrl+C.

In a second terminal, from the same directory:

```sh
docker compose exec node npm run demo
docker compose exec node npm test
docker compose exec node npm run check
```

The demo logs in, lists products, creates an order, retries it with the same
idempotency key, cancels it, and logs out. It restores the reserved inventory;
the cancelled order and audit history remain available for investigation.
Tests create isolated application instances and do not modify the running API.
A process-level test also launches a separate server on an ephemeral port and
verifies the demo and SIGTERM shutdown.

```sh
docker compose stop
```

### Demonstration accounts

Docker Compose enables sample accounts and three products by default.

| Role | Email | Password |
| --- | --- | --- |
| Administrator | admin@example.test | Admin-demo-password-2026! |
| Customer | customer@example.test | Customer-demo-password-2026! |

These credentials are intentionally public examples. Seeding is disabled by
default outside Compose, and configuration rejects seeding in production mode.
There is no public endpoint for creating administrators or promoting a user.

Optional settings are documented in [.env.example](.env.example). Copy it to
`.env` if you want overrides, then run `docker compose up -d` again.
Setting `SEED_DEMO_DATA=false` starts with an empty store. The demo requires seeds.

## What you can investigate

- Registration, normalized email addresses, salted asynchronous scrypt hashes,
  generic login failures, opaque bearer tokens, session expiry and revocation.
- Customer/admin permissions, ownership checks, protected administration endpoints.
- Profile changes, password changes, concurrent credential updates, account deactivation.
- Strict body/path/query validation, rejected unknown fields and safe serialization.
- Catalog search, category filters, stable sorting, pagination and soft deletion.
- Inventory adjustments with reasons and optimistic version checks.
- Order price snapshots, integer-cent totals, inventory reservation, cancellations,
  status transitions and status history.
- Customer-scoped idempotency keys, replayed responses, payload conflicts and expiry.
- Request IDs, structured logs, bounded audit history and basic request metrics.
- Explicit CORS policy, API security headers, JSON size limits and two rate limits.
- Consistent error envelopes, hidden internal failures, health/readiness and shutdown.
- Application factories, dependency injection and isolated integration tests.

## Read the code by responsibility

```text
src/
  app.js                          Composition root and middleware order
  server.js                       Listening, timeouts and graceful shutdown
  configuration/environment.js    Startup validation and defaults
  routes/                         Endpoint-to-middleware wiring
  controllers/                    HTTP input/output translation
  schemas/                        Zod request contracts
  middleware/                     Shared request policies
  services/                       Business rules and workflows
  security/                       Passwords, tokens and role permissions
  repositories/                   In-memory persistence and defensive copies
  observability/                  JSON log formatting
  data/                           Explicit demonstration seed data
test/                             HTTP workflows, concurrency and process tests
scripts/                          Runnable API demo and syntax checks
docs/                             API contract, architecture and evaluator notes
```

Typical request flow:

```text
request context -> security/CORS -> readiness gate -> global rate limiter
-> JSON parser -> route -> authentication -> authorization -> validation
-> controller -> service -> repository -> response
                              |
                              +-> audit event
errors -------------------------------------------------> error handler
response finish ----------------------------------------> request log / metrics
```

Authentication endpoints also have a tighter rate limiter. Public catalog reads
skip authentication. Health endpoints precede the global rate limiter and
readiness gate; see the actual order in `src/app.js`.

## Explore next

- [API reference and payloads](docs/api-reference.md)
- [Architecture, decisions and limits](docs/architecture.md)
- [Investigation questions](questions.md)
- [Evaluator guide](docs/evaluator-guide.md) — reference anchors for checking agent answers

Start with: **“Find where request validation happens and explain how invalid
requests are rejected. Cite file paths, function names, and line numbers.”**

## Important fixture boundaries

The former unversioned mock API has been replaced by `/api/v1` routes.
A user ID is no longer an authentication token; obtain a token through login.
The old `/health` route is now `/health/live` and `/health/ready`.

State, rate limits and transaction-like behavior are local to one Node process.
The API is suitable for local investigation, not a claim of deployment readiness.
See the architecture document for specific limitations.
