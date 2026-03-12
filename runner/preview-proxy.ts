import { Router, Request, Response } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { spawn, ChildProcess } from 'child_process';
import { getWorkspace, touchWorkspace, isDockerEnabled } from './workspace-manager';
import { createLogger } from './logger';
import { getDockerManager } from './docker-manager';

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
  process?: ChildProcess;
  port: number;
  proxy: ReturnType<typeof createProxyMiddleware>;
  dockerExecStream?: NodeJS.ReadWriteStream;
}

const previewSessions = new Map<string, PreviewSession>();

export function createPreviewRouter(): Router {
  const router = Router({ mergeParams: true });

  router.post('/preview/start', async (req: Request, res: Response) => {
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
      if (existing.process) {
        try { existing.process.kill('SIGTERM'); } catch {}
      }
      if (existing.dockerExecStream) {
        try { (existing.dockerExecStream as any).destroy(); } catch {}
      }
      previewSessions.delete(workspaceId);
    }

    if (isDockerEnabled() && ws.containerId) {
      try {
        const dockerMgr = getDockerManager();

        const containerIp = await dockerMgr.getContainerIp(workspaceId);
        if (!containerIp) {
          return res.status(500).json({ error: 'Could not determine container IP address' });
        }

        const { stream } = await dockerMgr.execInteractive(
          workspaceId,
          ['sh', '-c', command],
          { env: { PORT: String(port), HOST: '0.0.0.0' } }
        );

        stream.on('data', (d: Buffer) =>
          logger.info(`[preview:${workspaceId}] ${d.toString().trim()}`)
        );

        const proxyTarget = `http://${containerIp}:${port}`;
        logger.info(`Preview proxy target for workspace ${workspaceId}: ${proxyTarget}`);

        const proxy = createProxyMiddleware({
          target: proxyTarget,
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

        previewSessions.set(workspaceId, { port, proxy, dockerExecStream: stream });
        ws.previewPort = port;
        touchWorkspace(workspaceId);

        logger.info(`Docker preview started for workspace ${workspaceId} on port ${port}`);
        return res.json({ started: true, port, previewPath: `/workspaces/${workspaceId}/preview/` });
      } catch (err) {
        logger.error(`Failed to start Docker preview for ${workspaceId}: ${err}`);
        return res.status(500).json({ error: 'Failed to start preview in container' });
      }
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

  router.post('/preview/stop', async (req: Request, res: Response) => {
    const workspaceId = req.params.workspaceId;
    const session = previewSessions.get(workspaceId);
    if (!session) return res.json({ stopped: false, reason: 'no session' });

    if (session.process) {
      try { session.process.kill('SIGTERM'); } catch {}
    }
    if (session.dockerExecStream) {
      const dockerWs = getWorkspace(workspaceId);
      if (isDockerEnabled() && dockerWs?.containerId) {
        try {
          const dockerMgr = getDockerManager();
          await dockerMgr.execInContainer(workspaceId,
            ['sh', '-c', `kill $(lsof -t -i:${session.port}) 2>/dev/null || true`],
            { timeout: 3000 }
          );
        } catch {}
      }
      try { (session.dockerExecStream as any).destroy(); } catch {}
    }
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
