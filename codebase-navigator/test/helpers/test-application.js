import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { createApplication } from '../../src/app.js';
import { readConfiguration } from '../../src/configuration/environment.js';

export const testPassword = 'Test-password-for-fixture-2026!';

export async function startTestApplication(testContext, overrides = {}) {
  let currentTime = Date.parse('2026-01-01T12:00:00Z');
  const logEntries = [];
  const configuration = {
    ...readConfiguration({ NODE_ENV: 'test' }),
    requestLimitPerMinute: 10000,
    authenticationLimitPerMinute: 10000,
    ...overrides,
  };
  const application = await createApplication({
    configuration, clock: () => currentTime,
    logger: { info: entry => logEntries.push(entry), error: entry => logEntries.push(entry) },
  });
  const server = application.listen(0, '127.0.0.1');
  await once(server, 'listening');
  testContext.after(() => new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  const baseUrl = 'http://127.0.0.1:' + server.address().port;

  async function request(path, { method = 'GET', body, token, headers = {}, rawBody } = {}) {
    const response = await fetch(baseUrl + path, {
      method,
      headers: {
        ...(body !== undefined || rawBody !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...headers,
      },
      body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body)),
    });
    const text = await response.text();
    return { status: response.status, headers: response.headers, body: text ? JSON.parse(text) : null };
  }

  async function createAccount(role = 'customer') {
    const email = randomUUID() + '@example.test';
    const user = await application.locals.context.services.userService.registerUser({
      displayName: 'Test ' + role, email, password: testPassword,
    }, 'test-fixture', role);
    const loginResponse = await request('/api/v1/auth/login', {
      method: 'POST', body: { email, password: testPassword },
    });
    if (loginResponse.status !== 200) throw new Error('Test account login failed: ' + JSON.stringify(loginResponse.body));
    return { user, email, token: loginResponse.body.data.accessToken };
  }

  async function createProduct(administrator, changes = {}) {
    const response = await request('/api/v1/products', {
      method: 'POST', token: administrator.token,
      body: { name: 'Test Notebook', category: 'stationery', priceCents: 1250, stockQuantity: 5, ...changes },
    });
    if (response.status !== 201) throw new Error('Test product creation failed: ' + JSON.stringify(response.body));
    return response.body.data;
  }

  async function placeOrder(customer, product, quantity = 1, key = randomUUID()) {
    return request('/api/v1/orders', {
      method: 'POST', token: customer.token, headers: { 'Idempotency-Key': key },
      body: { items: [{ productId: product.id, quantity }] },
    });
  }

  return {
    application, configuration, logEntries, request, createAccount, createProduct, placeOrder,
    advanceTime(milliseconds) { currentTime += milliseconds; },
  };
}
