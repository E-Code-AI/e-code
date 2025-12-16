import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { storage } from '../storage';
import { spawn } from 'child_process';
import jwt from 'jsonwebtoken';

export class MobileWebSocketService {
  private io: Server;
  private terminalSessions: Map<string, any> = new Map();
  private aiSessions: Map<string, any> = new Map();

  constructor(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    this.setupNamespaces();
  }

  private setupNamespaces() {
    const jwtAuthMiddleware = async (socket: any, next: (err?: Error) => void) => {
      try {
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;
        if (!token) {
          return next(new Error('Authentication token required'));
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as { userId: number };
        const user = await storage.getUser(decoded.userId);
        if (!user) {
          return next(new Error('User not found'));
        }
        
        socket.userId = user.id;
        socket.username = user.username;
        next();
      } catch (error) {
        next(new Error('Invalid or expired token'));
      }
    };

    // Terminal WebSocket namespace with JWT auth
    const terminalNs = this.io.of('/terminal');
    terminalNs.use(jwtAuthMiddleware);
    terminalNs.on('connection', (socket) => {
      socket.on('command', async (data) => {
        const { command, projectId } = data;
        
        try {
          const result = await this.executeCommand(command, projectId);
          socket.emit('output', { text: result.stdout || result.stderr });
        } catch (error: any) {
          socket.emit('error', { message: error.message });
        }
      });

      socket.on('disconnect', () => {
        this.terminalSessions.delete(socket.id);
      });
    });

    // AI Assistant WebSocket namespace with JWT auth
    const aiNs = this.io.of('/ai');
    aiNs.use(jwtAuthMiddleware);
    aiNs.on('connection', (socket) => {
      socket.on('message', async (data) => {
        const { message, projectId } = data;
        
        socket.emit('ai-streaming', { chunk: 'I understand you need help with ' });
        
        setTimeout(() => {
          socket.emit('ai-streaming', { chunk: 'your ' + data.message + '. ' });
        }, 100);
        
        setTimeout(() => {
          socket.emit('ai-streaming', { chunk: 'Here\'s what I suggest: ' });
        }, 200);
        
        setTimeout(() => {
          const response = this.generateAIResponse(message);
          socket.emit('ai-response', { text: response });
        }, 500);
      });

      socket.on('disconnect', () => {
        this.aiSessions.delete(socket.id);
      });
    });

    // Real-time collaboration namespace with JWT auth
    const collaborationNs = this.io.of('/collaboration');
    collaborationNs.use(jwtAuthMiddleware);
    collaborationNs.on('connection', (socket) => {
      socket.on('join-project', (projectId) => {
        socket.join(`project-${projectId}`);
        socket.to(`project-${projectId}`).emit('user-joined', { userId: (socket as any).userId });
      });

      socket.on('code-change', (data) => {
        socket.to(`project-${data.projectId}`).emit('code-update', data);
      });

      socket.on('cursor-move', (data) => {
        socket.to(`project-${data.projectId}`).emit('cursor-update', data);
      });

      socket.on('disconnect', () => {
        // Client disconnected
      });
    });
  }

  private async executeCommand(command: string, projectId: string): Promise<any> {
    const safeCommands = ['ls', 'pwd', 'echo', 'cat', 'node', 'npm'];
    const [cmd, ...args] = command.split(' ');
    
    if (!safeCommands.includes(cmd)) {
      return { stderr: `Command not allowed: ${cmd}` };
    }

    return new Promise((resolve) => {
      const child = spawn(cmd, args, {
        cwd: `/tmp/projects/${projectId}`,
        shell: false,
        timeout: 5000
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', () => {
        resolve({ stdout, stderr });
      });

      child.on('error', (error: any) => {
        resolve({ stderr: error.message });
      });
    });
  }

  private generateAIResponse(message: string): string {
    // Simplified AI response generation
    const responses = {
      'debug': 'To debug your code, try adding console.log statements at key points to track variable values.',
      'error': 'Check the error message carefully. It usually indicates the line number and type of error.',
      'optimize': 'Consider using memoization, caching, or more efficient algorithms to optimize performance.',
      'test': 'Write unit tests for each function, covering both normal cases and edge cases.',
      'default': 'I can help you with coding questions, debugging, optimization, and best practices.'
    };

    const keyword = Object.keys(responses).find(k => message.toLowerCase().includes(k)) as keyof typeof responses | undefined;
    return keyword ? responses[keyword] : responses.default;
  }
}

export function initializeMobileWebSocket(httpServer: HttpServer) {
  return new MobileWebSocketService(httpServer);
}