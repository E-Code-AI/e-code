import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { collaborativeEditingService } from '../services/collaborative-editing';
import jwt from 'jsonwebtoken';
import { storage } from '../storage';
import * as Y from 'yjs';
import { applyUpdate } from 'yjs';
import { createLogger } from '../utils/logger';
import { wsMetrics } from './ws-metrics';

const logger = createLogger('collaborative-editing-ws');

// Configuration from environment with defaults
const MAX_CONNECTIONS_PER_USER = parseInt(process.env.WS_MAX_CONNECTIONS_PER_USER || '5', 10);
const PING_INTERVAL_MS = parseInt(process.env.WS_PING_INTERVAL_MS || '30000', 10);
const SOCKET_TIMEOUT_MS = parseInt(process.env.WS_SOCKET_TIMEOUT_MS || '30000', 10);
const INACTIVE_THRESHOLD_MS = parseInt(process.env.WS_INACTIVE_THRESHOLD_MS || '1800000', 10); // 30 min default

interface WebSocketMessage {
  type: string;
  data: any;
}

// W-H1: Rate limiting utility for per-client throttling
const clientThrottles = new Map<string, Map<string, number>>();

function isThrottled(clientId: string, action: string, intervalMs: number): boolean {
  const now = Date.now();
  if (!clientThrottles.has(clientId)) {
    clientThrottles.set(clientId, new Map());
  }
  const clientActions = clientThrottles.get(clientId)!;
  const lastTime = clientActions.get(action) || 0;
  if (now - lastTime < intervalMs) return true;
  clientActions.set(action, now);
  return false;
}

function cleanupClientThrottles(clientId: string): void {
  clientThrottles.delete(clientId);
}

// W-H13: Message validation helper
function validateMessage(msg: any): msg is WebSocketMessage {
  return typeof msg === 'object' && 
         msg !== null && 
         typeof msg.type === 'string';
}

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  username?: string;
  sessionId?: string;
  fileId?: number;
  projectId?: string;
  pingInterval?: NodeJS.Timeout;
  lastActivity?: Date;
  clientId?: string;
}

// Track connection counts per user for limit enforcement
const userConnectionCounts = new Map<string, number>();

// 8.2 FIX: Track unanswered pings for timeout detection
const PONG_TIMEOUT_MS = 10000;
const MAX_MISSED_PONGS = 3;
const unansweredPings = new Map<string, number>();

function getClientId(ws: AuthenticatedWebSocket): string {
  if (!ws.clientId) {
    ws.clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  return ws.clientId;
}

export class CollaborativeEditingWebSocketHandler {
  private wss: WebSocketServer;
  private connections: Map<string, Set<AuthenticatedWebSocket>> = new Map(); // Changed to Set for multiple connections

  constructor(server: Server) {
    // W-H9: Add maxPayload to prevent DoS via large messages
    this.wss = new WebSocketServer({
      server,
      path: '/ws/collaborate',
      maxPayload: 10 * 1024 * 1024, // 10MB max
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
    ws.lastActivity = new Date();
    wsMetrics.recordConnection('collaborative-editing');
    
    const clientId = getClientId(ws);
    
    // 8.2 FIX: Set up ping/pong with timeout tracking
    ws.pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        const missedPongs = unansweredPings.get(clientId) || 0;
        
        // Force close after MAX_MISSED_PONGS consecutive missed pongs
        if (missedPongs >= MAX_MISSED_PONGS) {
          logger.warn(`Client ${clientId} missed ${missedPongs} pongs, terminating connection`);
          unansweredPings.delete(clientId);
          ws.terminate(); // Force close immediately
          return;
        }
        
        // Increment missed pong counter and send ping
        unansweredPings.set(clientId, missedPongs + 1);
        ws.ping();
      }
    }, PING_INTERVAL_MS);

    // 8.2 FIX: Reset counter on pong received
    ws.on('pong', () => {
      ws.lastActivity = new Date();
      unansweredPings.set(clientId, 0); // Reset missed pongs on successful pong
    });

    ws.on('message', async (message: Buffer) => {
      try {
        ws.lastActivity = new Date();
        wsMetrics.recordMessageReceived('collaborative-editing', message.length);
        const msg = JSON.parse(message.toString());
        // W-H13: Validate message schema
        if (!validateMessage(msg)) {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'error',
              data: { message: 'Invalid message schema' },
            }));
          }
          return;
        }
        await this.handleMessage(ws, msg);
      } catch (error) {
        logger.error('Error handling WebSocket message:', error);
        wsMetrics.recordError('collaborative-editing');
        // W-H17: Check readyState before sending error
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'error',
            data: { message: 'Invalid message format' },
          }));
        }
      }
    });

    ws.on('close', (code: number, reason: Buffer) => {
      logger.info(`WebSocket closed with code ${code}, reason: ${reason?.toString() || 'none'}`);
      wsMetrics.recordDisconnection('collaborative-editing');
      this.handleDisconnection(ws);
    });

    ws.on('error', (error) => {
      logger.error('WebSocket error:', error);
      wsMetrics.recordError('collaborative-editing');
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
        logger.warn('Unknown message type:', message.type);
    }
  }

  private async handleAuth(ws: AuthenticatedWebSocket, data: { token: string }) {
    try {
      if (!data.token) {
        ws.send(JSON.stringify({
          type: 'auth-failed',
          data: { message: 'Authentication token required' },
        }));
        ws.close(4001, 'Authentication token required');
        return;
      }

      let decoded: { userId: number };
      try {
        decoded = jwt.verify(data.token, process.env.JWT_SECRET || 'dev-secret') as { userId: number };
      } catch (jwtError) {
        logger.error('JWT verification failed:', jwtError);
        ws.send(JSON.stringify({
          type: 'auth-failed',
          data: { message: 'Invalid or expired token' },
        }));
        ws.close(4002, 'Invalid or expired token');
        return;
      }

      const user = await storage.getUser(decoded.userId);
      if (!user) {
        ws.send(JSON.stringify({
          type: 'auth-failed',
          data: { message: 'User not found' },
        }));
        ws.close(4003, 'User not found');
        return;
      }

      const userId = String(user.id);
      
      // Check connection limit per user
      const currentCount = userConnectionCounts.get(userId) || 0;
      if (currentCount >= MAX_CONNECTIONS_PER_USER) {
        logger.warn(`User ${userId} exceeded max connections (${MAX_CONNECTIONS_PER_USER})`);
        ws.send(JSON.stringify({
          type: 'auth-failed',
          data: { message: 'Maximum connections exceeded' },
        }));
        ws.close(4004, 'Maximum connections exceeded');
        return;
      }

      ws.userId = userId;
      ws.username = user.username || 'Anonymous';
      
      // Track connection count
      userConnectionCounts.set(userId, currentCount + 1);
      
      // Store connection (using Set for multiple connections per user)
      if (!this.connections.has(ws.userId)) {
        this.connections.set(ws.userId, new Set());
      }
      this.connections.get(ws.userId)!.add(ws);

      logger.info(`User ${userId} authenticated, connections: ${currentCount + 1}/${MAX_CONNECTIONS_PER_USER}`);

      ws.send(JSON.stringify({
        type: 'auth-success',
        data: {
          userId: ws.userId,
          username: ws.username,
        },
      }));
    } catch (error) {
      logger.error('Authentication error:', error);
      ws.send(JSON.stringify({
        type: 'auth-failed',
        data: { message: 'Authentication failed' },
      }));
      ws.close(4000, 'Authentication failed');
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

    // SECURITY: Validate required fields
    if (!data || typeof data.projectId !== 'string' || typeof data.fileId !== 'number') {
      ws.send(JSON.stringify({
        type: 'error',
        data: { message: 'Invalid session data' },
      }));
      return;
    }

    // SECURITY: Block path traversal in projectId
    if (data.projectId.includes('..')) {
      ws.send(JSON.stringify({
        type: 'error',
        data: { message: 'Invalid projectId' },
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
      logger.error('Error joining session:', error);
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
      logger.error('Error handling document update:', error);
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

    // W-H1: 100ms throttle on cursor updates to prevent DoS
    if (isThrottled(ws.userId, 'cursor-update', 100)) {
      return;
    }

    try {
      await collaborativeEditingService.handleCursorUpdate(
        ws.sessionId,
        ws.userId,
        data
      );
    } catch (error) {
      logger.error('Error handling cursor update:', error);
      // W-H17: Send error response
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'error',
          data: { message: 'Failed to update cursor' },
        }));
      }
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
      logger.error('Error handling selection update:', error);
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
      logger.error('Error getting session state:', error);
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

    // 8.2 FIX: Clean up ping tracking
    if (ws.clientId) {
      unansweredPings.delete(ws.clientId);
    }

    // W-H5: Cleanup connections Map on ALL paths
    if (ws.userId) {
      // Update connection count
      const currentCount = userConnectionCounts.get(ws.userId) || 1;
      if (currentCount <= 1) {
        userConnectionCounts.delete(ws.userId);
      } else {
        userConnectionCounts.set(ws.userId, currentCount - 1);
      }
      
      // Remove from connections set
      const userConnections = this.connections.get(ws.userId);
      if (userConnections) {
        userConnections.delete(ws);
        if (userConnections.size === 0) {
          this.connections.delete(ws.userId);
        }
      }
      
      // W-H5: Cleanup throttle tracking for this client
      cleanupClientThrottles(ws.userId);
    }

    if (ws.sessionId && ws.userId) {
      try {
        await collaborativeEditingService.handleParticipantLeave(
          ws.sessionId,
          ws.userId
        );
      } catch (error) {
        logger.error('Error handling participant leave:', error);
      }
    }
  }

  private sendToUser(userId: string, message: any) {
    const userConnections = this.connections.get(userId);
    if (userConnections) {
      const messageStr = JSON.stringify(message);
      userConnections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(messageStr);
          wsMetrics.recordMessageSent('collaborative-editing', messageStr.length);
        }
      });
    }
  }

  public async shutdown() {
    logger.info('Shutting down collaborative editing WebSocket service...');
    
    // Close all connections with proper code/reason
    this.connections.forEach((wsSet, userId) => {
      wsSet.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'server-shutdown',
          }));
          ws.close(1001, 'Server shutting down');
        }
      });
    });

    this.wss.close();
    await collaborativeEditingService.shutdown();
    logger.info('Collaborative editing WebSocket service shut down');
  }
}

export function setupCollaborativeEditingWebSocket(server: Server): CollaborativeEditingWebSocketHandler {
  return new CollaborativeEditingWebSocketHandler(server);
}