import { AxiosInstance } from 'axios';
import { 
  Project, 
  ProjectCreateOptions, 
  ProjectUpdateOptions, 
  SearchResult, 
  PaginationParams 
} from '../types';

export class ProjectManager {
  constructor(private client: AxiosInstance) {}

  /**
   * Create a new project
   */
  async create(options: ProjectCreateOptions): Promise<Project> {
    const response = await this.client.post('/projects', options);
    return response.data;
  }

  /**
   * Get project by ID
   */
  async get(id: number): Promise<Project> {
    const response = await this.client.get(`/projects/${id}`);
    return response.data;
  }

  /**
   * Get project by slug
   */
  async getBySlug(slug: string): Promise<Project> {
    const response = await this.client.get(`/projects/by-slug/${slug}`);
    return response.data;
  }

  /**
   * Update a project
   */
  async update(id: number, options: ProjectUpdateOptions): Promise<Project> {
    const response = await this.client.put(`/projects/${id}`, options);
    return response.data;
  }

  /**
   * Delete a project
   */
  async delete(id: number): Promise<void> {
    await this.client.delete(`/projects/${id}`);
  }

  /**
   * List projects with pagination
   */
  async list(params?: PaginationParams & {
    owner?: string;
    language?: string;
    visibility?: 'public' | 'private';
    template?: boolean;
  }): Promise<SearchResult<Project>> {
    const response = await this.client.get('/projects', { params });
    return response.data;
  }

  /**
   * Search projects
   */
  async search(query: string, params?: PaginationParams): Promise<SearchResult<Project>> {
    const response = await this.client.get('/projects/search', {
      params: { q: query, ...params }
    });
    return response.data;
  }

  /**
   * Like a project
   */
  async like(id: number): Promise<void> {
    await this.client.post(`/projects/${id}/like`);
  }

  /**
   * Unlike a project
   */
  async unlike(id: number): Promise<void> {
    await this.client.delete(`/projects/${id}/like`);
  }

  /**
   * Fork a project
   */
  async fork(id: number, name?: string): Promise<Project> {
    const response = await this.client.post(`/projects/${id}/fork`, { name });
    return response.data;
  }

  /**
   * Get project collaborators
   */
  async getCollaborators(id: number): Promise<any[]> {
    const response = await this.client.get(`/projects/${id}/collaborators`);
    return response.data;
  }

  /**
   * Add collaborator to project
   */
  async addCollaborator(id: number, userId: string, role: string = 'collaborator'): Promise<void> {
    await this.client.post(`/projects/${id}/collaborators`, { userId, role });
  }

  /**
   * Remove collaborator from project
   */
  async removeCollaborator(id: number, userId: string): Promise<void> {
    await this.client.delete(`/projects/${id}/collaborators/${userId}`);
  }

  /**
   * Get project statistics
   */
  async getStats(id: number): Promise<{
    views: number;
    likes: number;
    forks: number;
    collaborators: number;
    files: number;
    commits: number;
  }> {
    const response = await this.client.get(`/projects/${id}/stats`);
    return response.data;
  }

  /**
   * Star a project
   */
  async star(id: number): Promise<void> {
    await this.client.post(`/projects/${id}/star`);
  }

  /**
   * Unstar a project
   */
  async unstar(id: number): Promise<void> {
    await this.client.delete(`/projects/${id}/star`);
  }

  /**
   * Get project activity feed
   */
  async getActivity(id: number, params?: PaginationParams): Promise<SearchResult<any>> {
    const response = await this.client.get(`/projects/${id}/activity`, { params });
    return response.data;
  }

  /**
   * Archive a project
   */
  async archive(id: number): Promise<void> {
    await this.client.post(`/projects/${id}/archive`);
  }

  /**
   * Unarchive a project
   */
  async unarchive(id: number): Promise<void> {
    await this.client.post(`/projects/${id}/unarchive`);
  }

  /**
   * Transfer project ownership
   */
  async transfer(id: number, newOwnerId: string): Promise<void> {
    await this.client.post(`/projects/${id}/transfer`, { newOwnerId });
  }

  /**
   * Get project templates
   */
  async getTemplates(params?: PaginationParams & {
    language?: string;
    category?: string;
  }): Promise<SearchResult<Project>> {
    const response = await this.client.get('/projects/templates', { params });
    return response.data;
  }

  /**
   * Create project from template
   */
  async createFromTemplate(templateId: number, options: {
    name: string;
    description?: string;
    visibility?: 'public' | 'private';
  }): Promise<Project> {
    const response = await this.client.post(`/projects/templates/${templateId}/create`, options);
    return response.data;
  }
}