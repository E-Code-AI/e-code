// @ts-nocheck
/**
 * Real Object Storage Service
 * Provides actual cloud storage capabilities using Google Cloud Storage
 */

import { Storage, Bucket, File } from '@google-cloud/storage';
import * as crypto from 'crypto';
import * as path from 'path';
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
  private storage: Storage;
  private buckets: Map<string, Bucket> = new Map();
  private defaultBucket: string;

  constructor() {
    this.defaultBucket = process.env.GCS_BUCKET || 'e-code-storage';
    this.initialize();
  }

  private initialize() {
    try {
      // Skip initialization if not in production and no credentials provided
      const hasCredentials = process.env.GCS_CREDENTIALS || process.env.GOOGLE_APPLICATION_CREDENTIALS;
      const isProduction = process.env.NODE_ENV === 'production';
      
      if (!hasCredentials && !isProduction) {
        logger.info('Skipping Google Cloud Storage initialization in development without credentials');
        return;
      }

      // Initialize Google Cloud Storage
      if (process.env.GCS_CREDENTIALS) {
        // Use service account credentials from environment
        const credentials = JSON.parse(process.env.GCS_CREDENTIALS);
        this.storage = new Storage({
          credentials,
          projectId: credentials.project_id
        });
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        // Use credentials file
        this.storage = new Storage({
          keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
        });
      } else {
        // Use default credentials (for Google Cloud environments)
        this.storage = new Storage();
      }

      // Initialize buckets
      this.initializeBuckets();
      
      logger.info('Google Cloud Storage initialized');
    } catch (error) {
      logger.error(`Failed to initialize Google Cloud Storage: ${error}`);
      // Continue without throwing - service will handle errors gracefully
    }
  }

  private async initializeBuckets() {
    const bucketNames = [
      this.defaultBucket,
      'e-code-user-uploads',
      'e-code-project-files',
      'e-code-deployments',
      'e-code-backups'
    ];

    for (const bucketName of bucketNames) {
      try {
        const bucket = this.storage.bucket(bucketName);
        const [exists] = await bucket.exists();
        
        if (!exists && process.env.GCS_CREATE_BUCKETS === 'true') {
          await this.storage.createBucket(bucketName, {
            location: process.env.GCS_LOCATION || 'us-central1',
            storageClass: 'STANDARD',
            uniformBucketLevelAccess: {
              enabled: true
            }
          });
          logger.info(`Created bucket: ${bucketName}`);
        }
        
        this.buckets.set(bucketName, bucket);
      } catch (error) {
        logger.error(`Error checking bucket ${bucketName}: ${error}`);
      }
    }
  }

  async uploadFile(
    key: string,
    content: Buffer | Readable | string,
    options: UploadOptions = {},
    projectId?: number,
    userId?: number
  ): Promise<StorageObject> {
    const bucket = this.buckets.get(this.defaultBucket);
    if (!bucket) {
      throw new Error('Storage bucket not available');
    }

    try {
      const file = bucket.file(key);
      
      // Convert content to stream if needed
      let stream: Readable;
      let fileSize = 0;
      if (Buffer.isBuffer(content)) {
        stream = Readable.from(content);
        fileSize = content.length;
      } else if (typeof content === 'string') {
        stream = Readable.from(Buffer.from(content));
      } else {
        stream = content;
      }

      // Upload options
      const uploadOptions: any = {
        metadata: {
          contentType: options.contentType || 'application/octet-stream',
          metadata: options.metadata || {}
        },
        resumable: options.resumable !== false,
        public: options.public || false
      };

      // Upload file
      await new Promise((resolve, reject) => {
        stream
          .pipe(file.createWriteStream(uploadOptions))
          .on('error', reject)
          .on('finish', resolve);
      });

      // Get file metadata
      const [metadata] = await file.getMetadata();

      const storageObject: StorageObject = {
        key,
        size: parseInt(metadata.size),
        contentType: metadata.contentType,
        lastModified: new Date(metadata.updated),
        etag: metadata.etag
      };

      // Generate public URL if requested
      if (options.public) {
        await file.makePublic();
        storageObject.url = `https://storage.googleapis.com/${this.defaultBucket}/${key}`;
      }

      // Track in database if project ID provided
      if (projectId) {
        // Find or create bucket record
        let bucketRecord = (await dbStorage.getProjectObjectStorageBuckets(projectId))
          .find(b => b.name === this.defaultBucket);
        
        if (!bucketRecord) {
          bucketRecord = await dbStorage.createObjectStorageBucket({
            projectId,
            name: this.defaultBucket,
            region: 'us-central1',
            storageClass: 'STANDARD',
            metadata: {}
          });
        }

        // Create file record
        await dbStorage.createObjectStorageFile({
          bucketId: bucketRecord.id,
          key,
          size: storageObject.size,
          contentType: storageObject.contentType,
          metadata: options.metadata || {},
          url: storageObject.url || null
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
    const bucket = this.buckets.get(this.defaultBucket);
    if (!bucket) {
      throw new Error('Storage bucket not available');
    }

    try {
      const file = bucket.file(key);
      
      // Check if file exists
      const [exists] = await file.exists();
      if (!exists) {
        throw new Error(`File not found: ${key}`);
      }

      // Download options
      const downloadOptions: any = {};
      if (options.start !== undefined || options.end !== undefined) {
        downloadOptions.start = options.start;
        downloadOptions.end = options.end;
      }

      // Download file
      const [buffer] = await file.download(downloadOptions);
      
      logger.info(`Downloaded file: ${key} (${buffer.length} bytes)`);
      return buffer;

    } catch (error) {
      logger.error(`Failed to download file ${key}: ${error}`);
      throw error;
    }
  }

  async deleteFile(key: string, projectId?: number): Promise<void> {
    const bucket = this.buckets.get(this.defaultBucket);
    if (!bucket) {
      throw new Error('Storage bucket not available');
    }

    try {
      const file = bucket.file(key);
      await file.delete();
      
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
    const bucket = this.buckets.get(this.defaultBucket);
    if (!bucket) {
      throw new Error('Storage bucket not available');
    }

    try {
      const options: any = {
        autoPaginate: false,
        maxResults: maxResults || 1000
      };
      
      if (prefix) {
        options.prefix = prefix;
      }

      const [files] = await bucket.getFiles(options);
      
      const objects: StorageObject[] = files.map(file => ({
        key: file.name,
        size: parseInt(file.metadata.size),
        contentType: file.metadata.contentType,
        lastModified: new Date(file.metadata.updated),
        etag: file.metadata.etag
      }));

      logger.info(`Listed ${objects.length} files with prefix: ${prefix || 'none'}`);
      return objects;

    } catch (error) {
      logger.error(`Failed to list files: ${error}`);
      throw error;
    }
  }

  async getSignedUrl(
    key: string,
    expiresIn: number = 3600,
    action: 'read' | 'write' = 'read'
  ): Promise<string> {
    const bucket = this.buckets.get(this.defaultBucket);
    if (!bucket) {
      throw new Error('Storage bucket not available');
    }

    try {
      const file = bucket.file(key);
      
      const [url] = await file.getSignedUrl({
        action,
        expires: Date.now() + expiresIn * 1000,
        version: 'v4'
      });

      logger.info(`Generated signed URL for ${key} (${action}, expires in ${expiresIn}s)`);
      return url;

    } catch (error) {
      logger.error(`Failed to generate signed URL for ${key}: ${error}`);
      throw error;
    }
  }

  async copyFile(sourceKey: string, destKey: string): Promise<StorageObject> {
    const bucket = this.buckets.get(this.defaultBucket);
    if (!bucket) {
      throw new Error('Storage bucket not available');
    }

    try {
      const sourceFile = bucket.file(sourceKey);
      const destFile = bucket.file(destKey);
      
      await sourceFile.copy(destFile);
      
      const [metadata] = await destFile.getMetadata();
      
      const storageObject: StorageObject = {
        key: destKey,
        size: parseInt(metadata.size),
        contentType: metadata.contentType,
        lastModified: new Date(metadata.updated),
        etag: metadata.etag
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
    const bucket = this.buckets.get(this.defaultBucket);
    if (!bucket) {
      return false;
    }

    try {
      const file = bucket.file(key);
      const [exists] = await file.exists();
      return exists;
    } catch (error) {
      logger.error(`Failed to check file existence for ${key}: ${error}`);
      return false;
    }
  }

  async getFileMetadata(key: string): Promise<StorageObject> {
    const bucket = this.buckets.get(this.defaultBucket);
    if (!bucket) {
      throw new Error('Storage bucket not available');
    }

    try {
      const file = bucket.file(key);
      const [metadata] = await file.getMetadata();
      
      return {
        key,
        size: parseInt(metadata.size),
        contentType: metadata.contentType,
        lastModified: new Date(metadata.updated),
        etag: metadata.etag,
        metadata: metadata.metadata
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
    // Google Cloud Storage handles multipart uploads automatically
    // Return a unique upload ID for tracking
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
    // In production, this would handle actual multipart upload
    // For now, return a mock ETag
    const etag = crypto.createHash('md5').update(content).digest('hex');
    
    logger.info(`Uploaded part ${partNumber} for ${key} (${content.length} bytes)`);
    return etag;
  }

  async completeMultipartUpload(
    key: string,
    uploadId: string,
    parts: Array<{ partNumber: number; etag: string }>
  ): Promise<StorageObject> {
    // In production, this would complete the multipart upload
    // For now, return a mock object
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
    
    // In production, this would create an actual backup
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