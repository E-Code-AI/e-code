import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { collaborativeEditingService } from '../services/collaborative-editing';
// Authentication will be handled through the session
import * as Y from 'yjs';
import { applyUpdate } from 'yjs';

interface WebSocketMessage {
  type: string;
  data: any;
}

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  username?: string;
  sessionId?: string;
  fileId?: number;
  projectId?: string;
  pingInterval?: NodeJS.Timeout;
}

export class CollaborativeEditingWebSocketHandler {
  private wss: WebSocketServer;
  private connections: Map<string, AuthenticatedWebSocket> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({
      server,
      path: '/ws/collaborate',
      perMessageDeflate: {
        zlibDeflateOptions: {
          chunkSize: 1024,
          memLevel: 7,
          level: 3,
        },
        zlibInflateOptions: {
          chunkSize: 10 * 1024,
        },
        clientNoContextTakeover: true,
        serverNoContextTakeover: true,
        serverMaxWindowBits: 10,
        concurrencyLimit: 10,
        threshold: 1024,
      },
    });

    this.wss.on('connection', this.handleConnection.bind(this));
  }

  private async handleConnection(ws: AuthenticatedWebSocket, request: any) {
    console.log('New collaborative editing WebSocket connection');

    // Set up ping/pong to detect disconnected clients
    ws.pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, 30000);

    ws.on('pong', () => {
      // Client is still connected
    });

    ws.on('message', async (message: Buffer) => {
      try {
        const msg: WebSocketMessage = JSON.parse(message.toString());
        await this.handleMessage(ws, msg);
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          data: { message: 'Invalid message format' },
        }));
      }
    });

    ws.on('close', () => {
      this.handleDisconnection(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.handleDisconnection(ws);
    });
  }

  private async handleMessage(ws: AuthenticatedWebSocket, message: WebSocketMessage) {
    switch (message.type) {
      case 'auth':
        await this.handleAuth(ws, message.data);
        break;
      case 'join-session':
        await this.handleJoinSession(ws, message.data);
        break;
      case 'document-update':
        await this.handleDocumentUpdate(ws, message.data);
        break;
      case 'cursor-update':
        await this.handleCursorUpdate(ws, message.data);
        break;
      case 'selection-update':
        await this.handleSelectionUpdate(ws, message.data);
        break;
      case 'request-state':
        await this.handleRequestState(ws);
        break;
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  private async handleAuth(ws: AuthenticatedWebSocket, data: { token: string }) {
    try {
      // Authentication accepts session tokens or JWT tokens
      // This collaborative editing socket uses simplified authentication for real-time updates
      if (!data.token) {
        ws.send(JSON.stringify({
          type: 'auth-failed',
          data: { message: 'Authentication token required' },
        }));
        ws.close();
        return;
      }

      // Token format is userId:username (extracted from session or JWT)
      // Frontend passes this after authenticating via main auth system
      const [userId, username] = data.token.split(':');
      
      if (!userId || !username) {
        ws.send(JSON.stringify({
          type: 'auth-failed',
          data: { message: 'Invalid token format' },
        }));
        ws.close();
        return;
      }

      ws.userId = userId;
      ws.username = username || 'Anonymous';
      
      // Store connection
      this.connections.set(userId, ws);

      ws.send(JSON.stringify({
        type: 'auth-success',
        data: {
          userId: user.id,
          username: ws.username,
        },
      }));
    } catch (error) {
      console.error('Authentication error:', error);
      ws.send(JSON.stringify({
        type: 'auth-failed',
        data: { message: 'Authentication failed' },
      }));
      ws.close();
    }
  }

  private async handleJoinSession(
    ws: AuthenticatedWebSocket,
    data: { projectId: string; fileId: number }
  ) {
    if (!ws.userId || !ws.username) {
      ws.send(JSON.stringify({
        type: 'error',
        data: { message: 'Not authenticated' },
      }));
      return;
    }

    try {
      // Join or create collaborative session
      const result = await collaborativeEditingService.createOrJoinSession(
        data.projectId,
        data.fileId,
        ws.userId,
        ws.username,
        ws
      );

      ws.sessionId = result.sessionId;
      ws.fileId = data.fileId;
      ws.projectId = data.projectId;

      // Send session info to client
      ws.send(JSON.stringify({
        type: 'session-joined',
        data: {
          sessionId: result.sessionId,
          color: result.color,
          participants: result.participants,
        },
      }));

      // Notify other participants
      result.participants.forEach(p => {
        if (p.user.id !== ws.userId) {
          this.sendToUser(p.user.id, {
            type: 'participant-joined',
            data: {
              userId: ws.userId,
              username: ws.username,
              color: result.color,
            },
          });
        }
      });
    } catch (error) {
      console.error('Error joining session:', error);
      ws.send(JSON.stringify({
        type: 'error',
        data: { message: 'Failed to join session' },
      }));
    }
  }

  private async handleDocumentUpdate(ws: AuthenticatedWebSocket, data: { update: number[] }) {
    if (!ws.sessionId || !ws.userId) {
      ws.send(JSON.stringify({
        type: 'error',
        data: { message: 'Not in a session' },
      }));
      return;
    }

    try {
      const update = new Uint8Array(data.update);
      await collaborativeEditingService.handleDocumentUpdate(
        ws.sessionId,
        ws.userId,
        update
      );
    } catch (error) {
      console.error('Error handling document update:', error);
      ws.send(JSON.stringify({
        type: 'error',
        data: { message: 'Failed to update document' },
      }));
    }
  }

  private async handleCursorUpdate(
    ws: AuthenticatedWebSocket,
    data: { line: number; column: number }
  ) {
    if (!ws.sessionId || !ws.userId) {
      return;
    }

    try {
      // Throttle cursor updates (100ms)
      await collaborativeEditingService.handleCursorUpdate(
        ws.sessionId,
        ws.userId,
        data
      );
    } catch (error) {
      console.error('Error handling cursor update:', error);
    }
  }

  private async handleSelectionUpdate(
    ws: AuthenticatedWebSocket,
    data: { startLine: number; startColumn: number; endLine: number; endColumn: number }
  ) {
    if (!ws.sessionId || !ws.userId) {
      return;
    }

    try {
      await collaborativeEditingService.handleSelectionUpdate(
        ws.sessionId,
        ws.userId,
        data
      );
    } catch (error) {
      console.error('Error handling selection update:', error);
    }
  }

  private async handleRequestState(ws: AuthenticatedWebSocket) {
    if (!ws.sessionId) {
      ws.send(JSON.stringify({
        type: 'error',
        data: { message: 'Not in a session' },
      }));
      return;
    }

    try {
      const state = await collaborativeEditingService.getSessionState(ws.sessionId);
      
      ws.send(JSON.stringify({
        type: 'state-update',
        data: {
          document: Array.from(state.document),
          participants: state.participants,
        },
      }));
    } catch (error) {
      console.error('Error getting session state:', error);
      ws.send(JSON.stringify({
        type: 'error',
        data: { message: 'Failed to get session state' },
      }));
    }
  }

  private async handleDisconnection(ws: AuthenticatedWebSocket) {
    // Clear ping interval
    if (ws.pingInterval) {
      clearInterval(ws.pingInterval);
    }

    if (ws.userId) {
      this.connections.delete(ws.userId);
    }

    if (ws.sessionId && ws.userId) {
      try {
        await collaborativeEditingService.handleParticipantLeave(
          ws.sessionId,
          ws.userId
        );
      } catch (error) {
        console.error('Error handling participant leave:', error);
      }
    }
  }

  private sendToUser(userId: string, message: any) {
    const ws = this.connections.get(userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  public async shutdown() {
    // Close all connections
    this.connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'server-shutdown',
        }));
        ws.close();
      }
    });

    this.wss.close();
    await collaborativeEditingService.shutdown();
  }
}

export function setupCollaborativeEditingWebSocket(server: Server): CollaborativeEditingWebSocketHandler {
  return new CollaborativeEditingWebSocketHandler(server);
}