import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { randomUUID } from 'crypto';
import { ChildProcess } from 'child_process';
import { createLogger } from './logger';
import { auditLog } from './security';
import { getDockerManager, ContainerInfo } from './docker-manager';

const logger = createLogger('workspace-manager');

const WORKSPACES_DIR = process.env.RUNNER_WORKSPACES_DIR
  ?? path.join(os.tmpdir(), 'runner-workspaces');

const IDLE_TTL_SEC = parseInt(process.env.WORKSPACE_IDLE_TTL_SEC ?? '3600', 10);
const IDLE_TIMEOUT_MS = IDLE_TTL_SEC * 1000;

const DOCKER_ENABLED = process.env.DOCKER_ENABLED !== 'false';

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
  containerId?: string;
  containerInfo?: ContainerInfo;
}

const workspaces = new Map<string, Workspace>();

if (!fs.existsSync(WORKSPACES_DIR)) {
  fs.mkdirSync(WORKSPACES_DIR, { recursive: true });
}

function allocatePort(): number {
  return 30000 + Math.floor(Math.random() * 5000);
}

type StopHook = (workspaceId: string) => void;
const stopHooks: StopHook[] = [];

export function onWorkspaceStop(hook: StopHook): void {
  stopHooks.push(hook);
}

export async function createWorkspace(projectId: string, userId = 'unknown'): Promise<Workspace> {
  const id = randomUUID();

  let dir: string;
  let containerId: string | undefined;
  let containerInfo: ContainerInfo | undefined;

  if (DOCKER_ENABLED) {
    try {
      const dockerMgr = getDockerManager();
      containerInfo = await dockerMgr.createContainer(id);
      containerId = containerInfo.containerId;
      dir = containerInfo.volumePath || path.join(WORKSPACES_DIR, id);
      logger.info(`Workspace ${id} backed by Docker container ${containerId?.slice(0, 12)}`);
    } catch (err) {
      logger.warn(`Docker container creation failed, falling back to directory isolation: ${err}`);
      dir = path.join(WORKSPACES_DIR, id);
      fs.mkdirSync(dir, { recursive: true });
    }
  } else {
    dir = path.join(WORKSPACES_DIR, id);
    fs.mkdirSync(dir, { recursive: true });
  }

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
    containerId,
    containerInfo,
  };

  workspaces.set(id, workspace);
  auditLog('workspace_created', {
    workspaceId: id,
    projectId,
    userId,
    dockerEnabled: DOCKER_ENABLED,
    containerId: containerId?.slice(0, 12),
  });
  return workspace;
}

export function getWorkspace(id: string): Workspace | undefined {
  return workspaces.get(id);
}

export function listWorkspaces(): Workspace[] {
  return Array.from(workspaces.values());
}

export async function stopWorkspace(id: string, reason = 'manual'): Promise<boolean> {
  const ws = workspaces.get(id);
  if (!ws) return false;

  if (ws.previewProcess && !ws.previewProcess.killed) {
    try {
      process.kill(-ws.previewProcess.pid!, 'SIGTERM');
    } catch {
      try { ws.previewProcess.kill('SIGTERM'); } catch {}
    }
  }

  for (const hook of stopHooks) {
    try { hook(id); } catch (e) {
      logger.warn(`Stop hook error for workspace ${id}: ${e}`);
    }
  }

  ws.status = 'stopped';

  if (DOCKER_ENABLED && ws.containerId) {
    try {
      const dockerMgr = getDockerManager();
      await dockerMgr.stopContainer(id);
      logger.info(`Docker container for workspace ${id} stopped and removed`);
    } catch (err) {
      logger.warn(`Failed to stop Docker container for workspace ${id}: ${err}`);
    }
  }

  try {
    if (fs.existsSync(ws.dir)) {
      fs.rmSync(ws.dir, { recursive: true, force: true });
    }
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

export function isDockerEnabled(): boolean {
  return DOCKER_ENABLED;
}

setInterval(() => {
  const now = Date.now();
  for (const [id, ws] of workspaces) {
    const idleMs = now - ws.lastActiveAt.getTime();
    if (idleMs > IDLE_TIMEOUT_MS) {
      logger.info(`Stopping idle workspace ${id} (idle ${Math.round(idleMs / 1000)}s > TTL ${IDLE_TTL_SEC}s)`);
      stopWorkspace(id, 'idle_ttl');
    }
  }
}, Math.min(IDLE_TIMEOUT_MS / 4, 15 * 60 * 1000));
