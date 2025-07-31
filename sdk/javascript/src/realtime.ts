import { EventEmitter } from 'eventemitter3';
import WebSocket from 'ws';
import { ECodeClient } from './client';
import { RealtimeMessage } from './types';

export class RealtimeSession extends EventEmitter {
    private ws?: WebSocket;
    private reconnectTimer?: NodeJS.Timeout;
    private heartbeatTimer?: NodeJS.Timeout;

    constructor(
        private projectId: string,
        private wsUrl: string,
        private token: string
    ) {
        super();
        this.connect();
    }

    private connect() {
        this.ws = new WebSocket(`${this.wsUrl}/ws/collaboration?projectId=${this.projectId}`, {
            headers: {
                'Authorization': `Bearer ${this.token}`
            }
        });

        this.ws.on('open', () => {
            this.emit('connected');
            this.startHeartbeat();
        });

        this.ws.on('message', (data) => {
            const message: RealtimeMessage = JSON.parse(data.toString());
            this.emit(message.type, message.data);
        });

        this.ws.on('close', () => {
            this.emit('disconnected');
            this.stopHeartbeat();
            this.scheduleReconnect();
        });

        this.ws.on('error', (error) => {
            this.emit('error', error);
        });
    }

    private startHeartbeat() {
        this.heartbeatTimer = setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, 30000);
    }

    private stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = undefined;
        }
    }

    private scheduleReconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }
        this.reconnectTimer = setTimeout(() => {
            this.connect();
        }, 5000);
    }

    /**
     * Share cursor position
     */
    shareCursor(position: { line: number; column: number; file?: string }) {
        this.send('cursor', position);
    }

    /**
     * Share selection
     */
    shareSelection(selection: { start: any; end: any; file?: string }) {
        this.send('selection', selection);
    }

    /**
     * Send document change
     */
    sendChange(change: any) {
        this.send('document:change', change);
    }

    /**
     * Send a message
     */
    sendMessage(message: string) {
        this.send('message', { text: message });
    }

    /**
     * Send generic data
     */
    send(type: string, data: any) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type, data }));
        }
    }

    /**
     * Disconnect from session
     */
    disconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }
        this.stopHeartbeat();
        if (this.ws) {
            this.ws.close();
            this.ws = undefined;
        }
    }
}

export class RealtimeCollaboration {
    private sessions: Map<string, RealtimeSession> = new Map();

    constructor(
        private client: ECodeClient,
        private wsUrl?: string
    ) {
        this.wsUrl = wsUrl || 'wss://e-code.app';
    }

    /**
     * Connect to a project collaboration session
     */
    async connect(projectId: string): Promise<RealtimeSession> {
        // Get auth token from client
        const token = await this.client.get('/auth/token');
        
        const session = new RealtimeSession(projectId, this.wsUrl!, token);
        this.sessions.set(projectId, session);
        
        return session;
    }

    /**
     * Get existing session
     */
    getSession(projectId: string): RealtimeSession | undefined {
        return this.sessions.get(projectId);
    }

    /**
     * Disconnect from a session
     */
    disconnect(projectId: string) {
        const session = this.sessions.get(projectId);
        if (session) {
            session.disconnect();
            this.sessions.delete(projectId);
        }
    }

    /**
     * Disconnect all sessions
     */
    disconnectAll() {
        this.sessions.forEach(session => session.disconnect());
        this.sessions.clear();
    }
}