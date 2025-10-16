// @ts-nocheck
import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { previewService } from './preview-service';
import { EventEmitter } from 'events';

// Event emitter for preview updates
export const previewEvents = new EventEmitter();

interface PreviewClient {
  ws: WebSocket;
  projectId?: number;
}

class PreviewWebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, PreviewClient> = new Map();

  initialize(server: Server) {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/ws/preview'
    });

    this.wss.on('connection', (ws: WebSocket, req) => {
      const clientId = Math.random().toString(36).substring(7);
      const client: PreviewClient = { ws };
      this.clients.set(clientId, client);

      console.log(`Preview WebSocket client connected: ${clientId}`);

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleMessage(clientId, data);
        } catch (error) {
          console.error('Invalid WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        console.log(`Preview WebSocket client disconnected: ${clientId}`);
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
    });

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

  private handleMessage(clientId: string, data: any) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (data.type) {
      case 'subscribe':
        // Subscribe to a specific project's preview updates
        client.projectId = data.projectId;
        client.ws.send(JSON.stringify({
          type: 'subscribed',
          projectId: data.projectId
        }));
        
        // Send current preview status
        const preview = previewService.getPreview(data.projectId);
        if (preview) {
          client.ws.send(JSON.stringify({
            type: 'preview:status',
            projectId: data.projectId,
            status: preview.status,
            port: preview.port,
            url: preview.status === 'running' ? `/preview/${data.projectId}` : null,
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
}

export const previewWebSocketService = new PreviewWebSocketService();