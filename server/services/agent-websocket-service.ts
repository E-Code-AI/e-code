// WebSocket service for real-time agent progress updates
import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import type { Socket } from 'net';
import { Server } from 'http';
import { createLogger } from '../utils/logger';
import { wrapWebSocketServer, markSocketAsHandled } from '../websocket/upgrade-guard';
import { isOriginAllowed } from '../utils/origin-validation';
import jwt from 'jsonwebtoken';

const logger = createLogger('agent-websocket-service');

// WebSocket connection rate limiter (per IP)
// Prevents connection flooding attacks
const WS_CONNECTION_LIMITS = {
  maxConnectionsPerMinute: 30,     // Max new connections per IP per minute
  maxActiveConnections: 50,        // Max active connections per IP
  blockDurationMs: 60 * 1000,      // Block duration for violators (1 min)
};

// Simple in-memory rate limiter for WebSocket connections
const wsConnectionTracking = new Map<string, { count: number; timestamp: number; active: number }>();

function checkWebSocketRateLimit(ip: string): { allowed: boolean; reason?: string } {
  const now = Date.now();
  const tracking = wsConnectionTracking.get(ip);
  
  // Skip rate limiting in development
  if (process.env.NODE_ENV === 'development') {
    return { allowed: true };
  }
  
  if (!tracking) {
    wsConnectionTracking.set(ip, { count: 1, timestamp: now, active: 1 });
    return { allowed: true };
  }
  
  // Reset counter if window has passed
  if (now - tracking.timestamp > WS_CONNECTION_LIMITS.blockDurationMs) {
    wsConnectionTracking.set(ip, { count: 1, timestamp: now, active: tracking.active + 1 });
    return { allowed: true };
  }
  
  // Check connection rate
  if (tracking.count >= WS_CONNECTION_LIMITS.maxConnectionsPerMinute) {
    logger.warn(`[Agent WebSocket] Rate limit exceeded for IP: ${ip} (${tracking.count} connections in window)`);
    return { allowed: false, reason: 'Too many connection attempts' };
  }
  
  // Check active connections
  if (tracking.active >= WS_CONNECTION_LIMITS.maxActiveConnections) {
    logger.warn(`[Agent WebSocket] Max active connections exceeded for IP: ${ip} (${tracking.active} active)`);
    return { allowed: false, reason: 'Too many active connections' };
  }
  
  // Allow and increment
  tracking.count++;
  tracking.active++;
  return { allowed: true };
}

function decrementActiveConnections(ip: string): void {
  const tracking = wsConnectionTracking.get(ip);
  if (tracking && tracking.active > 0) {
    tracking.active--;
  }
}

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
    // ✅ CRITICAL FIX (Dec 1, 2025): Use noServer mode with prependListener for priority
    // PROBLEM: { server, path } mode registers listener AFTER other WS services,
    // causing race conditions with 13+ upgrade listeners. The ws library's internal
    // completeUpgrade sometimes fails silently when other handlers interfere.
    //
    // SOLUTION: Use noServer + prependListener to run FIRST, before any other handlers.
    // Mark socket as handled immediately to prevent other handlers from touching it.
    this.wss = new WebSocketServer({ noServer: true });
    
    // 🔍 DEBUG: Add error handlers
    this.wss.on('error', (err: Error) => {
      console.error('[Agent WebSocket] WebSocketServer ERROR:', err.message, err.stack);
    });
    
    this.wss.on('wsClientError', (err: Error, socket: any, request: any) => {
      console.error('[Agent WebSocket] wsClientError:', err.message);
      console.error('[Agent WebSocket] wsClientError URL:', request?.url);
    });
    
    // Register as FIRST listener using prependListener (runs before all other upgrade handlers)
    // CRITICAL: Cannot use async/await here - must stay synchronous to prevent race conditions
    server.prependListener('upgrade', (request: any, socket: any, head: Buffer) => {
      const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;
      
      // Only handle /ws/agent path
      if (pathname !== '/ws/agent') {
        return;
      }
      
      // Mark socket as handled IMMEDIATELY to prevent other handlers from interfering
      markSocketAsHandled(request, socket);
      
      // PRODUCTION SECURITY: Origin validation (prevents CSRF attacks)
      const origin = request.headers.origin;
      const host = request.headers.host;
      if (process.env.NODE_ENV === 'production' && !isOriginAllowed(origin, host)) {
        logger.warn(`[Agent WebSocket] Origin validation failed - origin: ${origin}, host: ${host}`);
        socket.write('HTTP/1.1 403 Forbidden\r\nContent-Type: text/plain\r\nContent-Length: 14\r\n\r\nInvalid origin');
        socket.destroy();
        return;
      }
      
      // PRODUCTION SECURITY: Rate limiting (prevents connection flooding)
      const clientIp = request.socket?.remoteAddress || 'unknown';
      const rateLimitResult = checkWebSocketRateLimit(clientIp);
      if (!rateLimitResult.allowed) {
        logger.warn(`[Agent WebSocket] Rate limit rejected - IP: ${clientIp}, reason: ${rateLimitResult.reason}`);
        socket.write('HTTP/1.1 429 Too Many Requests\r\nContent-Type: text/plain\r\nContent-Length: 22\r\n\r\nToo many connections');
        socket.destroy();
        return;
      }
      
      const url = new URL(request.url || '', `http://${request.headers.host}`);
      const projectId = url.searchParams.get('projectId');
      const sessionId = url.searchParams.get('sessionId');
      const token = url.searchParams.get('bootstrap');
      
      // Parse cookies for session-based auth
      // Note: Session cookie name is 'ecode.sid' (configured in server/middleware/passport-setup.ts)
      const cookies = this.parseCookies(request.headers.cookie || '');
      const hasSessionCookie = !!cookies['ecode.sid'];
      
      logger.info('[Agent WebSocket] Upgrade handler: projectId=' + projectId + ', sessionId=' + sessionId + ', hasToken=' + !!token + ', hasSessionCookie=' + hasSessionCookie);
      
      // Validate parameters
      if (!projectId || !sessionId) {
        logger.warn('[Agent WebSocket] Missing projectId or sessionId - rejecting');
        socket.write('HTTP/1.1 400 Bad Request\r\nContent-Type: text/plain\r\nContent-Length: 30\r\n\r\nMissing projectId or sessionId');
        socket.destroy();
        return;
      }
      
      // TWO authentication modes:
      // 1. Bootstrap token (for autonomous workspace creation)
      // 2. Session cookie (for normal IDE usage)
      
      if (token) {
        // Mode 1: Bootstrap token authentication (synchronous)
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          
          if (decoded.projectId !== projectId || decoded.sessionId !== sessionId) {
            logger.warn('[Agent WebSocket] Token projectId/sessionId mismatch - rejecting');
            socket.write('HTTP/1.1 401 Unauthorized\r\nContent-Type: text/plain\r\nContent-Length: 14\r\n\r\nToken mismatch');
            socket.destroy();
            return;
          }
          
          logger.info(`[Agent WebSocket] ✅ Token validated for project ${projectId}, session ${sessionId}`);
          
          // Complete the WebSocket handshake
          this.wss!.handleUpgrade(request, socket, head, (ws) => {
            console.log(`[Agent WebSocket] 🎯 UPGRADE COMPLETE! Emitting connection event...`);
            this.wss!.emit('connection', ws, request);
          });
          return;
          
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          logger.warn(`[Agent WebSocket] Token validation failed: ${errorMsg}`);
          socket.write('HTTP/1.1 401 Unauthorized\r\nContent-Type: text/plain\r\nContent-Length: 13\r\n\r\nInvalid token');
          socket.destroy();
          return;
        }
      }
      
      // Mode 2: Session cookie authentication (for normal IDE usage)
      // ARCHITECTURE: Accept the connection FIRST (synchronously), then validate
      // and close if validation fails. This avoids async timing issues with handleUpgrade.
      if (hasSessionCookie) {
        logger.info(`[Agent WebSocket] Session cookie present - completing upgrade first, then validating`);
        
        // Complete the WebSocket handshake SYNCHRONOUSLY
        this.wss!.handleUpgrade(request, socket, head, (ws) => {
          console.log(`[Agent WebSocket] 🎯 UPGRADE COMPLETE (session auth pending validation)!`);
          
          // Now validate the session asynchronously
          this.validateSessionCookie(cookies['ecode.sid'], projectId)
            .then((userId) => {
              if (userId) {
                logger.info(`[Agent WebSocket] ✅ Session validated for user ${userId}, project ${projectId}, session ${sessionId}`);
                // Emit connection event to complete setup
                this.wss!.emit('connection', ws, request);
              } else {
                logger.warn('[Agent WebSocket] Session validation returned null user - closing connection');
                ws.close(4001, 'Session validation failed');
              }
            })
            .catch((err) => {
              const errorMsg = err instanceof Error ? err.message : String(err);
              logger.warn(`[Agent WebSocket] Session validation failed: ${errorMsg} - closing connection`);
              ws.close(4001, 'Session validation failed');
            });
        });
        return;
      }
      
      // No valid authentication found
      logger.warn('[Agent WebSocket] No valid authentication (no token, no session cookie) - rejecting');
      socket.write('HTTP/1.1 401 Unauthorized\r\nContent-Type: text/plain\r\nContent-Length: 42\r\n\r\nAuthentication required (token or session)');
      socket.destroy();
    });
    
    logger.info('[Agent WebSocket] Service initialized with noServer + prependListener mode');
    
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
        // PRODUCTION SECURITY: Decrement active connection count for rate limiting
        const clientIp = req.socket?.remoteAddress || 'unknown';
        decrementActiveConnections(clientIp);
        
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
  
  // Parse cookies from cookie header string
  private parseCookies(cookieHeader: string): Record<string, string> {
    const cookies: Record<string, string> = {};
    if (!cookieHeader) return cookies;
    
    cookieHeader.split(';').forEach((cookie) => {
      const [name, ...valueParts] = cookie.trim().split('=');
      if (name) {
        cookies[name.trim()] = valueParts.join('=');
      }
    });
    
    return cookies;
  }
  
  // Validate session cookie and check project access
  // Uses the session store directly (like LSPService) instead of database queries
  private async validateSessionCookie(sessionCookie: string, projectId: string): Promise<number | null> {
    try {
      // Decode the session cookie (it's URL encoded and signed)
      // Format: s%3A<sessionId>.<signature> -> s:<sessionId>.<signature>
      const decodedCookie = decodeURIComponent(sessionCookie);
      
      // Remove the 's:' prefix and signature (format: s:sessionId.signature)
      const actualSessionId = decodedCookie.split('.')[0].replace('s:', '');
      
      if (!actualSessionId) {
        logger.warn('[Agent WebSocket] Could not extract session ID from cookie');
        return null;
      }
      
      logger.debug(`[Agent WebSocket] Extracted session ID: ${actualSessionId.substring(0, 10)}...`);
      
      // Use the session store directly (global variable set during app initialization)
      const sessionStore = (global as any).sessionStore;
      if (!sessionStore) {
        logger.error('[Agent WebSocket] Session store not available');
        return null;
      }
      
      // Get session data from store
      const session = await new Promise<any>((resolve, reject) => {
        sessionStore.get(actualSessionId, (err: Error | null, session: any) => {
          if (err) reject(err);
          else resolve(session);
        });
      });
      
      if (!session || !session.passport || !session.passport.user) {
        logger.warn('[Agent WebSocket] Invalid or expired session');
        return null;
      }
      
      const userId = session.passport.user;
      logger.debug(`[Agent WebSocket] Session found for user: ${userId}`);
      
      // Verify user has access to this project
      const { db } = await import('../db');
      const { projects } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      const projectRows = await db.select()
        .from(projects)
        .where(eq(projects.id, parseInt(projectId, 10)))
        .limit(1);
      
      if (!projectRows.length) {
        logger.warn(`[Agent WebSocket] Project ${projectId} not found`);
        return null;
      }
      
      const project = projectRows[0];
      
      // Check if user owns the project or is a collaborator
      // For now, just check ownership (can expand to collaborators later)
      if (project.ownerId !== userId) {
        logger.warn(`[Agent WebSocket] User ${userId} does not have access to project ${projectId}`);
        return null;
      }
      
      return userId;
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`[Agent WebSocket] Session validation error: ${errorMsg}`);
      return null;
    }
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