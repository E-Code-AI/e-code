/**
 * File Service
 *
 * REST endpoints for reading and writing files inside a workspace directory.
 * Path traversal is blocked: all paths are resolved within the workspace dir.
 */

import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { getWorkspace, touchWorkspace } from './workspace-manager';
import { createLogger } from './logger';

const logger = createLogger('file-service');

function resolveSafePath(workspaceDir: string, filePath: string): string | null {
  const resolved = path.resolve(workspaceDir, filePath.replace(/^\/+/, ''));
  if (!resolved.startsWith(workspaceDir + path.sep) && resolved !== workspaceDir) {
    return null;
  }
  return resolved;
}

export function createFileRouter(): Router {
  const router = Router({ mergeParams: true });

  router.get('/files/*', (req: Request, res: Response) => {
    const workspaceId = req.params.workspaceId;
    const ws = getWorkspace(workspaceId);
    if (!ws || ws.status !== 'running') {
      return res.status(404).json({ error: 'Workspace not found or stopped' });
    }

    const filePath = (req.params as any)[0] ?? '';
    const safePath = resolveSafePath(ws.dir, filePath);
    if (!safePath) return res.status(400).json({ error: 'Invalid path' });

    if (!fs.existsSync(safePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const stat = fs.statSync(safePath);
    if (stat.isDirectory()) {
      const entries = fs.readdirSync(safePath, { withFileTypes: true }).map((e) => ({
        name: e.name,
        type: e.isDirectory() ? 'directory' : 'file',
        size: e.isFile() ? fs.statSync(path.join(safePath, e.name)).size : undefined,
      }));
      touchWorkspace(workspaceId);
      return res.json({ type: 'directory', entries });
    }

    const content = fs.readFileSync(safePath, 'utf-8');
    touchWorkspace(workspaceId);
    res.json({ type: 'file', content, path: filePath });
  });

  router.put('/files/*', (req: Request, res: Response) => {
    const workspaceId = req.params.workspaceId;
    const ws = getWorkspace(workspaceId);
    if (!ws || ws.status !== 'running') {
      return res.status(404).json({ error: 'Workspace not found or stopped' });
    }

    const filePath = (req.params as any)[0] ?? '';
    const safePath = resolveSafePath(ws.dir, filePath);
    if (!safePath) return res.status(400).json({ error: 'Invalid path' });

    const { content } = req.body;
    if (typeof content !== 'string') {
      return res.status(400).json({ error: 'content must be a string' });
    }

    fs.mkdirSync(path.dirname(safePath), { recursive: true });
    fs.writeFileSync(safePath, content, 'utf-8');
    touchWorkspace(workspaceId);

    logger.info(`File written: ${filePath} in workspace ${workspaceId}`);
    res.json({ saved: true, path: filePath });
  });

  router.delete('/files/*', (req: Request, res: Response) => {
    const workspaceId = req.params.workspaceId;
    const ws = getWorkspace(workspaceId);
    if (!ws || ws.status !== 'running') {
      return res.status(404).json({ error: 'Workspace not found or stopped' });
    }

    const filePath = (req.params as any)[0] ?? '';
    const safePath = resolveSafePath(ws.dir, filePath);
    if (!safePath) return res.status(400).json({ error: 'Invalid path' });

    if (!fs.existsSync(safePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    fs.rmSync(safePath, { recursive: true, force: true });
    touchWorkspace(workspaceId);
    res.json({ deleted: true, path: filePath });
  });

  return router;
}
