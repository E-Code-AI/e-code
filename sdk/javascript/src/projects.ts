import { ECodeClient } from './client';
import { Project, File, CreateProjectOptions } from './types';

export class ProjectManager {
    constructor(private client: ECodeClient) {}

    /**
     * Create a new project
     */
    async create(options: CreateProjectOptions): Promise<Project> {
        return this.client.post('/projects', options);
    }

    /**
     * Get all projects
     */
    async list(limit: number = 100): Promise<Project[]> {
        return this.client.get('/projects', { params: { limit } });
    }

    /**
     * Get a specific project
     */
    async get(projectId: string): Promise<Project> {
        return this.client.get(`/projects/${projectId}`);
    }

    /**
     * Get project by slug
     */
    async getBySlug(slug: string): Promise<Project> {
        return this.client.get(`/projects/by-slug/${slug}`);
    }

    /**
     * Update project
     */
    async update(projectId: string, updates: Partial<Project>): Promise<Project> {
        return this.client.patch(`/projects/${projectId}`, updates);
    }

    /**
     * Delete project
     */
    async delete(projectId: string): Promise<void> {
        return this.client.delete(`/projects/${projectId}`);
    }

    /**
     * Fork a project
     */
    async fork(projectId: string, name?: string): Promise<Project> {
        return this.client.post(`/projects/${projectId}/fork`, { name });
    }

    /**
     * Get project files
     */
    async getFiles(projectId: string): Promise<File[]> {
        return this.client.get(`/projects/${projectId}/files`);
    }

    /**
     * Create a file in project
     */
    async createFile(projectId: string, path: string, content: string): Promise<File> {
        return this.client.post(`/projects/${projectId}/files`, {
            path,
            content,
            isFolder: false
        });
    }

    /**
     * Update a file
     */
    async updateFile(fileId: string, content: string): Promise<File> {
        return this.client.patch(`/files/${fileId}`, { content });
    }

    /**
     * Delete a file
     */
    async deleteFile(fileId: string): Promise<void> {
        return this.client.delete(`/files/${fileId}`);
    }

    /**
     * Run code in project
     */
    async run(projectId: string): Promise<{ output: string; error?: string }> {
        return this.client.post(`/projects/${projectId}/run`);
    }

    /**
     * Get project collaborators
     */
    async getCollaborators(projectId: string) {
        return this.client.get(`/projects/${projectId}/collaborators`);
    }

    /**
     * Add collaborator
     */
    async addCollaborator(projectId: string, username: string, role: string = 'editor') {
        return this.client.post(`/projects/${projectId}/collaborators`, {
            username,
            role
        });
    }

    /**
     * Remove collaborator
     */
    async removeCollaborator(projectId: string, userId: string) {
        return this.client.delete(`/projects/${projectId}/collaborators/${userId}`);
    }

    /**
     * Export project
     */
    async export(projectId: string, format: 'zip' | 'docker' | 'github' = 'zip'): Promise<Blob> {
        const response = await this.client.get(`/projects/${projectId}/export`, {
            params: { format },
            responseType: 'blob'
        });
        return response;
    }
}