import { WebSocket, WebSocketServer } from 'ws';
import type { IncomingMessage } from 'http';
import type { Server } from 'http';
import type { IStorage } from '../storage';
import { WebSocketRateLimiter } from '../middleware/websocket-rate-limiter';
import { getClientIp } from '../utils/ip-extraction';
import { isOriginAllowed } from '../utils/origin-validation';
import { createLogger } from '../utils/logger';

const logger = createLogger('runtime-logs');
const rateLimiter = new WebSocketRateLimiter(20, 60000);

interface RuntimeLogsClient {
  ws: WebSocket;
  projectId: string;
  userId: string;
  executionId?: string;
}

interface RuntimeLogEntry {
  type: 'stdout' | 'stderr' | 'system' | 'exit';
  message: string;
  timestamp: number;
  executionId: string;
}

export class RuntimeLogsService {
  private clients: Map<string, RuntimeLogsClient[]> = new Map();
  private executionClients: Map<string, RuntimeLogsClient[]> = new Map();
  private storage: IStorage;
  private wss: WebSocketServer | null = null;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  setup(server: Server): void {
    this.wss = new WebSocketServer({
      server,
      path: '/api/runtime/logs/ws'
    });

    logger.info('Setting up runtime logs WebSocket server at /api/runtime/logs/ws');

    this.wss.on('connection', async (ws, req) => {
      try {
        const url = new URL(req.url || '', `http://${req.headers.host}`);
        const projectId = url.searchParams.get('projectId');
        const userId = url.searchParams.get('userId');
        const executionId = url.searchParams.get('executionId');

        if (!projectId || !userId) {
          ws.close(1008, 'Missing projectId or userId');
          return;
        }

        const clientIp = getClientIp(req);
        const origin = req.headers.origin || '';
        const host = req.headers.host || '';

        if (!isOriginAllowed(origin, host)) {
          logger.warn(`[RuntimeLogs] Rejected connection from disallowed origin: ${origin}`);
          ws.close(1008, 'Origin not allowed');
          return;
        }

        if (!rateLimiter.checkLimit(clientIp)) {
          logger.warn(`[RuntimeLogs] Rate limit exceeded for IP: ${clientIp}`);
          ws.close(1008, 'Rate limit exceeded');
          return;
        }

        const authorized = await this.authenticateConnection(req, userId, projectId);
        if (!authorized) {
          ws.close(1008, 'Unauthorized');
          return;
        }

        logger.info(`[RuntimeLogs] Client connected: project=${projectId}, user=${userId}, execution=${executionId || 'all'}`);

        await this.handleConnection(ws, req, projectId, userId, executionId || undefined);
      } catch (error) {
        logger.error('[RuntimeLogs] Connection error:', error);
        ws.close(1011, 'Internal server error');
      }
    });
  }

  private async authenticateConnection(
    req: IncomingMessage,
    userId: string,
    projectId: string
  ): Promise<boolean> {
    try {
      const project = await this.storage.getProject(projectId);
      if (!project) {
        logger.warn(`[RuntimeLogs] Project not found: ${projectId}`);
        return false;
      }

      if (String(project.ownerId) === userId) {
        return true;
      }

      try {
        const teamMember = await this.storage.getTeamMemberByUserAndProject?.(userId, projectId);
        if (teamMember) {
          return true;
        }
      } catch (error) {
        // Team feature might not be available
      }

      logger.warn(`[RuntimeLogs] User ${userId} unauthorized for project ${projectId}`);
      return false;
    } catch (error) {
      logger.error('[RuntimeLogs] Authorization error:', error);
      return false;
    }
  }

  async handleConnection(
    ws: WebSocket,
    request: IncomingMessage,
    projectId: string,
    userId: string,
    executionId?: string
  ): Promise<void> {
    const client: RuntimeLogsClient = {
      ws,
      projectId,
      userId,
      executionId,
    };

    if (!this.clients.has(projectId)) {
      this.clients.set(projectId, []);
    }
    this.clients.get(projectId)!.push(client);

    if (executionId) {
      if (!this.executionClients.has(executionId)) {
        this.executionClients.set(executionId, []);
      }
      this.executionClients.get(executionId)!.push(client);
    }

    try {
      const logs = await this.storage.getTerminalLogs(projectId, 100);
      ws.send(JSON.stringify({
        type: 'initial',
        logs: logs.map(log => ({
          type: log.type === 'error' ? 'stderr' : 'stdout',
          message: log.message,
          timestamp: new Date(log.timestamp).getTime(),
          executionId: executionId || 'unknown'
        })),
      }));
    } catch (error) {
      logger.error('[RuntimeLogs] Error fetching initial logs:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to fetch initial logs',
      }));
    }

    ws.on('close', () => {
      this.removeClient(projectId, ws, executionId);
    });

    ws.on('error', (error) => {
      logger.error('[RuntimeLogs] WebSocket error:', error);
      this.removeClient(projectId, ws, executionId);
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        }
      } catch (error) {
        // Ignore parse errors
      }
    });
  }

  private removeClient(projectId: string, ws: WebSocket, executionId?: string): void {
    const projectClients = this.clients.get(projectId);
    if (projectClients) {
      const index = projectClients.findIndex(c => c.ws === ws);
      if (index !== -1) {
        projectClients.splice(index, 1);
      }
      if (projectClients.length === 0) {
        this.clients.delete(projectId);
      }
    }

    if (executionId) {
      const execClients = this.executionClients.get(executionId);
      if (execClients) {
        const index = execClients.findIndex(c => c.ws === ws);
        if (index !== -1) {
          execClients.splice(index, 1);
        }
        if (execClients.length === 0) {
          this.executionClients.delete(executionId);
        }
      }
    }

    logger.debug(`[RuntimeLogs] Client disconnected: project=${projectId}, execution=${executionId || 'all'}`);
  }

  streamOutput(projectId: string, executionId: string, type: 'stdout' | 'stderr' | 'system', message: string): void {
    const entry: RuntimeLogEntry = {
      type,
      message,
      timestamp: Date.now(),
      executionId,
    };

    this.broadcastToExecution(executionId, {
      type: 'log',
      log: entry,
    });

    this.broadcastToProject(projectId, {
      type: 'log',
      log: entry,
    });
  }

  streamExit(projectId: string, executionId: string, exitCode: number, executionTime: number): void {
    const entry: RuntimeLogEntry = {
      type: 'exit',
      message: `Process exited with code ${exitCode}`,
      timestamp: Date.now(),
      executionId,
    };

    const exitData = {
      type: 'exit',
      log: entry,
      exitCode,
      executionTime,
    };

    this.broadcastToExecution(executionId, exitData);
    this.broadcastToProject(projectId, exitData);

    logger.info(`[RuntimeLogs] Execution ${executionId} exited with code ${exitCode} in ${executionTime}ms`);
  }

  private broadcastToExecution(executionId: string, data: object): void {
    const clients = this.executionClients.get(executionId);
    if (!clients) return;

    const message = JSON.stringify(data);
    for (const client of clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    }
  }

  private broadcastToProject(projectId: string, data: object): void {
    const clients = this.clients.get(projectId);
    if (!clients) return;

    const message = JSON.stringify(data);
    for (const client of clients) {
      if (!client.executionId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    }
  }

  getConnectedClientsCount(projectId: string): number {
    return this.clients.get(projectId)?.length || 0;
  }

  getExecutionClientsCount(executionId: string): number {
    return this.executionClients.get(executionId)?.length || 0;
  }
}

let runtimeLogsService: RuntimeLogsService | null = null;

export function initRuntimeLogsService(storage: IStorage): RuntimeLogsService {
  if (!runtimeLogsService) {
    runtimeLogsService = new RuntimeLogsService(storage);
  }
  return runtimeLogsService;
}

export function getRuntimeLogsService(): RuntimeLogsService | null {
  return runtimeLogsService;
}
