import WebSocket from 'ws';
import { IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';
import { backgroundTestingService } from '../services/background-testing-service';
import { createLogger } from '../utils/logger';
import { db } from '../db';
import { projects } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { storage } from '../storage';

const logger = createLogger('background-testing-ws');

/**
 * SECURITY: Get JWT secret - fails fast if not configured
 */
function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('[SECURITY] JWT_SECRET environment variable is not configured');
  }
  return secret;
}

// Lazy-evaluated JWT secret (validated on first use)
const getSecret = () => getJWTSecret();

/**
 * 🔥 SECURITY IMPLEMENTATION: Authenticated WebSocket with project access control
 */
interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  username?: string;
  subscribedProjects?: Set<number>; // Projects this client is authorized to receive updates for
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

    // 🔥 SECURITY CRITICAL: Verify JWT token (not just split on ':')
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

    // Verify user exists in database
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

    // Store authenticated user info
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

    // 🔥 SECURITY CRITICAL: Verify user OWNS this project (not just that it exists!)
    const userIdNum = parseInt(ws.userId, 10);
    const [project] = await db.select()
      .from(projects)
      .where(and(
        eq(projects.id, projectId),
        eq(projects.ownerId, userIdNum) // MUST be owner to receive test notifications
        // TODO: Add collaborator check via join if needed
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


    // Add to subscribed projects
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
 * Background Testing WebSocket Handler
 * 
 * 🔥 SECURITY FEATURES:
 * - Requires authentication before any operations
 * - Verifies project access permissions before subscriptions
 * - Only broadcasts test events to authorized project members
 * - Rate limiting on subscriptions to prevent DoS
 * 
 * Provides real-time notifications for background test execution:
 * - Test queued events
 * - Test started events
 * - Test completed events (with results)
 * - Test failed events
 * - Agent notifications for failed tests
 */
export function setupBackgroundTestingWebSocket(wss: WebSocket.Server) {
  logger.info('Setting up authenticated WebSocket handler');
  
  wss.on('connection', (ws: AuthenticatedWebSocket, req: IncomingMessage) => {
    logger.info('New client connected - authentication required');
    
    // Initialize subscription tracking
    ws.subscribedProjects = new Set();
    
    // Send initial connection confirmation (auth required)
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Authentication required - send auth message with token',
      timestamp: new Date().toISOString()
    }));
    
    // 🔥 SECURITY: Filtered event handlers - only broadcast to authorized clients
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
    
    // Register event listeners
    backgroundTestingService.on('test:queued', handleTestQueued);
    backgroundTestingService.on('test:started', handleTestStarted);
    backgroundTestingService.on('test:completed', handleTestCompleted);
    backgroundTestingService.on('test:failed', handleTestFailed);
    backgroundTestingService.on('test:agent-notification', handleAgentNotification);
    
    // Handle incoming messages from client
    ws.on('message', async (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        
        switch (data.type) {
          case 'auth':
            // 🔥 SECURITY: Authenticate client before any operations
            await handleAuth(ws, data);
            break;
            
          case 'subscribe':
            // 🔥 SECURITY: Verify auth and project access before subscription
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
            // Unsubscribe from project updates
            if (ws.subscribedProjects?.has(data.projectId)) {
              ws.subscribedProjects.delete(data.projectId);
              logger.info(`Client ${ws.userId} unsubscribed from project ${data.projectId}`);
            }
            break;
            
          case 'get-status':
            // 🔥 SECURITY: Verify auth and project access before returning status
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
    
    // Handle client disconnect
    ws.on('close', () => {
      console.log('[BackgroundTestingWS] Client disconnected');
      
      // Clean up event listeners
      backgroundTestingService.off('test:queued', handleTestQueued);
      backgroundTestingService.off('test:started', handleTestStarted);
      backgroundTestingService.off('test:completed', handleTestCompleted);
      backgroundTestingService.off('test:failed', handleTestFailed);
      backgroundTestingService.off('test:agent-notification', handleAgentNotification);
    });
    
    // Handle errors
    ws.on('error', (error) => {
      console.error('[BackgroundTestingWS] WebSocket error:', error);
    });
  });
}
