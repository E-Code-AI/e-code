import { AxiosInstance } from 'axios';
import { CollaborationSession, CollaborationOptions, User } from '../types';

export interface CollaborationInvite {
  id: string;
  projectId: number;
  inviterId: string;
  inviteeEmail: string;
  role: 'viewer' | 'editor' | 'admin';
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: string;
  expiresAt: string;
}

export interface CollaborationPresence {
  userId: string;
  user: User;
  cursor?: {
    line: number;
    column: number;
    fileId?: number;
  };
  selection?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
    fileId?: number;
  };
  status: 'active' | 'idle' | 'away';
  lastSeen: string;
}

export class CollaborationManager {
  constructor(private client: AxiosInstance) {}

  /**
   * Start a collaboration session
   */
  async startSession(projectId: number, options?: CollaborationOptions): Promise<CollaborationSession> {
    const response = await this.client.post(`/projects/${projectId}/collaborate`, options);
    return response.data;
  }

  /**
   * End a collaboration session
   */
  async endSession(sessionId: string): Promise<void> {
    await this.client.delete(`/collaboration/sessions/${sessionId}`);
  }

  /**
   * Get active collaboration sessions
   */
  async getSessions(projectId?: number): Promise<CollaborationSession[]> {
    const response = await this.client.get('/collaboration/sessions', {
      params: { projectId }
    });
    return response.data;
  }

  /**
   * Join a collaboration session
   */
  async joinSession(sessionId: string): Promise<CollaborationSession> {
    const response = await this.client.post(`/collaboration/sessions/${sessionId}/join`);
    return response.data;
  }

  /**
   * Leave a collaboration session
   */
  async leaveSession(sessionId: string): Promise<void> {
    await this.client.post(`/collaboration/sessions/${sessionId}/leave`);
  }

  /**
   * Send a collaboration invite
   */
  async sendInvite(projectId: number, options: {
    email: string;
    role: 'viewer' | 'editor' | 'admin';
    message?: string;
    expiresIn?: number; // hours
  }): Promise<CollaborationInvite> {
    const response = await this.client.post(`/projects/${projectId}/invites`, options);
    return response.data;
  }

  /**
   * Accept a collaboration invite
   */
  async acceptInvite(inviteId: string): Promise<void> {
    await this.client.post(`/collaboration/invites/${inviteId}/accept`);
  }

  /**
   * Decline a collaboration invite
   */
  async declineInvite(inviteId: string): Promise<void> {
    await this.client.post(`/collaboration/invites/${inviteId}/decline`);
  }

  /**
   * Get collaboration invites
   */
  async getInvites(projectId?: number, status?: string): Promise<CollaborationInvite[]> {
    const response = await this.client.get('/collaboration/invites', {
      params: { projectId, status }
    });
    return response.data;
  }

  /**
   * Update user presence
   */
  async updatePresence(sessionId: string, presence: {
    cursor?: { line: number; column: number; fileId?: number };
    selection?: {
      start: { line: number; column: number };
      end: { line: number; column: number };
      fileId?: number;
    };
    status?: 'active' | 'idle' | 'away';
  }): Promise<void> {
    await this.client.put(`/collaboration/sessions/${sessionId}/presence`, presence);
  }

  /**
   * Get user presence in session
   */
  async getPresence(sessionId: string): Promise<CollaborationPresence[]> {
    const response = await this.client.get(`/collaboration/sessions/${sessionId}/presence`);
    return response.data;
  }

  /**
   * Send a chat message in collaboration
   */
  async sendMessage(sessionId: string, message: string, type?: 'text' | 'code' | 'system'): Promise<{
    id: string;
    message: string;
    type: string;
    userId: string;
    user: User;
    timestamp: string;
  }> {
    const response = await this.client.post(`/collaboration/sessions/${sessionId}/messages`, {
      message,
      type: type || 'text'
    });
    return response.data;
  }

  /**
   * Get chat messages from session
   */
  async getMessages(sessionId: string, limit?: number, before?: string): Promise<{
    id: string;
    message: string;
    type: string;
    userId: string;
    user: User;
    timestamp: string;
  }[]> {
    const response = await this.client.get(`/collaboration/sessions/${sessionId}/messages`, {
      params: { limit, before }
    });
    return response.data;
  }

  /**
   * Share screen in collaboration
   */
  async startScreenShare(sessionId: string): Promise<{
    shareId: string;
    streamUrl: string;
  }> {
    const response = await this.client.post(`/collaboration/sessions/${sessionId}/screen-share`);
    return response.data;
  }

  /**
   * Stop screen sharing
   */
  async stopScreenShare(sessionId: string, shareId: string): Promise<void> {
    await this.client.delete(`/collaboration/sessions/${sessionId}/screen-share/${shareId}`);
  }

  /**
   * Start voice/video call
   */
  async startCall(sessionId: string, type: 'voice' | 'video'): Promise<{
    callId: string;
    roomId: string;
    token: string;
  }> {
    const response = await this.client.post(`/collaboration/sessions/${sessionId}/call`, { type });
    return response.data;
  }

  /**
   * End voice/video call
   */
  async endCall(sessionId: string, callId: string): Promise<void> {
    await this.client.delete(`/collaboration/sessions/${sessionId}/call/${callId}`);
  }

  /**
   * Get collaboration permissions
   */
  async getPermissions(projectId: number, userId?: string): Promise<{
    read: boolean;
    write: boolean;
    admin: boolean;
    invite: boolean;
    delete: boolean;
  }> {
    const response = await this.client.get(`/projects/${projectId}/permissions`, {
      params: { userId }
    });
    return response.data;
  }

  /**
   * Update collaboration permissions
   */
  async updatePermissions(projectId: number, userId: string, permissions: {
    read?: boolean;
    write?: boolean;
    admin?: boolean;
    invite?: boolean;
    delete?: boolean;
  }): Promise<void> {
    await this.client.put(`/projects/${projectId}/permissions/${userId}`, permissions);
  }

  /**
   * Get collaboration history
   */
  async getHistory(projectId: number, limit?: number): Promise<{
    id: string;
    type: 'join' | 'leave' | 'edit' | 'comment' | 'invite';
    userId: string;
    user: User;
    details: any;
    timestamp: string;
  }[]> {
    const response = await this.client.get(`/projects/${projectId}/collaboration/history`, {
      params: { limit }
    });
    return response.data;
  }

  /**
   * Create a collaborative comment
   */
  async createComment(projectId: number, options: {
    fileId: number;
    line: number;
    column?: number;
    content: string;
    thread?: string;
  }): Promise<{
    id: string;
    content: string;
    fileId: number;
    line: number;
    column?: number;
    userId: string;
    user: User;
    thread?: string;
    replies: any[];
    createdAt: string;
  }> {
    const response = await this.client.post(`/projects/${projectId}/comments`, options);
    return response.data;
  }

  /**
   * Get comments for a file
   */
  async getComments(projectId: number, fileId?: number): Promise<{
    id: string;
    content: string;
    fileId: number;
    line: number;
    column?: number;
    userId: string;
    user: User;
    thread?: string;
    replies: any[];
    createdAt: string;
  }[]> {
    const response = await this.client.get(`/projects/${projectId}/comments`, {
      params: { fileId }
    });
    return response.data;
  }

  /**
   * Reply to a comment
   */
  async replyToComment(projectId: number, commentId: string, content: string): Promise<{
    id: string;
    content: string;
    commentId: string;
    userId: string;
    user: User;
    createdAt: string;
  }> {
    const response = await this.client.post(`/projects/${projectId}/comments/${commentId}/replies`, {
      content
    });
    return response.data;
  }

  /**
   * Resolve a comment thread
   */
  async resolveComment(projectId: number, commentId: string): Promise<void> {
    await this.client.post(`/projects/${projectId}/comments/${commentId}/resolve`);
  }
}