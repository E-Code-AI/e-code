import { Server as SocketIOServer, Socket } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import { winstonLogger as logger } from '../utils/logger';
import { centralUpgradeDispatcher } from '../websocket/central-upgrade-dispatcher';
import cookieParser from 'cookie';
import * as signature from 'cookie-signature';

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

export class SocketIOTerminalService {
  private io: SocketIOServer | null = null;
  private sessions: Map<string, PTYSession> = new Map();
  private outputBuffers: Map<string, CircularBuffer> = new Map();
  private maxSessions = 50;
  private cleanupInterval: NodeJS.Timeout | null = null;

  initialize(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      path: '/socket.io/terminal',
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling'],
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
        console.log('[SocketIO Terminal] Received upgrade request via central dispatcher');
        this.io?.engine.handleUpgrade(request, socket, head);
      },
      { pathMatch: 'prefix', priority: 25 }
    );

    // Start idle session cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleSessions();
    }, 60000);

    logger.info('[SocketIO Terminal] Service initialized at /socket.io/terminal');
    console.log('[SocketIO Terminal] Service initialized at /socket.io/terminal');
  }

  private cleanupIdleSessions() {
    const now = Date.now();
    for (const [sessionKey, session] of this.sessions) {
      const idleTime = now - session.lastActivity;
      if (session.clients.size === 0 && idleTime > SESSION_IDLE_TIMEOUT_MS) {
        console.log(`[SocketIO Terminal] Cleaning up idle session ${sessionKey} (idle ${Math.round(idleTime / 1000)}s)`);
        this.cleanupSession(sessionKey);
      }
    }
  }

  private async handleConnection(socket: Socket) {
    const projectId = (socket.handshake.query.projectId as string) || 'default';

    console.log(`[SocketIO Terminal] New connection for project ${projectId}`);

    // Session-based authentication via cookies
    let userId: string | null = null;
    const cookieHeader = socket.handshake.headers.cookie;
    
    if (cookieHeader) {
      // Parse session from cookies
      const cookies = cookieParser.parse(cookieHeader);
      const sessionCookie = cookies['connect.sid'];
      
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
                    console.log(`[SocketIO Terminal] Authenticated user: ${userId}`);
                  }
                  resolve();
                });
              });
            }
          }
        } catch (error) {
          console.error('[SocketIO Terminal] Session validation error:', error);
        }
      }
    }

    // Require authentication in production
    if (IS_PRODUCTION && !userId) {
      socket.emit('error', { message: 'Authentication required. Please log in.' });
      socket.disconnect();
      console.log('[SocketIO Terminal] Rejected unauthenticated connection in production');
      return;
    }

    // In development, allow anonymous access only if explicitly enabled
    if (!IS_PRODUCTION && !userId) {
      if (ALLOW_INSECURE_LOCAL_PTY) {
        userId = 'dev-anonymous';
        console.log('[SocketIO Terminal] DEV MODE: Allowing anonymous access');
      } else {
        socket.emit('error', { message: 'Authentication required' });
        socket.disconnect();
        return;
      }
    }

    socket.emit('connected', { message: 'Connected to terminal' });

    // Session key scoped by project AND user to ensure isolation
    const sessionKey = `${projectId}:${userId}`;
    let session = this.sessions.get(sessionKey);
    
    if (!session) {
      if (this.sessions.size >= this.maxSessions) {
        socket.emit('error', { message: 'Server at capacity' });
        socket.disconnect();
        return;
      }

      console.log(`[SocketIO Terminal] Creating new PTY session for ${sessionKey}`);
      const newSession = await this.createSession(projectId, userId!, sessionKey);
      if (!newSession) {
        socket.emit('error', { message: 'Failed to create terminal session' });
        socket.disconnect();
        return;
      }
      session = newSession;
      this.sessions.set(sessionKey, session);
      console.log(`[SocketIO Terminal] Session created for ${sessionKey}`);
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
      console.log(`[SocketIO Terminal] Client disconnected from ${sessionKey}`);
      if (session) {
        session.clients.delete(socket);
        // Note: cleanup is now handled by the idle session cleanup interval
      }
    });
  }

  private async createSession(projectId: string, userId: string, sessionKey: string): Promise<PTYSession | null> {
    try {
      const pty = await getPty();
      
      const shell = process.platform === 'win32' ? 'powershell.exe' : 
                    process.env.SHELL || '/bin/bash';
      const shellArgs = process.platform === 'win32' ? [] : ['-l'];

      const workDir = process.cwd();

      console.log(`[SocketIO Terminal] Spawning PTY with shell: ${shell} for user: ${userId}`);

      const ptyProcess = pty.spawn(shell, shellArgs, {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd: workDir,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
          PS1: 'user@e-code:\\w$ ',
          LANG: 'en_US.UTF-8',
          LC_ALL: 'en_US.UTF-8',
          // Security: Don't leak user or project info to shell unless needed
        }
      });

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
        console.log(`[SocketIO Terminal] PTY exited for ${sessionKey}: code=${exitCode}, signal=${signal}`);
        for (const client of session.clients) {
          client.emit('exit', { code: exitCode, signal });
        }
        this.cleanupSession(sessionKey);
      });

      return session;
    } catch (error) {
      console.error('[SocketIO Terminal] Failed to create session:', error);
      return null;
    }
  }

  private cleanupSession(sessionKey: string) {
    const session = this.sessions.get(sessionKey);
    if (session) {
      try {
        session.ptyProcess?.kill();
      } catch (e) {
        console.error('[SocketIO Terminal] Error killing PTY:', e);
      }
      for (const client of session.clients) {
        client.disconnect();
      }
      this.sessions.delete(sessionKey);
      this.outputBuffers.delete(sessionKey);
      console.log(`[SocketIO Terminal] Session cleaned up for ${sessionKey}`);
    }
  }

  getIO(): SocketIOServer | null {
    return this.io;
  }
}

export const socketIOTerminalService = new SocketIOTerminalService();
