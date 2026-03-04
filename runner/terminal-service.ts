/**
 * Terminal Service
 *
 * Provides real interactive shell access per workspace via node-pty + WebSocket.
 * Each workspace gets its own PTY session, isolated to its workspace directory.
 *
 * WebSocket protocol (same as main platform's ReplitTerminalPanel):
 *   Client → Server:  JSON { type: 'input', data: string }
 *                     JSON { type: 'resize', cols: number, rows: number }
 *   Server → Client:  string (raw terminal output)
 *                     JSON { type: 'exit', code: number }
 */

import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { Socket } from 'net';
import { getWorkspace, touchWorkspace } from './workspace-manager';
import { verifyWsToken } from './auth';
import { createLogger } from './logger';

const logger = createLogger('terminal');

let ptyModule: typeof import('node-pty') | null = null;
async function getPty() {
  if (!ptyModule) ptyModule = await import('node-pty');
  return ptyModule;
}

export function registerTerminalHandler(
  server: import('http').Server,
  wss: WebSocketServer
) {
  server.on('upgrade', (req: IncomingMessage, socket: Socket, head: Buffer) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);

    const match = url.pathname.match(/^\/workspaces\/([^/]+)\/terminal$/);
    if (!match) return;

    const workspaceId = match[1];
    const token = url.searchParams.get('token') ?? '';
    const payload = verifyWsToken(token);

    if (!payload) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    const workspace = getWorkspace(workspaceId);
    if (!workspace || workspace.status !== 'running') {
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      handleTerminalSession(ws, workspaceId, workspace.dir);
    });
  });
}

async function handleTerminalSession(
  ws: WebSocket,
  workspaceId: string,
  cwd: string
) {
  logger.info(`Terminal session started for workspace ${workspaceId}`);

  let pty: import('node-pty').IPty;

  try {
    const nodePty = await getPty();
    pty = nodePty.spawn(process.env.SHELL ?? '/bin/bash', [], {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd,
      env: {
        TERM: 'xterm-256color',
        HOME: cwd,
        PATH: process.env.PATH ?? '/usr/bin:/bin',
        SHELL: process.env.SHELL ?? '/bin/bash',
        LANG: 'en_US.UTF-8',
        PS1: '\\[\\033[1;32m\\]workspace\\[\\033[0m\\]:\\[\\033[1;34m\\]\\w\\[\\033[0m\\]$ ',
      },
    });
  } catch (err) {
    logger.error(`Failed to spawn PTY: ${err}`);
    ws.send(JSON.stringify({ type: 'error', message: 'Failed to start terminal' }));
    ws.close();
    return;
  }

  pty.onData((data) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(data);
    touchWorkspace(workspaceId);
  });

  pty.onExit(({ exitCode }) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'exit', code: exitCode }));
      ws.close();
    }
  });

  ws.on('message', (msg: Buffer | string) => {
    try {
      const text = typeof msg === 'string' ? msg : msg.toString();
      const parsed = JSON.parse(text);
      if (parsed.type === 'input' && typeof parsed.data === 'string') {
        pty.write(parsed.data);
      } else if (
        parsed.type === 'resize' &&
        typeof parsed.cols === 'number' &&
        typeof parsed.rows === 'number'
      ) {
        pty.resize(parsed.cols, parsed.rows);
      }
    } catch {
      if (typeof msg === 'string') pty.write(msg);
    }
    touchWorkspace(workspaceId);
  });

  ws.on('close', () => {
    logger.info(`Terminal session closed for workspace ${workspaceId}`);
    try { pty.kill(); } catch {}
  });

  ws.on('error', (err) => {
    logger.warn(`Terminal WS error for workspace ${workspaceId}: ${err.message}`);
    try { pty.kill(); } catch {}
  });
}
