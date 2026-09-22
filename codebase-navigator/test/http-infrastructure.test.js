import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readConfiguration } from '../src/configuration/environment.js';
import { startTestApplication, testPassword } from './helpers/test-application.js';

test('errors share an envelope and request identifier, including malformed or oversized JSON', async context => {
  const fixture = await startTestApplication(context);
  const cases = [
    ['/missing', {}, 404, 'ROUTE_NOT_FOUND'],
    ['/api/v1/auth/register', { method: 'POST', rawBody: '{' }, 400, 'INVALID_JSON'],
    ['/api/v1/auth/register', { method: 'POST', body: { displayName: 'x'.repeat(17000) } }, 413, 'BODY_TOO_LARGE'],
    ['/api/v1/products/nope', {}, 400, 'VALIDATION_FAILED'],
    ['/api/v1/auth/register', { method: 'POST', rawBody: 'hello', headers: { 'Content-Type': 'text/plain' } }, 415, 'UNSUPPORTED_MEDIA_TYPE'],
  ];
  for (const [path, options, status, code] of cases) {
    const response = await fixture.request(path, options);
    assert.equal(response.status, status);
    assert.equal(response.body.error.code, code);
    assert.equal(response.body.requestId, response.headers.get('x-request-id'));
    assert.equal(response.headers.get('x-powered-by'), null);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  }
});

test('CORS permits configured origins and supplies preflight headers', async context => {
  const fixture = await startTestApplication(context);
  assert.equal((await fixture.request('/api/v1/products', { headers: { Origin: 'https://untrusted.example' } })).status, 403);
  const allowed = await fixture.request('/api/v1/products', { headers: { Origin: 'http://localhost:3000' } });
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:3000');
  const preflight = await fixture.request('/api/v1/orders', {
    method: 'OPTIONS', headers: { Origin: 'http://localhost:3000', 'Access-Control-Request-Method': 'POST' },
  });
  assert.equal(preflight.status, 204);
  assert.match(preflight.headers.get('access-control-allow-headers'), /Idempotency-Key/);
});

test('global rate limits ignore spoofed forwarding headers and expire with the window', async context => {
  const fixture = await startTestApplication(context, { requestLimitPerMinute: 2 });
  assert.equal((await fixture.request('/api/v1/products')).status, 200);
  assert.equal((await fixture.request('/api/v1/products')).status, 200);
  const limited = await fixture.request('/api/v1/products', { headers: { 'X-Forwarded-For': '198.51.100.25' } });
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('retry-after'), '60');
  assert.equal((await fixture.request('/health/live')).status, 200);
  fixture.advanceTime(60000);
  assert.equal((await fixture.request('/api/v1/products')).status, 200);
});

test('authentication has a separate tighter request budget', async context => {
  const fixture = await startTestApplication(context, { authenticationLimitPerMinute: 1 });
  const options = { method: 'POST', body: { email: 'missing@example.test', password: testPassword } };
  assert.equal((await fixture.request('/api/v1/auth/login', options)).status, 401);
  assert.equal((await fixture.request('/api/v1/auth/login', options)).status, 429);
  assert.equal((await fixture.request('/api/v1/products')).status, 200);
});

test('readiness changes during draining while liveness remains healthy', async context => {
  const fixture = await startTestApplication(context);
  assert.equal((await fixture.request('/health/ready')).status, 200);
  fixture.application.locals.context.lifecycle.ready = false;
  assert.equal((await fixture.request('/health/ready')).status, 503);
  assert.equal((await fixture.request('/health/live')).status, 200);
  assert.equal((await fixture.request('/api/v1/products')).body.error.code, 'SERVER_DRAINING');
});

test('request logs and audit events exclude credentials and audit retention is bounded', async context => {
  const fixture = await startTestApplication(context, { maximumAuditEvents: 3 });
  const account = await fixture.createAccount();
  for (let index = 0; index < 4; index += 1) {
    await fixture.request('/api/v1/users/me', {
      method: 'PATCH', token: account.token, body: { displayName: 'Customer ' + index },
    });
  }
  await fixture.request('/api/v1/products?search=secret-query-content', { token: account.token });
  const events = fixture.application.locals.context.repositories.audit.findAll();
  assert.equal(events.length, 3);
  const serialized = JSON.stringify({ logs: fixture.logEntries, events });
  for (const forbidden of [testPassword, account.token, 'secret-query-content', 'passwordHash']) {
    assert.equal(serialized.includes(forbidden), false);
  }
  assert.ok(events.every(event => event.requestId && event.actorId === account.user.id));
});

test('unexpected service failures return safe errors and increment error metrics', async context => {
  const fixture = await startTestApplication(context);
  fixture.application.locals.context.repositories.products.findAll = () => {
    throw new Error('PRIVATE_DATABASE_PASSWORD');
  };
  const response = await fixture.request('/api/v1/products');
  assert.equal(response.status, 500);
  assert.equal(response.body.error.code, 'INTERNAL_ERROR');
  assert.equal(JSON.stringify(response.body).includes('PRIVATE_DATABASE_PASSWORD'), false);
  assert.equal(fixture.application.locals.context.metrics.serverErrors, 1);
  assert.ok(fixture.logEntries.some(entry => entry.event === 'http.unexpected_error'));
});

test('configuration rejects invalid ports and demo accounts in production', () => {
  assert.throws(() => readConfiguration({ PORT: 'invalid' }), /PORT/);
  assert.throws(() => readConfiguration({ PORT: '70000' }), /PORT/);
  assert.throws(() => readConfiguration({ NODE_ENV: 'production', SEED_DEMO_DATA: 'true' }), /Demo accounts/);
  assert.equal(readConfiguration({}).seedDemoData, false);
});

test('application instances do not share repository state', async context => {
  const first = await startTestApplication(context);
  const second = await startTestApplication(context);
  const account = await first.createAccount();
  assert.equal((await second.request('/api/v1/users/me', { token: account.token })).status, 401);
  assert.equal(second.application.locals.context.repositories.users.findAll().length, 0);
});
