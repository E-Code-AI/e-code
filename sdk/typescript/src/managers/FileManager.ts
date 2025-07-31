import { AxiosInstance } from 'axios';
import { ProjectFile, FileCreateOptions, FileUpdateOptions } from '../types';

export class FileManager {
  constructor(private client: AxiosInstance) {}

  /**
   * Get file by ID
   */
  async get(id: number): Promise<ProjectFile> {
    const response = await this.client.get(`/files/${id}`);
    return response.data;
  }

  /**
   * Get files by project
   */
  async getByProject(projectId: number): Promise<ProjectFile[]> {
    const response = await this.client.get(`/projects/${projectId}/files`);
    return response.data;
  }

  /**
   * Create a new file
   */
  async create(projectId: number, options: FileCreateOptions): Promise<ProjectFile> {
    const response = await this.client.post(`/projects/${projectId}/files`, options);
    return response.data;
  }

  /**
   * Update a file
   */
  async update(id: number, options: FileUpdateOptions): Promise<ProjectFile> {
    const response = await this.client.put(`/files/${id}`, options);
    return response.data;
  }

  /**
   * Delete a file
   */
  async delete(id: number): Promise<void> {
    await this.client.delete(`/files/${id}`);
  }

  /**
   * Create a folder
   */
  async createFolder(projectId: number, name: string, path?: string): Promise<ProjectFile> {
    return this.create(projectId, {
      name,
      path,
      isFolder: true,
      content: ''
    });
  }

  /**
   * Upload file content
   */
  async upload(projectId: number, filePath: string, content: string | Buffer): Promise<ProjectFile> {
    const formData = new FormData();
    formData.append('file', new Blob([content]), filePath);
    formData.append('path', filePath);

    const response = await this.client.post(`/projects/${projectId}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }

  /**
   * Download file content
   */
  async download(id: number): Promise<string> {
    const response = await this.client.get(`/files/${id}/download`);
    return response.data;
  }

  /**
   * Copy a file
   */
  async copy(id: number, newName: string, newPath?: string): Promise<ProjectFile> {
    const response = await this.client.post(`/files/${id}/copy`, {
      name: newName,
      path: newPath
    });
    return response.data;
  }

  /**
   * Move a file
   */
  async move(id: number, newPath: string): Promise<ProjectFile> {
    const response = await this.client.post(`/files/${id}/move`, { path: newPath });
    return response.data;
  }

  /**
   * Rename a file
   */
  async rename(id: number, newName: string): Promise<ProjectFile> {
    return this.update(id, { name: newName });
  }

  /**
   * Search files in project
   */
  async search(projectId: number, query: string): Promise<ProjectFile[]> {
    const response = await this.client.get(`/projects/${projectId}/files/search`, {
      params: { q: query }
    });
    return response.data;
  }

  /**
   * Get file history/versions
   */
  async getHistory(id: number): Promise<{
    id: string;
    content: string;
    message?: string;
    createdAt: string;
    author: string;
  }[]> {
    const response = await this.client.get(`/files/${id}/history`);
    return response.data;
  }

  /**
   * Restore file to a specific version
   */
  async restore(id: number, versionId: string): Promise<ProjectFile> {
    const response = await this.client.post(`/files/${id}/restore/${versionId}`);
    return response.data;
  }

  /**
   * Get file metadata
   */
  async getMetadata(id: number): Promise<{
    size: number;
    lines: number;
    language: string;
    encoding: string;
    lastModified: string;
    permissions: {
      read: boolean;
      write: boolean;
      execute: boolean;
    };
  }> {
    const response = await this.client.get(`/files/${id}/metadata`);
    return response.data;
  }

  /**
   * Batch create files
   */
  async createBatch(projectId: number, files: FileCreateOptions[]): Promise<ProjectFile[]> {
    const response = await this.client.post(`/projects/${projectId}/files/batch`, { files });
    return response.data;
  }

  /**
   * Batch delete files
   */
  async deleteBatch(fileIds: number[]): Promise<void> {
    await this.client.delete('/files/batch', { data: { fileIds } });
  }

  /**
   * Get file tree structure
   */
  async getTree(projectId: number): Promise<{
    name: string;
    path: string;
    type: 'file' | 'folder';
    children?: any[];
  }[]> {
    const response = await this.client.get(`/projects/${projectId}/tree`);
    return response.data;
  }

  /**
   * Compress files into archive
   */
  async createArchive(projectId: number, fileIds: number[], format: 'zip' | 'tar' = 'zip'): Promise<{
    downloadUrl: string;
    filename: string;
    size: number;
  }> {
    const response = await this.client.post(`/projects/${projectId}/archive`, {
      fileIds,
      format
    });
    return response.data;
  }
}