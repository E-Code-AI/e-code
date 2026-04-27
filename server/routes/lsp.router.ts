import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import { Request, Response, Router } from 'express';
import { ensureAuthenticated } from '../middleware/auth';
import { storage } from '../storage';
import { createLogger } from '../utils/logger';
import { ensureProjectDirectory } from '../utils/project-fs-sync';
import { redactErrorForLog } from '../utils/error-redaction';

const logger = createLogger('lsp-router');
const router = Router();

type SupportedLsp = 'typescript' | 'python' | 'go' | 'rust';

interface LspSession {
  projectId: string;
  language: SupportedLsp;
  process: ChildProcessWithoutNullStreams;
  buffer: Buffer;
  pending: Map<number, { resolve: (value: any) => void; reject: (error: Error) => void; timer: NodeJS.Timeout }>;
  nextId: number;
  startedAt: number;
  lastActivity: number;
}

const sessions = new Map<string, LspSession>();

function sessionKey(projectId: string, language: SupportedLsp): string {
  return `${projectId}:${language}`;
}

function commandFor(language: SupportedLsp): { cmd: string; args: string[] } {
  switch (language) {
    case 'typescript':
      return { cmd: 'typescript-language-server', args: ['--stdio'] };
    case 'python':
      return { cmd: 'pyright-langserver', args: ['--stdio'] };
    case 'go':
      return { cmd: 'gopls', args: [] };
    case 'rust':
      return { cmd: 'rust-analyzer', args: [] };
  }
}

function parseFrames(session: LspSession): void {
  while (true) {
    const headerEnd = session.buffer.indexOf('\r\n\r\n');
    if (headerEnd === -1) return;

    const header = session.buffer.slice(0, headerEnd).toString('utf8');
    const match = header.match(/Content-Length:\s*(\d+)/i);
    if (!match) {
      session.buffer = session.buffer.slice(headerEnd + 4);
      continue;
    }

    const length = Number(match[1]);
    const frameStart = headerEnd + 4;
    const frameEnd = frameStart + length;
    if (session.buffer.length < frameEnd) return;

    const payload = session.buffer.slice(frameStart, frameEnd).toString('utf8');
    session.buffer = session.buffer.slice(frameEnd);

    try {
      const message = JSON.parse(payload);
      if (typeof message.id === 'number') {
        const pending = session.pending.get(message.id);
        if (pending) {
          clearTimeout(pending.timer);
          session.pending.delete(message.id);
          pending.resolve(message);
        }
      }
    } catch (error) {
      logger.warn(`[LSP] Failed to parse response frame for ${session.projectId}:${session.language}: ${error}`);
    }
  }
}

async function getSession(projectId: string, language: SupportedLsp): Promise<LspSession> {
  const key = sessionKey(projectId, language);
  const existing = sessions.get(key);
  if (existing && !existing.process.killed) {
    existing.lastActivity = Date.now();
    return existing;
  }

  const cwd = await ensureProjectDirectory(projectId);
  const command = commandFor(language);
  const child = spawn(command.cmd, command.args, {
    cwd,
    env: { ...process.env },
    stdio: 'pipe',
  }) as ChildProcessWithoutNullStreams;

  const session: LspSession = {
    projectId,
    language,
    process: child,
    buffer: Buffer.alloc(0),
    pending: new Map(),
    nextId: 1,
    startedAt: Date.now(),
    lastActivity: Date.now(),
  };

  child.stdout.on('data', (chunk) => {
    session.buffer = Buffer.concat([session.buffer, chunk]);
    parseFrames(session);
  });

  child.stderr.on('data', (chunk) => {
    logger.warn(`[LSP:${language}] ${chunk.toString('utf8').trim()}`);
  });

  child.on('close', () => {
    for (const pending of session.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error('LSP server exited'));
    }
    sessions.delete(key);
  });

  child.on('error', (error) => {
    logger.error(`[LSP] Failed to start ${language} server:`, redactErrorForLog(error));
  });

  sessions.set(key, session);
  return session;
}

function sendRequest(session: LspSession, method: string, params?: unknown): Promise<any> {
  const id = session.nextId++;
  const payload = JSON.stringify({ jsonrpc: '2.0', id, method, params });
  const frame = `Content-Length: ${Buffer.byteLength(payload, 'utf8')}\r\n\r\n${payload}`;
  session.lastActivity = Date.now();
  session.process.stdin.write(frame);

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      session.pending.delete(id);
      reject(new Error(`LSP request timed out: ${method}`));
    }, 15000);
    session.pending.set(id, { resolve, reject, timer });
  });
}

function isSupportedLanguage(value: string): value is SupportedLsp {
  return value === 'typescript' || value === 'python' || value === 'go' || value === 'rust';
}

async function ensureProjectAccess(req: Request, res: Response, next: any) {
  const projectId = String(req.params.projectId || '');
  const userId = (req as any).user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const project = await storage.getProject(projectId);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  if (project.ownerId === userId) {
    return next();
  }
  const collaborators = await storage.getProjectCollaborators(projectId);
  if (collaborators.some((collaborator: any) => collaborator.userId === userId)) {
    return next();
  }
  return res.status(403).json({ error: 'Access denied' });
}

router.use('/:projectId', ensureAuthenticated, ensureProjectAccess);

router.post('/:projectId/:language/start', async (req: Request, res: Response) => {
  const { projectId, language } = req.params;
  if (!isSupportedLanguage(language)) {
    return res.status(400).json({ error: 'Unsupported LSP language' });
  }
  try {
    const session = await getSession(projectId, language);
    res.json({ success: true, language, pid: session.process.pid, startedAt: session.startedAt });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:projectId/:language/request', async (req: Request, res: Response) => {
  const { projectId, language } = req.params;
  const { method, params } = req.body || {};
  if (!isSupportedLanguage(language)) {
    return res.status(400).json({ error: 'Unsupported LSP language' });
  }
  if (!method || typeof method !== 'string') {
    return res.status(400).json({ error: 'LSP method is required' });
  }
  try {
    const session = await getSession(projectId, language);
    const response = await sendRequest(session, method, params);
    res.json(response);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:projectId/status', (req: Request, res: Response) => {
  const { projectId } = req.params;
  const active = Array.from(sessions.values())
    .filter(session => session.projectId === projectId)
    .map(session => ({
      language: session.language,
      pid: session.process.pid,
      startedAt: session.startedAt,
      lastActivity: session.lastActivity,
      pending: session.pending.size,
    }));
  res.json({ sessions: active });
});

router.post('/:projectId/:language/stop', (req: Request, res: Response) => {
  const { projectId, language } = req.params;
  if (!isSupportedLanguage(language)) {
    return res.status(400).json({ error: 'Unsupported LSP language' });
  }
  const key = sessionKey(projectId, language);
  const session = sessions.get(key);
  if (session) {
    session.process.kill('SIGTERM');
    sessions.delete(key);
  }
  res.json({ success: true });
});

setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [key, session] of sessions.entries()) {
    if (session.lastActivity < cutoff) {
      session.process.kill('SIGTERM');
      sessions.delete(key);
    }
  }
}, 60_000).unref();

export default router;
