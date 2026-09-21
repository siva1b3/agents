# Codebase Navigator — practice repository

A small Express API for our agent to investigate. No database or frontend.
The navigator agent will be added in the next learning step.

## Docker development

Run commands from this directory. Node and npm run exclusively in Docker.

```sh
docker compose up -d --build
docker compose exec node npm ci
docker compose exec node npm run dev
```

The container stays alive using `tail -f /dev/null`. The last command starts
the API with Node's file watcher; Ctrl+C stops the API, leaving the container running.
The API is available at http://localhost:3000.

```sh
docker compose exec node sh
docker compose stop
```

Source files are bind-mounted; dependencies live in a Docker volume.

## Endpoints

- `GET /health` — health check.
- `POST /users` — create a user with `name` and `email`.
- `GET /users/:id` — retrieve a user.
- `GET /products` — list products.
- `GET /products/:id` — retrieve a product.
- `POST /products` — create a product; requires mock authentication.
- `GET /orders` — list the authenticated user's orders.
- `POST /orders` — place an order and reduce stock.
- `GET /orders/:id` — retrieve an owned order.
- `POST /orders/:id/cancel` — cancel an owned order and restore stock.

All order endpoints require mock authentication. Create a user first, then send
`Authorization: Bearer <user-id>`. This fixture trusts user IDs; it is not real authentication.
Any authenticated user may create products; there is no admin role.

Product bodies contain `name`, integer `priceCents`, and integer `stock`.
Order bodies contain `items`: an array of `{ "productId": "<uuid>", "quantity": 1 }`.
Prices and totals use integer cents. Duplicate product lines are rejected.

The source is divided into routes, controllers, services, repositories, schemas,
middleware, shared errors, configuration, and an in-memory data store.
All users, products, and orders reset when the API restarts.

Run the integration check inside Docker:

```sh
docker compose exec node npm test
```

Users are stored in memory and reset when the API restarts.
See `questions.md` for investigation prompts.
