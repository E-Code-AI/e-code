/**
 * Workspace Manager
 *
 * Each workspace is an isolated directory under RUNNER_WORKSPACES_DIR.
 * It tracks running processes (preview server) and metadata.
 *
 * Isolation strategy (no Docker required):
 * - Filesystem: each workspace gets /tmp/runner-workspaces/<id>/
 * - Processes: tracked by PID, killed on workspace stop
 * - Environment: only whitelisted safe vars passed to child processes
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { randomUUID } from 'crypto';
import { spawn, ChildProcess } from 'child_process';
import { createLogger } from './logger';

const logger = createLogger('workspace-manager');

const WORKSPACES_DIR = process.env.RUNNER_WORKSPACES_DIR
  ?? path.join(os.tmpdir(), 'runner-workspaces');

export type WorkspaceStatus = 'starting' | 'running' | 'stopped' | 'error';

export interface Workspace {
  id: string;
  projectId: string;
  dir: string;
  status: WorkspaceStatus;
  previewPort: number | null;
  previewProcess: ChildProcess | null;
  createdAt: Date;
  lastActiveAt: Date;
}

const workspaces = new Map<string, Workspace>();

// Ensure the root workspaces dir exists
if (!fs.existsSync(WORKSPACES_DIR)) {
  fs.mkdirSync(WORKSPACES_DIR, { recursive: true });
}

function allocatePort(): number {
  return 30000 + Math.floor(Math.random() * 5000);
}

export function createWorkspace(projectId: string): Workspace {
  const id = randomUUID();
  const dir = path.join(WORKSPACES_DIR, id);
  fs.mkdirSync(dir, { recursive: true });

  const workspace: Workspace = {
    id,
    projectId,
    dir,
    status: 'running',
    previewPort: null,
    previewProcess: null,
    createdAt: new Date(),
    lastActiveAt: new Date(),
  };

  workspaces.set(id, workspace);
  logger.info(`Workspace created: ${id} for project ${projectId} at ${dir}`);
  return workspace;
}

export function getWorkspace(id: string): Workspace | undefined {
  return workspaces.get(id);
}

export function listWorkspaces(): Workspace[] {
  return Array.from(workspaces.values());
}

export function stopWorkspace(id: string): boolean {
  const ws = workspaces.get(id);
  if (!ws) return false;

  if (ws.previewProcess && !ws.previewProcess.killed) {
    try {
      process.kill(-ws.previewProcess.pid!, 'SIGTERM');
    } catch {
      ws.previewProcess.kill('SIGTERM');
    }
  }

  ws.status = 'stopped';

  try {
    fs.rmSync(ws.dir, { recursive: true, force: true });
  } catch (e) {
    logger.warn(`Could not remove workspace dir ${ws.dir}: ${e}`);
  }

  workspaces.delete(id);
  logger.info(`Workspace stopped: ${id}`);
  return true;
}

export function touchWorkspace(id: string): void {
  const ws = workspaces.get(id);
  if (ws) ws.lastActiveAt = new Date();
}

// Periodically stop idle workspaces (> 2 hours idle)
const IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [id, ws] of workspaces) {
    if (now - ws.lastActiveAt.getTime() > IDLE_TIMEOUT_MS) {
      logger.info(`Stopping idle workspace ${id}`);
      stopWorkspace(id);
    }
  }
}, 10 * 60 * 1000);
