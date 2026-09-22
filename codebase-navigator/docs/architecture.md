# Architecture and design decisions

## Composition and responsibilities

`createApplication` in `src/app.js` creates repositories and services once per
application. It passes their dependencies explicitly into factories.
There is no global mutable data store. Tests can supply a clock and logger
without mocking network requests or depending on the real passage of time.

Routes declare middleware order. Controllers translate HTTP inputs and outputs.
Services implement rules. Repositories own storage and return defensive copies.
Request schemas describe accepted inputs separately from storage entities.
Security modules contain password/token primitives and the role-permission map.

This uses layers rather than a separate directory tree for each feature.
Following one request through route -> controller -> service -> repository gives
the navigator meaningful cross-file evidence.

## Authentication choices

Random 256-bit opaque tokens are simpler here than signed JWTs: server-side
session state makes logout and immediate revocation direct. Only SHA-256 hashes
of the tokens are stored. SHA-256 is used for high-entropy random tokens, not
passwords. Passwords use salted asynchronous scrypt and constant-time digest
comparison. Session expiry is absolute; there is no refresh-token flow.

Login uses a dummy hash for missing accounts and returns the same credentials
error for wrong passwords, unknown accounts and inactive users. This reduces
obvious timing differences; it is not a proof that account existence is hidden.
Registration intentionally reports duplicate emails.

Password work is asynchronous. Registration checks uniqueness after hashing.
Login rereads the account after verifying the password. Password changes
compare the current hash before saving, preventing concurrent requests from
silently overwriting a newer credential. Deactivation rechecks credentials and
revokes sessions. Public registration always creates a customer.

Password hashing follows the Node crypto APIs documented at
[Node.js crypto](https://nodejs.org/api/crypto.html).
Express 5 forwards rejected async route handlers to error middleware:
[Express error handling](https://expressjs.com/en/guide/error-handling.html).

## Inventory and consistency

Money uses integer cents, and schema bounds keep computed order totals within
JavaScript's safe integer range. Order items copy product names and prices.

Order creation first reads and validates every requested product.
Only then does it save inventory changes, the order and the idempotency result.
There are no asynchronous operations inside this critical section.
In a single Node process, another HTTP request cannot interleave there.

Cancellation also computes every restored product before saving anything.
An invalid transition or capacity conflict leaves the entire order unchanged.
Product writes use expected versions to detect stale administrative changes.
Archiving preserves records needed by existing orders.

This is NOT a durable transaction. A process crash loses everything.
Multiple processes would each have independent data. A database implementation
would need transactions, constraints, concurrency control and a unique
customer/key constraint; inserting awaits into these operations changes their
correctness assumptions.

## Middleware and errors

Request context is first so handled failures can carry an ID and produce a
completion log. Security headers and CORS precede routes. Health endpoints are
registered before admission gates. Other requests pass readiness checks, global
rate limiting and JSON parsing before feature routes.

Body, query and path validation use the same middleware and error envelope.
Validated input is stored in `request.validated` rather than replacing the
Express 5 query getter. Strict schemas prevent accidental mass assignment.

Expected business failures use ApplicationError with a stable code and status.
The final error handler translates parser errors and hides unexpected exception
details. Controllers return safe user representations; repositories retain hashes.

## Observability and retention

Request logs contain a generated request ID, method, route template, status
and duration. They omit bodies, authorization headers and query strings.
Audit events contain selected business fields, actor/resource IDs and request ID.
Audit history retains the newest 1,000 events by default. It is neither durable
nor tamper-evident. Metrics count completed requests and 5xx responses locally.

The injectable clock supports deterministic expiry/rate-limit tests.
It does not replace the timestamp source in the standalone JSON logger.

## Health and shutdown

Liveness means this HTTP process can answer. Readiness means initialization
completed and shutdown has not started; there is no external dependency to probe.
SIGINT/SIGTERM mark the application unready, stop accepting connections and
wait for active requests. After ten seconds, remaining connections are closed
and the process exits unsuccessfully. Request/header timeouts also bound waits.

## Explicit limits

- No persistence, database isolation, distributed rate limiting or multiple workers.
- Repositories use linear scans for several queries; acceptable for a small fixture.
- Users, products, orders and active sessions have no durable retention strategy.
  Audit history, rate-limit address buckets and idempotency records are bounded.
- Expired sessions are removed on login or when an expired token is used.
  Expired idempotency records and request windows are removed lazily on requests.
- Rate limiting is a simple fixed window, with no per-account lockout or shared store.
- No HTTPS termination, password recovery, MFA, email verification, external identity
  provider, billing, delivery integration, background jobs or event broker.
- Only local JSON stdout logs; no tracing backend, durable audit sink or alerts.
- Demo credentials are public and must never be treated as actual user credentials.
- `NODE_ENV=production` disables neither these limitations nor in-memory storage.
  It rejects demo seeding; it does not make this fixture deployment-ready.
