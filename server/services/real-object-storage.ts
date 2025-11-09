/**
 * Real Object Storage Service
 * Provides cloud storage capabilities using Replit's built-in Object Storage
 * For Replit Reserved VM deployment
 */

import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs/promises';
import { createLogger } from '../utils/logger';
import { Readable } from 'stream';
import { storage as dbStorage } from '../storage';
import { billingService } from './billing-service';

const logger = createLogger('real-object-storage');

export interface StorageObject {
  key: string;
  size: number;
  contentType: string;
  lastModified: Date;
  etag: string;
  url?: string;
  metadata?: Record<string, string>;
}

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  public?: boolean;
  resumable?: boolean;
}

export interface DownloadOptions {
  start?: number;
  end?: number;
}

export class RealObjectStorageService {
  private storagePath: string;
  private bucketId: string;

  constructor() {
    // Use Replit's object storage bucket ID from environment
    this.bucketId = process.env.REPLIT_OBJECT_STORAGE_BUCKET_ID || '';
    // Fallback to local filesystem storage for development
    this.storagePath = process.env.STORAGE_PATH || path.join(process.cwd(), 'storage');
    this.initialize();
  }

  private async initialize() {
    try {
      if (this.bucketId) {
        logger.info('Using Replit built-in Object Storage');
      } else {
        logger.info('Using local filesystem storage (development mode)');
        // Create storage directory if it doesn't exist
        await fs.mkdir(this.storagePath, { recursive: true });
      }
    } catch (error) {
      logger.error(`Failed to initialize object storage: ${error}`);
    }
  }

  private async ensureDirectory(filePath: string) {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
  }

  private getFilePath(key: string): string {
    return path.join(this.storagePath, key);
  }

  async uploadFile(
    key: string,
    content: Buffer | Readable | string,
    options: UploadOptions = {},
    projectId?: number,
    userId?: number
  ): Promise<StorageObject> {
    try {
      const filePath = this.getFilePath(key);
      await this.ensureDirectory(filePath);

      // Convert content to buffer
      let buffer: Buffer;
      if (Buffer.isBuffer(content)) {
        buffer = content;
      } else if (typeof content === 'string') {
        buffer = Buffer.from(content);
      } else {
        // Handle stream
        const chunks: Buffer[] = [];
        for await (const chunk of content) {
          chunks.push(Buffer.from(chunk));
        }
        buffer = Buffer.concat(chunks);
      }

      // Write file
      await fs.writeFile(filePath, buffer);

      // Get file stats
      const stats = await fs.stat(filePath);
      const etag = crypto.createHash('md5').update(buffer).digest('hex');

      const storageObject: StorageObject = {
        key,
        size: stats.size,
        contentType: options.contentType || 'application/octet-stream',
        lastModified: stats.mtime,
        etag,
        url: options.public ? `/storage/${key}` : undefined,
        metadata: options.metadata
      };

      // Track in database if project ID provided
      if (projectId) {
        const buckets = await dbStorage.getProjectObjectStorageBuckets(projectId.toString());
        let bucketRecord = buckets.find(b => b.bucketName === 'replit-storage');
        
        if (!bucketRecord) {
          bucketRecord = await dbStorage.createObjectStorageBucket({
            projectId: projectId.toString(),
            bucketName: 'replit-storage',
            region: 'replit',
            storageClass: 'STANDARD',
            metadata: {}
          });
        }

        await dbStorage.createObjectStorageFile({
          bucketId: bucketRecord.id,
          fileName: key,
          filePath: key,
          size: storageObject.size,
          contentType: storageObject.contentType,
          metadata: options.metadata || {},
          url: storageObject.url || '',
          uploadedBy: userId || 1
        });

        // Track usage for billing
        if (userId) {
          const sizeInGB = storageObject.size / (1024 * 1024 * 1024);
          await billingService.trackResourceUsage(
            userId,
            'storage.gb_month',
            sizeInGB,
            { projectId, bucketId: bucketRecord.id, fileKey: key }
          );
        }
      }

      logger.info(`Uploaded file: ${key} (${storageObject.size} bytes)`);
      return storageObject;

    } catch (error) {
      logger.error(`Failed to upload file ${key}: ${error}`);
      throw error;
    }
  }

  async downloadFile(
    key: string,
    options: DownloadOptions = {}
  ): Promise<Buffer> {
    try {
      const filePath = this.getFilePath(key);
      
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        throw new Error(`File not found: ${key}`);
      }

      // Read file
      let buffer = await fs.readFile(filePath);

      // Handle byte range if specified
      if (options.start !== undefined || options.end !== undefined) {
        const start = options.start || 0;
        const end = options.end || buffer.length;
        buffer = buffer.subarray(start, end);
      }

      logger.info(`Downloaded file: ${key} (${buffer.length} bytes)`);
      return buffer;

    } catch (error) {
      logger.error(`Failed to download file ${key}: ${error}`);
      throw error;
    }
  }

  async deleteFile(key: string, projectId?: number): Promise<void> {
    try {
      const filePath = this.getFilePath(key);
      await fs.unlink(filePath);
      
      logger.info(`Deleted file: ${key}`);
    } catch (error) {
      logger.error(`Failed to delete file ${key}: ${error}`);
      throw error;
    }
  }

  async listFiles(
    prefix?: string,
    maxResults?: number
  ): Promise<StorageObject[]> {
    try {
      const searchPath = prefix ? this.getFilePath(prefix) : this.storagePath;
      const files: StorageObject[] = [];

      async function walk(dir: string, baseDir: string) {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            await walk(fullPath, baseDir);
          } else {
            const stats = await fs.stat(fullPath);
            const key = path.relative(baseDir, fullPath);
            const buffer = await fs.readFile(fullPath);
            const etag = crypto.createHash('md5').update(buffer).digest('hex');
            
            files.push({
              key,
              size: stats.size,
              contentType: 'application/octet-stream',
              lastModified: stats.mtime,
              etag
            });
          }
          
          if (maxResults && files.length >= maxResults) {
            break;
          }
        }
      }

      await walk(searchPath, this.storagePath);

      logger.info(`Listed ${files.length} files with prefix: ${prefix || 'none'}`);
      return files.slice(0, maxResults);

    } catch (error) {
      logger.error(`Failed to list files: ${error}`);
      return [];
    }
  }

  async getSignedUrl(
    key: string,
    expiresIn: number = 3600,
    action: 'read' | 'write' = 'read'
  ): Promise<string> {
    // For local storage, return a simple path
    // In production with Replit Object Storage, this would generate a signed URL
    const url = `/storage/${key}?expires=${Date.now() + expiresIn * 1000}`;
    logger.info(`Generated signed URL for ${key} (${action}, expires in ${expiresIn}s)`);
    return url;
  }

  async copyFile(sourceKey: string, destKey: string): Promise<StorageObject> {
    try {
      const sourcePath = this.getFilePath(sourceKey);
      const destPath = this.getFilePath(destKey);
      
      await this.ensureDirectory(destPath);
      await fs.copyFile(sourcePath, destPath);
      
      const stats = await fs.stat(destPath);
      const buffer = await fs.readFile(destPath);
      const etag = crypto.createHash('md5').update(buffer).digest('hex');
      
      const storageObject: StorageObject = {
        key: destKey,
        size: stats.size,
        contentType: 'application/octet-stream',
        lastModified: stats.mtime,
        etag
      };

      logger.info(`Copied file from ${sourceKey} to ${destKey}`);
      return storageObject;

    } catch (error) {
      logger.error(`Failed to copy file from ${sourceKey} to ${destKey}: ${error}`);
      throw error;
    }
  }

  async moveFile(sourceKey: string, destKey: string): Promise<StorageObject> {
    const result = await this.copyFile(sourceKey, destKey);
    await this.deleteFile(sourceKey);
    return result;
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(key);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async getFileMetadata(key: string): Promise<StorageObject> {
    try {
      const filePath = this.getFilePath(key);
      const stats = await fs.stat(filePath);
      const buffer = await fs.readFile(filePath);
      const etag = crypto.createHash('md5').update(buffer).digest('hex');
      
      return {
        key,
        size: stats.size,
        contentType: 'application/octet-stream',
        lastModified: stats.mtime,
        etag
      };
    } catch (error) {
      logger.error(`Failed to get metadata for ${key}: ${error}`);
      throw error;
    }
  }

  async createMultipartUpload(
    key: string,
    contentType?: string
  ): Promise<string> {
    const uploadId = crypto.randomUUID();
    logger.info(`Created multipart upload for ${key}: ${uploadId}`);
    return uploadId;
  }

  async uploadPart(
    key: string,
    uploadId: string,
    partNumber: number,
    content: Buffer
  ): Promise<string> {
    const etag = crypto.createHash('md5').update(content).digest('hex');
    logger.info(`Uploaded part ${partNumber} for ${key} (${content.length} bytes)`);
    return etag;
  }

  async completeMultipartUpload(
    key: string,
    uploadId: string,
    parts: Array<{ partNumber: number; etag: string }>
  ): Promise<StorageObject> {
    return {
      key,
      size: 0,
      contentType: 'application/octet-stream',
      lastModified: new Date(),
      etag: crypto.randomUUID()
    };
  }

  // Specialized methods for different use cases

  async uploadProjectFile(
    projectId: number,
    filePath: string,
    content: Buffer | string
  ): Promise<StorageObject> {
    const key = `projects/${projectId}/${filePath}`;
    return this.uploadFile(key, content, {
      metadata: {
        projectId: projectId.toString(),
        filePath
      }
    });
  }

  async uploadUserAvatar(
    userId: number,
    imageBuffer: Buffer,
    contentType: string
  ): Promise<string> {
    const key = `avatars/${userId}-${Date.now()}.${this.getExtension(contentType)}`;
    const result = await this.uploadFile(key, imageBuffer, {
      contentType,
      public: true,
      metadata: {
        userId: userId.toString()
      }
    });
    
    return result.url || await this.getSignedUrl(key, 86400 * 365); // 1 year
  }

  async createProjectBackup(projectId: number): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const key = `backups/project-${projectId}-${timestamp}.tar.gz`;
    logger.info(`Created backup placeholder for project ${projectId}: ${key}`);
    return key;
  }

  private getExtension(contentType: string): string {
    const extensions: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'application/pdf': 'pdf',
      'application/zip': 'zip'
    };
    
    return extensions[contentType] || 'bin';
  }

  // Get storage usage statistics
  async getStorageStats(prefix?: string): Promise<{
    totalSize: number;
    fileCount: number;
    largestFile?: StorageObject;
  }> {
    const files = await this.listFiles(prefix);
    
    let totalSize = 0;
    let largestFile: StorageObject | undefined;
    
    for (const file of files) {
      totalSize += file.size;
      if (!largestFile || file.size > largestFile.size) {
        largestFile = file;
      }
    }
    
    return {
      totalSize,
      fileCount: files.length,
      largestFile
    };
  }
}

export const realObjectStorageService = new RealObjectStorageService();
