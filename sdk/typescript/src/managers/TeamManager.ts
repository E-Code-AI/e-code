import { AxiosInstance } from 'axios';
import { Team, TeamCreateOptions, TeamUpdateOptions, User, SearchResult, PaginationParams } from '../types';

export interface TeamMember {
  id: string;
  userId: string;
  user: User;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: string;
  lastActive?: string;
}

export interface TeamInvitation {
  id: string;
  teamId: number;
  inviterId: string;
  inviterName: string;
  inviteeEmail: string;
  role: 'admin' | 'member' | 'viewer';
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: string;
  expiresAt: string;
}

export class TeamManager {
  constructor(private client: AxiosInstance) {}

  /**
   * Create a new team
   */
  async create(options: TeamCreateOptions): Promise<Team> {
    const response = await this.client.post('/teams', options);
    return response.data;
  }

  /**
   * Get team by ID
   */
  async get(id: number): Promise<Team> {
    const response = await this.client.get(`/teams/${id}`);
    return response.data;
  }

  /**
   * Get team by slug
   */
  async getBySlug(slug: string): Promise<Team> {
    const response = await this.client.get(`/teams/slug/${slug}`);
    return response.data;
  }

  /**
   * Update team
   */
  async update(id: number, options: TeamUpdateOptions): Promise<Team> {
    const response = await this.client.put(`/teams/${id}`, options);
    return response.data;
  }

  /**
   * Delete team
   */
  async delete(id: number): Promise<void> {
    await this.client.delete(`/teams/${id}`);
  }

  /**
   * List teams
   */
  async list(params?: PaginationParams & {
    visibility?: 'public' | 'private';
    member?: boolean;
  }): Promise<SearchResult<Team>> {
    const response = await this.client.get('/teams', { params });
    return response.data;
  }

  /**
   * Search teams
   */
  async search(query: string, params?: PaginationParams): Promise<SearchResult<Team>> {
    const response = await this.client.get('/teams/search', {
      params: { q: query, ...params }
    });
    return response.data;
  }

  /**
   * Get team members
   */
  async getMembers(id: number, params?: PaginationParams): Promise<SearchResult<TeamMember>> {
    const response = await this.client.get(`/teams/${id}/members`, { params });
    return response.data;
  }

  /**
   * Add team member
   */
  async addMember(id: number, userId: string, role: 'admin' | 'member' | 'viewer' = 'member'): Promise<TeamMember> {
    const response = await this.client.post(`/teams/${id}/members`, { userId, role });
    return response.data;
  }

  /**
   * Update member role
   */
  async updateMemberRole(id: number, userId: string, role: 'admin' | 'member' | 'viewer'): Promise<void> {
    await this.client.put(`/teams/${id}/members/${userId}`, { role });
  }

  /**
   * Remove team member
   */
  async removeMember(id: number, userId: string): Promise<void> {
    await this.client.delete(`/teams/${id}/members/${userId}`);
  }

  /**
   * Send team invitation
   */
  async sendInvitation(id: number, options: {
    email: string;
    role: 'admin' | 'member' | 'viewer';
    message?: string;
  }): Promise<TeamInvitation> {
    const response = await this.client.post(`/teams/${id}/invitations`, options);
    return response.data;
  }

  /**
   * Get team invitations
   */
  async getInvitations(id: number, status?: string): Promise<TeamInvitation[]> {
    const response = await this.client.get(`/teams/${id}/invitations`, {
      params: { status }
    });
    return response.data;
  }

  /**
   * Accept team invitation
   */
  async acceptInvitation(invitationId: string): Promise<void> {
    await this.client.post(`/team-invitations/${invitationId}/accept`);
  }

  /**
   * Decline team invitation
   */
  async declineInvitation(invitationId: string): Promise<void> {
    await this.client.post(`/team-invitations/${invitationId}/decline`);
  }

  /**
   * Cancel team invitation
   */
  async cancelInvitation(invitationId: string): Promise<void> {
    await this.client.delete(`/team-invitations/${invitationId}`);
  }

  /**
   * Get team projects
   */
  async getProjects(id: number, params?: PaginationParams): Promise<SearchResult<any>> {
    const response = await this.client.get(`/teams/${id}/projects`, { params });
    return response.data;
  }

  /**
   * Add project to team
   */
  async addProject(id: number, projectId: number): Promise<void> {
    await this.client.post(`/teams/${id}/projects`, { projectId });
  }

  /**
   * Remove project from team
   */
  async removeProject(id: number, projectId: number): Promise<void> {
    await this.client.delete(`/teams/${id}/projects/${projectId}`);
  }

  /**
   * Get team workspaces
   */
  async getWorkspaces(id: number): Promise<{
    id: string;
    name: string;
    description?: string;
    projects: any[];
    members: TeamMember[];
    createdAt: string;
    updatedAt: string;
  }[]> {
    const response = await this.client.get(`/teams/${id}/workspaces`);
    return response.data;
  }

  /**
   * Create team workspace
   */
  async createWorkspace(id: number, options: {
    name: string;
    description?: string;
    projectIds?: number[];
  }): Promise<{
    id: string;
    name: string;
    description?: string;
    projects: any[];
    members: TeamMember[];
    createdAt: string;
    updatedAt: string;
  }> {
    const response = await this.client.post(`/teams/${id}/workspaces`, options);
    return response.data;
  }

  /**
   * Update team workspace
   */
  async updateWorkspace(id: number, workspaceId: string, options: {
    name?: string;
    description?: string;
  }): Promise<void> {
    await this.client.put(`/teams/${id}/workspaces/${workspaceId}`, options);
  }

  /**
   * Delete team workspace
   */
  async deleteWorkspace(id: number, workspaceId: string): Promise<void> {
    await this.client.delete(`/teams/${id}/workspaces/${workspaceId}`);
  }

  /**
   * Get team statistics
   */
  async getStats(id: number): Promise<{
    members: number;
    projects: number;
    workspaces: number;
    activity: number;
    createdAt: string;
  }> {
    const response = await this.client.get(`/teams/${id}/stats`);
    return response.data;
  }

  /**
   * Get team activity
   */
  async getActivity(id: number, params?: PaginationParams): Promise<SearchResult<{
    id: string;
    type: 'member_joined' | 'member_left' | 'project_added' | 'project_removed' | 'workspace_created';
    userId?: string;
    user?: User;
    details: any;
    timestamp: string;
  }>> {
    const response = await this.client.get(`/teams/${id}/activity`, { params });
    return response.data;
  }

  /**
   * Upload team avatar
   */
  async uploadAvatar(id: number, file: File | Blob): Promise<{
    url: string;
    thumbnailUrl: string;
  }> {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await this.client.post(`/teams/${id}/avatar`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }

  /**
   * Join public team
   */
  async join(id: number): Promise<void> {
    await this.client.post(`/teams/${id}/join`);
  }

  /**
   * Leave team
   */
  async leave(id: number): Promise<void> {
    await this.client.post(`/teams/${id}/leave`);
  }

  /**
   * Transfer team ownership
   */
  async transferOwnership(id: number, newOwnerId: string): Promise<void> {
    await this.client.post(`/teams/${id}/transfer`, { newOwnerId });
  }

  /**
   * Get team permissions for current user
   */
  async getPermissions(id: number): Promise<{
    read: boolean;
    write: boolean;
    admin: boolean;
    invite: boolean;
    manage: boolean;
    delete: boolean;
  }> {
    const response = await this.client.get(`/teams/${id}/permissions`);
    return response.data;
  }

  /**
   * Archive team
   */
  async archive(id: number): Promise<void> {
    await this.client.post(`/teams/${id}/archive`);
  }

  /**
   * Unarchive team
   */
  async unarchive(id: number): Promise<void> {
    await this.client.post(`/teams/${id}/unarchive`);
  }
}