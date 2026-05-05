/**
 * Deployment proxy router — routes public deployment URLs to the runtime
 * that the DeploymentRuntime keeps alive.
 *
 *   GET /d/:deploymentId/...     → forwards to http://127.0.0.1:<port>/...
 *                                  (or serves files from the static root,
 *                                  for static deployments)
 *
 * The deployment manager hands out URLs of the form
 *   `${APP_URL}/d/${deploymentId}/`
 * so the proxy and the URL stored in the deployment row stay in sync.
 */

import express, { type Request, type Response, type NextFunction } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { deploymentRuntime } from '../deployment/deployment-runtime';

const router = express.Router();

const PREFIX_RE = /^\/d\/[A-Za-z0-9_\-]+/;

router.use('/d/:deploymentId', (req: Request, res: Response, next: NextFunction) => {
  const { deploymentId } = req.params;
  const target = deploymentRuntime.getProxyTarget(deploymentId);

  if (!target) {
    return res.status(503).json({
      error: 'Deployment not running',
      code: 'DEPLOYMENT_NOT_RUNNING',
      hint: 'The deployment may be stopped, building, or has not finished provisioning.',
    });
  }

  // Express strips the matched mount path from req.url, so the upstream sees
  // the right path; but we still rebuild from originalUrl to be defensive
  // about middlewares that may have rewritten req.url upstream.
  const upstreamPath = req.originalUrl.replace(PREFIX_RE, '') || '/';
  req.url = upstreamPath;

  if (target.kind === 'static') {
    // Resolve the requested file relative to the static root and ensure it
    // doesn't escape the deployment directory (path traversal guard).
    const decoded = decodeURIComponent(upstreamPath.split('?')[0]);
    let candidate = path.normalize(path.join(target.rootPath, decoded));
    if (!candidate.startsWith(target.rootPath)) {
      return res.status(400).json({ error: 'Invalid path', code: 'INVALID_PATH' });
    }

    fs.stat(candidate, (err, stat) => {
      if (err) {
        const indexHtml = path.join(target.rootPath, 'index.html');
        // SPA fallback: serve index.html when no specific file matches.
        return res.sendFile(indexHtml, (sendErr) => {
          if (sendErr) res.status(404).end();
        });
      }
      if (stat.isDirectory()) {
        candidate = path.join(candidate, 'index.html');
      }
      res.sendFile(candidate, (sendErr) => {
        if (sendErr && !res.headersSent) res.status(500).end();
      });
    });
    return;
  }

  // Process-backed deployment: regular reverse proxy.
  const proxy = createProxyMiddleware({
    target: target.target,
    changeOrigin: true,
    ws: true,
    on: {
      error: (err: any, _req: any, response: any) => {
        if (response && typeof response.status === 'function' && !response.headersSent) {
          response.status(502).json({
            error: 'Deployment upstream error',
            code: 'UPSTREAM_ERROR',
            detail: err?.message || 'Connection failed',
          });
        }
      },
    },
  });
  return proxy(req, res, next);
});

export default router;
