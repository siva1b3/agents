import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { startTestApplication } from './helpers/test-application.js';

test('orders validate all lines before changing stock and enforce ownership', async context => {
  const fixture = await startTestApplication(context);
  const administrator = await fixture.createAccount('administrator');
  const customer = await fixture.createAccount();
  const otherCustomer = await fixture.createAccount();
  const product = await fixture.createProduct(administrator, { stockQuantity: 3 });
  const stock = async () => (await fixture.request('/api/v1/products/' + product.id)).body.data.stockQuantity;
  assert.equal((await fixture.placeOrder(customer, product, 4)).status, 409);
  for (const items of [
    [{ productId: product.id, quantity: 1 }, { productId: randomUUID(), quantity: 1 }],
    [{ productId: product.id, quantity: 1 }, { productId: product.id, quantity: 1 }],
    [{ productId: product.id, quantity: -1 }],
  ]) {
    const response = await fixture.request('/api/v1/orders', {
      method: 'POST', token: customer.token, headers: { 'Idempotency-Key': randomUUID() }, body: { items },
    });
    assert.ok([400, 404].includes(response.status));
    assert.equal(await stock(), 3);
  }
  assert.equal((await fixture.request('/api/v1/orders', {
    method: 'POST', token: customer.token, body: { items: [{ productId: product.id, quantity: 1 }] },
  })).body.error.code, 'INVALID_IDEMPOTENCY_KEY');
  const order = (await fixture.placeOrder(customer, product, 2)).body.data;
  assert.equal(order.totalCents, 2500);
  assert.equal(await stock(), 1);
  const path = '/api/v1/orders/' + order.id;
  assert.equal((await fixture.request(path, { token: otherCustomer.token })).status, 403);
  assert.equal((await fixture.request(path + '/cancel', { method: 'POST', token: otherCustomer.token })).status, 403);
  assert.equal((await fixture.request('/api/v1/orders', { token: otherCustomer.token })).body.pagination.totalItems, 0);
  assert.equal((await fixture.request(path, { token: administrator.token })).status, 200);
  assert.equal((await fixture.request(path + '/cancel', { method: 'POST', token: customer.token })).body.data.status, 'cancelled');
  assert.equal(await stock(), 3);
  assert.equal((await fixture.request(path + '/cancel', { method: 'POST', token: customer.token })).status, 409);
  assert.equal(await stock(), 3);
});

test('concurrent duplicate requests reserve stock once; changed payloads conflict and keys are customer-scoped', async context => {
  const fixture = await startTestApplication(context);
  const administrator = await fixture.createAccount('administrator');
  const customer = await fixture.createAccount();
  const otherCustomer = await fixture.createAccount();
  const product = await fixture.createProduct(administrator);
  const key = randomUUID();
  const responses = await Promise.all([
    fixture.placeOrder(customer, product, 1, key), fixture.placeOrder(customer, product, 1, key),
  ]);
  assert.ok(responses.every(response => response.status === 201));
  assert.equal(responses[0].body.data.id, responses[1].body.data.id);
  assert.deepEqual(responses.map(response => response.headers.get('idempotency-replayed')).sort(), ['false', 'true']);
  assert.equal((await fixture.placeOrder(customer, product, 2, key)).status, 409);
  const otherOrder = await fixture.placeOrder(otherCustomer, product, 1, key);
  assert.notEqual(otherOrder.body.data.id, responses[0].body.data.id);
  assert.equal((await fixture.request('/api/v1/products/' + product.id)).body.data.stockQuantity, 3);
  const orderPath = '/api/v1/orders/' + responses[0].body.data.id;
  await fixture.request(orderPath + '/cancel', { method: 'POST', token: customer.token });
  const replay = await fixture.placeOrder(customer, product, 1, key);
  assert.equal(replay.body.data.status, 'placed'); // Original HTTP response is replayed.
  assert.equal((await fixture.request(orderPath, { token: customer.token })).body.data.status, 'cancelled');
});

test('concurrent orders cannot oversell the final unit', async context => {
  const fixture = await startTestApplication(context);
  const administrator = await fixture.createAccount('administrator');
  const customer = await fixture.createAccount();
  const product = await fixture.createProduct(administrator, { stockQuantity: 1 });
  const responses = await Promise.all([
    fixture.placeOrder(customer, product), fixture.placeOrder(customer, product),
  ]);
  assert.deepEqual(responses.map(response => response.status).sort(), [201, 409]);
  assert.equal((await fixture.request('/api/v1/products/' + product.id)).body.data.stockQuantity, 0);
});

test('price snapshots survive catalog updates and order state transitions are enforced', async context => {
  const fixture = await startTestApplication(context);
  const administrator = await fixture.createAccount('administrator');
  const customer = await fixture.createAccount();
  const product = await fixture.createProduct(administrator);
  const order = (await fixture.placeOrder(customer, product)).body.data;
  await fixture.request('/api/v1/products/' + product.id, {
    method: 'PATCH', token: administrator.token, body: { priceCents: 9000, expectedVersion: 2 },
  });
  const path = '/api/v1/orders/' + order.id;
  assert.equal((await fixture.request(path, { token: customer.token })).body.data.totalCents, 1250);
  const transition = (status, token = administrator.token) =>
    fixture.request(path + '/status', { method: 'PATCH', token, body: { status } });
  assert.equal((await transition('confirmed', customer.token)).status, 403);
  assert.equal((await transition('delivered')).status, 409);
  assert.equal((await transition('confirmed')).status, 200);
  assert.equal((await transition('shipped')).status, 200);
  assert.equal((await fixture.request(path + '/cancel', { method: 'POST', token: customer.token })).status, 409);
  const delivered = await transition('delivered');
  assert.equal(delivered.body.data.statusHistory.length, 4);
  assert.equal((await transition('cancelled')).status, 409);
});

test('archiving hides products but still allows cancellation to restore inventory', async context => {
  const fixture = await startTestApplication(context);
  const administrator = await fixture.createAccount('administrator');
  const customer = await fixture.createAccount();
  const product = await fixture.createProduct(administrator);
  const order = (await fixture.placeOrder(customer, product, 2)).body.data;
  assert.equal((await fixture.request('/api/v1/products/' + product.id, {
    method: 'DELETE', token: administrator.token, body: { expectedVersion: 2 },
  })).status, 204);
  assert.equal((await fixture.placeOrder(customer, product)).status, 404);
  assert.equal((await fixture.request('/api/v1/orders/' + order.id + '/cancel', {
    method: 'POST', token: customer.token,
  })).status, 200);
  assert.equal(fixture.application.locals.context.repositories.products.findById(product.id).stockQuantity, 5);
});

test('idempotency expiry and capacity checks happen before inventory mutation', async context => {
  const fixture = await startTestApplication(context, {
    maximumIdempotencyRecords: 1, idempotencyLifetimeMilliseconds: 1000,
  });
  const administrator = await fixture.createAccount('administrator');
  const customer = await fixture.createAccount();
  const product = await fixture.createProduct(administrator);
  const key = randomUUID();
  const original = await fixture.placeOrder(customer, product, 1, key);
  assert.equal((await fixture.placeOrder(customer, product)).status, 503);
  assert.equal((await fixture.request('/api/v1/products/' + product.id)).body.data.stockQuantity, 4);
  fixture.advanceTime(1000);
  const afterExpiry = await fixture.placeOrder(customer, product, 1, key);
  assert.equal(afterExpiry.status, 201);
  assert.notEqual(afterExpiry.body.data.id, original.body.data.id);
});

test('cancellation capacity failures leave every product and the order unchanged', async context => {
  const fixture = await startTestApplication(context);
  const administrator = await fixture.createAccount('administrator');
  const customer = await fixture.createAccount();
  const firstProduct = await fixture.createProduct(administrator);
  const secondProduct = await fixture.createProduct(administrator, { stockQuantity: 1000000 });
  const created = await fixture.request('/api/v1/orders', {
    method: 'POST', token: customer.token, headers: { 'Idempotency-Key': randomUUID() },
    body: { items: [{ productId: firstProduct.id, quantity: 1 }, { productId: secondProduct.id, quantity: 1 }] },
  });
  await fixture.request('/api/v1/products/' + secondProduct.id + '/stock-adjustments', {
    method: 'POST', token: administrator.token,
    body: { adjustmentQuantity: 1, expectedVersion: 2, reason: 'Restocked to capacity' },
  });
  const orderPath = '/api/v1/orders/' + created.body.data.id;
  const cancellation = await fixture.request(orderPath + '/cancel', { method: 'POST', token: customer.token });
  assert.equal(cancellation.status, 409);
  assert.equal(cancellation.body.error.code, 'STOCK_CAPACITY_EXCEEDED');
  assert.equal((await fixture.request(orderPath, { token: customer.token })).body.data.status, 'placed');
  assert.equal((await fixture.request('/api/v1/products/' + firstProduct.id)).body.data.stockQuantity, 4);
});
