/**
 * Google Drive MCP Server
 * Provides Google Drive integration capabilities
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export class GoogleDriveMCPServer {
  private drive: any = null;
  private auth: OAuth2Client | null = null;
  private initialized: boolean = false;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      // Check for Google credentials
      if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
        this.auth = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/auth/google/callback'
        );

        // If we have a refresh token, set it
        if (process.env.GOOGLE_REFRESH_TOKEN && this.auth) {
          this.auth.setCredentials({
            refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
          });
          
          this.drive = google.drive({ version: 'v3', auth: this.auth });
          this.initialized = true;
          console.log('[google-drive-mcp] Google Drive MCP server initialized successfully');
        } else {
          console.log('[google-drive-mcp] Google refresh token not configured');
        }
      } else {
        console.log('[google-drive-mcp] Google credentials not configured');
      }
    } catch (error) {
      console.error('[google-drive-mcp] Failed to initialize:', error);
    }
  }

  // List files in Google Drive
  async listFiles(params: {
    pageSize?: number;
    q?: string;
    orderBy?: string;
    fields?: string;
  } = {}) {
    if (!this.drive) {
      return { error: 'Google Drive not initialized. Please configure Google credentials.' };
    }

    try {
      const response = await this.drive.files.list({
        pageSize: params.pageSize || 10,
        q: params.q,
        orderBy: params.orderBy || 'modifiedTime desc',
        fields: params.fields || 'files(id, name, mimeType, size, modifiedTime, webViewLink)',
      });

      return {
        files: response.data.files || [],
        nextPageToken: response.data.nextPageToken,
      };
    } catch (error: any) {
      console.error('[google-drive-mcp] List files error:', error);
      return { error: error.message };
    }
  }

  // Get file content
  async getFile(params: { fileId: string }) {
    if (!this.drive) {
      return { error: 'Google Drive not initialized. Please configure Google credentials.' };
    }

    try {
      const response = await this.drive.files.get({
        fileId: params.fileId,
        alt: 'media',
      }, {
        responseType: 'stream',
      });

      // Convert stream to string for text files
      let content = '';
      for await (const chunk of response.data) {
        content += chunk.toString();
      }

      return {
        content,
        fileId: params.fileId,
      };
    } catch (error: any) {
      console.error('[google-drive-mcp] Get file error:', error);
      return { error: error.message };
    }
  }

  // Create a new file
  async createFile(params: {
    name: string;
    content: string;
    mimeType?: string;
    parents?: string[];
  }) {
    if (!this.drive) {
      return { error: 'Google Drive not initialized. Please configure Google credentials.' };
    }

    try {
      const fileMetadata = {
        name: params.name,
        parents: params.parents,
      };

      const media = {
        mimeType: params.mimeType || 'text/plain',
        body: params.content,
      };

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink',
      });

      return {
        fileId: response.data.id,
        name: response.data.name,
        webViewLink: response.data.webViewLink,
      };
    } catch (error: any) {
      console.error('[google-drive-mcp] Create file error:', error);
      return { error: error.message };
    }
  }

  // Update file content
  async updateFile(params: {
    fileId: string;
    content: string;
    name?: string;
  }) {
    if (!this.drive) {
      return { error: 'Google Drive not initialized. Please configure Google credentials.' };
    }

    try {
      const fileMetadata: any = {};
      if (params.name) {
        fileMetadata.name = params.name;
      }

      const media = {
        mimeType: 'text/plain',
        body: params.content,
      };

      const response = await this.drive.files.update({
        fileId: params.fileId,
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name, modifiedTime',
      });

      return {
        fileId: response.data.id,
        name: response.data.name,
        modifiedTime: response.data.modifiedTime,
      };
    } catch (error: any) {
      console.error('[google-drive-mcp] Update file error:', error);
      return { error: error.message };
    }
  }

  // Delete a file
  async deleteFile(params: { fileId: string }) {
    if (!this.drive) {
      return { error: 'Google Drive not initialized. Please configure Google credentials.' };
    }

    try {
      await this.drive.files.delete({
        fileId: params.fileId,
      });

      return {
        success: true,
        fileId: params.fileId,
      };
    } catch (error: any) {
      console.error('[google-drive-mcp] Delete file error:', error);
      return { error: error.message };
    }
  }

  // Search files
  async searchFiles(params: {
    query: string;
    pageSize?: number;
  }) {
    return this.listFiles({
      q: `name contains '${params.query}'`,
      pageSize: params.pageSize,
    });
  }

  // Get tool definitions
  getTools() {
    return [
      {
        name: 'gdrive_list_files',
        description: 'List files in Google Drive',
        inputSchema: {
          type: 'object',
          properties: {
            pageSize: { type: 'number', description: 'Number of files to return' },
            q: { type: 'string', description: 'Query string for filtering' },
            orderBy: { type: 'string', description: 'Sort order' },
          },
        },
      },
      {
        name: 'gdrive_get_file',
        description: 'Get file content from Google Drive',
        inputSchema: {
          type: 'object',
          properties: {
            fileId: { type: 'string', description: 'File ID' },
          },
          required: ['fileId'],
        },
      },
      {
        name: 'gdrive_create_file',
        description: 'Create a new file in Google Drive',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'File name' },
            content: { type: 'string', description: 'File content' },
            mimeType: { type: 'string', description: 'MIME type' },
            parents: { type: 'array', items: { type: 'string' }, description: 'Parent folder IDs' },
          },
          required: ['name', 'content'],
        },
      },
      {
        name: 'gdrive_update_file',
        description: 'Update file content in Google Drive',
        inputSchema: {
          type: 'object',
          properties: {
            fileId: { type: 'string', description: 'File ID' },
            content: { type: 'string', description: 'New content' },
            name: { type: 'string', description: 'New name (optional)' },
          },
          required: ['fileId', 'content'],
        },
      },
      {
        name: 'gdrive_delete_file',
        description: 'Delete a file from Google Drive',
        inputSchema: {
          type: 'object',
          properties: {
            fileId: { type: 'string', description: 'File ID' },
          },
          required: ['fileId'],
        },
      },
      {
        name: 'gdrive_search_files',
        description: 'Search for files in Google Drive',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            pageSize: { type: 'number', description: 'Number of results' },
          },
          required: ['query'],
        },
      },
    ];
  }
}

export const googleDriveMCP = new GoogleDriveMCPServer();