import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { app } from '../src/app.js';

test('API validation, ownership, inventory and cancellation', async () => {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(path, { method = 'GET', body, token, raw } = {}) {
    const response = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
    });
    return { status: response.status, data: await response.json() };
  }
  const post = (path, body, token) => request(path, { method: 'POST', body, token });
  try {
    assert.equal((await request('/health')).status, 200);
    assert.equal((await post('/users', { name: '', email: 'bad' })).status, 400);
    assert.equal((await request('/users', { method: 'POST', raw: '{' })).status, 400);
    assert.equal((await post('/users', { name: 'x'.repeat(17000) })).status, 413);
    const alice = await post('/users', { name: 'Alice', email: 'ALICE@example.com' });
    assert.equal(alice.status, 201);
    assert.equal((await post('/users', { name: 'Alice', email: 'alice@example.com' })).status, 409);
    const bob = await post('/users', { name: 'Bob', email: 'bob@example.com' });
    const token = alice.data.id;
    assert.equal((await request(`/users/${token}`)).status, 200);
    assert.equal((await request('/users/missing')).status, 404);
    assert.equal((await request('/orders')).status, 401);
    assert.equal((await post('/products', {})).status, 401);
    assert.equal((await post('/products', { name: 'Book', priceCents: -1, stock: 3 }, token)).status, 400);
    const product = await post('/products', { name: 'Book', priceCents: 1250, stock: 3 }, token);
    assert.equal(product.status, 201);
    const productId = product.data.id;
    const stock = async () => (await request(`/products/${productId}`)).data.stock;
    assert.equal((await post('/orders', { items: [{ productId, quantity: 4 }] }, token)).status, 409);
    assert.equal(await stock(), 3);
    assert.equal((await post('/orders', { items: [{ productId, quantity: 1 }, { productId, quantity: 1 }] }, token)).status, 400);
    const missingId = '00000000-0000-4000-8000-000000000000';
    assert.equal((await post('/orders', { items: [{ productId, quantity: 1 }, { productId: missingId, quantity: 1 }] }, token)).status, 404);
    assert.equal(await stock(), 3);
    const order = await post('/orders', { items: [{ productId, quantity: 2 }] }, token);
    assert.equal(order.status, 201);
    assert.equal(order.data.totalCents, 2500);
    assert.equal(await stock(), 1);
    const path = `/orders/${order.data.id}`;
    assert.equal((await request(path, { token: bob.data.id })).status, 403);
    assert.equal((await post(`${path}/cancel`, {}, bob.data.id)).status, 403);
    assert.equal((await request('/orders', { token: bob.data.id })).data.length, 0);
    assert.equal((await request('/orders', { token })).data.length, 1);
    assert.equal((await post(`${path}/cancel`, {}, token)).data.status, 'cancelled');
    assert.equal(await stock(), 3);
    assert.equal((await post(`${path}/cancel`, {}, token)).status, 409);
    assert.equal(await stock(), 3);
    assert.equal((await request('/unknown')).status, 404);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
