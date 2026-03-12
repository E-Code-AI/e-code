import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { getWorkspace, touchWorkspace, isDockerEnabled } from './workspace-manager';
import { validateFileWrite } from './security';
import { createLogger } from './logger';
import { auditLog } from './security';
import { getDockerManager } from './docker-manager';

const logger = createLogger('file-service');
const FILE_WRITE_MAX_BYTES = 1 * 1024 * 1024;

function resolveSafePath(workspaceDir: string, filePath: string): string | null {
  const resolved = path.resolve(workspaceDir, filePath.replace(/^\/+/, ''));
  if (!resolved.startsWith(workspaceDir + path.sep) && resolved !== workspaceDir) {
    return null;
  }
  return resolved;
}

function resolveContainerPath(filePath: string): string | null {
  const cleaned = filePath.replace(/^\/+/, '');
  const resolved = path.resolve('/workspace', cleaned);
  if (resolved !== '/workspace' && !resolved.startsWith('/workspace/')) {
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

  router.get('/files/*', async (req: Request, res: Response) => {
    const ws = getWs(req, res);
    if (!ws) return;

    const filePath = (req.params as any)[0] ?? '';
    const workspaceId = req.params.workspaceId;

    if (isDockerEnabled() && ws.containerId) {
      const containerPath = resolveContainerPath(filePath);
      if (!containerPath) {
        return res.status(400).json({ error: 'Invalid path', code: 'PATH_TRAVERSAL' });
      }

      try {
        const dockerMgr = getDockerManager();

        const statResult = await dockerMgr.execInContainer(workspaceId,
          ['stat', '--format=%F', containerPath],
          { timeout: 5000 }
        );

        if (statResult.exitCode !== 0) {
          return res.status(404).json({ error: 'File not found', code: 'NOT_FOUND' });
        }

        const fileType = statResult.stdout.trim();

        if (fileType === 'directory') {
          const lsResult = await dockerMgr.execInContainer(
            workspaceId,
            ['python3', '-c', `
import os, json, sys
p = sys.argv[1]
entries = []
for name in sorted(os.listdir(p)):
    fp = os.path.join(p, name)
    try:
        st = os.stat(fp)
        entries.append({"name": name, "type": "directory" if os.path.isdir(fp) else "file", "size": st.st_size if not os.path.isdir(fp) else None})
    except: pass
print(json.dumps(entries))
`, containerPath],
            { timeout: 5000 }
          );

          let entries: any[] = [];
          try {
            entries = JSON.parse(lsResult.stdout.trim());
          } catch {
            entries = [];
          }

          touchWorkspace(workspaceId);
          return res.json({ type: 'directory', entries });
        }

        const sizeResult = await dockerMgr.execInContainer(
          workspaceId,
          ['stat', '--format=%s', containerPath],
          { timeout: 5000 }
        );
        const fileSize = parseInt(sizeResult.stdout.trim(), 10);

        if (fileSize > FILE_WRITE_MAX_BYTES) {
          return res.status(413).json({ error: 'File too large to read via API (max 1 MB)', code: 'FILE_TOO_LARGE' });
        }

        const catResult = await dockerMgr.execInContainer(
          workspaceId,
          ['cat', containerPath],
          { timeout: 5000 }
        );

        touchWorkspace(workspaceId);
        return res.json({ type: 'file', content: catResult.stdout, path: filePath, size: fileSize });

      } catch (err) {
        logger.error(`Docker file read error for workspace ${workspaceId}: ${err}`);
        return res.status(500).json({ error: 'Failed to read file from container', code: 'CONTAINER_ERROR' });
      }
    }

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
      touchWorkspace(workspaceId);
      return res.json({ type: 'directory', entries });
    }

    if (stat.size > FILE_WRITE_MAX_BYTES) {
      return res.status(413).json({ error: 'File too large to read via API (max 1 MB)', code: 'FILE_TOO_LARGE' });
    }

    const content = fs.readFileSync(safePath, 'utf-8');
    touchWorkspace(workspaceId);
    res.json({ type: 'file', content, path: filePath, size: stat.size });
  });

  router.put('/files/*', validateFileWrite, async (req: Request, res: Response) => {
    const ws = getWs(req, res);
    if (!ws) return;

    const filePath = (req.params as any)[0] ?? '';
    const workspaceId = req.params.workspaceId;

    const { content } = req.body;
    if (typeof content !== 'string') {
      return res.status(400).json({ error: 'content must be a string', code: 'MISSING_FIELD' });
    }

    const byteSize = Buffer.byteLength(content, 'utf8');
    if (byteSize > FILE_WRITE_MAX_BYTES) {
      return res.status(413).json({ error: 'File too large (max 1 MB)', code: 'FILE_TOO_LARGE' });
    }

    if (isDockerEnabled() && ws.containerId) {
      const containerPath = resolveContainerPath(filePath);
      if (!containerPath) {
        return res.status(400).json({ error: 'Invalid path', code: 'PATH_TRAVERSAL' });
      }

      try {
        const dockerMgr = getDockerManager();

        await dockerMgr.writeFileToContainer(workspaceId, containerPath, content);

        touchWorkspace(workspaceId);
        auditLog('file_written', { workspaceId, path: filePath, bytes: byteSize, docker: true });
        return res.json({ saved: true, path: filePath, bytes: byteSize });
      } catch (err) {
        logger.error(`Docker file write error for workspace ${workspaceId}: ${err}`);
        return res.status(500).json({ error: 'Failed to write file to container', code: 'CONTAINER_ERROR' });
      }
    }

    const safePath = resolveSafePath(ws.dir, filePath);
    if (!safePath) return res.status(400).json({ error: 'Invalid path', code: 'PATH_TRAVERSAL' });

    fs.mkdirSync(path.dirname(safePath), { recursive: true });
    fs.writeFileSync(safePath, content, 'utf-8');
    touchWorkspace(workspaceId);

    auditLog('file_written', { workspaceId, path: filePath, bytes: byteSize });
    res.json({ saved: true, path: filePath, bytes: byteSize });
  });

  router.delete('/files/*', async (req: Request, res: Response) => {
    const ws = getWs(req, res);
    if (!ws) return;

    const filePath = (req.params as any)[0] ?? '';
    const workspaceId = req.params.workspaceId;

    if (isDockerEnabled() && ws.containerId) {
      const containerPath = resolveContainerPath(filePath);
      if (!containerPath) {
        return res.status(400).json({ error: 'Invalid path', code: 'PATH_TRAVERSAL' });
      }

      try {
        const dockerMgr = getDockerManager();

        const checkResult = await dockerMgr.execInContainer(
          workspaceId,
          ['test', '-e', containerPath],
          { timeout: 5000 }
        );

        if (checkResult.exitCode !== 0) {
          return res.status(404).json({ error: 'File not found', code: 'NOT_FOUND' });
        }

        await dockerMgr.execInContainer(
          workspaceId,
          ['rm', '-rf', containerPath],
          { timeout: 5000 }
        );

        touchWorkspace(workspaceId);
        auditLog('file_deleted', { workspaceId, path: filePath, docker: true });
        return res.json({ deleted: true, path: filePath });
      } catch (err) {
        logger.error(`Docker file delete error for workspace ${workspaceId}: ${err}`);
        return res.status(500).json({ error: 'Failed to delete file from container', code: 'CONTAINER_ERROR' });
      }
    }

    const safePath = resolveSafePath(ws.dir, filePath);
    if (!safePath) return res.status(400).json({ error: 'Invalid path', code: 'PATH_TRAVERSAL' });

    if (!fs.existsSync(safePath)) {
      return res.status(404).json({ error: 'File not found', code: 'NOT_FOUND' });
    }

    fs.rmSync(safePath, { recursive: true, force: true });
    touchWorkspace(workspaceId);
    auditLog('file_deleted', { workspaceId, path: filePath });
    res.json({ deleted: true, path: filePath });
  });

  return router;
}
