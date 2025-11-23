import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { IncomingMessage } from 'http';
import { previewService } from './preview-service';
import { EventEmitter } from 'events';
import { parse as parseCookie } from 'cookie';
import { storage } from '../storage';

// Event emitter for preview updates
export const previewEvents = new EventEmitter();

interface PreviewClient {
  ws: WebSocket;
  projectId?: number;
  userId: number;
}

class PreviewWebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, PreviewClient> = new Map();

  initialize(server: Server) {
    this.wss = new WebSocketServer({ 
      noServer: true
    });

    // Handle WebSocket upgrade with authentication
    server.on('upgrade', async (request: IncomingMessage, socket, head) => {
      const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;
      
      if (pathname !== '/ws/preview' && !pathname.startsWith('/ws/preview-devtools/')) {
        return; // Not our WebSocket path
      }

      try {
        // Extract and verify session
        const cookies = parseCookie(request.headers.cookie || '');
        const sessionId = cookies['ecode.sid'];
        
        if (!sessionId) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        // Get userId from session
        const userId = await this.getUserIdFromSession(sessionId);
        
        if (!userId) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        // Handle upgrade
        this.wss!.handleUpgrade(request, socket, head, (ws) => {
          const clientId = Math.random().toString(36).substring(7);
          const client: PreviewClient = { ws, userId };
          this.clients.set(clientId, client);

          this.setupClient(clientId, ws);
        });
      } catch (error) {
        console.error('WebSocket upgrade error:', error);
        socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
        socket.destroy();
      }
    });
  }

  private async getUserIdFromSession(sessionId: string): Promise<number | null> {
    try {
      // Parse the session ID (remove signature if present)
      const cleanSessionId = sessionId.split('.')[0].replace('s:', '');
      
      // Query session store
      const sessionStore = (global as any).sessionStore;
      if (!sessionStore) {
        console.error('Session store not available');
        return null;
      }

      return new Promise((resolve) => {
        sessionStore.get(cleanSessionId, (err: any, session: any) => {
          if (err || !session || !session.passport?.user) {
            resolve(null);
          } else {
            resolve(session.passport.user);
          }
        });
      });
    } catch (error) {
      console.error('Error getting userId from session:', error);
      return null;
    }
  }

  private setupClient(clientId: string, ws: WebSocket) {
    const client = this.clients.get(clientId);
    if (!client) return;

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleMessage(clientId, data);
        } catch (error) {
          console.error('Invalid WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
      });

      ws.on('error', (error) => {
        console.error(`Preview WebSocket error for client ${clientId}:`, error);
        this.clients.delete(clientId);
      });

      // Send initial connection success
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Preview WebSocket connected'
      }));

    // Listen for preview events
    previewEvents.on('preview:start', (data) => this.broadcastToProject(data.projectId, {
      type: 'preview:start',
      projectId: data.projectId,
      port: data.port,
      status: 'starting'
    }));

    previewEvents.on('preview:ready', (data) => this.broadcastToProject(data.projectId, {
      type: 'preview:ready',
      projectId: data.projectId,
      port: data.port,
      url: `/preview/${data.projectId}`,
      status: 'running'
    }));

    previewEvents.on('preview:stop', (data) => this.broadcastToProject(data.projectId, {
      type: 'preview:stop',
      projectId: data.projectId,
      status: 'stopped'
    }));

    previewEvents.on('preview:error', (data) => this.broadcastToProject(data.projectId, {
      type: 'preview:error',
      projectId: data.projectId,
      error: data.error,
      status: 'error'
    }));

    previewEvents.on('preview:log', (data) => this.broadcastToProject(data.projectId, {
      type: 'preview:log',
      projectId: data.projectId,
      log: data.log,
      timestamp: data.timestamp || new Date().toISOString()
    }));

    previewEvents.on('preview:rebuild', (data) => this.broadcastToProject(data.projectId, {
      type: 'preview:rebuild',
      projectId: data.projectId,
      message: 'Preview rebuilding due to file changes...'
    }));
  }

  private async handleMessage(clientId: string, data: any) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (data.type) {
      case 'subscribe':
        // Subscribe to a specific project's preview updates
        const projectId = data.projectId;
        
        // Security: Verify user has access to this project
        const hasAccess = await this.verifyProjectAccess(client.userId, projectId);
        if (!hasAccess) {
          client.ws.send(JSON.stringify({
            type: 'error',
            message: 'Access denied to this project'
          }));
          return;
        }

        client.projectId = projectId;
        client.ws.send(JSON.stringify({
          type: 'subscribed',
          projectId: projectId
        }));
        
        // Send current preview status
        const preview = previewService.getPreview(projectId);
        if (preview) {
          client.ws.send(JSON.stringify({
            type: 'preview:status',
            projectId: projectId,
            status: preview.status,
            port: preview.port,
            url: preview.status === 'running' ? `/preview/${projectId}` : null,
            logs: preview.logs || []
          }));
        }
        break;

      case 'unsubscribe':
        client.projectId = undefined;
        client.ws.send(JSON.stringify({
          type: 'unsubscribed'
        }));
        break;

      case 'ping':
        client.ws.send(JSON.stringify({ type: 'pong' }));
        break;

      default:
        console.warn(`Unknown WebSocket message type: ${data.type}`);
    }
  }

  private broadcastToProject(projectId: number, message: any) {
    this.clients.forEach((client) => {
      if (client.projectId === projectId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
      }
    });
  }

  broadcast(message: any) {
    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
      }
    });
  }

  sendToProject(projectId: number, message: any) {
    this.broadcastToProject(projectId, message);
  }

  private async verifyProjectAccess(userId: number, projectId: number): Promise<boolean> {
    try {
      const project = await storage.getProject(projectId);
      if (!project) {
        return false;
      }

      // Check if user is owner
      if (project.ownerId === userId) {
        return true;
      }

      // Check if user is collaborator
      const collaborators = await storage.getProjectCollaborators(projectId);
      return collaborators.some((c: any) => c.userId === userId);
    } catch (error) {
      console.error('Error verifying project access:', error);
      return false;
    }
  }
}

export const previewWebSocketService = new PreviewWebSocketService();