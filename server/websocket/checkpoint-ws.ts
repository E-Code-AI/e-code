import WebSocket, { WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import type { Server } from 'http';
import jwt from 'jsonwebtoken';
import { checkpointRestoreService } from '../services/checkpoint-restore.service';
import { createLogger } from '../utils/logger';
import { db } from '../db';
import { projects } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { storage } from '../storage';
import { centralUpgradeDispatcher } from './central-upgrade-dispatcher';
import { markSocketAsHandled } from './upgrade-guard';
import { getJwtSecret } from '../utils/secrets-manager';

const logger = createLogger('checkpoint-ws');

const getSecret = () => getJwtSecret();

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  username?: string;
  subscribedProjects?: Set<number>;
}

const clients = new Map<number, Set<AuthenticatedWebSocket>>();

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
    ws.subscribedProjects = new Set();
    
    logger.info(`✅ Checkpoint WS: Client authenticated as user ${user.id} (${user.username})`);
    
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
      logger.warn(`⚠️ SECURITY: User ${ws.userId} attempted to subscribe to unauthorized project ${projectId}`);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Not authorized for this project',
        timestamp: new Date().toISOString()
      }));
      return;
    }

    ws.subscribedProjects?.add(projectId);

    if (!clients.has(projectId)) {
      clients.set(projectId, new Set());
    }
    clients.get(projectId)!.add(ws);

    logger.info(`✅ Checkpoint WS: User ${ws.userId} subscribed to project ${projectId}`);
    
    ws.send(JSON.stringify({
      type: 'subscribed',
      projectId,
      timestamp: new Date().toISOString()
    }));
  } catch (error) {
    logger.error('Subscribe error:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Failed to subscribe',
      timestamp: new Date().toISOString()
    }));
  }
}

function handleUnsubscribe(ws: AuthenticatedWebSocket, projectId: number) {
  ws.subscribedProjects?.delete(projectId);
  clients.get(projectId)?.delete(ws);
  
  if (clients.get(projectId)?.size === 0) {
    clients.delete(projectId);
  }

  ws.send(JSON.stringify({
    type: 'unsubscribed',
    projectId,
    timestamp: new Date().toISOString()
  }));
}

function broadcastToProject(projectId: number, message: any) {
  const projectClients = clients.get(projectId);
  if (!projectClients) return;

  const messageStr = JSON.stringify(message);
  projectClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

export function setupCheckpointWebSocket(httpServer: Server) {
  const wss = new WebSocketServer({ noServer: true });

  centralUpgradeDispatcher.register('/ws/checkpoints', (request, socket, head) => {
    markSocketAsHandled(request, socket);
    
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (ws: AuthenticatedWebSocket, request: IncomingMessage) => {
    logger.info('[Checkpoint WS] New client connected');
    
    ws.subscribedProjects = new Set();

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());

        switch (message.type) {
          case 'auth':
            await handleAuth(ws, message);
            break;

          case 'subscribe':
            if (typeof message.projectId === 'number') {
              await handleSubscribe(ws, message.projectId);
            }
            break;

          case 'unsubscribe':
            if (typeof message.projectId === 'number') {
              handleUnsubscribe(ws, message.projectId);
            }
            break;

          case 'ping':
            ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
            break;

          default:
            logger.warn(`Unknown message type: ${message.type}`);
        }
      } catch (error) {
        logger.error('Error processing message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
          timestamp: new Date().toISOString()
        }));
      }
    });

    ws.on('close', () => {
      ws.subscribedProjects?.forEach(projectId => {
        clients.get(projectId)?.delete(ws);
        if (clients.get(projectId)?.size === 0) {
          clients.delete(projectId);
        }
      });
      logger.info('[Checkpoint WS] Client disconnected');
    });

    ws.on('error', (error) => {
      logger.error('[Checkpoint WS] WebSocket error:', error);
    });
  });

  checkpointRestoreService.on('restored', (event) => {
    logger.info(`[Checkpoint WS] Broadcasting restore event for project ${event.projectId}`);
    broadcastToProject(event.projectId, {
      type: 'checkpoint:restored',
      data: event,
      timestamp: new Date().toISOString()
    });
  });

  checkpointRestoreService.on('checkpoint_created', (event) => {
    logger.info(`[Checkpoint WS] Broadcasting checkpoint created for project ${event.projectId}`);
    broadcastToProject(event.projectId, {
      type: 'checkpoint:created',
      data: event,
      timestamp: new Date().toISOString()
    });
  });

  logger.info('[Checkpoint WS] ✅ WebSocket service initialized at /ws/checkpoints');

  return wss;
}
