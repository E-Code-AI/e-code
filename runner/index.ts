/**
 * E-Code Runner Service
 * ─────────────────────────────────────────────────────────────────
 * Standalone microservice that provides isolated workspace execution.
 * Runs on a separate port from the main E-Code platform.
 *
 * Responsibilities:
 *   - Create/manage isolated workspace directories
 *   - Interactive terminal via WebSocket (node-pty)
 *   - File read/write within workspace boundaries
 *   - HTTP preview proxy (user's running app → browser)
 *   - Exec arbitrary shell commands in workspace context
 *
 * Communication with main platform:
 *   - Main platform calls POST/GET/DELETE /workspaces (authenticated via JWT)
 *   - Browser connects directly to Runner for terminal WS and preview
 *
 * Environment variables:
 *   RUNNER_JWT_SECRET   Shared secret with main platform (REQUIRED)
 *   RUNNER_PORT         Port to listen on (default: 8080)
 *   RUNNER_WORKSPACES_DIR  Where to store workspace dirs (default: /tmp/runner-workspaces)
 *   RUNNER_DEBUG        Set to "true" for verbose logs
 */

import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { requireRunnerAuth } from './auth';
import {
  createWorkspace,
  getWorkspace,
  listWorkspaces,
  stopWorkspace,
} from './workspace-manager';
import { registerTerminalHandler } from './terminal-service';
import { createFileRouter } from './file-service';
import { createPreviewRouter } from './preview-proxy';
import { createLogger } from './logger';

const logger = createLogger('index');

const PORT = parseInt(process.env.PORT ?? process.env.RUNNER_PORT ?? '8080', 10);

if (!process.env.RUNNER_JWT_SECRET) {
  console.error('[Runner] FATAL: RUNNER_JWT_SECRET is not set. Exiting.');
  process.exit(1);
}

const app = express();
const httpServer = createServer(app);
const wss = new WebSocketServer({ noServer: true });

const allowedOrigins = process.env.RUNNER_ALLOWED_ORIGINS
  ? process.env.RUNNER_ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : null;

app.use(
  cors({
    origin: allowedOrigins
      ? (origin, cb) => {
          if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
          cb(new Error(`CORS: origin ${origin} not allowed`));
        }
      : '*',
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));

// ─── Health check (no auth) ───────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'e-code-runner',
    workspaces: listWorkspaces().length,
    timestamp: new Date().toISOString(),
  });
});

// ─── All routes below require JWT auth ───────────────────────────
app.use(requireRunnerAuth);

// POST /workspaces — create a new workspace
app.post('/workspaces', (req: Request, res: Response) => {
  const { projectId, projectName } = req.body;
  if (!projectId) {
    return res.status(400).json({ error: 'projectId is required' });
  }

  const ws = createWorkspace(String(projectId));
  const runnerUrl = process.env.RUNNER_PUBLIC_URL ?? `http://localhost:${PORT}`;

  logger.info(`Workspace created: ${ws.id} for project ${projectId} (${projectName ?? 'unnamed'})`);

  res.status(201).json({
    workspaceId: ws.id,
    status: ws.status,
    previewUrl: `${runnerUrl}/workspaces/${ws.id}/preview/`,
    wsTerminalUrl: `${runnerUrl.replace(/^http/, 'ws')}/workspaces/${ws.id}/terminal`,
    createdAt: ws.createdAt.toISOString(),
  });
});

// GET /workspaces/:id — workspace status
app.get('/workspaces/:id', (req: Request, res: Response) => {
  const ws = getWorkspace(req.params.id);
  if (!ws) return res.status(404).json({ error: 'Workspace not found' });

  res.json({
    workspaceId: ws.id,
    projectId: ws.projectId,
    status: ws.status,
    previewPort: ws.previewPort,
    createdAt: ws.createdAt.toISOString(),
    lastActiveAt: ws.lastActiveAt.toISOString(),
  });
});

// DELETE /workspaces/:id — stop workspace
app.delete('/workspaces/:id', (req: Request, res: Response) => {
  const stopped = stopWorkspace(req.params.id);
  if (!stopped) return res.status(404).json({ error: 'Workspace not found' });
  res.json({ stopped: true });
});

// GET /workspaces — list all (admin)
app.get('/workspaces', (_req, res) => {
  const list = listWorkspaces().map((ws) => ({
    workspaceId: ws.id,
    projectId: ws.projectId,
    status: ws.status,
    createdAt: ws.createdAt.toISOString(),
    lastActiveAt: ws.lastActiveAt.toISOString(),
  }));
  res.json({ workspaces: list, total: list.length });
});

// POST /workspaces/:workspaceId/exec — run a command in workspace
app.post('/workspaces/:workspaceId/exec', (req: Request, res: Response) => {
  const ws = getWorkspace(req.params.workspaceId);
  if (!ws || ws.status !== 'running') {
    return res.status(404).json({ error: 'Workspace not found or stopped' });
  }

  const { command } = req.body;
  if (typeof command !== 'string') {
    return res.status(400).json({ error: 'command (string) required' });
  }

  const { execSync } = require('child_process');
  try {
    const output = execSync(command, {
      cwd: ws.dir,
      timeout: 30_000,
      env: { PATH: process.env.PATH ?? '/usr/bin:/bin', HOME: ws.dir },
      encoding: 'utf-8',
    });
    res.json({ output, exitCode: 0 });
  } catch (err: any) {
    res.json({
      output: err.stdout ?? '',
      error: err.stderr ?? err.message,
      exitCode: err.status ?? 1,
    });
  }
});

// ─── File & Preview sub-routers ───────────────────────────────────
app.use('/workspaces/:workspaceId', createFileRouter());
app.use('/workspaces/:workspaceId', createPreviewRouter());

// ─── WebSocket terminal handler ───────────────────────────────────
registerTerminalHandler(httpServer, wss);

// ─── Start ────────────────────────────────────────────────────────
httpServer.listen(PORT, '0.0.0.0', () => {
  logger.info(`E-Code Runner listening on port ${PORT}`);
  logger.info(`Health: http://localhost:${PORT}/health`);
  logger.info(`Workspaces dir: ${process.env.RUNNER_WORKSPACES_DIR ?? '/tmp/runner-workspaces'}`);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down...');
  const all = listWorkspaces();
  for (const ws of all) stopWorkspace(ws.id);
  httpServer.close(() => process.exit(0));
});
