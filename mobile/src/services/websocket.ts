import { io, Socket } from 'socket.io-client';
import { WS_URL } from './config';
import AuthService from './auth';

export interface TerminalOutputData {
  output: string;
  projectId?: number;
}

export interface FileChangeData {
  path: string;
  type: 'create' | 'update' | 'delete';
  content?: string;
  projectId?: number;
}

export interface CollabCursorData {
  userId: string;
  username: string;
  fileId: number;
  line: number;
  column: number;
}

export interface CollabSelectionData {
  userId: string;
  username: string;
  fileId: number;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export interface AgentMessageData {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

export interface AgentStatusData {
  status: 'idle' | 'thinking' | 'building' | 'error';
  message?: string;
}

export interface ConnectionStatusData {
  status: 'connected' | 'disconnected' | 'error';
  reason?: string;
  error?: string;
}

export type WebSocketEventData = 
  | TerminalOutputData 
  | FileChangeData 
  | CollabCursorData 
  | CollabSelectionData 
  | AgentMessageData 
  | AgentStatusData 
  | ConnectionStatusData
  | Error;

export type WebSocketEventType = 
  | 'terminal:output'
  | 'file:change'
  | 'collab:cursor'
  | 'collab:selection'
  | 'agent:message'
  | 'agent:status'
  | 'connection'
  | 'error';

export type WebSocketEventHandler<T = WebSocketEventData> = (data: T) => void;

export class WebSocketService {
  private static socket: Socket | null = null;
  private static reconnectAttempts = 0;
  private static maxReconnectAttempts = 5;
  private static eventHandlers: Map<string, Set<WebSocketEventHandler>> = new Map();

  static connect(projectId?: number): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    const token = AuthService.getToken();

    this.socket = io(WS_URL, {
      auth: { token },
      query: projectId ? { projectId } : {},
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    this.setupListeners();

    return this.socket;
  }

  private static setupListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.emit('connection', { status: 'connected' } as ConnectionStatusData);
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('WebSocket disconnected:', reason);
      this.emit('connection', { status: 'disconnected', reason } as ConnectionStatusData);
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('WebSocket connection error:', error);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.emit('connection', { status: 'error', error: 'Max reconnection attempts reached' } as ConnectionStatusData);
      }
    });

    this.socket.on('error', (error: Error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    });

    this.socket.on('terminal:output', (data: TerminalOutputData) => {
      this.emit('terminal:output', data);
    });

    this.socket.on('file:change', (data: FileChangeData) => {
      this.emit('file:change', data);
    });

    this.socket.on('collab:cursor', (data: CollabCursorData) => {
      this.emit('collab:cursor', data);
    });

    this.socket.on('collab:selection', (data: CollabSelectionData) => {
      this.emit('collab:selection', data);
    });

    this.socket.on('agent:message', (data: AgentMessageData) => {
      this.emit('agent:message', data);
    });

    this.socket.on('agent:status', (data: AgentStatusData) => {
      this.emit('agent:status', data);
    });
  }

  static disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.eventHandlers.clear();
  }

  static on<T extends WebSocketEventData>(event: WebSocketEventType, handler: WebSocketEventHandler<T>): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler as WebSocketEventHandler);

    return () => {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        handlers.delete(handler as WebSocketEventHandler);
      }
    };
  }

  private static emit(event: string, data: WebSocketEventData): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in WebSocket event handler for ${event}:`, error);
        }
      });
    }
  }

  static send(event: string, data: Record<string, unknown>): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('WebSocket not connected. Message not sent:', event, data);
    }
  }

  static isConnected(): boolean {
    return !!this.socket?.connected;
  }

  static getSocket(): Socket | null {
    return this.socket;
  }
}

export default WebSocketService;
