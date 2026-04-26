#!/usr/bin/env node
import { spawn } from 'node:child_process';
import net from 'node:net';
import WebSocket from 'ws';

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
const httpBase = process.env.ECODE_SMOKE_URL || `http://127.0.0.1:${port}`;
const wsUrl = process.env.ECODE_TERMINAL_WS_URL || `ws://127.0.0.1:${port}/api/terminal/ws?projectId=smoke-terminal`;
const startServer = process.env.ECODE_SMOKE_START_SERVER !== 'false';
const timeoutMs = Number(process.env.ECODE_SMOKE_TIMEOUT_MS || 120000);
const marker = `ecode-terminal-smoke-${Date.now()}`;

let child;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForServer() {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${httpBase}/health/readiness`);
      if (response.status === 200) {
        const body = await response.json().catch(() => null);
        if (body?.ready === true) return;
      }
    } catch {
      // Server is still booting.
    }
    await delay(1000);
  }
  throw new Error(`Server did not become ready within ${timeoutMs}ms`);
}

function waitForTerminal() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl, { perMessageDeflate: false });
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error(`Terminal WebSocket did not echo marker within ${timeoutMs}ms`));
    }, timeoutMs);

    let sawReady = false;
    let output = '';

    ws.on('message', raw => {
      const text = raw.toString();
      output += text;
      try {
        const message = JSON.parse(text);
        if (message.type === 'ready') {
          sawReady = true;
          ws.send(JSON.stringify({ type: 'input', data: `printf '${marker}\\n'\n` }));
        }
        if (typeof message.data === 'string') output += message.data;
      } catch {
        // Raw terminal stream is appended above.
      }

      if (sawReady && output.includes(marker)) {
        clearTimeout(timer);
        ws.close();
        resolve();
      }
    });

    ws.on('error', error => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

async function main() {
  if (startServer) {
    child = spawn('npm', ['run', 'dev'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PORT: String(port),
        NODE_ENV: 'development',
        ALLOW_INSECURE_LOCAL_PTY: 'true',
        DOTENV_CONFIG_PATH: process.env.DOTENV_CONFIG_PATH || '.env.local',
      },
    });
    child.stdout.on('data', data => process.stdout.write(`[server] ${data}`));
    child.stderr.on('data', data => process.stderr.write(`[server] ${data}`));
  }

  await waitForServer();
  await waitForTerminal();
  console.log(`ok terminal websocket echoed ${marker}`);
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    if (child) child.kill('SIGTERM');
  });
