// WebSocket service for real-time agent progress updates
import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { createLogger } from '../utils/logger';

const logger = createLogger('agent-websocket-service');

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
}

class AgentWebSocketService {
  private wss: WebSocketServer | null = null;
  private connections = new Map<string, Set<DeviceConnection>>();
  private pingInterval: NodeJS.Timeout | null = null;
  
  initialize(server: Server) {
    // ✅ CRITICAL FIX (Nov 20, 2025): noServer mode to handle upgrades manually
    // This prevents Vite HMR from intercepting /ws/agent connections
    this.wss = new WebSocketServer({ noServer: true });
    
    logger.info('[Agent WebSocket] Service initialized at /ws/agent (noServer mode)');
    
    //Setup connection handlers
    this.setupConnectionHandlers();
    
    // Start heartbeat for connection health monitoring
    this.startHeartbeat();
  }
  
  // ✅ NEW METHOD: Handle WebSocket upgrade manually
  handleUpgrade(request: any, socket: any, head: any) {
    if (!this.wss) {
      logger.error('[Agent WebSocket] WebSocketServer not initialized!');
      socket.destroy();
      return;
    }
    
    logger.info(`[Agent WebSocket] handleUpgrade called for ${request.url}`);
    
    try {
      this.wss.handleUpgrade(request, socket, head, (ws) => {
        logger.info('[Agent WebSocket] ✅ Upgrade successful! Emitting connection event');
        this.wss!.emit('connection', ws, request);
      });
    } catch (error: any) {
      logger.error('[Agent WebSocket] ❌ handleUpgrade failed:', { error: error.message, stack: error.stack });
      socket.destroy();
    }
  }
  
  private setupConnectionHandlers() {
    if (!this.wss) return;
    
    this.wss.on('connection', (ws, req) => {
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
        connectedAt: new Date()
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

  // Heartbeat to detect stale connections
  private startHeartbeat() {
    this.pingInterval = setInterval(() => {
      this.connections.forEach((devices, connectionKey) => {
        devices.forEach((device) => {
          if (device.ws.readyState === WebSocket.OPEN) {
            device.ws.ping();
          } else if (device.ws.readyState === WebSocket.CLOSED || device.ws.readyState === WebSocket.CLOSING) {
            devices.delete(device);
            logger.debug(`[Heartbeat] Removed stale device ${device.deviceId} from ${connectionKey}`);
          }
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
      logger.warn(`No active connections for ${connectionKey}`);
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
      logger.warn(`Cannot broadcast ${message.type}: No active connections for ${connectionKey}`);
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