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

class AgentWebSocketService {
  private wss: WebSocketServer | null = null;
  private connections = new Map<string, WebSocket>();
  
  initialize(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws/agent' });
    
    logger.info('[Agent WebSocket] Service initialized at /ws/agent');
    
    this.wss.on('connection', (ws, req) => {
      logger.info(`[Agent WebSocket] New connection attempt from ${req.socket.remoteAddress} - URL: ${req.url}`);
      
      const url = new URL(req.url!, `http://${req.headers.host}`);
      const projectId = url.searchParams.get('projectId');
      const sessionId = url.searchParams.get('sessionId');
      
      logger.info(`[Agent WebSocket] Parsed params - projectId: ${projectId}, sessionId: ${sessionId}`);
      
      if (!projectId || !sessionId) {
        logger.warn(`[Agent WebSocket] Rejecting connection - missing params (projectId: ${projectId}, sessionId: ${sessionId})`);
        ws.close(1008, 'Missing projectId or sessionId');
        return;
      }
      
      const connectionKey = `${projectId}-${sessionId}`;
      this.connections.set(connectionKey, ws);
      logger.info(`[Agent WebSocket] ✅ Connection established: ${connectionKey}`);
      
      ws.on('error', (error) => {
        logger.error(`[Agent WebSocket] WebSocket error for ${connectionKey}: ${error.message}`);
      });
      
      ws.on('close', (code, reason) => {
        this.connections.delete(connectionKey);
        logger.info(`[Agent WebSocket] Connection closed: ${connectionKey} (code: ${code}, reason: ${reason})`);
      });
      
      // Send initial connection confirmation
      const confirmationMsg = JSON.stringify({
        type: 'connected',
        projectId,
        sessionId
      });
      ws.send(confirmationMsg);
      logger.info(`[Agent WebSocket] Sent confirmation to ${connectionKey}`);
    });
    
    this.wss.on('error', (error) => {
      logger.error(`[Agent WebSocket] Server error: ${error.message}`);
    });
  }
  
  sendProgress(update: AgentProgressUpdate) {
    const connectionKey = `${update.projectId}-${update.sessionId}`;
    const ws = this.connections.get(connectionKey);
    
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(update));
      logger.debug(`Sent progress update to ${connectionKey}: ${update.type}`);
    } else {
      logger.warn(`No active connection for ${connectionKey}`);
    }
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
}

export const agentWebSocketService = new AgentWebSocketService();