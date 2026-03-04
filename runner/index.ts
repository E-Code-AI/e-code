/**
 * E-Code Runner Service
 * ─────────────────────────────────────────────────────────────────
 * Standalone microservice that provides isolated workspace execution.
 *
 * Environment variables:
 *   RUNNER_JWT_SECRET        Shared secret with main platform (REQUIRED)
 *   PORT / RUNNER_PORT       Port to listen on (default: 8080)
 *   RUNNER_WORKSPACES_DIR    Where to store workspace dirs
 *   RUNNER_ALLOWED_ORIGINS   Comma-separated CORS origins
 *   RUNNER_ADMIN_KEY         Secret header for /admin/runs
 *   WORKSPACE_IDLE_TTL_SEC   Idle TTL in seconds (default: 3600)
 *   EXEC_TIMEOUT_MS          Max exec duration in ms (default: 10000)
 */

import express, { Request, Response, NextFunction } from 'express';
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
import {
  rateLimit,
  validateExecPayload,
  EXEC_TIMEOUT_MS,
  requireAdminKey,
  globalErrorHandler,
  auditLog,
  recordExecRun,
  getExecRuns,
} from './security';
import { execSync } from 'child_process';
import { randomUUID } from 'crypto';

const logger = createLogger('index');
const PORT = parseInt(process.env.PORT ?? process.env.RUNNER_PORT ?? '8080', 10);

if (!process.env.RUNNER_JWT_SECRET) {
  console.error('[Runner] FATAL: RUNNER_JWT_SECRET is not set. Exiting.');
  process.exit(1);
}

const app = express();
const httpServer = createServer(app);
const wss = new WebSocketServer({ noServer: true });

// ─── CORS ────────────────────────────────────────────────────────
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

app.use(express.json({ limit: '2mb' }));

// ─── Health check (no auth) ───────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'e-code-runner',
    workspaces: listWorkspaces().length,
    timestamp: new Date().toISOString(),
  });
});

// ─── Admin: list recent exec runs (no JWT — uses RUNNER_ADMIN_KEY) ─
app.get('/admin/runs', requireAdminKey, (_req, res) => {
  const runs = getExecRuns();
  res.json({ total: runs.length, runs });
});

// ─── All routes below require JWT auth ───────────────────────────
app.use(requireRunnerAuth);

// POST /workspaces — create workspace (rate limited: 10/min per user)
app.post('/workspaces', rateLimit(10), (req: Request, res: Response) => {
  const { projectId, projectName } = req.body;
  if (!projectId) {
    return res.status(400).json({ error: 'projectId is required', code: 'MISSING_FIELD' });
  }

  const token = (req as any).runnerToken as Record<string, unknown>;
  const userId = String(token?.userId ?? token?.sub ?? 'unknown');

  const ws = createWorkspace(String(projectId), userId);
  const runnerUrl = process.env.RUNNER_PUBLIC_URL ?? `http://localhost:${PORT}`;

  auditLog('workspace_create', { workspaceId: ws.id, projectId, userId });

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
  if (!ws) return res.status(404).json({ error: 'Workspace not found', code: 'NOT_FOUND' });

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
  const token = (req as any).runnerToken as Record<string, unknown>;
  const userId = String(token?.userId ?? token?.sub ?? 'unknown');
  const stopped = stopWorkspace(req.params.id, `manual:${userId}`);
  if (!stopped) return res.status(404).json({ error: 'Workspace not found', code: 'NOT_FOUND' });
  res.json({ stopped: true });
});

// GET /workspaces — list all (admin view, still JWT-gated)
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

// POST /workspaces/:workspaceId/exec — run a command (rate limited: 30/min)
app.post(
  '/workspaces/:workspaceId/exec',
  rateLimit(30),
  validateExecPayload,
  (req: Request, res: Response) => {
    const ws = getWorkspace(req.params.workspaceId);
    if (!ws || ws.status !== 'running') {
      return res.status(404).json({ error: 'Workspace not found or stopped', code: 'NOT_FOUND' });
    }

    const token = (req as any).runnerToken as Record<string, unknown>;
    const userId = String(token?.userId ?? token?.sub ?? 'unknown');
    const { command } = req.body;
    const runId = randomUUID();
    const startedAt = new Date().toISOString();
    const t0 = Date.now();

    auditLog('exec_start', { runId, workspaceId: ws.id, userId, command });

    try {
      const output = execSync(command, {
        cwd: ws.dir,
        timeout: EXEC_TIMEOUT_MS,
        env: { PATH: process.env.PATH ?? '/usr/bin:/bin', HOME: ws.dir },
        encoding: 'utf-8',
        maxBuffer: 512 * 1024,
      });

      const durationMs = Date.now() - t0;
      recordExecRun({ runId, workspaceId: ws.id, userId, command, startedAt, durationMs, exitCode: 0, error: null });
      auditLog('exec_done', { runId, exitCode: 0, durationMs });

      res.json({ runId, output, exitCode: 0, durationMs });
    } catch (err: any) {
      const durationMs = Date.now() - t0;
      const isTimeout = err.code === 'ETIMEDOUT' || err.signal === 'SIGTERM';
      const exitCode = err.status ?? 1;

      recordExecRun({ runId, workspaceId: ws.id, userId, command, startedAt, durationMs, exitCode, error: isTimeout ? 'timeout' : err.stderr });
      auditLog('exec_error', { runId, exitCode, isTimeout, durationMs });

      res.status(isTimeout ? 408 : 200).json({
        runId,
        output: err.stdout ?? '',
        error: isTimeout
          ? `Command timed out after ${EXEC_TIMEOUT_MS}ms`
          : (err.stderr ?? err.message),
        exitCode,
        durationMs,
        code: isTimeout ? 'EXEC_TIMEOUT' : 'EXEC_ERROR',
      });
    }
  }
);

// ─── File & Preview sub-routers ───────────────────────────────────
app.use('/workspaces/:workspaceId', createFileRouter());
app.use('/workspaces/:workspaceId', createPreviewRouter());

// ─── 404 handler ─────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found', code: 'NOT_FOUND' });
});

// ─── Global error handler ─────────────────────────────────────────
app.use(globalErrorHandler);

// ─── WebSocket terminal handler ───────────────────────────────────
registerTerminalHandler(httpServer, wss);

// ─── Start ────────────────────────────────────────────────────────
httpServer.listen(PORT, '0.0.0.0', () => {
  logger.info(`E-Code Runner listening on port ${PORT}`);
  logger.info(`Health: http://localhost:${PORT}/health`);
  logger.info(`Idle TTL: ${process.env.WORKSPACE_IDLE_TTL_SEC ?? 3600}s | Exec timeout: ${EXEC_TIMEOUT_MS}ms`);
  logger.info(`Admin endpoint: ${process.env.RUNNER_ADMIN_KEY ? 'enabled' : 'disabled (set RUNNER_ADMIN_KEY)'}`);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  const all = listWorkspaces();
  for (const ws of all) stopWorkspace(ws.id, 'shutdown');
  httpServer.close(() => process.exit(0));
});

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught exception: ${err.message}`);
  auditLog('uncaught_exception', { error: err.message, stack: err.stack });
});
