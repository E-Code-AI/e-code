/**
 * Real Terminal WebSocket Service
 * Provides real-time terminal access to Docker containers
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { dockerExecutor } from '../execution/docker-executor';
import { createLogger } from '../utils/logger';
import * as pty from 'node-pty';
import Docker from 'dockerode';

const logger = createLogger('real-terminal');
const docker = new Docker();

interface TerminalSession {
  containerId: string;
  projectId: number;
  ws: WebSocket;
  exec?: Docker.Exec;
  stream?: NodeJS.ReadWriteStream;
  pty?: any; // node-pty instance
}

export class RealTerminalService {
  private wss: WebSocketServer;
  private sessions: Map<string, TerminalSession> = new Map();

  constructor() {}

  setupWebSocket(server: Server) {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/terminal',
      perMessageDeflate: {
        zlibDeflateOptions: {
          chunkSize: 1024,
          memLevel: 7,
          level: 3
        },
        zlibInflateOptions: {
          chunkSize: 10 * 1024
        },
        clientNoContextTakeover: true,
        serverNoContextTakeover: true,
        serverMaxWindowBits: 10,
        concurrencyLimit: 10,
        threshold: 1024
      }
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    logger.info('Real terminal WebSocket server initialized');
  }

  private async handleConnection(ws: WebSocket, request: any) {
    const sessionId = this.generateSessionId();
    logger.info(`New terminal connection: ${sessionId}`);

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        await this.handleMessage(sessionId, ws, message);
      } catch (error) {
        logger.error(`Failed to handle terminal message: ${error}`);
        ws.send(JSON.stringify({
          type: 'error',
          error: error.message
        }));
      }
    });

    ws.on('close', () => {
      this.cleanupSession(sessionId);
    });

    ws.on('error', (error) => {
      logger.error(`Terminal WebSocket error: ${error}`);
      this.cleanupSession(sessionId);
    });

    // Send ready message
    ws.send(JSON.stringify({ type: 'ready' }));
  }

  private async handleMessage(sessionId: string, ws: WebSocket, message: any) {
    switch (message.type) {
      case 'init':
        await this.initTerminal(sessionId, ws, message);
        break;
      
      case 'resize':
        await this.resizeTerminal(sessionId, message);
        break;
      
      case 'input':
        await this.sendInput(sessionId, message.data);
        break;
      
      case 'command':
        await this.executeCommand(sessionId, message.command);
        break;
      
      default:
        logger.warn(`Unknown terminal message type: ${message.type}`);
    }
  }

  private async initTerminal(sessionId: string, ws: WebSocket, message: any) {
    const { projectId, containerId, cols = 80, rows = 24 } = message;

    // If container ID is provided, connect to existing container
    if (containerId) {
      await this.connectToContainer(sessionId, ws, containerId, projectId, cols, rows);
    } else {
      // Create new container for the project
      await this.createAndConnectContainer(sessionId, ws, projectId, cols, rows);
    }
  }

  private async connectToContainer(
    sessionId: string, 
    ws: WebSocket, 
    containerId: string, 
    projectId: number,
    cols: number,
    rows: number
  ) {
    try {
      const container = docker.getContainer(containerId);
      
      // Verify container exists and is running
      const info = await container.inspect();
      if (info.State.Status !== 'running') {
        throw new Error('Container is not running');
      }

      // Create exec instance for interactive shell
      const exec = await container.exec({
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: true,
        Cmd: ['/bin/sh'],
        Env: [`TERM=xterm-256color`, `COLUMNS=${cols}`, `LINES=${rows}`]
      });

      // Start exec and get duplex stream
      const stream = await exec.start({
        Detach: false,
        Tty: true,
        stdin: true,
        hijack: true
      });

      // Store session
      this.sessions.set(sessionId, {
        containerId,
        projectId,
        ws,
        exec,
        stream
      });

      // Handle output from container
      stream.on('data', (chunk: Buffer) => {
        // Send terminal output to client
        ws.send(JSON.stringify({
          type: 'output',
          data: chunk.toString('base64')
        }));
      });

      stream.on('end', () => {
        ws.send(JSON.stringify({ type: 'exit', code: 0 }));
        this.cleanupSession(sessionId);
      });

      stream.on('error', (error) => {
        logger.error(`Container stream error: ${error}`);
        ws.send(JSON.stringify({
          type: 'error',
          error: error.message
        }));
        this.cleanupSession(sessionId);
      });

      // Send connected message
      ws.send(JSON.stringify({
        type: 'connected',
        containerId,
        message: 'Connected to container terminal'
      }));

      logger.info(`Terminal connected to container ${containerId}`);

    } catch (error) {
      logger.error(`Failed to connect to container: ${error}`);
      ws.send(JSON.stringify({
        type: 'error',
        error: `Failed to connect to container: ${error.message}`
      }));
    }
  }

  private async createAndConnectContainer(
    sessionId: string,
    ws: WebSocket,
    projectId: number,
    cols: number,
    rows: number
  ) {
    try {
      // Get project files from storage
      const { storage } = require('../storage');
      const project = await storage.getProject(projectId);
      const files = await storage.getFilesByProject(projectId);

      if (!project) {
        throw new Error('Project not found');
      }

      // Create and start container
      const result = await dockerExecutor.executeProject({
        projectId,
        language: project.language || 'nodejs',
        files,
        environmentVars: {
          TERM: 'xterm-256color',
          COLUMNS: cols.toString(),
          LINES: rows.toString()
        }
      });

      // Connect to the new container
      await this.connectToContainer(sessionId, ws, result.containerId, projectId, cols, rows);

    } catch (error) {
      logger.error(`Failed to create container: ${error}`);
      ws.send(JSON.stringify({
        type: 'error',
        error: `Failed to create container: ${error.message}`
      }));
    }
  }

  private async sendInput(sessionId: string, data: string) {
    const session = this.sessions.get(sessionId);
    if (!session || !session.stream) {
      logger.warn(`No active session found: ${sessionId}`);
      return;
    }

    try {
      // Decode base64 input and write to container
      const input = Buffer.from(data, 'base64');
      session.stream.write(input);
    } catch (error) {
      logger.error(`Failed to send input: ${error}`);
    }
  }

  private async executeCommand(sessionId: string, command: string) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      logger.warn(`No active session found: ${sessionId}`);
      return;
    }

    try {
      // Execute command in container
      const result = await dockerExecutor.executeCommand(
        session.containerId,
        ['sh', '-c', command]
      );

      // Send command output
      session.ws.send(JSON.stringify({
        type: 'command-output',
        output: result.output,
        exitCode: result.exitCode
      }));

    } catch (error) {
      logger.error(`Failed to execute command: ${error}`);
      session.ws.send(JSON.stringify({
        type: 'error',
        error: error.message
      }));
    }
  }

  private async resizeTerminal(sessionId: string, message: any) {
    const session = this.sessions.get(sessionId);
    if (!session || !session.exec) {
      return;
    }

    const { cols, rows } = message;

    try {
      // Resize the exec session
      await session.exec.resize({ w: cols, h: rows });
    } catch (error) {
      logger.error(`Failed to resize terminal: ${error}`);
    }
  }

  private cleanupSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Close streams
    if (session.stream) {
      session.stream.destroy();
    }

    // Close WebSocket
    if (session.ws.readyState === WebSocket.OPEN) {
      session.ws.close();
    }

    this.sessions.delete(sessionId);
    logger.info(`Terminal session cleaned up: ${sessionId}`);
  }

  private generateSessionId(): string {
    return `terminal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public API for external control
  async broadcastToProject(projectId: number, message: any) {
    for (const [sessionId, session] of this.sessions) {
      if (session.projectId === projectId && session.ws.readyState === WebSocket.OPEN) {
        session.ws.send(JSON.stringify(message));
      }
    }
  }

  async executeInContainer(containerId: string, command: string): Promise<{ output: string; exitCode: number }> {
    return dockerExecutor.executeCommand(containerId, ['sh', '-c', command]);
  }

  getActiveSessions(): Array<{ sessionId: string; projectId: number; containerId: string }> {
    return Array.from(this.sessions.entries()).map(([sessionId, session]) => ({
      sessionId,
      projectId: session.projectId,
      containerId: session.containerId
    }));
  }
}

export const realTerminalService = new RealTerminalService();