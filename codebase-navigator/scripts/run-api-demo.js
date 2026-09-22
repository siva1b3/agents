import { randomUUID } from 'node:crypto';
import { demonstrationAccounts } from '../src/data/seed-demonstration-data.js';

const baseUrl = process.env.API_BASE_URL ?? 'http://127.0.0.1:3000';

async function request(path, { method = 'GET', body, token, headers = {} } = {}) {
  const response = await fetch(baseUrl + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const result = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(path + ': HTTP ' + response.status + ' ' + JSON.stringify(result));
  return result;
}

let accessToken;
try {
  const credentials = demonstrationAccounts.customer;
  const authentication = await request('/api/v1/auth/login', {
    method: 'POST', body: { email: credentials.email, password: credentials.password },
  });
  accessToken = authentication.data.accessToken;
  console.log('Signed in as ' + authentication.data.user.email);
  const catalog = await request('/api/v1/products?pageSize=100');
  const product = catalog.data.find(item => item.stockQuantity > 0);
  if (!product) throw new Error('No available products; start the API with SEED_DEMO_DATA=true');
  const orderRequest = {
    method: 'POST', token: accessToken,
    headers: { 'Idempotency-Key': randomUUID() },
    body: { items: [{ productId: product.id, quantity: 1 }] },
  };
  const created = await request('/api/v1/orders', orderRequest);
  const replayed = await request('/api/v1/orders', orderRequest);
  if (replayed.data.id !== created.data.id) throw new Error('Duplicate request created a second order');
  console.log('Created order ' + created.data.id + '; duplicate request returned the same order.');
  const cancelled = await request('/api/v1/orders/' + created.data.id + '/cancel', { method: 'POST', token: accessToken });
  console.log('Order status: ' + cancelled.data.status + '. Reserved stock was restored.');
} catch (error) {
  console.error('Demo failed: ' + error.message);
  process.exitCode = 1;
} finally {
  if (accessToken) {
    try {
      await request('/api/v1/auth/logout', { method: 'POST', token: accessToken });
      console.log('Session revoked.');
    } catch {
      console.error('Unable to revoke the demo session; it will expire automatically.');
      process.exitCode = 1;
    }
  }
}
