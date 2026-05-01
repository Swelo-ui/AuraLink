import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process';
import path from 'node:path';

const cwd = path.resolve(process.cwd());
const PORT = 3307;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(): Promise<void> {
  const maxAttempts = 40;
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      const res = await fetch(`${BASE_URL}/api/env-check`);
      if (res.ok) return;
    } catch {
      // keep waiting
    }
    await sleep(250);
  }
  throw new Error('Server did not start in time');
}

function startDevServer(): ChildProcessWithoutNullStreams {
  return spawn(process.execPath, ['--import', 'tsx', 'server.ts'], {
    cwd,
    env: { ...process.env, PORT: String(PORT), JWT_SECRET: 'integration-secret', NODE_ENV: 'production' },
    stdio: 'pipe',
    shell: false
  });
}

async function jsonPost(endpoint: string, payload: Record<string, unknown>) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const body = await res.json();
  return { res, body };
}

test('register/login flow and brute-force protection', async (t) => {
  const server = startDevServer();
  t.after(() => {
    server.kill('SIGTERM');
  });

  await waitForServer();

  const user = `test_user_${Date.now()}`;
  const password = 'StrongPass123!';

  const invalidRegister = await jsonPost('/api/auth/register', { username: 'ab', password: 'short' });
  assert.equal(invalidRegister.res.status, 400);

  const register = await jsonPost('/api/auth/register', { username: user, password });
  assert.equal(register.res.status, 200);
  assert.ok(register.body.token);
  assert.equal(register.body.user.username, user);

  const login = await jsonPost('/api/auth/login', { username: user, password });
  assert.equal(login.res.status, 200);
  assert.ok(login.body.token);

  for (let i = 0; i < 5; i += 1) {
    const badLogin = await jsonPost('/api/auth/login', { username: user, password: 'WrongPass123!' });
    assert.equal(badLogin.res.status, 401);
  }

  const blocked = await jsonPost('/api/auth/login', { username: user, password: 'WrongPass123!' });
  assert.equal(blocked.res.status, 429);
});
