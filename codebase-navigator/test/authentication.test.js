import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startTestApplication, testPassword } from './helpers/test-application.js';

test('registration validates input, normalizes email, rejects mass assignment and hides password hashes', async context => {
  const fixture = await startTestApplication(context);
  const register = body => fixture.request('/api/v1/auth/register', { method: 'POST', body });
  const account = { displayName: 'Alice', email: 'ALICE@example.test', password: testPassword };
  assert.equal((await register({ ...account, role: 'administrator' })).status, 400);
  assert.equal((await register({ ...account, password: 'short' })).status, 400);
  const created = await register(account);
  assert.equal(created.status, 201);
  assert.equal(created.body.data.role, 'customer');
  assert.equal(created.body.data.email, 'alice@example.test');
  assert.equal('passwordHash' in created.body.data, false);
  assert.equal('password' in created.body.data, false);
  const stored = fixture.application.locals.context.repositories.users.findById(created.body.data.id);
  assert.match(stored.passwordHash, /^scrypt:/);
  assert.ok(!stored.passwordHash.includes(testPassword));
  assert.equal((await register({ ...account, email: 'alice@example.test' })).status, 409);
  const concurrent = await Promise.all([
    register({ ...account, email: 'race@example.test' }),
    register({ ...account, email: 'race@example.test' }),
  ]);
  assert.deepEqual(concurrent.map(response => response.status).sort(), [201, 409]);
});

test('login uses generic errors, stores only token hashes, and sessions expire', async context => {
  const fixture = await startTestApplication(context, { sessionLifetimeMilliseconds: 1000 });
  const account = await fixture.createAccount();
  for (const email of [account.email, 'missing@example.test']) {
    const response = await fixture.request('/api/v1/auth/login', {
      method: 'POST', body: { email, password: 'Incorrect-password-2026!' },
    });
    assert.equal(response.status, 401);
    assert.equal(response.body.error.code, 'INVALID_CREDENTIALS');
  }
  assert.equal((await fixture.request('/api/v1/users/me', { token: account.user.id })).status, 401);
  assert.equal((await fixture.request('/api/v1/users/me', { token: account.token })).status, 200);
  assert.equal(fixture.application.locals.context.repositories.sessions.findByTokenHash(account.token), undefined);
  fixture.advanceTime(1000);
  assert.equal((await fixture.request('/api/v1/users/me', { token: account.token })).status, 401);
});

test('logout revokes one session while logout-all revokes every session', async context => {
  const fixture = await startTestApplication(context);
  const account = await fixture.createAccount();
  const secondLogin = await fixture.request('/api/v1/auth/login', {
    method: 'POST', body: { email: account.email, password: testPassword },
  });
  const secondToken = secondLogin.body.data.accessToken;
  assert.equal((await fixture.request('/api/v1/auth/logout', { method: 'POST', token: account.token })).status, 204);
  assert.equal((await fixture.request('/api/v1/users/me', { token: account.token })).status, 401);
  assert.equal((await fixture.request('/api/v1/users/me', { token: secondToken })).status, 200);
  assert.equal((await fixture.request('/api/v1/auth/logout-all', { method: 'POST', token: secondToken })).status, 204);
  assert.equal((await fixture.request('/api/v1/users/me', { token: secondToken })).status, 401);
});

test('profile edits, password changes and deactivation enforce credentials and revoke sessions', async context => {
  const fixture = await startTestApplication(context);
  const account = await fixture.createAccount();
  const profile = await fixture.request('/api/v1/users/me', {
    method: 'PATCH', token: account.token, body: { displayName: 'Renamed Customer' },
  });
  assert.equal(profile.body.data.displayName, 'Renamed Customer');
  const newPassword = 'Replacement-password-2026!';
  assert.equal((await fixture.request('/api/v1/users/me/password', {
    method: 'POST', token: account.token,
    body: { currentPassword: 'Incorrect-password-2026!', newPassword },
  })).status, 401);
  assert.equal((await fixture.request('/api/v1/users/me/password', {
    method: 'POST', token: account.token, body: { currentPassword: testPassword, newPassword },
  })).status, 204);
  assert.equal((await fixture.request('/api/v1/users/me', { token: account.token })).status, 401);
  assert.equal((await fixture.request('/api/v1/auth/login', {
    method: 'POST', body: { email: account.email, password: testPassword },
  })).status, 401);
  const login = await fixture.request('/api/v1/auth/login', {
    method: 'POST', body: { email: account.email, password: newPassword },
  });
  const token = login.body.data.accessToken;
  assert.equal((await fixture.request('/api/v1/users/me/deactivate', {
    method: 'POST', token, body: { password: newPassword },
  })).status, 204);
  assert.equal((await fixture.request('/api/v1/users/me', { token })).status, 401);
  assert.equal((await fixture.request('/api/v1/auth/login', {
    method: 'POST', body: { email: account.email, password: newPassword },
  })).status, 401);
});

test('concurrent password changes cannot overwrite a newer credential', async context => {
  const fixture = await startTestApplication(context);
  const account = await fixture.createAccount();
  const newPasswords = ['First-replacement-password-2026!', 'Second-replacement-password-2026!'];
  const responses = await Promise.all(newPasswords.map(newPassword => fixture.request('/api/v1/users/me/password', {
    method: 'POST', token: account.token, body: { currentPassword: testPassword, newPassword },
  })));
  assert.equal(responses.filter(response => response.status === 204).length, 1);
  assert.ok(responses.every(response => [204, 401, 409].includes(response.status)));
  const successfulIndex = responses.findIndex(response => response.status === 204);
  const login = await fixture.request('/api/v1/auth/login', {
    method: 'POST', body: { email: account.email, password: newPasswords[successfulIndex] },
  });
  assert.equal(login.status, 200);
});
