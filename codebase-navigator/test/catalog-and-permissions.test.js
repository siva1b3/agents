import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startTestApplication } from './helpers/test-application.js';

test('product writes and administration require administrator permissions', async context => {
  const fixture = await startTestApplication(context);
  const customer = await fixture.createAccount();
  const administrator = await fixture.createAccount('administrator');
  const productBody = { name: 'Book', category: 'books', priceCents: 1000, stockQuantity: 3 };
  assert.equal((await fixture.request('/api/v1/products', { method: 'POST', body: productBody })).status, 401);
  assert.equal((await fixture.request('/api/v1/products', {
    method: 'POST', token: customer.token, body: productBody,
  })).status, 403);
  const product = await fixture.createProduct(administrator);
  assert.equal((await fixture.request('/api/v1/products/' + product.id)).status, 200);
  for (const path of ['/api/v1/admin/users', '/api/v1/admin/audit-events', '/api/v1/admin/metrics']) {
    assert.equal((await fixture.request(path, { token: customer.token })).status, 403);
    assert.equal((await fixture.request(path, { token: administrator.token })).status, 200);
  }
  const users = await fixture.request('/api/v1/admin/users', { token: administrator.token });
  assert.ok(users.body.data.every(user => !('passwordHash' in user)));
});

test('catalog search, filtering, sorting and pagination use validated query parameters', async context => {
  const fixture = await startTestApplication(context);
  const administrator = await fixture.createAccount('administrator');
  await fixture.createProduct(administrator, { name: 'Notebook A', priceCents: 100 });
  await fixture.createProduct(administrator, { name: 'Notebook B', priceCents: 200 });
  await fixture.createProduct(administrator, { name: 'Lamp', category: 'office' });
  const response = await fixture.request('/api/v1/products?category=stationery&search=NOTE&sort=priceCents&direction=desc&pageSize=1');
  assert.equal(response.status, 200);
  assert.equal(response.body.data[0].name, 'Notebook B');
  assert.equal(response.body.pagination.totalItems, 2);
  assert.equal(response.body.pagination.totalPages, 2);
  assert.equal((await fixture.request('/api/v1/products?page=0')).status, 400);
  assert.equal((await fixture.request('/api/v1/products?pageSize=101')).status, 400);
  assert.equal((await fixture.request('/api/v1/products?unknown=true')).status, 400);
  assert.equal((await fixture.request('/api/v1/products/not-a-uuid')).status, 400);
});

test('product version checks prevent stale updates; stock adjustments and archiving are audited', async context => {
  const fixture = await startTestApplication(context);
  const administrator = await fixture.createAccount('administrator');
  const product = await fixture.createProduct(administrator);
  const path = '/api/v1/products/' + product.id;
  const updated = await fixture.request(path, {
    method: 'PATCH', token: administrator.token, body: { priceCents: 2000, expectedVersion: 1 },
  });
  assert.equal(updated.body.data.version, 2);
  const stale = await fixture.request(path, {
    method: 'PATCH', token: administrator.token, body: { priceCents: 3000, expectedVersion: 1 },
  });
  assert.equal(stale.status, 409);
  assert.equal(stale.body.error.code, 'VERSION_CONFLICT');
  assert.equal((await fixture.request(path + '/stock-adjustments', {
    method: 'POST', token: administrator.token,
    body: { adjustmentQuantity: -6, expectedVersion: 2, reason: 'Inventory correction' },
  })).status, 409);
  const adjusted = await fixture.request(path + '/stock-adjustments', {
    method: 'POST', token: administrator.token,
    body: { adjustmentQuantity: 3, expectedVersion: 2, reason: 'Restock' },
  });
  assert.equal(adjusted.body.data.stockQuantity, 8);
  assert.equal(adjusted.body.data.version, 3);
  assert.equal((await fixture.request(path, {
    method: 'DELETE', token: administrator.token, body: { expectedVersion: 3 },
  })).status, 204);
  assert.equal((await fixture.request(path)).status, 404);
  assert.equal((await fixture.request('/api/v1/products')).body.pagination.totalItems, 0);
  const audit = await fixture.request('/api/v1/admin/audit-events', { token: administrator.token });
  assert.ok(audit.body.data.some(event => event.action === 'product.archived'));
});
