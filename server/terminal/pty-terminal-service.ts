/**
 * PTY-based Terminal Service
 * Provides real interactive shell access using node-pty
 * Works on Replit without Docker dependency
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import * as pty from 'node-pty';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { createLogger } from '../utils/logger';
import { storage } from '../storage';

const logger = createLogger('pty-terminal');

interface PTYSession {
  ptyProcess: pty.IPty;
  projectId: string;
  clients: Set<WebSocket>;
  commandHistory: string[];
  currentDirectory: string;
  cols: number;
  rows: number;
  createdAt: number;
  lastActivity: number;
}

export class PTYTerminalService {
  private wss: WebSocketServer | null = null;
  private sessions: Map<string, PTYSession> = new Map();
  private maxSessions: number = 100;

  constructor() {}

  setup(server: Server): void {
    this.wss = new WebSocketServer({
      server,
      path: '/api/terminal/ws',
      perMessageDeflate: {
        zlibDeflateOptions: { chunkSize: 1024, memLevel: 7, level: 3 },
        zlibInflateOptions: { chunkSize: 10 * 1024 },
        clientNoContextTakeover: true,
        serverNoContextTakeover: true,
        serverMaxWindowBits: 10,
        concurrencyLimit: 10,
        threshold: 1024
      }
    });

    logger.info('PTY Terminal WebSocket server initialized at /api/terminal/ws');

    this.wss.on('connection', this.handleConnection.bind(this));
  }

  private async handleConnection(ws: WebSocket, request: any): Promise<void> {
    try {
      const url = new URL(request.url || '', `http://${request.headers.host}`);
      const projectId = url.searchParams.get('projectId');

      if (!projectId) {
        logger.warn('Terminal connection rejected: missing projectId');
        ws.close(1008, 'Missing projectId');
        return;
      }

      logger.info(`Terminal connection for project ${projectId}`);

      let session = this.sessions.get(projectId);

      if (!session) {
        if (this.sessions.size >= this.maxSessions) {
          ws.close(1008, 'Server at capacity');
          return;
        }

        const newSession = await this.createSession(projectId);
        if (!newSession) {
          ws.close(1011, 'Failed to create terminal session');
          return;
        }
        session = newSession;
        this.sessions.set(projectId, session);
      }

      session.clients.add(ws);
      session.lastActivity = Date.now();

      ws.send(JSON.stringify({
        type: 'connected',
        data: 'Connected to terminal'
      }));

      ws.on('message', (data) => {
        this.handleMessage(projectId, ws, data);
      });

      ws.on('close', () => {
        this.handleDisconnect(projectId, ws);
      });

      ws.on('error', (error) => {
        logger.error(`WebSocket error for project ${projectId}:`, error);
        this.handleDisconnect(projectId, ws);
      });

    } catch (error) {
      logger.error('Terminal connection error:', error);
      ws.close(1011, 'Internal error');
    }
  }

  private async createSession(projectId: string): Promise<PTYSession | null> {
    try {
      const workDir = await this.setupProjectDirectory(projectId);
      
      const shell = this.getShell();
      const shellArgs = this.getShellArgs();

      logger.info(`Creating PTY session for project ${projectId} in ${workDir}`);

      const ptyProcess = pty.spawn(shell, shellArgs, {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd: workDir,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
          HOME: workDir,
          PS1: 'user@e-code:\\w$ ',
          LANG: 'en_US.UTF-8',
          LC_ALL: 'en_US.UTF-8'
        }
      });

      const session: PTYSession = {
        ptyProcess,
        projectId,
        clients: new Set(),
        commandHistory: [],
        currentDirectory: workDir,
        cols: 80,
        rows: 24,
        createdAt: Date.now(),
        lastActivity: Date.now()
      };

      ptyProcess.onData((data) => {
        this.broadcastToSession(session, {
          type: 'output',
          data
        });
      });

      ptyProcess.onExit(({ exitCode, signal }) => {
        logger.info(`PTY process exited for project ${projectId}: code=${exitCode}, signal=${signal}`);
        this.broadcastToSession(session, {
          type: 'exit',
          data: `Process exited with code ${exitCode}`
        });
        this.cleanupSession(projectId);
      });

      return session;

    } catch (error) {
      logger.error(`Failed to create session for project ${projectId}:`, error);
      return null;
    }
  }

  private async setupProjectDirectory(projectId: string): Promise<string> {
    const baseDir = path.join(os.tmpdir(), 'e-code-terminals');
    const projectDir = path.join(baseDir, `project-${projectId}`);

    try {
      await fs.promises.mkdir(projectDir, { recursive: true });

      try {
        const project = await storage.getProject(projectId);
        const files = await storage.getFilesByProjectId(projectId);

        if (files && files.length > 0) {
          for (const file of files) {
            const filePath = path.join(projectDir, file.path || file.name);
            const fileDir = path.dirname(filePath);

            if (file.isDirectory) {
              await fs.promises.mkdir(filePath, { recursive: true });
            } else {
              await fs.promises.mkdir(fileDir, { recursive: true });
              await fs.promises.writeFile(filePath, file.content || '', 'utf8');
            }
          }
          logger.info(`Synced ${files.length} files to ${projectDir}`);
        }
      } catch (storageError) {
        logger.warn(`Could not sync project files: ${storageError}`);
      }

      return projectDir;

    } catch (error) {
      logger.error(`Failed to setup project directory:`, error);
      return os.tmpdir();
    }
  }

  private getShell(): string {
    if (process.platform === 'win32') {
      return 'powershell.exe';
    }
    
    const bashPath = '/nix/store/d6mad4dkf6akii90k26dinhrg8a3xia8-replit-runtime-path/bin/bash';
    if (fs.existsSync(bashPath)) {
      return bashPath;
    }
    
    if (fs.existsSync('/bin/bash')) {
      return '/bin/bash';
    }
    
    return '/bin/sh';
  }

  private getShellArgs(): string[] {
    if (process.platform === 'win32') {
      return [];
    }
    return ['--login'];
  }

  private handleMessage(projectId: string, ws: WebSocket, rawData: any): void {
    const session = this.sessions.get(projectId);
    if (!session) return;

    session.lastActivity = Date.now();

    try {
      const message = JSON.parse(rawData.toString());

      switch (message.type) {
        case 'input':
          if (message.data) {
            session.ptyProcess.write(message.data);
          }
          break;

        case 'resize':
          if (message.cols && message.rows) {
            session.cols = message.cols;
            session.rows = message.rows;
            session.ptyProcess.resize(message.cols, message.rows);
          }
          break;

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;

        default:
          logger.warn(`Unknown message type: ${message.type}`);
      }

    } catch (error) {
      if (typeof rawData === 'string' || Buffer.isBuffer(rawData)) {
        session.ptyProcess.write(rawData.toString());
      }
    }
  }

  private handleDisconnect(projectId: string, ws: WebSocket): void {
    const session = this.sessions.get(projectId);
    if (!session) return;

    session.clients.delete(ws);
    logger.info(`Client disconnected from project ${projectId}, remaining: ${session.clients.size}`);

    if (session.clients.size === 0) {
      setTimeout(() => {
        const currentSession = this.sessions.get(projectId);
        if (currentSession && currentSession.clients.size === 0) {
          this.cleanupSession(projectId);
        }
      }, 30000);
    }
  }

  private cleanupSession(projectId: string): void {
    const session = this.sessions.get(projectId);
    if (!session) return;

    logger.info(`Cleaning up terminal session for project ${projectId}`);

    try {
      session.ptyProcess.kill();
    } catch (error) {
      logger.error(`Error killing PTY process:`, error);
    }

    for (const client of session.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.close(1000, 'Session ended');
      }
    }

    this.sessions.delete(projectId);
  }

  private broadcastToSession(session: PTYSession, message: any): void {
    const data = JSON.stringify(message);
    
    for (const client of session.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  getSessionCount(): number {
    return this.sessions.size;
  }

  getSessionInfo(projectId: string): { connected: boolean; clientCount: number } | null {
    const session = this.sessions.get(projectId);
    if (!session) return null;

    return {
      connected: true,
      clientCount: session.clients.size
    };
  }

  async executeInSession(projectId: string, command: string): Promise<void> {
    const session = this.sessions.get(projectId);
    if (!session) {
      throw new Error('No active session for project');
    }

    session.ptyProcess.write(command + '\r');
  }
}

let ptyTerminalService: PTYTerminalService | null = null;

export function initPTYTerminalService(): PTYTerminalService {
  if (!ptyTerminalService) {
    ptyTerminalService = new PTYTerminalService();
  }
  return ptyTerminalService;
}

export function getPTYTerminalService(): PTYTerminalService | null {
  return ptyTerminalService;
}

export { ptyTerminalService };