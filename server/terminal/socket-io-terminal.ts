// @ts-nocheck
import { spawn as spawnChildProcess } from 'child_process';
import cookieParser from 'cookie';
import * as signature from 'cookie-signature';
import * as fs from 'fs';
import type { Server as HTTPServer,IncomingMessage } from 'http';
import * as path from 'path';
import { Socket,Server as SocketIOServer } from 'socket.io';
import type { Duplex } from 'stream';
import { storage } from '../storage';
import { winstonLogger as logger } from '../utils/logger';
import { centralUpgradeDispatcher } from '../websocket/central-upgrade-dispatcher';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const ALLOW_INSECURE_LOCAL_PTY = process.env.ALLOW_INSECURE_LOCAL_PTY === 'true';
const SESSION_IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

interface PTYSession {
  ptyProcess: any;
  projectId: string;
  userId: string;
  sessionKey: string;
  clients: Set<Socket>;
  outputBuffer: string[];
  cols: number;
  rows: number;
  createdAt: number;
  lastActivity: number;
}

class CircularBuffer {
  private buffer: string[] = [];
  private maxSize: number;
  
  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }
  
  push(data: string) {
    this.buffer.push(data);
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
  }
  
  getRecentHistory(lines: number): string[] {
    return this.buffer.slice(-lines);
  }
}

let ptyModule: any = null;

async function getPty() {
  if (!ptyModule) {
    try {
      ptyModule = await import('node-pty');
    } catch (error) {
      logger.error('[SocketIO Terminal] Failed to load node-pty:', error);
      throw new Error('node-pty not available');
    }
  }
  return ptyModule;
}

function createBasicShellAdapter(shellPath: string, workDir: string, env: Record<string, string>) {
  const process = spawnChildProcess(shellPath, getInteractiveShellArgs(shellPath), {
    cwd: workDir,
    env,
    stdio: 'pipe',
  });

  return {
    write(data: string) {
      process.stdin.write(data);
    },
    resize(_cols: number, _rows: number) {
      // No-op fallback when PTY is unavailable.
    },
    kill() {
      process.kill();
    },
    onData(handler: (data: string) => void) {
      process.stdout.on('data', (chunk) => handler(chunk.toString()));
      process.stderr.on('data', (chunk) => handler(chunk.toString()));
    },
    onExit(handler: ({ exitCode, signal }: { exitCode: number; signal: number }) => void) {
      process.on('exit', (exitCode, signal) => {
        handler({ exitCode: exitCode ?? 0, signal: typeof signal === 'number' ? signal : 0 });
      });
    },
  };
}

function getInteractiveShellArgs(shellPath: string): string[] {
  if (process.platform === 'win32') {
    return [];
  }

  const shellName = path.basename(shellPath).toLowerCase();

  if (shellName.includes('bash')) {
    return ['--noprofile', '--norc', '-i'];
  }

  if (shellName.includes('zsh')) {
    return ['-f', '-i'];
  }

  return ['-i'];
}

function resolveShellBinary(): string {
  if (process.platform === 'win32') {
    return 'powershell.exe';
  }

  const isReplitVm = Boolean(process.env.REPL_ID || process.env.REPLIT_DEPLOYMENT);
  if (isReplitVm && fs.existsSync('/bin/sh')) {
    return '/bin/sh';
  }

  const candidates = [
    '/nix/store/d6mad4dkf6akii90k26dinhrg8a3xia8-replit-runtime-path/bin/bash',
    '/bin/bash',
    '/bin/sh',
    process.env.SHELL,
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (!candidate.startsWith('/')) {
      return candidate;
    }
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return '/bin/sh';
}

function buildShellEnv(workDir: string, userId: string, shellBinary: string): Record<string, string> {
  return {
    TERM: 'xterm-256color',
    COLORTERM: 'truecolor',
    HOME: workDir,
    PWD: workDir,
    TMPDIR: '/tmp',
    SHELL: shellBinary,
    USER: `user-${userId.slice(0, 8)}`,
    LOGNAME: `user-${userId.slice(0, 8)}`,
    PS1: 'Workspace: ',
    LANG: 'en_US.UTF-8',
    LC_ALL: 'en_US.UTF-8',
    PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin',
  };
}

const PROJECT_SYNC_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class SocketIOTerminalService {
  private io: SocketIOServer | null = null;
  private sessions: Map<string, PTYSession> = new Map();
  private outputBuffers: Map<string, CircularBuffer> = new Map();
  private lastSyncedAt: Map<string, number> = new Map();
  private maxSessions = 50;
  private cleanupInterval: NodeJS.Timeout | null = null;

  initialize(httpServer: HTTPServer) {
    // In development, allow all origins for easier testing
    // In production, use ALLOWED_ORIGINS or restrictive list
    const corsOrigin = IS_PRODUCTION 
      ? (process.env.ALLOWED_ORIGINS?.split(',') || ['https://e-code.ai'])
      : true; // Allow all origins in development

    this.io = new SocketIOServer(httpServer, {
      path: '/socket.io/terminal',
      cors: {
        origin: corsOrigin,
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['polling', 'websocket'], // Polling first for proxy compatibility
      pingTimeout: 60000,
      pingInterval: 25000,
      connectTimeout: 45000,
      allowEIO3: true,
    });

    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    centralUpgradeDispatcher.register(
      '/socket.io/terminal',
      (request: IncomingMessage, socket: Duplex, head: Buffer) => {
        logger.info('[SocketIO Terminal] Received upgrade request via central dispatcher');
        this.io?.engine.handleUpgrade(request, socket, head);
      },
      { pathMatch: 'prefix', priority: 25 }
    );

    // Start idle session cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleSessions();
    }, 60000);

    logger.info('[SocketIO Terminal] Service initialized at /socket.io/terminal');
  }

  private cleanupIdleSessions() {
    const now = Date.now();
    for (const [sessionKey, session] of this.sessions) {
      const idleTime = now - session.lastActivity;
      if (session.clients.size === 0 && idleTime > SESSION_IDLE_TIMEOUT_MS) {
        logger.info(`[SocketIO Terminal] Cleaning up idle session ${sessionKey} (idle ${Math.round(idleTime / 1000)}s)`);
        this.cleanupSession(sessionKey);
      }
    }
  }

  private async handleConnection(socket: Socket) {
    const projectId = (socket.handshake.query.projectId as string) || 'default';
    const requestedSessionId = (socket.handshake.query.sessionId as string) || 'default';

    logger.info(`[SocketIO Terminal] New connection for project ${projectId}`);

    // Session-based authentication via cookies
    let userId: string | null = null;
    const cookieHeader = socket.handshake.headers.cookie;
    
    if (cookieHeader) {
      // Parse session from cookies
      const cookies = cookieParser.parse(cookieHeader);
      const sessionCookie = cookies['ecode.sid'] || cookies['connect.sid'];
      
      if (sessionCookie) {
        // Extract session ID from signed cookie
        try {
          const sessionSecret = process.env.SESSION_SECRET || 'development-secret';
          let sessionId: string | null = null;
          
          // Handle signed cookies (format: s:sessionId.signature)
          if (sessionCookie.startsWith('s:')) {
            const unsigned = signature.unsign(sessionCookie.slice(2), sessionSecret);
            if (unsigned !== false) {
              sessionId = unsigned;
            }
          } else {
            sessionId = sessionCookie;
          }
          
          if (sessionId) {
            // Use global session store to look up user
            const sessionStore = (global as any).sessionStore;
            if (sessionStore) {
              await new Promise<void>((resolve) => {
                sessionStore.get(sessionId, (err: any, session: any) => {
                  if (!err && session?.passport?.user) {
                    userId = String(session.passport.user);
                    logger.info(`[SocketIO Terminal] Authenticated user: ${userId}`);
                  }
                  resolve();
                });
              });
            }
          }
        } catch (error) {
          logger.error('[SocketIO Terminal] Session validation error:', error);
        }
      }
    }

    // Require authentication in production
    if (IS_PRODUCTION && !userId) {
      socket.emit('error', { message: 'Authentication required. Please log in.' });
      socket.disconnect();
      logger.info('[SocketIO Terminal] Rejected unauthenticated connection in production');
      return;
    }

    // In development, allow anonymous access only if explicitly enabled
    if (!IS_PRODUCTION && !userId) {
      if (ALLOW_INSECURE_LOCAL_PTY) {
        userId = 'dev-anonymous';
        logger.info('[SocketIO Terminal] DEV MODE: Allowing anonymous access');
      } else {
        socket.emit('error', { message: 'Authentication required' });
        socket.disconnect();
        return;
      }
    }

    socket.emit('connected', { message: 'Connected to terminal' });

    // Session key scoped by project AND user to ensure isolation
    const sessionKey = `${projectId}:${userId}:${requestedSessionId}`;
    let session = this.sessions.get(sessionKey);
    
    if (!session) {
      if (this.sessions.size >= this.maxSessions) {
        socket.emit('error', { message: 'Server at capacity' });
        socket.disconnect();
        return;
      }

      logger.info(`[SocketIO Terminal] Creating new PTY session for ${sessionKey}`);
      const newSession = await this.createSession(projectId, userId!, sessionKey);
      if (!newSession) {
        socket.emit('error', { message: 'Failed to create terminal session' });
        socket.disconnect();
        return;
      }
      session = newSession;
      this.sessions.set(sessionKey, session);
      logger.info(`[SocketIO Terminal] Session created for ${sessionKey}`);
    }

    session.clients.add(socket);
    session.lastActivity = Date.now();

    socket.emit('ready', { message: 'Terminal session ready' });

    const buffer = this.outputBuffers.get(sessionKey);
    if (buffer) {
      const history = buffer.getRecentHistory(500);
      if (history.length > 0) {
        socket.emit('history', { data: history.join('') });
      }
    }

    socket.on('input', (data: { data: string }) => {
      if (session?.ptyProcess && data?.data) {
        session.ptyProcess.write(data.data);
        session.lastActivity = Date.now();
      }
    });

    socket.on('resize', (data: { cols: number; rows: number }) => {
      if (session?.ptyProcess && data?.cols && data?.rows) {
        try {
          session.ptyProcess.resize(data.cols, data.rows);
          session.cols = data.cols;
          session.rows = data.rows;
        } catch (error) {
          console.error('[SocketIO Terminal] Resize error:', error);
        }
      }
    });

    socket.on('disconnect', () => {
      logger.info(`[SocketIO Terminal] Client disconnected from ${sessionKey}`);
      if (session) {
        session.clients.delete(socket);
        // Note: cleanup is now handled by the idle session cleanup interval
      }
    });
  }

  private async createSession(projectId: string, userId: string, sessionKey: string): Promise<PTYSession | null> {
    try {
      const workDir = await this.setupProjectDirectory(projectId);

      logger.info(`[SocketIO Terminal] Spawning PTY for project ${projectId} in ${workDir}`);

      const bashPath = resolveShellBinary();
      const sandboxedEnv = buildShellEnv(workDir, userId, bashPath);

      const resourceLimitedShell = process.platform === 'win32'
        ? 'powershell.exe'
        : bashPath;
      const shellArgs = process.platform === 'win32'
        ? []
        : getInteractiveShellArgs(bashPath);

      let ptyProcess: any;
      try {
        const pty = await getPty();
        ptyProcess = pty.spawn(resourceLimitedShell, shellArgs, {
          name: 'xterm-256color',
          cols: 80,
          rows: 24,
          cwd: workDir,
          env: sandboxedEnv,
        });
      } catch (error) {
        logger.warn(`[SocketIO Terminal] PTY spawn failed for ${sessionKey}, falling back to basic shell process`, error);
        ptyProcess = createBasicShellAdapter(bashPath, workDir, sandboxedEnv);
      }

      const buffer = new CircularBuffer(10000);
      this.outputBuffers.set(sessionKey, buffer);

      const session: PTYSession = {
        ptyProcess,
        projectId,
        userId,
        sessionKey,
        clients: new Set(),
        outputBuffer: [],
        cols: 80,
        rows: 24,
        createdAt: Date.now(),
        lastActivity: Date.now()
      };

      ptyProcess.onData((data: string) => {
        buffer.push(data);
        for (const client of session.clients) {
          client.emit('output', { data });
        }
      });

      ptyProcess.onExit(({ exitCode, signal }: { exitCode: number; signal: number }) => {
        logger.info(`[SocketIO Terminal] PTY exited for ${sessionKey}: code=${exitCode}, signal=${signal}`);
        for (const client of session.clients) {
          client.emit('exit', { code: exitCode, signal });
        }
        this.cleanupSession(sessionKey);
      });

      return session;
    } catch (error) {
      logger.error('[SocketIO Terminal] Failed to create session:', error);
      return null;
    }
  }

  private cleanupSession(sessionKey: string) {
    const session = this.sessions.get(sessionKey);
    if (session) {
      try {
        session.ptyProcess?.kill();
      } catch (e) {
        logger.error('[SocketIO Terminal] Error killing PTY:', e);
      }
      for (const client of session.clients) {
        client.disconnect();
      }
      this.sessions.delete(sessionKey);
      this.outputBuffers.delete(sessionKey);
      logger.info(`[SocketIO Terminal] Session cleaned up for ${sessionKey}`);
    }
  }

  private async setupProjectDirectory(projectId: string): Promise<string> {
    try {
      const lastSync = this.lastSyncedAt.get(projectId) || 0;
      const now = Date.now();
      
      const { getProjectWorkspacePath: _getProjectWorkspacePath, bulkSyncProjectFiles, ensureProjectDirectory } = await import('../utils/project-fs-sync');

      if (now - lastSync < PROJECT_SYNC_CACHE_TTL_MS) {
        const projectDir = await ensureProjectDirectory(projectId);
        logger.info(`[SocketIO Terminal] Skipping sync for project ${projectId} (cached ${Math.round((now - lastSync) / 1000)}s ago)`);
        return projectDir;
      }

      const files = await storage.getFilesByProjectId(projectId);
      const projectDir = await bulkSyncProjectFiles(projectId, files as any);
      this.lastSyncedAt.set(projectId, Date.now());
      return projectDir;
    } catch (error) {
      logger.error(`[SocketIO Terminal] Failed to setup project directory:`, error);
      const { ensureProjectDirectory } = await import('../utils/project-fs-sync');
      return ensureProjectDirectory(projectId);
    }
  }

  getIO(): SocketIOServer | null {
    return this.io;
  }

  listSessions(projectId: string, userId: string) {
    return Array.from(this.sessions.values())
      .filter((session) => session.projectId === projectId && session.userId === userId)
      .map((session) => ({
        sessionId: session.sessionKey.split(':').slice(2).join(':'),
        projectId: session.projectId,
        createdAt: new Date(session.createdAt),
        lastActivity: new Date(session.lastActivity),
        status: session.clients.size > 0 ? 'active' : 'idle',
        connectedClients: session.clients.size,
        cols: session.cols,
        rows: session.rows,
      }));
  }

  getSession(projectId: string, userId: string, requestedSessionId: string) {
    const sessionKey = `${projectId}:${userId}:${requestedSessionId}`;
    const session = this.sessions.get(sessionKey);
    if (!session) {
      return null;
    }

    return {
      sessionId: requestedSessionId,
      projectId: session.projectId,
      createdAt: new Date(session.createdAt),
      lastActivity: new Date(session.lastActivity),
      status: session.clients.size > 0 ? 'active' : 'idle',
      connectedClients: session.clients.size,
      cols: session.cols,
      rows: session.rows,
    };
  }

  closeSession(projectId: string, userId: string, requestedSessionId: string) {
    const sessionKey = `${projectId}:${userId}:${requestedSessionId}`;
    if (!this.sessions.has(sessionKey)) {
      return false;
    }

    this.cleanupSession(sessionKey);
    return true;
  }
}

export const socketIOTerminalService = new SocketIOTerminalService();
