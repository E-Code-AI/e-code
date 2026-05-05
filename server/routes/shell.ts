import { parse as parseCookie } from 'cookie';
import * as signature from 'cookie-signature';
import { Router } from 'express';
import * as fsSync from 'fs';
import * as fs from 'fs/promises';
import type { IncomingMessage } from 'http';
import * as os from 'os';
import * as path from 'path';
import type { Duplex } from 'stream';
import { WebSocket,WebSocketServer } from 'ws';
import { ensureAuthenticated } from '../middleware/auth';
import { sessionStore,storage } from '../storage';
import { createLogger } from '../utils/logger';
import { bulkSyncProjectFiles,ensureProjectDirectory,getProjectWorkspacePath } from '../utils/project-fs-sync';
import { safePath } from '../utils/safe-path';
import { centralUpgradeDispatcher } from '../websocket/central-upgrade-dispatcher';
import { redactErrorForLog } from '../utils/error-redaction';

const logger = createLogger('shell-router');
const router = Router();

// Production limits
const MAX_SESSIONS_PER_USER = 5;
const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const SCROLLBACK_SIZE = 5000; // lines / chunks
const OUTPUT_RATE_LIMIT_BYTES = 500_000; // 500 KB/s max per session
const OUTPUT_RATE_WINDOW_MS = 1000;

function resolveShellBinary(): string {
  if (process.platform === 'win32') {
    return process.env.COMSPEC || 'powershell.exe';
  }

  const isReplitVm = Boolean(process.env.REPL_ID || process.env.REPLIT_DEPLOYMENT);
  if (isReplitVm) {
    return '/bin/sh';
  }

  const candidateShells = [
    '/nix/store/d6mad4dkf6akii90k26dinhrg8a3xia8-replit-runtime-path/bin/bash',
    '/bin/bash',
    '/bin/sh',
    process.env.SHELL,
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidateShells) {
    try {
      if (candidate.startsWith('/') && fsSync.existsSync(candidate)) {
        return candidate;
      }
      if (!candidate.startsWith('/')) {
        return candidate;
      }
    } catch {
      // Ignore and continue to the next candidate.
    }
  }

  return '/bin/sh';
}

function getInteractiveShellArgs(shellBinary: string): string[] {
  const shellName = path.basename(shellBinary).toLowerCase();

  if (shellName.includes('bash')) {
    return ['--noprofile', '--norc', '-i'];
  }

  if (shellName.includes('zsh')) {
    return ['-f', '-i'];
  }

  return ['-i'];
}

function buildShellEnv(userHome: string, userId: number, shellBinary: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin',
    HOME: userHome,
    PWD: userHome,
    SHELL: shellBinary,
    USER: `user${userId}`,
    LOGNAME: `user${userId}`,
    TERM: 'xterm-256color',
    COLORTERM: 'truecolor',
    LANG: 'en_US.UTF-8',
    LC_ALL: 'en_US.UTF-8',
    TMPDIR: '/tmp',
  };
}

/** Circular scrollback buffer */
class ScrollbackBuffer {
  private chunks: string[] = [];
  constructor(private maxSize: number) {}

  push(data: string): void {
    this.chunks.push(data);
    if (this.chunks.length > this.maxSize) {
      this.chunks.shift();
    }
  }

  replay(): string {
    return this.chunks.join('');
  }

  clear(): void {
    this.chunks = [];
  }
}

interface ShellSession {
  id: string;
  userId: number;
  projectId: string | null;
  process: any;
  cwd: string;
  created: Date;
  lastActivity: Date;
  clients: Set<WebSocket>;
  scrollback: ScrollbackBuffer;
  idleTimer: NodeJS.Timeout | null;
  memoryTimer: NodeJS.Timeout | null; // per-session RSS watchdog
  // Rate limiting state
  bytesThisWindow: number;
  windowStart: number;
  dropping: boolean;
}

// Global session store (persists across reconnects) — single source of truth.
// Exported so shell.router.ts can share this map without a separate session store.
export const shellSessions = new Map<string, ShellSession>();
// userId -> Set of sessionIds (for per-user limits)
const userSessionIndex = new Map<number, Set<string>>();
let ptyModule: typeof import('node-pty') | null = null;

// Prometheus-style counters
const metrics = {
  activeSessions: 0,
  totalCreated: 0,
  totalDestroyed: 0,
  totalBytesOut: 0,
  totalReconnects: 0,
  droppedFrames: 0,
  peakRssBytes: 0, // tracked by memory watchdog
};

export function handleShellClientMessage(
  raw: string,
  shell: { write: (data: string) => void; resize: (cols: number, rows: number) => void }
): 'input' | 'resize' | 'raw' {
  try {
    const message = JSON.parse(raw);

    if (message.type === 'input' && typeof message.data === 'string') {
      shell.write(message.data);
      return 'input';
    }

    if (message.type === 'resize' && Number.isFinite(message.cols) && Number.isFinite(message.rows)) {
      shell.resize(
        Math.max(1, Number(message.cols)),
        Math.max(1, Number(message.rows))
      );
      return 'resize';
    }
  } catch {
    // Fall back to raw writes for legacy clients.
  }

  shell.write(raw);
  return 'raw';
}

async function getPty(): Promise<typeof import('node-pty')> {
  if (!ptyModule) {
    ptyModule = await import('node-pty');
  }
  return ptyModule;
}

// ── Per-session resource controls ────────────────────────────────────────────
const MAX_SESSION_RSS_BYTES = 512 * 1024 * 1024; // 512 MB RSS limit per shell
const MEMORY_POLL_INTERVAL_MS = 10_000;           // check every 10 s

/** Lower CPU scheduling priority and start a periodic memory watchdog. */
function applyResourceLimits(sessionId: string, pid: number | undefined): void {
  if (!pid) return;

  // ── CPU priority ──────────────────────────────────────────────────────────
  try {
    // nice value 10 = lower-than-default scheduling priority.
    // os.setPriority is the canonical Node API; process.setPriority isn't
    // declared on @types/node.
    os.setPriority(pid, 10);
    logger.debug(`[Shell] Set nice=10 for PID ${pid} (session ${sessionId})`);
  } catch {
    // Not all platforms / privilege levels support this — ignore
  }

  // ── Memory watchdog ───────────────────────────────────────────────────────
  const timer = setInterval(async () => {
    const session = shellSessions.get(sessionId);
    if (!session) {
      clearInterval(timer);
      return;
    }

    // Read /proc/{pid}/status on Linux to get the RSS without spawning a child
    try {
      const status = await fs.readFile(`/proc/${pid}/status`, 'utf8');
      const match = status.match(/VmRSS:\s+(\d+)\s+kB/);
      if (match) {
        const rssBytes = parseInt(match[1]) * 1024;
        metrics.peakRssBytes = Math.max(metrics.peakRssBytes ?? 0, rssBytes);
        if (rssBytes > MAX_SESSION_RSS_BYTES) {
          logger.warn(
            `[Shell] Session ${sessionId} exceeded RSS limit ` +
            `(${Math.round(rssBytes / 1024 / 1024)} MB > ${Math.round(MAX_SESSION_RSS_BYTES / 1024 / 1024)} MB), killing`
          );
          const notice = `\r\n\x1b[1;31m✗ Shell process exceeded memory limit (${Math.round(MAX_SESSION_RSS_BYTES / 1024 / 1024)} MB) and was stopped.\x1b[0m\r\n`;
          for (const client of session.clients) {
            if (client.readyState === WebSocket.OPEN) client.send(notice);
          }
          destroySession(sessionId);
          clearInterval(timer);
        }
      }
    } catch {
      // Process may have already exited or /proc unavailable (non-Linux)
    }
  }, MEMORY_POLL_INTERVAL_MS);

  // Store the timer reference on the typed session field
  const session = shellSessions.get(sessionId);
  if (session) {
    session.memoryTimer = timer;
  }
}

async function getAuthenticatedUserIdFromUpgrade(req: IncomingMessage): Promise<number | null> {
  const requestUser = (req as any).user;
  if (Number.isInteger(requestUser?.id)) {
    return requestUser.id;
  }

  try {
    const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const bootstrapToken = requestUrl.searchParams.get('bootstrap') || requestUrl.searchParams.get('bootstrapToken');
    if (bootstrapToken) {
      const jwt = await import('jsonwebtoken');
      const { getJwtSecret } = await import('../utils/secrets-manager');
      const decoded = jwt.default.verify(bootstrapToken, getJwtSecret()) as {
        type?: string;
        userId?: number;
      };

      if (decoded?.type === 'agent_bootstrap' && Number.isInteger(decoded.userId)) {
        return decoded.userId!;
      }
    }
  } catch (error) {
    logger.debug('Shell bootstrap token validation failed:', error);
  }

  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    return null;
  }

  try {
    const cookies = parseCookie(cookieHeader);
    const rawSessionCookie = cookies['ecode.sid'] || cookies['connect.sid'];
    if (!rawSessionCookie) {
      return null;
    }

    const sessionSecret = process.env.SESSION_SECRET;
    if (!sessionSecret) {
      logger.error('[Shell] SESSION_SECRET env var is not set — cannot authenticate cookie session');
      return null;
    }
    let sessionId: string | null = null;

    if (rawSessionCookie.startsWith('s:')) {
      const unsigned = signature.unsign(rawSessionCookie.slice(2), sessionSecret);
      if (unsigned !== false) {
        sessionId = unsigned;
      }
    } else {
      sessionId = rawSessionCookie;
    }

    if (!sessionId) {
      return null;
    }

    return await new Promise<number | null>((resolve) => {
      sessionStore.get(sessionId!, (err: any, session: any) => {
        if (err || !session?.passport?.user) {
          resolve(null);
          return;
        }
        const userId = Number(session.passport.user);
        resolve(Number.isInteger(userId) ? userId : null);
      });
    });
  } catch (error) {
    logger.error('Failed to authenticate shell upgrade request:', redactErrorForLog(error));
    return null;
  }
}

async function ensureSpawnCwd(preferredCwd: string, fallbackCwd: string): Promise<string> {
  try {
    await fs.mkdir(preferredCwd, { recursive: true });
    return preferredCwd;
  } catch (error) {
    logger.warn(`Failed to ensure shell cwd ${preferredCwd}, falling back to ${fallbackCwd}: ${error}`);
    await fs.mkdir(fallbackCwd, { recursive: true });
    return fallbackCwd;
  }
}

function scheduleIdleCleanup(sessionId: string): void {
  const session = shellSessions.get(sessionId);
  if (!session) return;

  if (session.idleTimer) {
    clearTimeout(session.idleTimer);
  }

  session.idleTimer = setTimeout(() => {
    const s = shellSessions.get(sessionId);
    if (s && s.clients.size === 0) {
      logger.info(`[Shell] Idle timeout reached for session ${sessionId}, cleaning up`);
      destroySession(sessionId);
    }
  }, IDLE_TIMEOUT_MS);
}

export function destroySession(sessionId: string): void {
  const session = shellSessions.get(sessionId);
  if (!session) return;

  if (session.idleTimer) {
    clearTimeout(session.idleTimer);
    session.idleTimer = null;
  }

  // Clean up memory watchdog timer
  if (session.memoryTimer) {
    clearInterval(session.memoryTimer);
    session.memoryTimer = null;
  }

  // Notify all remaining clients
  for (const ws of session.clients) {
    try {
      ws.send('\r\n\x1b[1;33m⚠ Session ended (idle timeout or server shutdown)\x1b[0m\r\n');
      ws.close(1000, 'Session ended');
    } catch {}
  }
  session.clients.clear();

  try {
    session.process.kill();
  } catch {}

  shellSessions.delete(sessionId);

  // Remove from user index
  const userSessions = userSessionIndex.get(session.userId);
  if (userSessions) {
    userSessions.delete(sessionId);
    if (userSessions.size === 0) {
      userSessionIndex.delete(session.userId);
    }
  }

  metrics.activeSessions = shellSessions.size;
  metrics.totalDestroyed++;

  logger.info(`[Shell] Session ${sessionId} destroyed (active: ${metrics.activeSessions})`);
}

// WebSocket server for shell connections (noServer mode)
let shellWss: WebSocketServer | null = null;

// Clean up sessions exceeding 24 hours regardless
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of shellSessions.entries()) {
    if (now - session.created.getTime() > 24 * 60 * 60 * 1000) {
      logger.info(`[Shell] Cleaning up session ${sessionId} (24h limit)`);
      destroySession(sessionId);
    }
  }
}, 60 * 60 * 1000);

function initializeShellWebSocket() {
  if (shellWss) return;
  
  shellWss = new WebSocketServer({ noServer: true });
  
  shellWss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const sessionId = url.searchParams.get('sessionId');
    const projectId = url.searchParams.get('projectId');
    
    const userId = await getAuthenticatedUserIdFromUpgrade(req);
    
    if (!sessionId) {
      ws.close(1008, 'Session ID required');
      return;
    }

    if (!userId || !Number.isInteger(userId) || userId < 0) {
      ws.close(1008, 'Authentication required');
      return;
    }
    
    if (projectId) {
      try {
        const { storage: _storage } = await import('../storage');
        const project = await _storage.getProject(projectId);
        const hasAccess = !!project && (
          project.ownerId === userId ||
          await _storage.isProjectCollaborator(projectId, userId)
        );
        if (!hasAccess) {
          ws.close(1008, 'Access denied: You do not have access to this project');
          return;
        }
      } catch (error) {
        logger.error('Failed to validate project access:', redactErrorForLog(error));
        ws.close(1008, 'Project validation failed');
        return;
      }
    }

    // --- Session reuse: check if this sessionId already has a live PTY ---
    const existingSession = shellSessions.get(sessionId);

    if (existingSession) {
      // Security: ensure the reconnecting user owns this session
      if (existingSession.userId !== userId) {
        ws.close(1008, 'Session does not belong to this user');
        return;
      }

      logger.info(`[Shell] Client reattaching to session ${sessionId}`);
      metrics.totalReconnects++;

      // Cancel idle timer since we have a client again
      if (existingSession.idleTimer) {
        clearTimeout(existingSession.idleTimer);
        existingSession.idleTimer = null;
      }

      existingSession.clients.add(ws);
      existingSession.lastActivity = new Date();

      // Replay scrollback buffer so client sees prior output
      const history = existingSession.scrollback.replay();
      if (history) {
        ws.send(history);
      }

      // IMPORTANT: Do NOT register a new onData handler here.
      // The broadcaster installed at session creation iterates session.clients,
      // so simply adding ws to that Set is sufficient for it to receive future
      // output. Adding a per-reconnect listener would cause duplicate delivery
      // and accumulate unbounded handler registrations.

      ws.on('message', (data) => {
        handleShellClientMessage(data.toString(), existingSession.process);
        existingSession.lastActivity = new Date();
      });

      ws.on('close', () => {
        existingSession.clients.delete(ws);
        if (existingSession.clients.size === 0) {
          scheduleIdleCleanup(sessionId);
        }
      });

      ws.on('error', (error) => {
        logger.error('Shell WebSocket error on reconnect:', redactErrorForLog(error));
        existingSession.clients.delete(ws);
        if (existingSession.clients.size === 0) {
          scheduleIdleCleanup(sessionId);
        }
      });

      return;
    }

    // --- New session: enforce per-user limits ---
    const userSessions = userSessionIndex.get(userId) || new Set<string>();
    if (userSessions.size >= MAX_SESSIONS_PER_USER) {
      ws.send(`\r\n\x1b[1;31m✗ Session limit reached (max ${MAX_SESSIONS_PER_USER} per user). Close an existing shell tab first.\x1b[0m\r\n`);
      ws.close(1008, 'Session limit exceeded');
      return;
    }

    // Create shell home directory for user
    const shellsBaseDir = path.join(os.homedir(), 'ecode-shells');
    const userHome = safePath(shellsBaseDir, `user-${userId}`);
    
    if (!userHome) {
      ws.close(1008, 'Invalid path');
      return;
    }
    
    try {
      await fs.mkdir(userHome, { recursive: true });
      const dirs = ['projects', 'tmp', '.config'];
      for (const dir of dirs) {
        await fs.mkdir(path.join(userHome, dir), { recursive: true });
      }
      
      const bashrcContent = `
# E-Code Shell Configuration
export PS1='Workspace: '
export TERM=xterm-256color
export LANG=en_US.UTF-8

# Aliases
alias ll='ls -la'
alias la='ls -A'
alias l='ls -CF'
alias ..='cd ..'
alias ...='cd ../..'

# Welcome message
echo -e "\\033[32m● Connected to E-Code Shell\\033[0m"
echo ""
`;
      await fs.writeFile(path.join(userHome, '.bashrc'), bashrcContent);
    } catch (error) {
      logger.error('Failed to create user shell directory:', redactErrorForLog(error));
    }

    // Set working directory
    let shellCwd = userHome;
    if (projectId) {
      try {
        const projectDir = getProjectWorkspacePath(projectId);
        await ensureProjectDirectory(projectId);
        let shouldBootstrapWorkspace = false;
        try {
          const entries = await fs.readdir(projectDir);
          shouldBootstrapWorkspace = entries.length === 0;
        } catch {
          shouldBootstrapWorkspace = true;
        }

        if (shouldBootstrapWorkspace) {
          const projectFiles = await storage.getFilesByProjectId(String(projectId));
          if (projectFiles && projectFiles.length > 0) {
            await bulkSyncProjectFiles(projectId, projectFiles as any);
            logger.info(`[Shell] Synced ${projectFiles.length} files for project ${projectId}`);
          }
        }
        shellCwd = projectDir;
      } catch (syncErr) {
        logger.warn(`[Shell] Could not sync project files, using userHome: ${syncErr}`);
      }
    }

    shellCwd = await ensureSpawnCwd(shellCwd, userHome);

    const pty = await getPty();
    const shellBinary = resolveShellBinary();
    const shell = pty.spawn(shellBinary, getInteractiveShellArgs(shellBinary), {
      name: 'xterm-256color',
      cwd: shellCwd,
      cols: 120,
      rows: 30,
      env: buildShellEnv(userHome, userId, shellBinary),
    });

    const scrollback = new ScrollbackBuffer(SCROLLBACK_SIZE);

    const session: ShellSession = {
      id: sessionId,
      userId,
      projectId: projectId || null,
      process: shell,
      cwd: shellCwd,
      created: new Date(),
      lastActivity: new Date(),
      clients: new Set([ws]),
      scrollback,
      idleTimer: null,
      memoryTimer: null,
      bytesThisWindow: 0,
      windowStart: Date.now(),
      dropping: false,
    };

    shellSessions.set(sessionId, session);

    // Track in user index
    userSessions.add(sessionId);
    userSessionIndex.set(userId, userSessions);

    metrics.activeSessions = shellSessions.size;
    metrics.totalCreated++;

    logger.info(`[Shell] Created session ${sessionId} for user ${userId} (active: ${metrics.activeSessions})`);

    // ── Resource controls ────────────────────────────────────────────────────
    applyResourceLimits(sessionId, shell.pid);

    shell.onData((data: string) => {
      // Write to scrollback buffer
      scrollback.push(data);
      metrics.totalBytesOut += data.length;

      // Rate limiting
      const now = Date.now();
      if (now - session.windowStart > OUTPUT_RATE_WINDOW_MS) {
        session.bytesThisWindow = data.length;
        session.windowStart = now;
        session.dropping = false;
      } else {
        session.bytesThisWindow += data.length;
      }

      if (session.bytesThisWindow > OUTPUT_RATE_LIMIT_BYTES) {
        if (!session.dropping) {
          session.dropping = true;
          metrics.droppedFrames++;
          logger.warn(`[Shell] Rate limit exceeded for session ${sessionId}`);
        }
        return;
      }

      // Broadcast to all connected clients
      for (const client of session.clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(data);
        }
      }
    });

    shell.onExit(({ exitCode }: { exitCode: number }) => {
      const exitMsg = `\r\n\x1b[90mProcess exited with code ${exitCode}\x1b[0m\r\n`;
      scrollback.push(exitMsg);
      for (const client of session.clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(exitMsg);
        }
      }
      destroySession(sessionId);
    });

    ws.on('message', (data) => {
      handleShellClientMessage(data.toString(), shell);
      session.lastActivity = new Date();
    });

    ws.on('close', () => {
      session.clients.delete(ws);
      if (session.clients.size === 0) {
        // Don't kill immediately - give idle timeout a chance
        scheduleIdleCleanup(sessionId);
      }
    });

    ws.on('error', (error) => {
      logger.error('Shell WebSocket error:', redactErrorForLog(error));
      session.clients.delete(ws);
      if (session.clients.size === 0) {
        scheduleIdleCleanup(sessionId);
      }
    });
  });
  
  centralUpgradeDispatcher.register(
    '/shell',
    (req: IncomingMessage, socket: Duplex, head: Buffer) => {
      shellWss!.handleUpgrade(req, socket, head, (ws) => {
        shellWss!.emit('connection', ws, req);
      });
    },
    { pathMatch: 'exact', priority: 35 }
  );
  
  logger.info('[Shell] WebSocket service initialized at /shell');
}

initializeShellWebSocket();

// REST: list sessions for authenticated user
router.get('/sessions', ensureAuthenticated, (req, res) => {
  const userId = (req.user as any).id;
  const sessions = Array.from(shellSessions.values())
    .filter(s => s.userId === userId)
    .map(s => ({
      id: s.id,
      created: s.created,
      lastActivity: s.lastActivity,
      cwd: s.cwd,
      projectId: s.projectId,
      connectedClients: s.clients.size,
    }));
  
  res.json({ sessions });
});

// REST: create a new shell session token (actual PTY is created on WS connect)
router.post('/sessions', ensureAuthenticated, (req, res) => {
  const sessionId = `shell-${Date.now()}-${process.hrtime.bigint().toString(36).slice(0, 9)}`;
  res.json({ sessionId });
});

// REST: delete / kill a session
router.delete('/sessions/:sessionId', ensureAuthenticated, (req, res) => {
  const { sessionId } = req.params;
  const session = shellSessions.get(sessionId);
  
  if (session && session.userId === (req.user as any).id) {
    destroySession(sessionId);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Session not found' });
  }
});

// REST: metrics (Prometheus-style)
router.get('/metrics', ensureAuthenticated, (_req, res) => {
  res.json({
    activeSessions: shellSessions.size,
    maxSessionsPerUser: MAX_SESSIONS_PER_USER,
    totalCreated: metrics.totalCreated,
    totalDestroyed: metrics.totalDestroyed,
    totalBytesOut: metrics.totalBytesOut,
    totalReconnects: metrics.totalReconnects,
    droppedFrames: metrics.droppedFrames,
    peakRssBytes: metrics.peakRssBytes,
    idleTimeoutMs: IDLE_TIMEOUT_MS,
    scrollbackSize: SCROLLBACK_SIZE,
    rateLimitBytesPerSec: OUTPUT_RATE_LIMIT_BYTES,
  });
});

const MAX_HISTORY_PER_KEY = 500;
const commandHistoryStore = new Map<string, string[]>();

function historyKey(projectId: string, userId: number) {
  return `${userId}:${projectId}`;
}

router.get('/:projectId/history', ensureAuthenticated, (req, res) => {
  const userId = (req.user as any).id;
  const { projectId } = req.params;
  const key = historyKey(projectId, userId);
  const history = commandHistoryStore.get(key) || [];
  res.json({ history });
});

router.post('/:projectId/history', ensureAuthenticated, (req, res) => {
  const userId = (req.user as any).id;
  const { projectId } = req.params;
  const { command } = req.body;

  if (typeof command !== 'string' || !command.trim()) {
    return res.status(400).json({ error: 'command is required' });
  }

  const key = historyKey(projectId, userId);
  const existing = commandHistoryStore.get(key) || [];

  if (existing[existing.length - 1] !== command) {
    const updated = [...existing, command.trim()].slice(-MAX_HISTORY_PER_KEY);
    commandHistoryStore.set(key, updated);
  }

  res.json({ ok: true });
});

// REST: AI command generation
router.post('/generate-command', ensureAuthenticated, async (req, res) => {
  try {
    const { prompt, projectId: _projectId } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [
        {
          role: 'system',
          content: `You are a shell command generator. Given a natural language description, output ONLY the shell command that accomplishes the task. No explanations, no markdown code blocks, just the raw command. The command should work in a bash shell on Linux. Be concise and accurate. Never include a trailing newline.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 200,
      temperature: 0.3
    });

    const command = completion.choices[0]?.message?.content?.trim() || '';
    
    res.json({ command, prompt });
  } catch (error) {
    logger.error('Shell command generation error:', redactErrorForLog(error));
    res.status(500).json({ error: 'Failed to generate command' });
  }
});

// REST: clear session buffer
router.post('/clear', ensureAuthenticated, (req, res) => {
  const { sessionId } = req.body;
  const session = shellSessions.get(sessionId);
  if (session && session.userId === (req.user as any).id) {
    session.scrollback.clear();
  }
  res.json({ success: true, sessionId });
});

export default router;
