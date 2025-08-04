/**
 * Real-time Collaboration Service
 * Provides WebRTC/CRDT-based collaborative editing
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import * as Y from 'yjs';
import { setupWSConnection } from 'y-websocket/bin/utils';
import SimplePeer from 'simple-peer';
import { createLogger } from '../utils/logger';
import { storage } from '../storage';

const logger = createLogger('real-collaboration');

interface CollaborationSession {
  projectId: number;
  fileId: number;
  doc: Y.Doc;
  awareness: any;
  peers: Map<string, {
    ws: WebSocket;
    userId: number;
    cursor?: { line: number; ch: number };
    selection?: { anchor: any; head: any };
  }>;
  webrtcConnections: Map<string, SimplePeer.Instance>;
}

interface CursorUpdate {
  userId: number;
  fileId: number;
  cursor: { line: number; ch: number };
  selection?: { anchor: any; head: any };
  color: string;
  name: string;
}

export class RealCollaborationService {
  private wss: WebSocketServer;
  private sessions: Map<string, CollaborationSession> = new Map();
  private userSessions: Map<number, Set<string>> = new Map();

  constructor() {}

  setupWebSocket(server: Server) {
    // Main collaboration WebSocket
    this.wss = new WebSocketServer({ 
      server, 
      path: '/collaborate',
      perMessageDeflate: false
    });

    this.wss.on('connection', this.handleConnection.bind(this));

    // Yjs WebSocket for CRDT sync
    const yjsWss = new WebSocketServer({
      server,
      path: '/yjs',
      perMessageDeflate: false
    });

    yjsWss.on('connection', (ws, req) => {
      // Setup Yjs connection for CRDT synchronization
      setupWSConnection(ws, req);
    });

    logger.info('Real collaboration WebSocket servers initialized');
  }

  private async handleConnection(ws: WebSocket, request: any) {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const projectId = parseInt(url.searchParams.get('projectId') || '0');
    const fileId = parseInt(url.searchParams.get('fileId') || '0');
    const userId = parseInt(url.searchParams.get('userId') || '0');

    if (!projectId || !fileId || !userId) {
      ws.close(1008, 'Missing required parameters');
      return;
    }

    const sessionKey = `${projectId}-${fileId}`;
    logger.info(`New collaboration connection: user ${userId} for session ${sessionKey}`);

    // Get or create session
    let session = this.sessions.get(sessionKey);
    if (!session) {
      session = await this.createSession(projectId, fileId);
      this.sessions.set(sessionKey, session);
    }

    // Add peer to session
    const peerId = `${userId}-${Date.now()}`;
    session.peers.set(peerId, {
      ws,
      userId,
      cursor: { line: 0, ch: 0 }
    });

    // Track user sessions
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, new Set());
    }
    this.userSessions.get(userId)!.add(sessionKey);

    // Send initial state
    await this.sendInitialState(ws, session, userId);

    // Handle messages
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        await this.handleMessage(sessionKey, peerId, message);
      } catch (error) {
        logger.error(`Failed to handle collaboration message: ${error}`);
      }
    });

    ws.on('close', () => {
      this.handleDisconnect(sessionKey, peerId, userId);
    });

    ws.on('error', (error) => {
      logger.error(`Collaboration WebSocket error: ${error}`);
      this.handleDisconnect(sessionKey, peerId, userId);
    });
  }

  private async createSession(projectId: number, fileId: number): Promise<CollaborationSession> {
    // Create Yjs document for CRDT
    const doc = new Y.Doc();
    
    // Load file content
    const file = await storage.getFile(fileId);
    if (file && file.content) {
      const yText = doc.getText('content');
      yText.insert(0, file.content);
    }

    // Setup awareness for cursor positions
    const awareness = new Map();

    return {
      projectId,
      fileId,
      doc,
      awareness,
      peers: new Map(),
      webrtcConnections: new Map()
    };
  }

  private async sendInitialState(ws: WebSocket, session: CollaborationSession, userId: number) {
    // Send current document state
    const yText = session.doc.getText('content');
    ws.send(JSON.stringify({
      type: 'init',
      content: yText.toString(),
      peers: Array.from(session.peers.entries()).map(([id, peer]) => ({
        id,
        userId: peer.userId,
        cursor: peer.cursor,
        selection: peer.selection
      }))
    }));

    // Notify other peers of new user
    this.broadcast(session, {
      type: 'peer-joined',
      peerId: `${userId}-${Date.now()}`,
      userId
    }, ws);
  }

  private async handleMessage(sessionKey: string, peerId: string, message: any) {
    const session = this.sessions.get(sessionKey);
    if (!session) return;

    const peer = session.peers.get(peerId);
    if (!peer) return;

    switch (message.type) {
      case 'cursor':
        await this.handleCursorUpdate(session, peerId, message);
        break;

      case 'selection':
        await this.handleSelectionUpdate(session, peerId, message);
        break;

      case 'operation':
        await this.handleOperation(session, peerId, message);
        break;

      case 'webrtc-signal':
        await this.handleWebRTCSignal(session, peerId, message);
        break;

      case 'voice-call-start':
        await this.handleVoiceCallStart(session, peerId, message);
        break;

      case 'voice-call-end':
        await this.handleVoiceCallEnd(session, peerId);
        break;

      case 'save':
        await this.saveDocument(session);
        break;

      default:
        logger.warn(`Unknown collaboration message type: ${message.type}`);
    }
  }

  private async handleCursorUpdate(session: CollaborationSession, peerId: string, message: any) {
    const peer = session.peers.get(peerId);
    if (!peer) return;

    // Update peer's cursor position
    peer.cursor = message.cursor;

    // Get user info for display
    const user = await storage.getUser(peer.userId);
    
    // Broadcast cursor update to other peers
    const cursorUpdate: CursorUpdate = {
      userId: peer.userId,
      fileId: session.fileId,
      cursor: message.cursor,
      selection: peer.selection,
      color: this.getUserColor(peer.userId),
      name: user?.username || `User ${peer.userId}`
    };

    this.broadcast(session, {
      type: 'cursor-update',
      peerId,
      ...cursorUpdate
    }, peer.ws);
  }

  private async handleSelectionUpdate(session: CollaborationSession, peerId: string, message: any) {
    const peer = session.peers.get(peerId);
    if (!peer) return;

    peer.selection = message.selection;

    const user = await storage.getUser(peer.userId);

    this.broadcast(session, {
      type: 'selection-update',
      peerId,
      userId: peer.userId,
      selection: message.selection,
      color: this.getUserColor(peer.userId),
      name: user?.username || `User ${peer.userId}`
    }, peer.ws);
  }

  private async handleOperation(session: CollaborationSession, peerId: string, message: any) {
    // Apply operation to Yjs document
    const yText = session.doc.getText('content');
    
    switch (message.operation.type) {
      case 'insert':
        yText.insert(message.operation.index, message.operation.text);
        break;
        
      case 'delete':
        yText.delete(message.operation.index, message.operation.length);
        break;
        
      case 'format':
        // Handle text formatting if needed
        break;
    }

    // Broadcast operation to other peers
    this.broadcast(session, {
      type: 'operation',
      peerId,
      operation: message.operation
    }, session.peers.get(peerId)?.ws);

    // Auto-save periodically
    if (Math.random() < 0.1) { // 10% chance to save
      await this.saveDocument(session);
    }
  }

  private async handleWebRTCSignal(session: CollaborationSession, peerId: string, message: any) {
    const { targetPeerId, signal } = message;
    const targetPeer = session.peers.get(targetPeerId);
    
    if (targetPeer) {
      targetPeer.ws.send(JSON.stringify({
        type: 'webrtc-signal',
        fromPeerId: peerId,
        signal
      }));
    }
  }

  private async handleVoiceCallStart(session: CollaborationSession, peerId: string, message: any) {
    const peer = session.peers.get(peerId);
    if (!peer) return;

    // Create WebRTC connection for voice
    const rtcPeer = new SimplePeer({
      initiator: message.initiator,
      trickle: false,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      }
    });

    rtcPeer.on('signal', (data) => {
      peer.ws.send(JSON.stringify({
        type: 'voice-signal',
        signal: data
      }));
    });

    rtcPeer.on('connect', () => {
      logger.info(`Voice call connected for peer ${peerId}`);
    });

    rtcPeer.on('error', (err) => {
      logger.error(`Voice call error for peer ${peerId}: ${err}`);
    });

    session.webrtcConnections.set(peerId, rtcPeer);

    // Notify other peers
    this.broadcast(session, {
      type: 'voice-call-started',
      peerId,
      userId: peer.userId
    }, peer.ws);
  }

  private async handleVoiceCallEnd(session: CollaborationSession, peerId: string) {
    const rtcPeer = session.webrtcConnections.get(peerId);
    if (rtcPeer) {
      rtcPeer.destroy();
      session.webrtcConnections.delete(peerId);
    }

    this.broadcast(session, {
      type: 'voice-call-ended',
      peerId
    });
  }

  private async saveDocument(session: CollaborationSession) {
    try {
      const yText = session.doc.getText('content');
      const content = yText.toString();
      
      await storage.updateFile(session.fileId, { content });
      
      // Notify all peers of save
      this.broadcast(session, {
        type: 'saved',
        timestamp: new Date().toISOString()
      });
      
      logger.info(`Document saved for session ${session.projectId}-${session.fileId}`);
    } catch (error) {
      logger.error(`Failed to save document: ${error}`);
    }
  }

  private handleDisconnect(sessionKey: string, peerId: string, userId: number) {
    const session = this.sessions.get(sessionKey);
    if (!session) return;

    // Remove peer
    session.peers.delete(peerId);
    
    // Clean up WebRTC connections
    const rtcPeer = session.webrtcConnections.get(peerId);
    if (rtcPeer) {
      rtcPeer.destroy();
      session.webrtcConnections.delete(peerId);
    }

    // Update user sessions
    const userSessionSet = this.userSessions.get(userId);
    if (userSessionSet) {
      userSessionSet.delete(sessionKey);
      if (userSessionSet.size === 0) {
        this.userSessions.delete(userId);
      }
    }

    // Notify other peers
    this.broadcast(session, {
      type: 'peer-left',
      peerId,
      userId
    });

    // Clean up empty sessions
    if (session.peers.size === 0) {
      this.saveDocument(session).then(() => {
        session.doc.destroy();
        this.sessions.delete(sessionKey);
        logger.info(`Session ${sessionKey} closed`);
      });
    }
  }

  private broadcast(session: CollaborationSession, message: any, exclude?: WebSocket) {
    const messageStr = JSON.stringify(message);
    
    for (const [peerId, peer] of session.peers) {
      if (peer.ws !== exclude && peer.ws.readyState === WebSocket.OPEN) {
        peer.ws.send(messageStr);
      }
    }
  }

  private getUserColor(userId: number): string {
    // Generate consistent color for user
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
      '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
    ];
    return colors[userId % colors.length];
  }

  // Public API
  async getActiveCollaborators(projectId: number, fileId: number): Promise<Array<{
    userId: number;
    username: string;
    cursor?: { line: number; ch: number };
    color: string;
  }>> {
    const sessionKey = `${projectId}-${fileId}`;
    const session = this.sessions.get(sessionKey);
    
    if (!session) return [];

    const collaborators = await Promise.all(
      Array.from(session.peers.values()).map(async (peer) => {
        const user = await storage.getUser(peer.userId);
        return {
          userId: peer.userId,
          username: user?.username || `User ${peer.userId}`,
          cursor: peer.cursor,
          color: this.getUserColor(peer.userId)
        };
      })
    );

    return collaborators;
  }

  async forceSync(projectId: number, fileId: number) {
    const sessionKey = `${projectId}-${fileId}`;
    const session = this.sessions.get(sessionKey);
    
    if (session) {
      await this.saveDocument(session);
    }
  }
}

export const realCollaborationService = new RealCollaborationService();