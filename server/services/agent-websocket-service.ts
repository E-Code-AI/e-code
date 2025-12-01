// WebSocket service for real-time agent progress updates
import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import type { Socket } from 'net';
import { Server } from 'http';
import { createLogger } from '../utils/logger';
import { wrapWebSocketServer } from '../websocket/upgrade-guard';
import jwt from 'jsonwebtoken';

const logger = createLogger('agent-websocket-service');

// JWT secret for bootstrap tokens (must match workspace-bootstrap.router.ts)
const JWT_SECRET = process.env.JWT_SECRET || 'e-code-jwt-secret-key-2024';

interface AgentProgressUpdate {
  type: 'step' | 'summary' | 'error' | 'complete';
  projectId: number;
  sessionId: string;
  data: {
    step?: {
      id: string;
      type: string;
      title: string;
      icon?: string;
      expandable?: boolean;
      details?: string[];
      file?: string;
      children?: any[];
    };
    summary?: {
      timeWorked: string;
      workDone: number;
      itemsRead: number;
      codeChanged: { added: number; removed: number };
      agentUsage: number;
    };
    error?: string;
    complete?: boolean;
  };
}

interface DeviceConnection {
  ws: WebSocket;
  deviceId: string;
  deviceType: 'web' | 'mobile' | 'desktop';
  connectedAt: Date;
  isAlive: boolean; // For heartbeat tracking
}

class AgentWebSocketService {
  public wss: WebSocketServer | null = null;
  private connections = new Map<string, Set<DeviceConnection>>();
  private pingInterval: NodeJS.Timeout | null = null;
  
  initialize(server: Server) {
    // ✅ CRITICAL FIX (Dec 1, 2025): Use { server, path, verifyClient } mode
    // PROBLEM: noServer + prependListener approach lets Express/Vite middleware
    // continue processing the HTTP request after handleUpgrade, writing HTML to
    // the same socket and causing "Invalid frame header" errors.
    // 
    // SOLUTION: Use standard { server, path } mode which:
    // 1. Lets ws library fully own the upgrade process at the HTTP server layer
    // 2. Completely bypasses Express middleware for this path
    // 3. Uses verifyClient for token validation before upgrade
    this.wss = new WebSocketServer({
      server,
      path: '/ws/agent',
      verifyClient: (info, callback) => {
        try {
          const url = new URL(info.req.url || '', `http://${info.req.headers.host}`);
          const projectId = url.searchParams.get('projectId');
          const sessionId = url.searchParams.get('sessionId');
          const token = url.searchParams.get('bootstrap');
          
          logger.info('[Agent WebSocket] verifyClient: projectId=' + projectId + ', sessionId=' + sessionId + ', hasToken=' + !!token);
          
          if (!projectId || !sessionId) {
            logger.warn('[Agent WebSocket] Missing projectId or sessionId - rejecting');
            callback(false, 400, 'Missing projectId or sessionId');
            return;
          }
          
          if (!token) {
            logger.warn('[Agent WebSocket] No bootstrap token provided - rejecting');
            callback(false, 401, 'No bootstrap token provided');
            return;
          }
          
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          
          if (decoded.projectId !== projectId || decoded.sessionId !== sessionId) {
            logger.warn('[Agent WebSocket] Token projectId/sessionId mismatch - rejecting');
            callback(false, 401, 'Token mismatch');
            return;
          }
          
          logger.info(`[Agent WebSocket] ✅ Token validated for project ${projectId}, session ${sessionId}`);
          callback(true);
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          logger.warn(`[Agent WebSocket] Token validation failed: ${errorMsg}`);
          callback(false, 401, 'Invalid token: ' + errorMsg);
        }
      }
    });
    
    // Wrap for socket handling tracking
    wrapWebSocketServer(this.wss);
    
    logger.info('[Agent WebSocket] Service initialized with { server, path } mode (bypasses Express)');
    
    // Start heartbeat for connection health monitoring
    this.startHeartbeat();
    
    this.wss.on('connection', (ws, req) => {
      console.log(`[Agent WebSocket] 🎯 CONNECTION ESTABLISHED! URL: ${req.url}, ws.readyState: ${ws.readyState}`);
      
      logger.info(`[Agent WebSocket] New connection attempt from ${req.socket.remoteAddress} - URL: ${req.url}`);
      
      const url = new URL(req.url!, `http://${req.headers.host}`);
      const projectId = url.searchParams.get('projectId');
      const sessionId = url.searchParams.get('sessionId');
      const deviceId = url.searchParams.get('deviceId') || `device-${Date.now()}`;
      const deviceType = (url.searchParams.get('deviceType') || 'web') as 'web' | 'mobile' | 'desktop';
      
      logger.info(`[Agent WebSocket] Parsed params - projectId: ${projectId}, sessionId: ${sessionId}, deviceId: ${deviceId}, deviceType: ${deviceType}`);
      
      if (!projectId || !sessionId) {
        logger.warn(`[Agent WebSocket] Rejecting connection - missing params (projectId: ${projectId}, sessionId: ${sessionId})`);
        ws.close(1008, 'Missing projectId or sessionId');
        return;
      }
      
      const connectionKey = `${projectId}-${sessionId}`;
      
      // Create device connection object
      const deviceConnection: DeviceConnection = {
        ws,
        deviceId,
        deviceType,
        connectedAt: new Date(),
        isAlive: true // Initially alive
      };
      
      // Add to connections map (supports multiple devices per session)
      if (!this.connections.has(connectionKey)) {
        this.connections.set(connectionKey, new Set());
      }
      this.connections.get(connectionKey)!.add(deviceConnection);
      
      const deviceCount = this.connections.get(connectionKey)!.size;
      logger.info(`[Agent WebSocket] ✅ Connection established: ${connectionKey} (deviceId: ${deviceId}, type: ${deviceType}, total devices: ${deviceCount})`);
      
      // Build roster of currently connected devices (excluding this one)
      const roster = Array.from(this.connections.get(connectionKey)!)
        .filter((d) => d.deviceId !== deviceId)
        .map((d) => ({
          deviceId: d.deviceId,
          deviceType: d.deviceType,
          connectedAt: d.connectedAt.toISOString()
        }));
      
      // Send initial connection confirmation WITH roster
      ws.send(JSON.stringify({
        type: 'connected',
        projectId,
        sessionId,
        deviceId,
        deviceType,
        totalDevices: deviceCount,
        roster
      }));

      // Notify other devices about new connection (presence update)
      this.broadcastPresence(connectionKey, {
        type: 'device_connected',
        deviceId,
        deviceType,
        connectedAt: deviceConnection.connectedAt.toISOString(),
        totalDevices: deviceCount
      }, deviceId);

      // ✅ CRITICAL FIX (Nov 24, 2025): Trigger workflow startup on WebSocket connection
      // PROBLEM: Background plan generation could fail, leaving WebSocket connected but idle
      // SOLUTION: When WebSocket connects, check if workflow exists and start it if needed
      logger.info(`[Agent WebSocket] Checking workflow status for session ${sessionId}...`);

      (async () => {
        try {
          // Import services dynamically to avoid circular dependencies
          const { db } = await import('../db');
          const { agentPlans, agentWorkflows, agentSessions } = await import('@shared/schema');
          const { eq } = await import('drizzle-orm');
          const { agentOrchestrator } = await import('./agent-orchestrator.service');
          const { aiPlanGenerator } = await import('./ai-plan-generator.service');

          // Check if a plan exists for this session
          const existingPlans = await db.select()
            .from(agentPlans)
            .where(eq(agentPlans.sessionId, sessionId))
            .limit(1);

          if (existingPlans.length > 0) {
            logger.info(`[Agent WebSocket] Plan already exists for session ${sessionId}, checking workflow...`);

            // Check if workflow has been executed
            const existingWorkflows = await db.select()
              .from(agentWorkflows)
              .where(eq(agentWorkflows.sessionId, sessionId))
              .limit(1);

            if (existingWorkflows.length === 0) {
              logger.warn(`[Agent WebSocket] Plan exists but NO workflow! Starting execution for session ${sessionId}...`);

              // Get session data
              const sessions = await db.select()
                .from(agentSessions)
                .where(eq(agentSessions.id, sessionId))
                .limit(1);

              if (sessions.length === 0) {
                throw new Error(`Session ${sessionId} not found`);
              }

              const session = sessions[0];
              const storedPlan = existingPlans[0];

              // Reconstruct ExecutionPlan from stored agentPlans columns
              const executionPlan = {
                goal: storedPlan.goal,
                tasks: storedPlan.tasks,
                metadata: storedPlan.metadata ?? {},
                planId: storedPlan.planId,
                estimatedTime: storedPlan.estimatedTime
              };

              // Execute the plan
              await agentOrchestrator.executeAutonomousPlan(
                sessionId,
                executionPlan,
                projectId,
                session.userId.toString()
              );

              logger.info(`[Agent WebSocket] ✅ Workflow execution started for session ${sessionId}`);
            } else {
              const workflow = existingWorkflows[0];
              logger.info(`[Agent WebSocket] Workflow already exists for session ${sessionId}, status: ${workflow.status}`);
              
              // ✅ FIX (Dec 1, 2025): Send workflow status to client when already complete
              // PROBLEM: Client was left waiting with no response when workflow was already done
              // SOLUTION: Send completion/failure status immediately so UI can update
              if (workflow.status === 'completed') {
                ws.send(JSON.stringify({
                  type: 'complete',
                  sessionId,
                  projectId,
                  message: 'Workspace creation completed successfully!',
                  workflowId: workflow.id
                }));
                logger.info(`[Agent WebSocket] ✅ Sent 'complete' event to client for session ${sessionId}`);
              } else if (workflow.status === 'failed') {
                ws.send(JSON.stringify({
                  type: 'error',
                  sessionId,
                  projectId,
                  message: workflow.error || 'Workspace creation failed',
                  workflowId: workflow.id
                }));
                logger.info(`[Agent WebSocket] ❌ Sent 'error' event to client for session ${sessionId}`);
              } else if (workflow.status === 'in_progress') {
                ws.send(JSON.stringify({
                  type: 'status',
                  sessionId,
                  projectId,
                  message: 'Workspace creation in progress...',
                  status: 'in_progress',
                  progress: workflow.progress || 0,
                  workflowId: workflow.id
                }));
                logger.info(`[Agent WebSocket] 🔄 Sent 'in_progress' status to client for session ${sessionId}`);
              }
            }
          } else {
            // ✅ FIX (Dec 1, 2025): Plan may not exist yet due to race condition
            // Bootstrap endpoint returns token immediately, then fires setImmediate for plan generation
            // Client WebSocket connects before setImmediate runs, finds no plan yet
            // This is NOT an error - just a timing issue. Send 'status' instead of 'error'
            logger.info(`[Agent WebSocket] No plan found yet for session ${sessionId} - waiting for plan generation to start...`);

            // Send status notification (not error) - plan generation will stream events when ready
            ws.send(JSON.stringify({
              type: 'status',
              status: 'waiting_for_plan',
              message: 'Connecting to AI... Plan generation will begin shortly.',
              sessionId,
              projectId
            }));
          }
        } catch (error: any) {
          logger.error(`[Agent WebSocket] Failed to check/start workflow for session ${sessionId}:`, error);

          // Send error to client
          ws.send(JSON.stringify({
            type: 'error',
            message: `Failed to start workspace workflow: ${error.message}`,
            sessionId,
            projectId
          }));
        }
      })().catch(err => {
        logger.error(`[Agent WebSocket] Unhandled error in workflow startup check:`, err);
      });
      
      ws.on('error', (error) => {
        logger.error(`[Agent WebSocket] WebSocket error for ${connectionKey} (device: ${deviceId}): ${error.message}`);
      });
      
      ws.on('close', (code, reason) => {
        // Remove this device from the connections
        const connections = this.connections.get(connectionKey);
        if (connections) {
          connections.delete(deviceConnection);
          
          const remainingDevices = connections.size;
          logger.info(`[Agent WebSocket] Connection closed: ${connectionKey} (deviceId: ${deviceId}, code: ${code}, remaining devices: ${remainingDevices})`);
          
          // Clean up empty connection sets
          if (remainingDevices === 0) {
            this.connections.delete(connectionKey);
          } else {
            // Notify other devices about disconnection
            this.broadcastPresence(connectionKey, {
              type: 'device_disconnected',
              deviceId,
              deviceType,
              totalDevices: remainingDevices
            }, deviceId);
          }
        }
      });
    });
    
    this.wss.on('error', (error) => {
      logger.error(`[Agent WebSocket] Server error: ${error.message}`);
    });
  }

  // ✅ CRITICAL FIX (Dec 1, 2025): verifyClient validates bootstrap tokens/sessions BEFORE WebSocket upgrade
  // This replaces the complex manual handleUpgrade flow that leaked requests to Express/Vite
  private verifyClient(
    info: { origin: string; req: IncomingMessage; secure: boolean },
    callback: (res: boolean, code?: number, message?: string) => void
  ) {
    try {
      const url = new URL(info.req.url!, `http://${info.req.headers.host}`);
      const projectId = url.searchParams.get('projectId');
      const sessionId = url.searchParams.get('sessionId');
      // ✅ CRITICAL FIX (Dec 1, 2025): Frontend sends 'bootstrap', not 'bootstrapToken'
      const bootstrapToken = url.searchParams.get('bootstrap') || url.searchParams.get('bootstrapToken');
      
      logger.info(`[Agent WebSocket] verifyClient: projectId=${projectId}, sessionId=${sessionId}, hasToken=${!!bootstrapToken}`);
      
      // Require projectId and sessionId
      if (!projectId || !sessionId) {
        logger.warn(`[Agent WebSocket] Rejecting connection - missing projectId or sessionId`);
        callback(false, 400, 'Missing projectId or sessionId');
        return;
      }
      
      // For bootstrap connections, validate the JWT token
      if (bootstrapToken) {
        try {
          const decoded = jwt.verify(bootstrapToken, JWT_SECRET) as {
            type: string;
            projectId: number;
            sessionId: string;
            userId: number;
            exp?: number;
          };
          
          // Validate token claims
          if (decoded.type !== 'agent_bootstrap') {
            logger.warn(`[Agent WebSocket] Invalid token type: ${decoded.type}`);
            callback(false, 401, 'Invalid token type');
            return;
          }
          
          if (decoded.sessionId !== sessionId) {
            logger.warn(`[Agent WebSocket] Session ID mismatch: token=${decoded.sessionId}, param=${sessionId}`);
            callback(false, 403, 'Session ID mismatch');
            return;
          }
          
          if (decoded.projectId.toString() !== projectId) {
            logger.warn(`[Agent WebSocket] Project ID mismatch: token=${decoded.projectId}, param=${projectId}`);
            callback(false, 403, 'Project ID mismatch');
            return;
          }
          
          logger.info(`[Agent WebSocket] ✅ Bootstrap token validated for project ${projectId}, session ${sessionId}`);
          callback(true);
          return;
        } catch (error: any) {
          logger.warn(`[Agent WebSocket] Bootstrap token validation failed: ${error.message}`);
          callback(false, 401, 'Invalid or expired bootstrap token');
          return;
        }
      }
      
      // For non-bootstrap connections, we'll validate session in the connection handler
      // This is a fallback for authenticated users who don't have a bootstrap token
      logger.info(`[Agent WebSocket] Allowing connection without bootstrap token (will validate session later)`);
      callback(true);
      
    } catch (error: any) {
      logger.error(`[Agent WebSocket] verifyClient error: ${error.message}`);
      callback(false, 500, 'Internal server error');
    }
  }
  
  // Heartbeat to detect stale connections
  // ✅ FIX (Nov 20, 2025): Browser WebSocket clients don't support manual pong API
  // Sending ws.ping() causes ws library to close connections with code 1006
  // Solution: Track isAlive flag and only terminate after multiple missed heartbeats
  private startHeartbeat() {
    this.pingInterval = setInterval(() => {
      this.connections.forEach((devices, connectionKey) => {
        devices.forEach((device) => {
          // ✅ CRITICAL: Don't send ping to browser clients
          // Browsers auto-handle ping/pong internally, manual ping causes 1006 closure
          // Instead, rely on readyState check and remove dead connections
          if (device.ws.readyState === WebSocket.CLOSED || device.ws.readyState === WebSocket.CLOSING) {
            devices.delete(device);
            logger.debug(`[Heartbeat] Removed stale device ${device.deviceId} from ${connectionKey}`);
          }
          // For future: Could implement application-level ping (JSON message) instead of WebSocket ping
        });
        
        // Clean up empty connection sets
        if (devices.size === 0) {
          this.connections.delete(connectionKey);
        }
      });
    }, 30000); // Every 30 seconds
  }
  
  // Broadcast presence updates to all devices EXCEPT the sender
  private broadcastPresence(connectionKey: string, message: any, excludeDeviceId?: string) {
    const devices = this.connections.get(connectionKey);
    if (!devices) return;
    
    const messageStr = JSON.stringify(message);
    let sentCount = 0;
    
    devices.forEach((device) => {
      if (device.deviceId !== excludeDeviceId && device.ws.readyState === WebSocket.OPEN) {
        device.ws.send(messageStr);
        sentCount++;
      }
    });
    
    logger.debug(`[Presence] Broadcasted ${message.type} to ${sentCount} devices on ${connectionKey}`);
  }
  
  // Send progress update to ALL connected devices for a session
  sendProgress(update: AgentProgressUpdate) {
    const connectionKey = `${update.projectId}-${update.sessionId}`;
    const devices = this.connections.get(connectionKey);
    
    if (!devices || devices.size === 0) {
      // Changed to debug - this is expected during autonomous workspace creation without UI
      logger.debug(`Cannot broadcast status: No active connections for ${connectionKey}`);
      return;
    }
    
    const messageStr = JSON.stringify(update);
    let sentCount = 0;
    
    devices.forEach((device) => {
      if (device.ws.readyState === WebSocket.OPEN) {
        device.ws.send(messageStr);
        sentCount++;
      }
    });
    
    logger.debug(`Sent progress update to ${sentCount} device(s) on ${connectionKey}: ${update.type}`);
  }
  
  sendStepUpdate(projectId: number, sessionId: string, step: any) {
    this.sendProgress({
      type: 'step',
      projectId,
      sessionId,
      data: { step }
    });
  }
  
  sendSummaryUpdate(projectId: number, sessionId: string, summary: any) {
    this.sendProgress({
      type: 'summary',
      projectId,
      sessionId,
      data: { summary }
    });
  }
  
  sendError(projectId: number, sessionId: string, error: string) {
    this.sendProgress({
      type: 'error',
      projectId,
      sessionId,
      data: { error }
    });
  }
  
  sendComplete(projectId: number, sessionId: string) {
    this.sendProgress({
      type: 'complete',
      projectId,
      sessionId,
      data: { complete: true }
    });
  }

  // Generic broadcast method for autonomous agent events (sends to ALL devices)
  broadcast(message: any, projectId: string | number) {
    const sessionId = message.sessionId || 'default';
    const connectionKey = `${projectId}-${sessionId}`;
    const devices = this.connections.get(connectionKey);

    if (!devices || devices.size === 0) {
      // Changed to debug - this is expected during autonomous workspace creation without UI
      logger.debug(`Cannot broadcast ${message.type}: No active connections for ${connectionKey}`);
      return;
    }

    const messageStr = JSON.stringify(message);
    let sentCount = 0;

    devices.forEach((device) => {
      if (device.ws.readyState === WebSocket.OPEN) {
        device.ws.send(messageStr);
        sentCount++;
      }
    });

    logger.debug(`Broadcasted ${message.type} to ${sentCount} device(s) on ${connectionKey}`);
  }

  // NEW: Convenience methods for plan execution events (matches frontend expectations)
  broadcastPlanStarted(projectId: string | number, sessionId: string, totalTasks: number) {
    this.broadcast({
      type: 'task_start',
      projectId,
      sessionId,
      taskName: 'Initializing autonomous workspace creation',
      message: `Starting ${totalTasks} tasks...`
    }, projectId);
  }

  broadcastTaskStarted(projectId: string | number, sessionId: string, taskIndex: number, task: any) {
    this.broadcast({
      type: 'task_start',
      projectId,
      sessionId,
      taskId: task.id || `task-${taskIndex}`,
      taskName: task.description || task.name || `Task ${taskIndex + 1}`,
      message: task.description || `Starting task ${taskIndex + 1}`
    }, projectId);
  }

  broadcastTaskCompleted(projectId: string | number, sessionId: string, taskIndex: number, totalTasks: number, result: any) {
    const progress = Math.round(((taskIndex + 1) / totalTasks) * 100);
    this.broadcast({
      type: 'task_complete',
      projectId,
      sessionId,
      taskId: result.stepId || `task-${taskIndex}`,
      taskName: `Task ${taskIndex + 1} completed`,
      progress
    }, projectId);
  }

  broadcastFileCreated(projectId: string | number, sessionId: string, filePath: string) {
    this.broadcast({
      type: 'file_created',
      projectId,
      sessionId,
      filePath
    }, projectId);
  }

  broadcastCommandOutput(projectId: string | number, sessionId: string, stream: 'stdout' | 'stderr', data: string) {
    this.broadcast({
      type: 'command_output',
      projectId,
      sessionId,
      stream,
      data
    }, projectId);
  }

  broadcastPlanCompleted(projectId: string | number, sessionId: string, success: boolean) {
    this.broadcast({
      type: 'complete',
      projectId,
      sessionId,
      message: 'Workspace creation complete! 🎉'
    }, projectId);
  }

  broadcastPlanFailed(projectId: string | number, sessionId: string, error: string) {
    this.broadcast({
      type: 'error',
      projectId,
      sessionId,
      message: error
    }, projectId);
  }

  broadcastAgentMessage(projectId: string | number, sessionId: string, content: string, messageType?: string) {
    this.broadcast({
      type: 'agent_message',
      projectId,
      sessionId,
      content,
      messageType
    }, projectId);
  }
}

export const agentWebSocketService = new AgentWebSocketService();