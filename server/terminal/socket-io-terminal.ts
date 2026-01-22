import { Server as SocketIOServer, Socket } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { winstonLogger as logger } from '../utils/logger';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

interface PTYSession {
  ptyProcess: any;
  projectId: string;
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

  initialize(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      path: '/socket.io/terminal',
      cors: {
        origin: '*',
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

    logger.info('[SocketIO Terminal] Service initialized at /socket.io/terminal');
    console.log('[SocketIO Terminal] Service initialized at /socket.io/terminal');
  }

  private async handleConnection(socket: Socket) {
    const projectId = (socket.handshake.query.projectId as string) || 'default';
    const token = socket.handshake.auth?.token || socket.handshake.query.token;

    console.log(`[SocketIO Terminal] New connection for project ${projectId}`);

    socket.emit('connected', { message: 'Connected to terminal' });

    if (IS_PRODUCTION && !token) {
      socket.emit('error', { message: 'Authentication required' });
      socket.disconnect();
      return;
    }

    if (IS_PRODUCTION && token) {
      try {
        const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'development-secret';
        jwt.verify(token as string, jwtSecret);
      } catch (error) {
        socket.emit('error', { message: 'Invalid authentication token' });
        socket.disconnect();
        return;
      }
    }

    let session = this.sessions.get(projectId);
    
    if (!session) {
      if (this.sessions.size >= this.maxSessions) {
        socket.emit('error', { message: 'Server at capacity' });
        socket.disconnect();
        return;
      }

      console.log(`[SocketIO Terminal] Creating new PTY session for ${projectId}`);
      const newSession = await this.createSession(projectId);
      if (!newSession) {
        socket.emit('error', { message: 'Failed to create terminal session' });
        socket.disconnect();
        return;
      }
      session = newSession;
      this.sessions.set(projectId, session);
      console.log(`[SocketIO Terminal] Session created for ${projectId}`);
    }

    session.clients.add(socket);
    session.lastActivity = Date.now();

    socket.emit('ready', { message: 'Terminal session ready' });

    const buffer = this.outputBuffers.get(projectId);
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
      console.log(`[SocketIO Terminal] Client disconnected from ${projectId}`);
      if (session) {
        session.clients.delete(socket);
        if (session.clients.size === 0) {
          setTimeout(() => {
            if (session && session.clients.size === 0) {
              this.cleanupSession(projectId);
            }
          }, 30000);
        }
      }
    });
  }

  private async createSession(projectId: string): Promise<PTYSession | null> {
    try {
      const pty = await getPty();
      
      const shell = process.platform === 'win32' ? 'powershell.exe' : 
                    process.env.SHELL || '/bin/bash';
      const shellArgs = process.platform === 'win32' ? [] : ['-l'];

      const workDir = process.cwd();

      console.log(`[SocketIO Terminal] Spawning PTY with shell: ${shell}`);

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
          LC_ALL: 'en_US.UTF-8'
        }
      });

      const buffer = new CircularBuffer(10000);
      this.outputBuffers.set(projectId, buffer);

      const session: PTYSession = {
        ptyProcess,
        projectId,
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
        console.log(`[SocketIO Terminal] PTY exited for ${projectId}: code=${exitCode}, signal=${signal}`);
        for (const client of session.clients) {
          client.emit('exit', { code: exitCode, signal });
        }
        this.cleanupSession(projectId);
      });

      return session;
    } catch (error) {
      console.error('[SocketIO Terminal] Failed to create session:', error);
      return null;
    }
  }

  private cleanupSession(projectId: string) {
    const session = this.sessions.get(projectId);
    if (session) {
      try {
        session.ptyProcess?.kill();
      } catch (e) {
        console.error('[SocketIO Terminal] Error killing PTY:', e);
      }
      for (const client of session.clients) {
        client.disconnect();
      }
      this.sessions.delete(projectId);
      this.outputBuffers.delete(projectId);
      console.log(`[SocketIO Terminal] Session cleaned up for ${projectId}`);
    }
  }

  getIO(): SocketIOServer | null {
    return this.io;
  }
}

export const socketIOTerminalService = new SocketIOTerminalService();
