#!/usr/bin/env node
import { spawn } from 'node:child_process';
import net from 'node:net';

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => {
        if (address && typeof address === 'object') resolve(address.port);
        else reject(new Error('Could not allocate a free port'));
      });
    });
  });
}

const port = process.env.PORT ? Number(process.env.PORT) : await getFreePort();
const baseUrl = process.env.ECODE_SMOKE_URL || `http://127.0.0.1:${port}`;
const startServer = process.env.ECODE_SMOKE_START_SERVER !== 'false';
const timeoutMs = Number(process.env.ECODE_SMOKE_TIMEOUT_MS || 90000);

const endpoints = [
  { name: 'health', path: '/health', expect: [200, 503] },
  { name: 'liveness', path: '/health/liveness', expect: [200] },
  { name: 'readiness', path: '/health/readiness', expect: [200, 503] },
  { name: 'api health', path: '/api/health', expect: [200] },
  { name: 'api liveness', path: '/api/health/liveness', expect: [200] },
  { name: 'api readiness', path: '/api/health/readiness', expect: [200, 503] },
  { name: 'cors health', path: '/api/cors-health', expect: [200, 500] },
  { name: 'csrf token', path: '/api/csrf-token', expect: [200] },
  { name: 'auth check', path: '/api/auth/check', expect: [200] },
  { name: 'system status', path: '/api/system/status', expect: [200] },
];

let child;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function request(path) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { accept: 'application/json' },
  });
  let body = null;
  const text = await response.text();
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: response.status, body };
}

async function waitForServer() {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const result = await request('/health/readiness');
      if (result.status === 200 && result.body?.ready === true) return;
    } catch {
      // Server is still booting.
    }
    await delay(1000);
  }
  throw new Error(`Server did not become ready within ${timeoutMs}ms at ${baseUrl}`);
}

async function main() {
  if (startServer) {
    child = spawn('npm', ['run', 'dev'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PORT: String(port),
        NODE_ENV: 'development',
        DOTENV_CONFIG_PATH: process.env.DOTENV_CONFIG_PATH || '.env.local',
      },
    });
    child.stdout.on('data', data => process.stdout.write(`[server] ${data}`));
    child.stderr.on('data', data => process.stderr.write(`[server] ${data}`));
  }

  await waitForServer();

  const failures = [];
  for (const endpoint of endpoints) {
    const result = await request(endpoint.path);
    const hasData = result.body && (typeof result.body !== 'object' || Object.keys(result.body).length > 0);
    if (!endpoint.expect.includes(result.status) || !hasData) {
      failures.push({ endpoint, result });
      continue;
    }
    console.log(`ok ${endpoint.name} ${endpoint.path} -> ${result.status}`);
  }

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`fail ${failure.endpoint.name} ${failure.endpoint.path} -> ${failure.result.status}`);
      console.error(JSON.stringify(failure.result.body, null, 2));
    }
    process.exitCode = 1;
  }
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    if (child) child.kill('SIGTERM');
  });
