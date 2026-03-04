/**
 * Preview Proxy
 *
 * Allows a workspace to run a web server on a local port, then proxies
 * requests from /workspaces/:id/preview/* to that port.
 *
 * Usage:
 *   1. Client POSTs { command, port } to /workspaces/:id/preview/start
 *   2. Runner spawns the command in the workspace dir
 *   3. All requests to /workspaces/:id/preview/* are proxied to localhost:<port>
 */

import { Router, Request, Response } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { spawn, ChildProcess } from 'child_process';
import { getWorkspace, touchWorkspace } from './workspace-manager';
import { createLogger } from './logger';

const logger = createLogger('preview-proxy');

const SAFE_ENV_KEYS = [
  'PATH', 'HOME', 'USER', 'SHELL', 'LANG', 'TERM',
  'NODE_ENV', 'NODE_PATH', 'PYTHONPATH', 'GOPATH',
];

function buildSafeEnv(extra: Record<string, string> = {}) {
  const safe: Record<string, string> = {};
  for (const key of SAFE_ENV_KEYS) {
    if (process.env[key]) safe[key] = process.env[key]!;
  }
  return { ...safe, ...extra };
}

interface PreviewSession {
  process: ChildProcess;
  port: number;
  proxy: ReturnType<typeof createProxyMiddleware>;
}

const previewSessions = new Map<string, PreviewSession>();

export function createPreviewRouter(): Router {
  const router = Router({ mergeParams: true });

  router.post('/preview/start', (req: Request, res: Response) => {
    const workspaceId = req.params.workspaceId;
    const ws = getWorkspace(workspaceId);
    if (!ws || ws.status !== 'running') {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const { command, port } = req.body;
    if (typeof command !== 'string' || typeof port !== 'number') {
      return res.status(400).json({ error: 'command (string) and port (number) required' });
    }

    const existing = previewSessions.get(workspaceId);
    if (existing) {
      try { existing.process.kill('SIGTERM'); } catch {}
      previewSessions.delete(workspaceId);
    }

    const child = spawn('sh', ['-c', command], {
      cwd: ws.dir,
      env: buildSafeEnv({ PORT: String(port) }),
      detached: true,
      stdio: 'pipe',
    });

    child.stdout?.on('data', (d: Buffer) =>
      logger.info(`[preview:${workspaceId}] ${d.toString().trim()}`)
    );
    child.stderr?.on('data', (d: Buffer) =>
      logger.warn(`[preview:${workspaceId}] ${d.toString().trim()}`)
    );

    const proxy = createProxyMiddleware({
      target: `http://127.0.0.1:${port}`,
      changeOrigin: true,
      pathRewrite: { [`^/workspaces/${workspaceId}/preview`]: '' },
      on: {
        error: (err: Error, _req: Request, res: Response) => {
          logger.warn(`Preview proxy error for ${workspaceId}: ${err.message}`);
          if (!res.headersSent) {
            (res as any).status(502).json({ error: 'Preview server not ready yet' });
          }
        },
      },
    });

    previewSessions.set(workspaceId, { process: child, port, proxy });
    ws.previewPort = port;
    ws.previewProcess = child;
    touchWorkspace(workspaceId);

    logger.info(`Preview started for workspace ${workspaceId} on port ${port}`);
    res.json({ started: true, port, previewPath: `/workspaces/${workspaceId}/preview/` });
  });

  router.post('/preview/stop', (req: Request, res: Response) => {
    const workspaceId = req.params.workspaceId;
    const session = previewSessions.get(workspaceId);
    if (!session) return res.json({ stopped: false, reason: 'no session' });

    try { session.process.kill('SIGTERM'); } catch {}
    previewSessions.delete(workspaceId);

    const ws = getWorkspace(workspaceId);
    if (ws) { ws.previewPort = null; ws.previewProcess = null; }

    res.json({ stopped: true });
  });

  router.use('/preview', (req: Request, res: Response, next) => {
    const workspaceId = req.params.workspaceId;
    const session = previewSessions.get(workspaceId);
    if (!session) {
      return res.status(503).json({ error: 'No preview running. POST /preview/start first.' });
    }
    touchWorkspace(workspaceId);
    (session.proxy as any)(req, res, next);
  });

  return router;
}
