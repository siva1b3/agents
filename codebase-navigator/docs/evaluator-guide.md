# Evaluator guide

Use this after an investigation to check answers. These are source anchors,
not a substitute for reading the implementation. Line numbers are intentionally
not hardcoded here: ask the navigator to retrieve current line-numbered excerpts.

## Evidence anchors

| Topic | Expected source evidence |
| --- | --- |
| Validation | schemas/request-schemas.js plus middleware/validate-request.js: validateRequest and middleware/error-handler.js |
| Order request trace | routes/order-routes.js -> controllers/order-controller.js -> services/order-service.js -> repositories/memory-repositories.js |
| Password hashing | security/password-hasher.js: hashPassword, verifyPassword |
| Token authentication | middleware/authenticate-request.js and services/authentication-service.js: authenticateToken |
| Password-change revocation | services/user-service.js: changePassword plus repositories.sessions.deleteByUserId |
| Registration race | services/user-service.js: registerUser checks email after await hashPassword |
| Account serialization | services/user-service.js: serializeUser and authentication-service.js login result |
| Roles and permissions | security/role-permissions.js and middleware/require-permission.js, with actual route wiring |
| Ownership | services/order-service.js: requireAccessibleOrder and listOrders |
| Optimistic concurrency | services/product-service.js: requireCurrentVersion and saveUpdatedProduct |
| Price snapshots and stock validation | services/order-service.js: createOrder |
| Request idempotency | middleware/require-idempotency-key.js and services/order-service.js: createOrder |
| State transitions | services/order-service.js: allowedOrderTransitions and transitionOrder |
| Archived product cancellation | services/order-service.js: transitionOrder calls requireProduct with includeArchived=true |
| Cancellation capacity | services/order-service.js: transitionOrder maps all restored products before saving |
| Logging and correlation | middleware/request-context.js, observability/structured-logger.js, services/audit-service.js |
| Rate limits | app.js limiter configuration, routes/authentication-routes.js, routes/user-routes.js, middleware/rate-limit.js |
| HTTP policies | middleware/http-security.js |
| Health/readiness | app.js health routes and lifecycle gate |
| Shutdown | server.js: shutdown |
| Configuration/seeding | configuration/environment.js and data/seed-demonstration-data.js |
| State isolation and retention | repositories/memory-repositories.js |
| Missing integrations | app.js composition, repositories/memory-repositories.js and docs/architecture.md |

All source paths in the table are relative to `src/`, except `docs/`.

## Scoring an answer

- **Correctness (0–2):** correctly identifies behavior, status codes and important conditions.
- **Evidence (0–2):** cites actual files, symbols and line ranges that support each main claim.
- **Traceability (0–2):** follows route wiring and service behavior where both are needed.
- **Boundaries (0–2):** distinguishes implemented behavior from deployment assumptions or missing features.

A strong answer quotes small relevant excerpts and explains their connection.
Naming a plausible file alone is insufficient. Documentation alone should not
be treated as proof of implemented behavior.

## Useful verification sources

- `test/authentication.test.js`: registration, credential races, session lifecycle.
- `test/catalog-and-permissions.test.js`: permissions, queries, version conflicts, archiving.
- `test/orders.test.js`: ownership, overselling, snapshots, idempotency, cancellation.
- `test/http-infrastructure.test.js`: validation, errors, CORS, limits, redaction, readiness.
- `test/server-lifecycle.test.js`: actual process startup, seeded demo and SIGTERM.

Tests are evidence of intended and checked behavior, not proof that every
possible input or deployment environment is covered.
