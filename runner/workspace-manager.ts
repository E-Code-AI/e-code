/**
 * Workspace Manager
 *
 * Each workspace is an isolated directory under RUNNER_WORKSPACES_DIR.
 * Idle TTL is controlled by WORKSPACE_IDLE_TTL_SEC (default: 3600 = 1 hour).
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { randomUUID } from 'crypto';
import { spawn, ChildProcess } from 'child_process';
import { createLogger } from './logger';
import { auditLog } from './security';

const logger = createLogger('workspace-manager');

const WORKSPACES_DIR = process.env.RUNNER_WORKSPACES_DIR
  ?? path.join(os.tmpdir(), 'runner-workspaces');

const IDLE_TTL_SEC = parseInt(process.env.WORKSPACE_IDLE_TTL_SEC ?? '3600', 10);
const IDLE_TIMEOUT_MS = IDLE_TTL_SEC * 1000;

export type WorkspaceStatus = 'starting' | 'running' | 'stopped' | 'error';

export interface Workspace {
  id: string;
  projectId: string;
  userId: string;
  dir: string;
  status: WorkspaceStatus;
  previewPort: number | null;
  previewProcess: ChildProcess | null;
  createdAt: Date;
  lastActiveAt: Date;
}

const workspaces = new Map<string, Workspace>();

if (!fs.existsSync(WORKSPACES_DIR)) {
  fs.mkdirSync(WORKSPACES_DIR, { recursive: true });
}

function allocatePort(): number {
  return 30000 + Math.floor(Math.random() * 5000);
}

export function createWorkspace(projectId: string, userId = 'unknown'): Workspace {
  const id = randomUUID();
  const dir = path.join(WORKSPACES_DIR, id);
  fs.mkdirSync(dir, { recursive: true });

  const workspace: Workspace = {
    id,
    projectId,
    userId,
    dir,
    status: 'running',
    previewPort: null,
    previewProcess: null,
    createdAt: new Date(),
    lastActiveAt: new Date(),
  };

  workspaces.set(id, workspace);
  auditLog('workspace_created', { workspaceId: id, projectId, userId });
  return workspace;
}

export function getWorkspace(id: string): Workspace | undefined {
  return workspaces.get(id);
}

export function listWorkspaces(): Workspace[] {
  return Array.from(workspaces.values());
}

export function stopWorkspace(id: string, reason = 'manual'): boolean {
  const ws = workspaces.get(id);
  if (!ws) return false;

  if (ws.previewProcess && !ws.previewProcess.killed) {
    try {
      process.kill(-ws.previewProcess.pid!, 'SIGTERM');
    } catch {
      try { ws.previewProcess.kill('SIGTERM'); } catch {}
    }
  }

  ws.status = 'stopped';

  try {
    fs.rmSync(ws.dir, { recursive: true, force: true });
  } catch (e) {
    logger.warn(`Could not remove workspace dir ${ws.dir}: ${e}`);
  }

  workspaces.delete(id);
  auditLog('workspace_stopped', { workspaceId: id, projectId: ws.projectId, reason });
  return true;
}

export function touchWorkspace(id: string): void {
  const ws = workspaces.get(id);
  if (ws) ws.lastActiveAt = new Date();
}

// Idle TTL enforcement
setInterval(() => {
  const now = Date.now();
  for (const [id, ws] of workspaces) {
    const idleMs = now - ws.lastActiveAt.getTime();
    if (idleMs > IDLE_TIMEOUT_MS) {
      logger.info(`Stopping idle workspace ${id} (idle ${Math.round(idleMs / 1000)}s > TTL ${IDLE_TTL_SEC}s)`);
      stopWorkspace(id, 'idle_ttl');
    }
  }
}, Math.min(IDLE_TIMEOUT_MS / 4, 15 * 60 * 1000)); // check at 1/4 of TTL, max 15min
