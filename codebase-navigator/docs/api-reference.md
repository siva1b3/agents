# API reference

Base URL: `http://localhost:3000`. Business endpoints use `/api/v1`.

Single-resource successes use `{ "data": ... }`; lists add
`pagination: { page, pageSize, totalItems, totalPages }`.
A 204 response has no body. Health responses use `{ "status": ... }`.

Errors use:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Request validation failed",
    "details": [{ "source": "body", "field": "email", "message": "Invalid email address" }]
  },
  "requestId": "server-generated-uuid"
}
```

The exact Zod validation message can differ by failing rule.
The response header `X-Request-Id` matches the error's request identifier.
Send `Content-Type: application/json` with request bodies.

## Endpoint inventory

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | /health/live | Public | Process liveness |
| GET | /health/ready | Public | Ready=200, draining=503 |
| POST | /api/v1/auth/register | Public, auth rate limit | Register a customer |
| POST | /api/v1/auth/login | Public, auth rate limit | Issue a session token |
| POST | /api/v1/auth/logout | Authenticated | Revoke current session |
| POST | /api/v1/auth/logout-all | Authenticated | Revoke every session for this user |
| GET | /api/v1/users/me | Authenticated | Own profile |
| PATCH | /api/v1/users/me | Authenticated | Change display name |
| POST | /api/v1/users/me/password | Authenticated, auth rate limit | Change password and revoke sessions |
| POST | /api/v1/users/me/deactivate | Authenticated, auth rate limit | Deactivate account with password |
| GET | /api/v1/products | Public | Search/filter/sort/page active products |
| GET | /api/v1/products/:identifier | Public | Retrieve an active product |
| POST | /api/v1/products | Administrator | Create product |
| PATCH | /api/v1/products/:identifier | Administrator | Update descriptive fields or price |
| POST | /api/v1/products/:identifier/stock-adjustments | Administrator | Adjust inventory |
| DELETE | /api/v1/products/:identifier | Administrator | Archive product |
| GET | /api/v1/orders | Authenticated | Own orders; admins see all |
| POST | /api/v1/orders | Authenticated | Place order with idempotency key |
| GET | /api/v1/orders/:identifier | Owner or administrator | Retrieve order |
| POST | /api/v1/orders/:identifier/cancel | Owner or administrator | Cancel eligible order |
| PATCH | /api/v1/orders/:identifier/status | Administrator | Change order status |
| GET | /api/v1/admin/users | Administrator | Paginated safe user summaries |
| GET | /api/v1/admin/audit-events | Administrator | Paginated audit events, newest first |
| GET | /api/v1/admin/metrics | Administrator | Completed requests, 5xx count and uptime |

## Authentication and accounts

Registration:

```json
{
  "displayName": "Alice",
  "email": "alice@example.test",
  "password": "Alice-example-password-2026!"
}
```

Passwords must contain 12–128 characters. Unknown fields are rejected:
clients cannot submit `role`, `status`, or `passwordHash`.
Emails are trimmed and lowercased. Duplicate email registration returns 409.

Login:

```json
{ "email": "customer@example.test", "password": "Customer-demo-password-2026!" }
```

The result contains `data.accessToken`, `tokenType`, `expiresAt` and a safe
`user` object. Send `Authorization: Bearer <accessToken>` on protected requests.
Sessions last one hour by default. They do not slide or refresh.

Profile update: `{ "displayName": "Alice Updated" }`.

Password change:

```json
{
  "currentPassword": "Alice-example-password-2026!",
  "newPassword": "Alice-replacement-password-2026!"
}
```

After a successful change, every existing session is invalid, including the
current session. Log in again with the new password.
Deactivation takes `{ "password": "the-current-password" }`, revokes sessions,
and blocks future login. Existing orders and audit records remain.

## Catalog and inventory

Product creation:

```json
{
  "name": "Notebook",
  "description": "For investigation notes",
  "category": "stationery",
  "priceCents": 1250,
  "stockQuantity": 10
}
```

Prices are integer cents, from 1 through 100,000,000. Stock is bounded at
1,000,000 units. No currencies, tax, shipping or discounts are modeled.

Example query:
`/api/v1/products?category=stationery&search=note&sort=priceCents&direction=desc&page=1&pageSize=10`.

All paginated endpoints default to page 1 and page size 20; maximum size is 100.
Product sorts: `name`, `priceCents`, `createdAt`; directions: `asc`, `desc`.
Names are searched case-insensitively. Unknown query fields are rejected.

A product starts at `version: 1`. Every update, inventory reservation, inventory
restoration, stock adjustment and archive increments the version.
Retrieve the latest product before a write:

```json
{ "priceCents": 1500, "expectedVersion": 1 }
```

Stock adjustment:

```json
{
  "adjustmentQuantity": 5,
  "reason": "Received new stock",
  "expectedVersion": 2
}
```

Negative adjustments are allowed if the resulting stock stays nonnegative.
Archiving uses DELETE with a JSON body: `{ "expectedVersion": 3 }`.
Archived products disappear from public reads and cannot be ordered.
Records remain so historical orders can still restore reserved inventory.

## Orders

Send a unique `Idempotency-Key` header, for example `checkout-attempt-0001`.

```json
{
  "items": [
    { "productId": "<uuid-from-product-response>", "quantity": 2 }
  ]
}
```

Orders allow 1–20 distinct products with quantities from 1–100.
Duplicate lines and unknown fields are rejected.
Names and unit prices are copied into the order; catalog changes do not rewrite
existing orders. Every inventory line is checked before stock is deducted.

Keys contain 8–128 letters, digits, underscores or hyphens. They are scoped to
the authenticated customer and retained for 24 hours. Within that period:

- Same key and same items: original 201 body and order ID are returned.
- Same key and different items: 409 `IDEMPOTENCY_CONFLICT`.
- Item order is ignored when comparing request contents.
- `Idempotency-Replayed: true` identifies a replay.
- Failed creations do not reserve a key.
- Replays return the original snapshot even if the order was later cancelled;
  GET the order for its current state.

After expiry, reusing a key can create a new order.
A full idempotency store rejects new orders with 503 before modifying inventory.

Status update body: `{ "status": "confirmed" }`.

```text
placed -> confirmed -> shipped -> delivered
   |          |
   +----------+-----> cancelled
```

Cancellation restores stock once. Repeated cancellation or cancellation after
shipping returns 409. If restoring any item would exceed inventory capacity,
the entire cancellation fails with `STOCK_CAPACITY_EXCEEDED`; an administrator
must correct stock first. No product or order is partially updated.

Orders can be filtered with `?status=placed` and paginated.

## Request policies

Default global limit: 120 requests per IP per minute.
Registration, login, password changes and deactivation share a tighter
10-per-IP-per-minute bucket. Health requests bypass these limits.
A 429 response includes `Retry-After`. Trusted proxy support is deliberately off.

Allowed browser origins default to `http://localhost:3000`.
CORS supports JSON, Authorization and Idempotency-Key request headers.
Cookies are not used. CORS does not authenticate non-browser clients.

Typical errors: 400 invalid input, 401 missing/expired credentials,
403 insufficient access, 404 missing resource, 409 state/version/stock conflict,
413 oversized JSON, 415 unsupported media/encoding, 429 request limit,
500 unexpected failure, 503 draining or temporary capacity limit.
