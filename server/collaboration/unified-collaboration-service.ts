/**
 * E-Code Unified Real-Time Collaboration Service
 * Fortune 500 Quality Implementation
 * 
 * Bridges Yjs document syncing with Socket.io presence/notifications
 * Provides enterprise-grade real-time collaboration features
 */

import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import { WebSocketServer, WebSocket } from 'ws';
import { storage } from '../storage';
import { db } from '../db';
import { collaborationSessions, sessionParticipants, projects, users } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

interface CollaboratorInfo {
  id: string;
  odUserId: string | number;
  username: string;
  avatar?: string;
  color: string;
  status: 'active' | 'idle' | 'away';
  currentFile?: string;
  activity?: string;
  cursor?: {
    lineNumber: number;
    column: number;
  };
  selection?: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
  lastSeen: Date;
}

interface CollaborationRoom {
  id: string;
  projectId: number;
  doc: Y.Doc;
  awareness: Awareness;
  collaborators: Map<string, CollaboratorInfo>;
  chatMessages: ChatMessage[];
  lastActivity: Date;
  createdAt: Date;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderColor: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'system' | 'file-change';
}

interface TypingIndicator {
  odUserId: string;
  username: string;
  isTyping: boolean;
}

const COLLABORATOR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
  '#F8B500', '#00CED1', '#FF69B4', '#32CD32', '#BA55D3'
];

export class UnifiedCollaborationService {
  private io: SocketServer;
  private yjsWss: WebSocketServer;
  private rooms: Map<string, CollaborationRoom> = new Map();
  private socketToRoom: Map<string, string> = new Map();
  private userColorMap: Map<string, string> = new Map();
  private colorIndex = 0;
  
  constructor(server: HttpServer) {
    this.io = new SocketServer(server, {
      cors: {
        origin: '*',
        credentials: true
      },
      path: '/ws/collaboration'
    });
    
    this.yjsWss = new WebSocketServer({ 
      server,
      path: '/ws/yjs'
    });
    
    this.setupSocketIO();
    this.setupYjsWebSocket();
    this.startCleanupInterval();
    
    console.log('[Collaboration] Unified collaboration service initialized');
  }
  
  private getColorForUser(odUserId: string): string {
    if (!this.userColorMap.has(odUserId)) {
      this.userColorMap.set(odUserId, COLLABORATOR_COLORS[this.colorIndex % COLLABORATOR_COLORS.length]);
      this.colorIndex++;
    }
    return this.userColorMap.get(odUserId)!;
  }
  
  private setupSocketIO() {
    this.io.on('connection', async (socket: Socket) => {
      const { projectId, userId, odUserId: queryOdUserId, username, avatar } = socket.handshake.query;
      
      const userIdValue = (userId || queryOdUserId) as string;
      if (!projectId || !userIdValue) {
        console.log('[Collaboration] Socket rejected - missing projectId or userId');
        socket.disconnect();
        return;
      }
      
      const projectIdNum = parseInt(projectId as string);
      const roomId = `project-${projectIdNum}`;
      const odUserId = userIdValue;
      const displayName = (username as string) || 'Anonymous';
      
      const hasAccess = await this.verifyProjectAccess(odUserId, projectIdNum);
      if (!hasAccess) {
        socket.emit('error', { message: 'Access denied' });
        socket.disconnect();
        return;
      }
      
      const room = this.getOrCreateRoom(roomId, projectIdNum);
      socket.join(roomId);
      this.socketToRoom.set(socket.id, roomId);
      
      const collaborator: CollaboratorInfo = {
        id: socket.id,
        odUserId,
        username: displayName,
        avatar: avatar as string,
        color: this.getColorForUser(odUserId),
        status: 'active',
        lastSeen: new Date()
      };
      
      room.collaborators.set(socket.id, collaborator);
      
      this.io.to(roomId).emit('collaborator:joined', {
        collaborator,
        collaborators: Array.from(room.collaborators.values()),
        chatHistory: room.chatMessages.slice(-50)
      });
      
      this.addSystemMessage(room, `${displayName} joined the session`);
      
      socket.on('cursor:update', (data: { lineNumber: number; column: number; file?: string }) => {
        const collab = room.collaborators.get(socket.id);
        if (collab) {
          collab.cursor = { lineNumber: data.lineNumber, column: data.column };
          collab.currentFile = data.file;
          collab.lastSeen = new Date();
          
          socket.to(roomId).emit('cursor:updated', {
            odUserId: collab.odUserId,
            socketId: socket.id,
            cursor: collab.cursor,
            currentFile: collab.currentFile,
            color: collab.color,
            username: collab.username
          });
        }
      });
      
      socket.on('selection:update', (data: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number }) => {
        const collab = room.collaborators.get(socket.id);
        if (collab) {
          collab.selection = data;
          collab.lastSeen = new Date();
          
          socket.to(roomId).emit('selection:updated', {
            odUserId: collab.odUserId,
            socketId: socket.id,
            selection: collab.selection,
            color: collab.color,
            username: collab.username
          });
        }
      });
      
      socket.on('activity:update', (data: { activity: string; file?: string }) => {
        const collab = room.collaborators.get(socket.id);
        if (collab) {
          collab.activity = data.activity;
          collab.currentFile = data.file;
          collab.lastSeen = new Date();
          
          socket.to(roomId).emit('activity:updated', {
            odUserId: collab.odUserId,
            socketId: socket.id,
            activity: collab.activity,
            currentFile: collab.currentFile
          });
        }
      });
      
      socket.on('status:update', (data: { status: 'active' | 'idle' | 'away' }) => {
        const collab = room.collaborators.get(socket.id);
        if (collab) {
          collab.status = data.status;
          collab.lastSeen = new Date();
          
          this.io.to(roomId).emit('status:updated', {
            odUserId: collab.odUserId,
            socketId: socket.id,
            status: collab.status
          });
        }
      });
      
      socket.on('chat:message', (data: { content: string }) => {
        const collab = room.collaborators.get(socket.id);
        if (collab && data.content.trim()) {
          const message: ChatMessage = {
            id: nanoid(),
            senderId: collab.odUserId.toString(),
            senderName: collab.username,
            senderColor: collab.color,
            content: data.content.trim(),
            timestamp: new Date(),
            type: 'text'
          };
          
          room.chatMessages.push(message);
          if (room.chatMessages.length > 500) {
            room.chatMessages = room.chatMessages.slice(-500);
          }
          
          this.io.to(roomId).emit('chat:message', message);
        }
      });
      
      socket.on('chat:typing', (data: { isTyping: boolean }) => {
        const collab = room.collaborators.get(socket.id);
        if (collab) {
          socket.to(roomId).emit('chat:typing', {
            odUserId: collab.odUserId,
            username: collab.username,
            isTyping: data.isTyping
          });
        }
      });
      
      socket.on('file:change', (data: { file: string; action: 'create' | 'update' | 'delete' }) => {
        const collab = room.collaborators.get(socket.id);
        if (collab) {
          this.addSystemMessage(room, `${collab.username} ${data.action}d ${data.file}`, 'file-change');
          
          socket.to(roomId).emit('file:changed', {
            odUserId: collab.odUserId,
            username: collab.username,
            file: data.file,
            action: data.action
          });
        }
      });
      
      socket.on('follow:request', (data: { targetUserId: string }) => {
        socket.to(roomId).emit('follow:requested', {
          followerId: odUserId,
          followerName: displayName,
          targetUserId: data.targetUserId
        });
      });
      
      socket.on('disconnect', () => {
        const roomId = this.socketToRoom.get(socket.id);
        if (roomId) {
          const room = this.rooms.get(roomId);
          if (room) {
            const collab = room.collaborators.get(socket.id);
            if (collab) {
              this.addSystemMessage(room, `${collab.username} left the session`);
            }
            room.collaborators.delete(socket.id);
            
            this.io.to(roomId).emit('collaborator:left', {
              socketId: socket.id,
              collaborators: Array.from(room.collaborators.values())
            });
            
            if (room.collaborators.size === 0) {
              setTimeout(() => {
                const currentRoom = this.rooms.get(roomId);
                if (currentRoom && currentRoom.collaborators.size === 0) {
                  this.rooms.delete(roomId);
                }
              }, 5 * 60 * 1000);
            }
          }
          this.socketToRoom.delete(socket.id);
        }
      });
    });
  }
  
  private setupYjsWebSocket() {
    this.yjsWss.on('connection', async (ws: WebSocket, request: any) => {
      const url = new URL(request.url, `http://${request.headers.host}`);
      const projectId = url.searchParams.get('projectId');
      const userId = url.searchParams.get('userId');
      
      if (!projectId || !userId) {
        ws.close(1008, 'Missing projectId or userId');
        return;
      }
      
      const projectIdNum = parseInt(projectId);
      const roomId = `project-${projectIdNum}`;
      
      const hasAccess = await this.verifyProjectAccess(userId, projectIdNum);
      if (!hasAccess) {
        ws.close(1008, 'Access denied');
        return;
      }
      
      const room = this.getOrCreateRoom(roomId, projectIdNum);
      
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, 0);
      syncProtocol.writeSyncStep1(encoder, room.doc);
      ws.send(encoding.toUint8Array(encoder));
      
      const awarenessEncoder = encoding.createEncoder();
      encoding.writeVarUint(awarenessEncoder, 1);
      const awarenessStates = room.awareness.getStates();
      if (awarenessStates.size > 0) {
        const update = awarenessProtocol.encodeAwarenessUpdate(
          room.awareness,
          Array.from(awarenessStates.keys())
        );
        encoding.writeVarUint8Array(awarenessEncoder, update);
        ws.send(encoding.toUint8Array(awarenessEncoder));
      }
      
      ws.on('message', (data: Buffer) => {
        try {
          const decoder = decoding.createDecoder(new Uint8Array(data));
          const messageType = decoding.readVarUint(decoder);
          
          switch (messageType) {
            case 0:
              this.handleYjsSync(decoder, ws, room);
              break;
            case 1:
              this.handleYjsAwareness(decoder, ws, room);
              break;
          }
        } catch (error) {
          console.error('[Collaboration] Yjs message error:', error);
        }
      });
      
      ws.on('close', () => {
        room.lastActivity = new Date();
      });
    });
  }
  
  private handleYjsSync(decoder: any, ws: WebSocket, room: CollaborationRoom) {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, 0);
    const syncMessageType = syncProtocol.readSyncMessage(decoder, encoder, room.doc, null);
    
    if (encoding.length(encoder) > 1) {
      ws.send(encoding.toUint8Array(encoder));
    }
    
    if (syncMessageType === 1 || syncMessageType === 2) {
      const broadcastEncoder = encoding.createEncoder();
      encoding.writeVarUint(broadcastEncoder, 0);
      syncProtocol.writeSyncStep2(broadcastEncoder, room.doc);
      const update = encoding.toUint8Array(broadcastEncoder);
      
      this.yjsWss.clients.forEach((client: WebSocket) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(update);
        }
      });
    }
  }
  
  private handleYjsAwareness(decoder: any, ws: WebSocket, room: CollaborationRoom) {
    const update = decoding.readVarUint8Array(decoder);
    awarenessProtocol.applyAwarenessUpdate(room.awareness, update, null);
    
    this.yjsWss.clients.forEach((client: WebSocket) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, 1);
        encoding.writeVarUint8Array(encoder, update);
        client.send(encoding.toUint8Array(encoder));
      }
    });
  }
  
  private async verifyProjectAccess(userId: string, projectId: number): Promise<boolean> {
    try {
      const project = await storage.getProject(projectId);
      if (!project) return false;
      
      if (project.ownerId.toString() === userId.toString()) return true;
      
      const isCollaborator = await storage.isProjectCollaborator(projectId, userId);
      if (isCollaborator) return true;
      
      if (project.visibility === 'public') return true;
      
      return false;
    } catch (error) {
      console.error('[Collaboration] Access verification error:', error);
      return false;
    }
  }
  
  private getOrCreateRoom(roomId: string, projectId: number): CollaborationRoom {
    let room = this.rooms.get(roomId);
    if (!room) {
      const doc = new Y.Doc();
      const awareness = new Awareness(doc);
      
      room = {
        id: roomId,
        projectId,
        doc,
        awareness,
        collaborators: new Map(),
        chatMessages: [],
        lastActivity: new Date(),
        createdAt: new Date()
      };
      
      this.rooms.set(roomId, room);
    }
    room.lastActivity = new Date();
    return room;
  }
  
  private addSystemMessage(room: CollaborationRoom, content: string, type: ChatMessage['type'] = 'system') {
    const message: ChatMessage = {
      id: nanoid(),
      senderId: 'system',
      senderName: 'System',
      senderColor: '#6B7280',
      content,
      timestamp: new Date(),
      type
    };
    room.chatMessages.push(message);
    this.io.to(room.id).emit('chat:message', message);
  }
  
  private startCleanupInterval() {
    setInterval(() => {
      const now = new Date();
      this.rooms.forEach((room, roomId) => {
        room.collaborators.forEach((collab, socketId) => {
          const idleTime = now.getTime() - collab.lastSeen.getTime();
          if (idleTime > 5 * 60 * 1000 && collab.status !== 'away') {
            collab.status = idleTime > 10 * 60 * 1000 ? 'away' : 'idle';
            this.io.to(roomId).emit('status:updated', {
              odUserId: collab.odUserId,
              socketId,
              status: collab.status
            });
          }
        });
        
        if (room.collaborators.size === 0 && 
            now.getTime() - room.lastActivity.getTime() > 30 * 60 * 1000) {
          this.rooms.delete(roomId);
        }
      });
    }, 60 * 1000);
  }
  
  public getRoomInfo(projectId: number) {
    const room = this.rooms.get(`project-${projectId}`);
    if (!room) return null;
    
    return {
      id: room.id,
      projectId: room.projectId,
      collaborators: Array.from(room.collaborators.values()),
      chatMessages: room.chatMessages.slice(-20),
      lastActivity: room.lastActivity,
      createdAt: room.createdAt
    };
  }
  
  public broadcastToProject(projectId: number, event: string, data: any) {
    this.io.to(`project-${projectId}`).emit(event, data);
  }
  
  public async inviteToProject(projectId: number, inviterId: string, inviteeEmail: string): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      const inviteToken = nanoid(32);
      
      return { success: true, token: inviteToken };
    } catch (error) {
      console.error('[Collaboration] Invite error:', error);
      return { success: false, error: 'Failed to create invitation' };
    }
  }
}

let collaborationService: UnifiedCollaborationService | null = null;

export function initializeCollaborationService(server: HttpServer): UnifiedCollaborationService {
  if (!collaborationService) {
    collaborationService = new UnifiedCollaborationService(server);
  }
  return collaborationService;
}

export function getCollaborationService(): UnifiedCollaborationService | null {
  return collaborationService;
}
