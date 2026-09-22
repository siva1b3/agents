import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

test('server seeds demo data, serves requests, runs the demo and shuts down on SIGTERM', { timeout: 15000 }, async context => {
  const reservation = createServer();
  reservation.listen(0, '127.0.0.1');
  await once(reservation, 'listening');
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const serverProcess = spawn(process.execPath, ['src/server.js'], {
    env: { ...process.env, PORT: String(port), NODE_ENV: 'test', SEED_DEMO_DATA: 'true' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  context.after(() => { if (serverProcess.exitCode === null) serverProcess.kill('SIGKILL'); });
  let output = '';
  const exited = once(serverProcess, 'exit');
  await new Promise((resolve, reject) => {
    serverProcess.once('error', reject);
    serverProcess.once('exit', code => reject(new Error('Server exited before readiness: ' + code + ' ' + output)));
    serverProcess.stderr.on('data', chunk => { output += chunk; });
    serverProcess.stdout.on('data', chunk => {
      output += chunk;
      if (output.includes('"event":"server.started"')) resolve();
    });
  });
  const baseUrl = 'http://127.0.0.1:' + port;
  const ready = await fetch(baseUrl + '/health/ready');
  assert.equal(ready.status, 200);
  const products = await (await fetch(baseUrl + '/api/v1/products')).json();
  assert.equal(products.pagination.totalItems, 3);
  const demoProcess = spawn(process.execPath, ['scripts/run-api-demo.js'], {
    env: { ...process.env, API_BASE_URL: baseUrl }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  context.after(() => { if (demoProcess.exitCode === null) demoProcess.kill('SIGKILL'); });
  let demoOutput = '';
  demoProcess.stdout.on('data', chunk => { demoOutput += chunk; });
  demoProcess.stderr.on('data', chunk => { demoOutput += chunk; });
  const [demoExitCode] = await once(demoProcess, 'exit');
  assert.equal(demoExitCode, 0, demoOutput);
  assert.match(demoOutput, /duplicate request returned the same order/);
  serverProcess.kill('SIGTERM');
  const [exitCode, signal] = await exited;
  assert.equal(exitCode, 0);
  assert.equal(signal, null);
  assert.match(output, /server.shutdown_completed/);
});
