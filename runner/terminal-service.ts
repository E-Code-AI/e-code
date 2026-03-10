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

/**
 * Registry of active PTY sessions keyed by workspaceId.
 * Used by killWorkspaceTerminals() to clean up on workspace stop.
 */
const activePtys = new Map<string, Set<import('node-pty').IPty>>();

function trackPty(workspaceId: string, pty: import('node-pty').IPty): void {
  if (!activePtys.has(workspaceId)) activePtys.set(workspaceId, new Set());
  activePtys.get(workspaceId)!.add(pty);
}

function untrackPty(workspaceId: string, pty: import('node-pty').IPty): void {
  activePtys.get(workspaceId)?.delete(pty);
  if (activePtys.get(workspaceId)?.size === 0) activePtys.delete(workspaceId);
}

/**
 * Kill all active terminal (PTY) sessions for a given workspace.
 * Called by stopWorkspace() so tabs are always cleaned up on stop.
 */
export function killWorkspaceTerminals(workspaceId: string): void {
  const ptys = activePtys.get(workspaceId);
  if (!ptys || ptys.size === 0) return;
  logger.info(`Killing ${ptys.size} terminal session(s) for workspace ${workspaceId}`);
  for (const pty of ptys) {
    try { pty.kill(); } catch {}
  }
  activePtys.delete(workspaceId);
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
    const bashPath = process.env.SHELL ?? '/bin/bash';

    const sandboxedEnv: Record<string, string> = {
      TERM: 'xterm-256color',
      HOME: cwd,
      PWD: cwd,
      TMPDIR: '/tmp',
      SHELL: bashPath,
      USER: `workspace-${workspaceId.slice(0, 8)}`,
      LOGNAME: `workspace-${workspaceId.slice(0, 8)}`,
      PATH: process.env.PATH ?? '/usr/local/bin:/usr/bin:/bin',
      LANG: 'en_US.UTF-8',
      LC_ALL: 'en_US.UTF-8',
      PS1: '\\[\\033[1;32m\\]workspace\\[\\033[0m\\]:\\[\\033[1;34m\\]\\w\\[\\033[0m\\]$ ',
    };

    pty = nodePty.spawn(bashPath, ['-c', `ulimit -v 524288 -n 256 -u 64 -t 3600 2>/dev/null; exec ${bashPath} -i`], {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd,
      env: sandboxedEnv,
    });
  } catch (err) {
    logger.error(`Failed to spawn PTY: ${err}`);
    ws.send(JSON.stringify({ type: 'error', message: 'Failed to start terminal' }));
    ws.close();
    return;
  }

  trackPty(workspaceId, pty);

  pty.onData((data) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(data);
    touchWorkspace(workspaceId);
  });

  pty.onExit(({ exitCode }) => {
    untrackPty(workspaceId, pty);
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
    untrackPty(workspaceId, pty);
    try { pty.kill(); } catch {}
  });

  ws.on('error', (err) => {
    logger.warn(`Terminal WS error for workspace ${workspaceId}: ${err.message}`);
    untrackPty(workspaceId, pty);
    try { pty.kill(); } catch {}
  });
}
