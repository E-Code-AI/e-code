import { AxiosInstance } from 'axios';
import { User, SearchResult, PaginationParams } from '../types';

export class UserManager {
  constructor(private client: AxiosInstance) {}

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<User> {
    const response = await this.client.get('/user');
    return response.data;
  }

  /**
   * Update current user profile
   */
  async updateProfile(updates: {
    firstName?: string;
    lastName?: string;
    bio?: string;
    website?: string;
    githubUsername?: string;
    twitterUsername?: string;
    linkedinUsername?: string;
  }): Promise<User> {
    const response = await this.client.put('/user/profile', updates);
    return response.data;
  }

  /**
   * Get user by ID
   */
  async get(id: string): Promise<User> {
    const response = await this.client.get(`/users/${id}`);
    return response.data;
  }

  /**
   * Get user by username
   */
  async getByUsername(username: string): Promise<User> {
    const response = await this.client.get(`/users/username/${username}`);
    return response.data;
  }

  /**
   * Search users
   */
  async search(query: string, params?: PaginationParams): Promise<SearchResult<User>> {
    const response = await this.client.get('/users/search', {
      params: { q: query, ...params }
    });
    return response.data;
  }

  /**
   * Follow a user
   */
  async follow(userId: string): Promise<void> {
    await this.client.post(`/users/${userId}/follow`);
  }

  /**
   * Unfollow a user
   */
  async unfollow(userId: string): Promise<void> {
    await this.client.delete(`/users/${userId}/follow`);
  }

  /**
   * Get user's followers
   */
  async getFollowers(userId: string, params?: PaginationParams): Promise<SearchResult<User>> {
    const response = await this.client.get(`/users/${userId}/followers`, { params });
    return response.data;
  }

  /**
   * Get users that a user is following
   */
  async getFollowing(userId: string, params?: PaginationParams): Promise<SearchResult<User>> {
    const response = await this.client.get(`/users/${userId}/following`, { params });
    return response.data;
  }

  /**
   * Get user's projects
   */
  async getProjects(userId: string, params?: PaginationParams & {
    visibility?: 'public' | 'private';
    type?: 'owned' | 'collaborated';
  }): Promise<SearchResult<any>> {
    const response = await this.client.get(`/users/${userId}/projects`, { params });
    return response.data;
  }

  /**
   * Get user's liked projects
   */
  async getLikedProjects(userId: string, params?: PaginationParams): Promise<SearchResult<any>> {
    const response = await this.client.get(`/users/${userId}/liked`, { params });
    return response.data;
  }

  /**
   * Get user statistics
   */
  async getStats(userId: string): Promise<{
    projects: number;
    followers: number;
    following: number;
    likes: number;
    views: number;
    contributions: number;
    reputation: number;
    joinedAt: string;
    lastActive: string;
  }> {
    const response = await this.client.get(`/users/${userId}/stats`);
    return response.data;
  }

  /**
   * Get user's activity feed
   */
  async getActivity(userId: string, params?: PaginationParams): Promise<SearchResult<{
    id: string;
    type: 'project_created' | 'project_liked' | 'project_forked' | 'user_followed';
    data: any;
    timestamp: string;
  }>> {
    const response = await this.client.get(`/users/${userId}/activity`, { params });
    return response.data;
  }

  /**
   * Upload profile avatar
   */
  async uploadAvatar(file: File | Blob): Promise<{
    url: string;
    thumbnailUrl: string;
  }> {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await this.client.post('/user/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }

  /**
   * Change password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.client.post('/user/change-password', {
      currentPassword,
      newPassword
    });
  }

  /**
   * Change email
   */
  async changeEmail(newEmail: string, password: string): Promise<void> {
    await this.client.post('/user/change-email', {
      email: newEmail,
      password
    });
  }

  /**
   * Enable two-factor authentication
   */
  async enableTwoFactor(): Promise<{
    secret: string;
    qrCode: string;
    backupCodes: string[];
  }> {
    const response = await this.client.post('/user/2fa/enable');
    return response.data;
  }

  /**
   * Verify two-factor authentication setup
   */
  async verifyTwoFactor(token: string): Promise<void> {
    await this.client.post('/user/2fa/verify', { token });
  }

  /**
   * Disable two-factor authentication
   */
  async disableTwoFactor(password: string): Promise<void> {
    await this.client.post('/user/2fa/disable', { password });
  }

  /**
   * Get user's API keys
   */
  async getApiKeys(): Promise<{
    id: string;
    name: string;
    keyPreview: string;
    permissions: string[];
    lastUsed?: string;
    createdAt: string;
    expiresAt?: string;
  }[]> {
    const response = await this.client.get('/user/api-keys');
    return response.data;
  }

  /**
   * Create new API key
   */
  async createApiKey(name: string, permissions: string[], expiresIn?: number): Promise<{
    id: string;
    name: string;
    key: string;
    permissions: string[];
    createdAt: string;
    expiresAt?: string;
  }> {
    const response = await this.client.post('/user/api-keys', {
      name,
      permissions,
      expiresIn
    });
    return response.data;
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(keyId: string): Promise<void> {
    await this.client.delete(`/user/api-keys/${keyId}`);
  }

  /**
   * Get user's sessions
   */
  async getSessions(): Promise<{
    id: string;
    device: string;
    browser: string;
    location: string;
    ip: string;
    isCurrent: boolean;
    createdAt: string;
    lastActive: string;
  }[]> {
    const response = await this.client.get('/user/sessions');
    return response.data;
  }

  /**
   * Revoke user session
   */
  async revokeSession(sessionId: string): Promise<void> {
    await this.client.delete(`/user/sessions/${sessionId}`);
  }

  /**
   * Get user preferences
   */
  async getPreferences(): Promise<{
    theme: 'light' | 'dark' | 'system';
    language: string;
    timezone: string;
    notifications: {
      email: boolean;
      push: boolean;
      desktop: boolean;
    };
    privacy: {
      profileVisible: boolean;
      projectsVisible: boolean;
      activityVisible: boolean;
    };
  }> {
    const response = await this.client.get('/user/preferences');
    return response.data;
  }

  /**
   * Update user preferences
   */
  async updatePreferences(preferences: any): Promise<void> {
    await this.client.put('/user/preferences', preferences);
  }

  /**
   * Delete user account
   */
  async deleteAccount(password: string, reason?: string): Promise<void> {
    await this.client.delete('/user/account', {
      data: { password, reason }
    });
  }

  /**
   * Export user data
   */
  async exportData(): Promise<{
    downloadUrl: string;
    expiresAt: string;
  }> {
    const response = await this.client.post('/user/export');
    return response.data;
  }
}