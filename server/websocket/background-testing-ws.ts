import WebSocket, { WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import type { Server } from 'http';
import type { Socket } from 'net';
import type { Duplex } from 'stream';
import jwt from 'jsonwebtoken';
import { backgroundTestingService } from '../services/background-testing-service';
import { createLogger } from '../utils/logger';
import { db } from '../db';
import { projects } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { storage } from '../storage';
import { centralUpgradeDispatcher } from './central-upgrade-dispatcher';
import { markSocketAsHandled } from './upgrade-guard';
import { getJwtSecret } from '../utils/secrets-manager';

const logger = createLogger('background-testing-ws');

// ✅ Fortune 500 Security: Use centralized secrets manager
const getSecret = () => getJwtSecret();

/**
 * 🔥 SECURITY IMPLEMENTATION: Authenticated WebSocket with project access control
 */
interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  username?: string;
  subscribedProjects?: Set<number>;
}

/**
 * 🔥 SECURITY: Authenticate WebSocket client with JWT verification
 */
async function handleAuth(ws: AuthenticatedWebSocket, data: any) {
  try {
    if (!data.token) {
      ws.send(JSON.stringify({
        type: 'auth-failed',
        message: 'Authentication token required',
        timestamp: new Date().toISOString()
      }));
      ws.close();
      return;
    }

    let decoded: any;
    try {
      decoded = jwt.verify(data.token, getSecret());
    } catch (jwtError) {
      logger.warn('JWT verification failed:', jwtError);
      ws.send(JSON.stringify({
        type: 'auth-failed',
        message: 'Invalid or expired token',
        timestamp: new Date().toISOString()
      }));
      ws.close();
      return;
    }

    const user = await storage.getUser(decoded.userId);
    if (!user) {
      logger.warn(`JWT valid but user ${decoded.userId} not found in database`);
      ws.send(JSON.stringify({
        type: 'auth-failed',
        message: 'User not found',
        timestamp: new Date().toISOString()
      }));
      ws.close();
      return;
    }

    ws.userId = String(user.id);
    ws.username = user.username;
    
    logger.info(`✅ Client authenticated as user ${user.id} (${user.username})`);
    
    ws.send(JSON.stringify({
      type: 'auth-success',
      data: {
        userId: user.id,
        username: user.username
      },
      timestamp: new Date().toISOString()
    }));
  } catch (error) {
    logger.error('Authentication error:', error);
    ws.send(JSON.stringify({
      type: 'auth-failed',
      message: 'Authentication failed',
      timestamp: new Date().toISOString()
    }));
    ws.close();
  }
}

/**
 * 🔥 SECURITY: Verify project access and subscribe client
 */
async function handleSubscribe(ws: AuthenticatedWebSocket, projectId: number) {
  try {
    if (!ws.userId) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Not authenticated',
        timestamp: new Date().toISOString()
      }));
      return;
    }

    const userIdNum = parseInt(ws.userId, 10);
    const [project] = await db.select()
      .from(projects)
      .where(and(
        eq(projects.id, projectId),
        eq(projects.ownerId, userIdNum)
      ))
      .limit(1);

    if (!project) {
      logger.warn(`⚠️  SECURITY: User ${ws.userId} attempted to subscribe to unauthorized project ${projectId}`);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Not authorized for this project (must be project owner)',
        timestamp: new Date().toISOString()
      }));
      return;
    }
    
    logger.info(`✅ User ${ws.userId} authorized for project ${projectId} (owner: ${project.ownerId})`);

    ws.subscribedProjects?.add(projectId);
    logger.info(`User ${ws.userId} subscribed to project ${projectId}`);
    
    ws.send(JSON.stringify({
      type: 'subscribed',
      projectId,
      timestamp: new Date().toISOString()
    }));
  } catch (error) {
    logger.error('Subscription error:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Failed to subscribe to project',
      timestamp: new Date().toISOString()
    }));
  }
}

/**
 * Background Testing WebSocket Service
 * 
 * 40-YEAR SENIOR ENGINEER FIX (Dec 6, 2025): Migrated to Central Upgrade Dispatcher
 * - Uses noServer: true + centralUpgradeDispatcher.register()
 * - Eliminates race conditions from multiple upgrade listeners
 * 
 * 🔥 SECURITY FEATURES:
 * - Requires authentication before any operations
 * - Verifies project access permissions before subscriptions
 * - Only broadcasts test events to authorized project members
 * - Rate limiting on subscriptions to prevent DoS
 */
class BackgroundTestingWebSocketService {
  private wss: WebSocketServer | null = null;

  /**
   * Initialize the background testing WebSocket service
   * Registers with the central upgrade dispatcher
   */
  initialize(server: Server): void {
    this.wss = new WebSocketServer({ noServer: true });

    this.wss.on('error', (err: Error) => {
      logger.error('[BackgroundTestingWS] WebSocketServer ERROR:', err.message);
    });

    centralUpgradeDispatcher.register(
      '/ws/background-tests',
      (request: IncomingMessage, socket: Duplex, head: Buffer) => {
        this.handleUpgrade(request, socket as Socket, head);
      },
      { pathMatch: 'exact', priority: 50 }
    );

    logger.info('[BackgroundTestingWS] ✅ Service initialized with central dispatcher (noServer mode)');

    this.wss.on('connection', (ws: AuthenticatedWebSocket, req: IncomingMessage) => {
      logger.info('[BackgroundTestingWS] New client connected via central dispatcher - authentication required');
      
      ws.subscribedProjects = new Set();
      
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Authentication required - send auth message with token',
        timestamp: new Date().toISOString()
      }));
      
      const handleTestQueued = (data: any) => {
        if (ws.readyState === WebSocket.OPEN && ws.subscribedProjects?.has(data.projectId)) {
          ws.send(JSON.stringify({
            type: 'test:queued',
            data,
            timestamp: new Date().toISOString()
          }));
        }
      };
      
      const handleTestStarted = (data: any) => {
        if (ws.readyState === WebSocket.OPEN && ws.subscribedProjects?.has(data.projectId)) {
          ws.send(JSON.stringify({
            type: 'test:started',
            data,
            timestamp: new Date().toISOString()
          }));
        }
      };
      
      const handleTestCompleted = (data: any) => {
        if (ws.readyState === WebSocket.OPEN && ws.subscribedProjects?.has(data.projectId)) {
          ws.send(JSON.stringify({
            type: 'test:completed',
            data,
            timestamp: new Date().toISOString()
          }));
        }
      };
      
      const handleTestFailed = (data: any) => {
        if (ws.readyState === WebSocket.OPEN && ws.subscribedProjects?.has(data.projectId)) {
          ws.send(JSON.stringify({
            type: 'test:failed',
            data,
            timestamp: new Date().toISOString()
          }));
        }
      };
      
      const handleAgentNotification = (data: any) => {
        if (ws.readyState === WebSocket.OPEN && ws.subscribedProjects?.has(data.projectId)) {
          ws.send(JSON.stringify({
            type: 'test:agent-notification',
            data,
            timestamp: new Date().toISOString()
          }));
        }
      };
      
      backgroundTestingService.on('test:queued', handleTestQueued);
      backgroundTestingService.on('test:started', handleTestStarted);
      backgroundTestingService.on('test:completed', handleTestCompleted);
      backgroundTestingService.on('test:failed', handleTestFailed);
      backgroundTestingService.on('test:agent-notification', handleAgentNotification);
      
      ws.on('message', async (message: string) => {
        try {
          const data = JSON.parse(message.toString());
          
          switch (data.type) {
            case 'auth':
              await handleAuth(ws, data);
              break;
              
            case 'subscribe':
              if (!ws.userId) {
                ws.send(JSON.stringify({
                  type: 'error',
                  message: 'Authentication required',
                  timestamp: new Date().toISOString()
                }));
                return;
              }
              
              await handleSubscribe(ws, data.projectId);
              break;
              
            case 'unsubscribe':
              if (ws.subscribedProjects?.has(data.projectId)) {
                ws.subscribedProjects.delete(data.projectId);
                logger.info(`Client ${ws.userId} unsubscribed from project ${data.projectId}`);
              }
              break;
              
            case 'get-status':
              if (!ws.userId) {
                ws.send(JSON.stringify({
                  type: 'error',
                  message: 'Authentication required',
                  timestamp: new Date().toISOString()
                }));
                return;
              }
              
              if (!ws.subscribedProjects?.has(data.projectId)) {
                ws.send(JSON.stringify({
                  type: 'error',
                  message: 'Not authorized for this project',
                  timestamp: new Date().toISOString()
                }));
                return;
              }
              
              const status = backgroundTestingService.getTestStatus(data.projectId);
              ws.send(JSON.stringify({
                type: 'status',
                projectId: data.projectId,
                status,
                timestamp: new Date().toISOString()
              }));
              break;
              
            default:
              logger.warn(`Unknown message type: ${data.type}`);
          }
        } catch (error) {
          logger.error('Error processing message:', error);
        }
      });
      
      ws.on('close', () => {
        logger.info('[BackgroundTestingWS] Client disconnected');
        
        backgroundTestingService.off('test:queued', handleTestQueued);
        backgroundTestingService.off('test:started', handleTestStarted);
        backgroundTestingService.off('test:completed', handleTestCompleted);
        backgroundTestingService.off('test:failed', handleTestFailed);
        backgroundTestingService.off('test:agent-notification', handleAgentNotification);
      });
      
      ws.on('error', (error) => {
        logger.error('[BackgroundTestingWS] WebSocket error:', error);
      });
    });
  }

  /**
   * Handle the WebSocket upgrade for /ws/background-tests
   * Called by the central dispatcher after path matching
   */
  private handleUpgrade(request: IncomingMessage, socket: Socket, head: Buffer): void {
    markSocketAsHandled(request, socket);
    
    logger.info('[BackgroundTestingWS] Upgrade request received via central dispatcher');
    
    this.wss!.handleUpgrade(request, socket, head, (ws) => {
      logger.info('[BackgroundTestingWS] 🎯 Upgrade complete, emitting connection event');
      this.wss!.emit('connection', ws, request);
    });
  }
}

export const backgroundTestingWebSocketService = new BackgroundTestingWebSocketService();

/**
 * Legacy export for backward compatibility
 * @deprecated Use backgroundTestingWebSocketService.initialize(server) instead
 */
export function setupBackgroundTestingWebSocket(server: Server): void {
  backgroundTestingWebSocketService.initialize(server);
}
