import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { requireRunnerAuth } from './auth';
import {
  createWorkspace,
  getWorkspace,
  listWorkspaces,
  stopWorkspace,
  onWorkspaceStop,
  isDockerEnabled,
} from './workspace-manager';
import { registerTerminalHandler, killWorkspaceTerminals } from './terminal-service';
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
import { getDockerManager } from './docker-manager';

const logger = createLogger('index');
const PORT = parseInt(process.env.RUNNER_PORT ?? process.env.PORT ?? '8080', 10);

if (!process.env.RUNNER_JWT_SECRET) {
  console.error('[Runner] FATAL: RUNNER_JWT_SECRET is not set. Exiting.');
  process.exit(1);
}

onWorkspaceStop(killWorkspaceTerminals);

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

// Transparent proxy — must be registered BEFORE express.json() so the request
// body stream is still intact when forwarded to the main app on port 5000.
// Only local runner paths (/health, /admin, /workspaces) bypass the proxy.
const mainAppPort = process.env.MAIN_APP_PORT ?? '5000';
const mainAppProxy = createProxyMiddleware({
  target: `http://localhost:${mainAppPort}`,
  changeOrigin: false,
  on: {
    error: (_err: Error, _req: Request, res: Response) => {
      if (!res.headersSent) {
        (res as any).status(502).json({ error: 'Main app unavailable', code: 'PROXY_ERROR' });
      }
    },
  },
});

app.use((req: Request, res: Response, next: NextFunction) => {
  const isRunnerPath =
    req.path === '/health' ||
    req.path.startsWith('/admin') ||
    req.path.startsWith('/workspaces');
  if (isRunnerPath) return next();
  return mainAppProxy(req, res, next);
});

// Body parser only for local runner routes (workspace management)
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  const dockerMgr = isDockerEnabled() ? getDockerManager() : null;
  res.json({
    status: 'ok',
    service: 'e-code-runner',
    workspaces: listWorkspaces().length,
    dockerEnabled: isDockerEnabled(),
    dockerReady: dockerMgr?.isReady ?? false,
    timestamp: new Date().toISOString(),
  });
});

app.get('/admin/runs', requireAdminKey, (_req, res) => {
  const runs = getExecRuns();
  res.json({ total: runs.length, runs });
});

// Only require runner auth for workspace API routes
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/workspaces')) {
    return requireRunnerAuth(req, res, next);
  }
  next();
});

app.post('/workspaces', rateLimit(10), async (req: Request, res: Response) => {
  const { projectId, projectName } = req.body;
  if (!projectId) {
    return res.status(400).json({ error: 'projectId is required', code: 'MISSING_FIELD' });
  }

  const token = (req as any).runnerToken as Record<string, unknown>;
  const userId = String(token?.userId ?? token?.sub ?? 'unknown');

  try {
    const ws = await createWorkspace(String(projectId), userId);
    const runnerUrl = process.env.RUNNER_PUBLIC_URL ?? `http://localhost:${PORT}`;

    auditLog('workspace_create', { workspaceId: ws.id, projectId, userId });

    res.status(201).json({
      workspaceId: ws.id,
      status: ws.status,
      dockerIsolated: !!ws.containerId,
      previewUrl: `${runnerUrl}/workspaces/${ws.id}/preview/`,
      wsTerminalUrl: `${runnerUrl.replace(/^http/, 'ws')}/workspaces/${ws.id}/terminal`,
      createdAt: ws.createdAt.toISOString(),
    });
  } catch (err: any) {
    logger.error(`Failed to create workspace: ${err.message}`);
    res.status(500).json({ error: 'Failed to create workspace', code: 'WORKSPACE_CREATE_FAILED' });
  }
});

app.get('/workspaces/:id', (req: Request, res: Response) => {
  const ws = getWorkspace(req.params.id);
  if (!ws) return res.status(404).json({ error: 'Workspace not found', code: 'NOT_FOUND' });

  res.json({
    workspaceId: ws.id,
    projectId: ws.projectId,
    status: ws.status,
    previewPort: ws.previewPort,
    dockerIsolated: !!ws.containerId,
    containerId: ws.containerId?.slice(0, 12),
    createdAt: ws.createdAt.toISOString(),
    lastActiveAt: ws.lastActiveAt.toISOString(),
  });
});

app.delete('/workspaces/:id', async (req: Request, res: Response) => {
  const token = (req as any).runnerToken as Record<string, unknown>;
  const userId = String(token?.userId ?? token?.sub ?? 'unknown');
  const stopped = await stopWorkspace(req.params.id, `manual:${userId}`);
  if (!stopped) return res.status(404).json({ error: 'Workspace not found', code: 'NOT_FOUND' });
  res.json({ stopped: true });
});

app.get('/workspaces', (_req, res) => {
  const list = listWorkspaces().map((ws) => ({
    workspaceId: ws.id,
    projectId: ws.projectId,
    status: ws.status,
    dockerIsolated: !!ws.containerId,
    createdAt: ws.createdAt.toISOString(),
    lastActiveAt: ws.lastActiveAt.toISOString(),
  }));
  res.json({ workspaces: list, total: list.length });
});

app.post(
  '/workspaces/:workspaceId/exec',
  rateLimit(30),
  validateExecPayload,
  async (req: Request, res: Response) => {
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

    if (isDockerEnabled() && ws.containerId) {
      try {
        const dockerMgr = getDockerManager();
        const result = await dockerMgr.execInContainer(ws.id, command, {
          timeout: EXEC_TIMEOUT_MS,
          env: { PATH: '/usr/local/bin:/usr/bin:/bin', HOME: '/workspace' },
        });

        const durationMs = Date.now() - t0;
        const isTimeout = result.exitCode === 124;

        recordExecRun({ runId, workspaceId: ws.id, userId, command, startedAt, durationMs, exitCode: result.exitCode, error: isTimeout ? 'timeout' : (result.stderr || null) });
        auditLog('exec_done', { runId, exitCode: result.exitCode, durationMs, docker: true });

        if (isTimeout) {
          return res.status(408).json({
            runId,
            output: result.stdout,
            error: `Command timed out after ${EXEC_TIMEOUT_MS}ms`,
            exitCode: 124,
            durationMs,
            code: 'EXEC_TIMEOUT',
          });
        }

        return res.json({
          runId,
          output: result.stdout,
          error: result.stderr || undefined,
          exitCode: result.exitCode,
          durationMs,
        });
      } catch (err: any) {
        const durationMs = Date.now() - t0;
        recordExecRun({ runId, workspaceId: ws.id, userId, command, startedAt, durationMs, exitCode: 1, error: err.message });
        auditLog('exec_error', { runId, error: err.message, durationMs });
        return res.status(500).json({
          runId,
          output: '',
          error: err.message,
          exitCode: 1,
          durationMs,
          code: 'EXEC_ERROR',
        });
      }
    }

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

app.use('/workspaces/:workspaceId', createFileRouter());
app.use('/workspaces/:workspaceId', createPreviewRouter());

app.use(globalErrorHandler);

registerTerminalHandler(httpServer, wss);

async function startServer() {
  // Wait for the main app (port 5000) to bind first so Replit's proxy detects
  // port 5000 before port 8081. This ensures `waitForPort = 5000` in .replit
  // routes external traffic correctly to the main app rather than the runner.
  const startupDelay = parseInt(process.env.RUNNER_STARTUP_DELAY_MS ?? '20000', 10);
  if (startupDelay > 0) {
    logger.info(`Startup delay: waiting ${startupDelay}ms for main app to bind port 5000 first...`);
    await new Promise<void>(resolve => setTimeout(resolve, startupDelay));
    logger.info('Startup delay complete, binding runner port now.');
  }

  if (isDockerEnabled()) {
    try {
      const dockerMgr = getDockerManager();
      await dockerMgr.initialize();
      logger.info('Docker sandbox isolation: ENABLED');
    } catch (err) {
      logger.warn(`Docker initialization failed — running in directory-only mode: ${err}`);
    }
  } else {
    logger.info('Docker sandbox isolation: DISABLED (set DOCKER_ENABLED=true to enable)');
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    logger.info(`E-Code Runner listening on port ${PORT}`);
    logger.info(`Health: http://localhost:${PORT}/health`);
    logger.info(`Idle TTL: ${process.env.WORKSPACE_IDLE_TTL_SEC ?? 3600}s | Exec timeout: ${EXEC_TIMEOUT_MS}ms`);
    logger.info(`Admin endpoint: ${process.env.RUNNER_ADMIN_KEY ? 'enabled' : 'disabled (set RUNNER_ADMIN_KEY)'}`);
  });
}

startServer().catch((err) => {
  logger.error(`Failed to start server: ${err}`);
  process.exit(1);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  const all = listWorkspaces();
  for (const ws of all) await stopWorkspace(ws.id, 'shutdown');

  if (isDockerEnabled()) {
    try {
      const dockerMgr = getDockerManager();
      await dockerMgr.stopAll();
    } catch {}
  }

  httpServer.close(() => process.exit(0));
});

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught exception: ${err.message}`);
  auditLog('uncaught_exception', { error: err.message, stack: err.stack });
});
