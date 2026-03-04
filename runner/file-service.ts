/**
 * File Service
 *
 * REST endpoints for reading and writing files inside a workspace directory.
 * Path traversal is blocked: all paths are resolved within the workspace dir.
 * Write limit: 1 MB per file.
 */

import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { getWorkspace, touchWorkspace } from './workspace-manager';
import { validateFileWrite } from './security';
import { createLogger } from './logger';
import { auditLog } from './security';

const logger = createLogger('file-service');
const FILE_WRITE_MAX_BYTES = 1 * 1024 * 1024;

function resolveSafePath(workspaceDir: string, filePath: string): string | null {
  const resolved = path.resolve(workspaceDir, filePath.replace(/^\/+/, ''));
  if (!resolved.startsWith(workspaceDir + path.sep) && resolved !== workspaceDir) {
    return null;
  }
  return resolved;
}

function getWs(req: Request, res: Response) {
  const ws = getWorkspace(req.params.workspaceId);
  if (!ws || ws.status !== 'running') {
    res.status(404).json({ error: 'Workspace not found or stopped', code: 'WORKSPACE_NOT_FOUND' });
    return null;
  }
  return ws;
}

export function createFileRouter(): Router {
  const router = Router({ mergeParams: true });

  router.get('/files/*', (req: Request, res: Response) => {
    const ws = getWs(req, res);
    if (!ws) return;

    const filePath = (req.params as any)[0] ?? '';
    const safePath = resolveSafePath(ws.dir, filePath);
    if (!safePath) return res.status(400).json({ error: 'Invalid path', code: 'PATH_TRAVERSAL' });

    if (!fs.existsSync(safePath)) {
      return res.status(404).json({ error: 'File not found', code: 'NOT_FOUND' });
    }

    const stat = fs.statSync(safePath);
    if (stat.isDirectory()) {
      const entries = fs.readdirSync(safePath, { withFileTypes: true }).map((e) => ({
        name: e.name,
        type: e.isDirectory() ? 'directory' : 'file',
        size: e.isFile() ? fs.statSync(path.join(safePath, e.name)).size : undefined,
      }));
      touchWorkspace(req.params.workspaceId);
      return res.json({ type: 'directory', entries });
    }

    if (stat.size > FILE_WRITE_MAX_BYTES) {
      return res.status(413).json({ error: 'File too large to read via API (max 1 MB)', code: 'FILE_TOO_LARGE' });
    }

    const content = fs.readFileSync(safePath, 'utf-8');
    touchWorkspace(req.params.workspaceId);
    res.json({ type: 'file', content, path: filePath, size: stat.size });
  });

  router.put('/files/*', validateFileWrite, (req: Request, res: Response) => {
    const ws = getWs(req, res);
    if (!ws) return;

    const filePath = (req.params as any)[0] ?? '';
    const safePath = resolveSafePath(ws.dir, filePath);
    if (!safePath) return res.status(400).json({ error: 'Invalid path', code: 'PATH_TRAVERSAL' });

    const { content } = req.body;
    if (typeof content !== 'string') {
      return res.status(400).json({ error: 'content must be a string', code: 'MISSING_FIELD' });
    }

    const byteSize = Buffer.byteLength(content, 'utf8');
    if (byteSize > FILE_WRITE_MAX_BYTES) {
      return res.status(413).json({ error: 'File too large (max 1 MB)', code: 'FILE_TOO_LARGE' });
    }

    fs.mkdirSync(path.dirname(safePath), { recursive: true });
    fs.writeFileSync(safePath, content, 'utf-8');
    touchWorkspace(req.params.workspaceId);

    auditLog('file_written', { workspaceId: req.params.workspaceId, path: filePath, bytes: byteSize });
    res.json({ saved: true, path: filePath, bytes: byteSize });
  });

  router.delete('/files/*', (req: Request, res: Response) => {
    const ws = getWs(req, res);
    if (!ws) return;

    const filePath = (req.params as any)[0] ?? '';
    const safePath = resolveSafePath(ws.dir, filePath);
    if (!safePath) return res.status(400).json({ error: 'Invalid path', code: 'PATH_TRAVERSAL' });

    if (!fs.existsSync(safePath)) {
      return res.status(404).json({ error: 'File not found', code: 'NOT_FOUND' });
    }

    fs.rmSync(safePath, { recursive: true, force: true });
    touchWorkspace(req.params.workspaceId);
    auditLog('file_deleted', { workspaceId: req.params.workspaceId, path: filePath });
    res.json({ deleted: true, path: filePath });
  });

  return router;
}
