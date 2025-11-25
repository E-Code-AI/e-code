import { io, Socket } from 'socket.io-client';
import { WS_URL } from './config';
import AuthService from './auth';

type WebSocketEventHandler = (data: any) => void;

export class WebSocketService {
  private static socket: Socket | null = null;
  private static reconnectAttempts = 0;
  private static maxReconnectAttempts = 5;
  private static eventHandlers: Map<string, Set<WebSocketEventHandler>> = new Map();

  // Initialize connection
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

  // Setup event listeners
  private static setupListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.emit('connection', { status: 'connected' });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.emit('connection', { status: 'disconnected', reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.emit('connection', { status: 'error', error: 'Max reconnection attempts reached' });
      }
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    });

    // Terminal output
    this.socket.on('terminal:output', (data) => {
      this.emit('terminal:output', data);
    });

    // File changes
    this.socket.on('file:change', (data) => {
      this.emit('file:change', data);
    });

    // Collaboration events
    this.socket.on('collab:cursor', (data) => {
      this.emit('collab:cursor', data);
    });

    this.socket.on('collab:selection', (data) => {
      this.emit('collab:selection', data);
    });

    // Agent events
    this.socket.on('agent:message', (data) => {
      this.emit('agent:message', data);
    });

    this.socket.on('agent:status', (data) => {
      this.emit('agent:status', data);
    });
  }

  // Disconnect
  static disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.eventHandlers.clear();
  }

  // Subscribe to event
  static on(event: string, handler: WebSocketEventHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }

  // Emit event to handlers
  private static emit(event: string, data: any): void {
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

  // Send message to server
  static send(event: string, data: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('WebSocket not connected. Message not sent:', event, data);
    }
  }

  // Check connection status
  static isConnected(): boolean {
    return !!this.socket?.connected;
  }

  // Get socket instance
  static getSocket(): Socket | null {
    return this.socket;
  }
}

export default WebSocketService;
