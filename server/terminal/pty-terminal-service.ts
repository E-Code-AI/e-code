/**
 * PTY-based Terminal Service
 * Provides real interactive shell access using node-pty
 * 
 * SECURITY: In production, terminal sessions run inside isolated Docker containers
 * to prevent access to host filesystem and secrets.
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server, IncomingMessage } from 'http';
import { Socket } from 'net';
import type { Duplex } from 'stream';
import * as pty from 'node-pty';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import { createLogger } from '../utils/logger';
import { storage } from '../storage';
import { markSocketAsHandled } from '../websocket/upgrade-guard';
import { centralUpgradeDispatcher } from '../websocket/central-upgrade-dispatcher';
import jwt from 'jsonwebtoken';

// Security: Use Docker for terminal in production
const USE_DOCKER_TERMINAL = process.env.EXECUTION_MODE === 'docker' || process.env.NODE_ENV === 'production';

const logger = createLogger('pty-terminal');

// 8.4 FIX: Circular buffer for terminal output history
class CircularBuffer {
  private buffer: string[] = [];
  private maxSize: number;
  
  constructor(maxSize: number = 10000) {
    this.maxSize = maxSize;
  }
  
  push(data: string): void {
    this.buffer.push(data);
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
  }
  
  getHistory(): string[] {
    return [...this.buffer];
  }
  
  getRecentHistory(lines: number = 100): string[] {
    return this.buffer.slice(-lines);
  }
  
  clear(): void {
    this.buffer = [];
  }
  
  get length(): number {
    return this.buffer.length;
  }
}

interface PTYSession {
  ptyProcess: pty.IPty | null;  // null when using Docker
  dockerProcess: ChildProcess | null;  // Docker exec process
  containerId: string | null;  // Docker container ID
  projectId: string;
  clients: Set<WebSocket>;
  commandHistory: string[];
  currentDirectory: string;
  cols: number;
  rows: number;
  createdAt: number;
  lastActivity: number;
  outputBuffer: CircularBuffer;
  isDocker: boolean;  // Flag to indicate Docker-based session
}

export class PTYTerminalService {
  private wss: WebSocketServer | null = null;
  private sessions: Map<string, PTYSession> = new Map();
  private maxSessions: number = 100;

  constructor() {}

  setup(server: Server): void {
    this.wss = new WebSocketServer({
      noServer: true,
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

    centralUpgradeDispatcher.register(
      '/api/terminal/ws',
      this.handleTerminalUpgrade.bind(this),
      { pathMatch: 'exact', priority: 30 }
    );

    logger.info('[PTY Terminal] Registered with central upgrade dispatcher at /api/terminal/ws (priority: 30)');

    this.wss.on('connection', this.handleConnection.bind(this));
  }

  private handleTerminalUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer): void {
    markSocketAsHandled(request, socket);
    
    logger.debug('[PTY Terminal] Handling upgrade via central dispatcher');
    
    this.wss!.handleUpgrade(request, socket as Socket, head, (ws) => {
      this.wss!.emit('connection', ws, request);
    });
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

      // Extract token from query params or Authorization header
      const queryToken = url.searchParams.get('token');
      const authHeader = request.headers['authorization'];
      const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
      const token = queryToken || headerToken;

      // Validate authentication (skip in development for easier testing)
      if (process.env.NODE_ENV === 'production') {
        if (!token) {
          logger.warn('Terminal connection rejected: missing authentication token');
          ws.close(1008, 'Authentication required');
          return;
        }

        try {
          const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'development-secret';
          jwt.verify(token, jwtSecret);
        } catch (error) {
          logger.warn('Terminal connection rejected: invalid token');
          ws.close(1008, 'Invalid authentication token');
          return;
        }
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

      // 8.4 FIX: Send recent terminal history to new clients
      const recentHistory = session.outputBuffer.getRecentHistory(500);
      if (recentHistory.length > 0) {
        ws.send(JSON.stringify({
          type: 'history',
          data: recentHistory.join('')
        }));
      }

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
      // SECURITY: Use Docker in production to isolate terminal sessions
      if (USE_DOCKER_TERMINAL) {
        return await this.createDockerSession(projectId);
      }
      
      // Development mode: use local PTY (only for development/testing)
      return await this.createLocalSession(projectId);

    } catch (error) {
      logger.error(`Failed to create session for project ${projectId}:`, error);
      return null;
    }
  }

  /**
   * Create a Docker-based terminal session (SECURE - Production)
   * Runs the shell inside an isolated container with no access to host
   */
  private async createDockerSession(projectId: string): Promise<PTYSession | null> {
    try {
      const workDir = await this.setupProjectDirectory(projectId);
      const containerName = `terminal-${projectId}-${Date.now()}`;
      
      logger.info(`[SECURE] Creating Docker terminal session for project ${projectId}`);

      // Start a container with project directory mounted as writable
      // This allows persistent file changes while maintaining container isolation
      // Use node:20-alpine as base image for a lightweight shell environment
      const dockerArgs = [
        'run',
        '-it',
        '--rm',
        '--name', containerName,
        // Security: Resource limits
        '--memory', '512m',
        '--cpus', '1.0',
        // Security: Read-only root filesystem except for mounted project
        '--read-only',
        '--tmpfs', '/tmp:rw,nosuid,size=128m',
        // Security: Drop all capabilities
        '--cap-drop', 'ALL',
        // Allow network for npm/git (bridge network for isolation from host)
        '--network', 'bridge',
        // Security: No privileged escalation
        '--security-opt', 'no-new-privileges:true',
        // Mount project directory as writable workspace
        // This allows npm install, git operations, and file edits to persist
        '-v', `${workDir}:/workspace`,
        // Environment
        '-e', 'TERM=xterm-256color',
        '-e', 'HOME=/workspace',
        '-e', 'PS1=user@e-code:\\w$ ',
        // Working directory is the project
        '-w', '/workspace',
        // Image
        'node:20-alpine',
        // Start an interactive shell directly in the workspace
        '/bin/sh'
      ];

      const dockerProcess = spawn('docker', dockerArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env }
      });

      const session: PTYSession = {
        ptyProcess: null,
        dockerProcess,
        containerId: containerName,
        projectId,
        clients: new Set(),
        commandHistory: [],
        currentDirectory: '/workspace',
        cols: 80,
        rows: 24,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        outputBuffer: new CircularBuffer(10000),
        isDocker: true
      };

      // Handle Docker output
      dockerProcess.stdout?.on('data', (data: Buffer) => {
        const output = data.toString();
        session.outputBuffer.push(output);
        this.broadcastToSession(session, {
          type: 'output',
          data: output
        });
      });

      dockerProcess.stderr?.on('data', (data: Buffer) => {
        const output = data.toString();
        session.outputBuffer.push(output);
        this.broadcastToSession(session, {
          type: 'output',
          data: output
        });
      });

      dockerProcess.on('close', (code) => {
        logger.info(`Docker terminal exited for project ${projectId}: code=${code}`);
        this.broadcastToSession(session, {
          type: 'exit',
          data: `Terminal session ended`
        });
        this.cleanupSession(projectId);
      });

      dockerProcess.on('error', async (error) => {
        logger.error(`Docker terminal error for project ${projectId}:`, error);
        logger.warn('Docker not available, attempting fallback to local PTY');
        
        // Clean up the failed Docker session
        this.sessions.delete(projectId);
        
        // Try to create a local session as fallback (development only)
        if (process.env.NODE_ENV !== 'production') {
          try {
            const fallbackSession = await this.createLocalSession(projectId);
            if (fallbackSession) {
              this.sessions.set(projectId, fallbackSession);
              // Notify existing clients of fallback
              this.broadcastToSession(fallbackSession, {
                type: 'output',
                data: '\r\n[NOTICE] Docker unavailable, using local terminal.\r\n'
              });
            }
          } catch (fallbackError) {
            logger.error('Local PTY fallback also failed:', fallbackError);
          }
        } else {
          // In production, notify clients that terminal is unavailable
          for (const client of session.clients) {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'error',
                data: 'Terminal service unavailable. Docker is required in production.'
              }));
              client.close(1011, 'Docker unavailable');
            }
          }
        }
      });

      return session;

    } catch (error) {
      logger.error(`Failed to create Docker session for project ${projectId}:`, error);
      return null;
    }
  }

  /**
   * Create a local PTY session (INSECURE - Development only)
   */
  private async createLocalSession(projectId: string): Promise<PTYSession | null> {
    try {
      const workDir = await this.setupProjectDirectory(projectId);
      
      const shell = this.getShell();
      const shellArgs = this.getShellArgs();

      logger.info(`Creating local PTY session for project ${projectId} in ${workDir}`);
      logger.warn('[SECURITY] Local PTY is only for development. Use Docker in production.');

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
        dockerProcess: null,
        containerId: null,
        projectId,
        clients: new Set(),
        commandHistory: [],
        currentDirectory: workDir,
        cols: 80,
        rows: 24,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        outputBuffer: new CircularBuffer(10000),
        isDocker: false
      };

      ptyProcess.onData((data) => {
        session.outputBuffer.push(data);
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
      logger.error(`Failed to create local session for project ${projectId}:`, error);
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

  /**
   * Sync modified files from terminal workspace back to database
   * This ensures terminal changes (npm install, file edits) persist
   */
  private async syncFilesBack(projectId: string, workDir: string): Promise<void> {
    try {
      const existingFiles = await storage.getFilesByProjectId(projectId);
      const existingFileMap = new Map(existingFiles.map(f => [f.path || f.name, f]));
      
      // Walk the workspace directory and sync changes
      const walkDir = async (dir: string, basePath: string = ''): Promise<void> => {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = basePath ? path.join(basePath, entry.name) : entry.name;
          
          // Skip node_modules and .git for performance (they can be regenerated)
          if (entry.name === 'node_modules' || entry.name === '.git') {
            continue;
          }
          
          if (entry.isDirectory()) {
            // Recursively walk subdirectories
            await walkDir(fullPath, relativePath);
          } else {
            // Read file content and update database
            try {
              const content = await fs.promises.readFile(fullPath, 'utf8');
              const existingFile = existingFileMap.get(relativePath);
              
              if (existingFile) {
                // Update existing file if content changed
                if (existingFile.content !== content) {
                  await storage.updateFile(existingFile.id, { content });
                  logger.debug(`Updated file: ${relativePath}`);
                }
              } else {
                // Create new file
                await storage.createFile({
                  projectId: parseInt(projectId, 10),
                  name: entry.name,
                  path: relativePath,
                  content,
                  isDirectory: false
                });
                logger.debug(`Created file: ${relativePath}`);
              }
            } catch (fileError) {
              logger.warn(`Could not sync file ${relativePath}: ${fileError}`);
            }
          }
        }
      };
      
      await walkDir(workDir);
      logger.info(`Synced terminal changes back to database for project ${projectId}`);
      
    } catch (error) {
      logger.error(`Failed to sync files back for project ${projectId}:`, error);
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
            this.writeToSession(session, message.data);
          }
          break;

        case 'resize':
          if (message.cols && message.rows) {
            session.cols = message.cols;
            session.rows = message.rows;
            // Resize only works with local PTY
            if (session.ptyProcess) {
              session.ptyProcess.resize(message.cols, message.rows);
            }
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
        this.writeToSession(session, rawData.toString());
      }
    }
  }

  /**
   * Write data to the terminal session (Docker or PTY)
   */
  private writeToSession(session: PTYSession, data: string): void {
    if (session.isDocker && session.dockerProcess?.stdin) {
      session.dockerProcess.stdin.write(data);
    } else if (session.ptyProcess) {
      session.ptyProcess.write(data);
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

  private async cleanupSession(projectId: string): Promise<void> {
    const session = this.sessions.get(projectId);
    if (!session) return;

    logger.info(`Cleaning up terminal session for project ${projectId}`);

    // Sync files back to database before cleanup (for persistent changes)
    try {
      const workDir = path.join(os.tmpdir(), 'e-code-terminals', `project-${projectId}`);
      await this.syncFilesBack(projectId, workDir);
    } catch (syncError) {
      logger.error(`Error syncing files back for project ${projectId}:`, syncError);
    }

    try {
      if (session.isDocker) {
        // Kill Docker container
        if (session.dockerProcess) {
          session.dockerProcess.kill('SIGTERM');
        }
        // Also stop the container if it's still running
        if (session.containerId) {
          spawn('docker', ['stop', session.containerId], { stdio: 'ignore' });
        }
      } else if (session.ptyProcess) {
        session.ptyProcess.kill();
      }
    } catch (error) {
      logger.error(`Error killing terminal process:`, error);
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

    this.writeToSession(session, command + '\r');
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