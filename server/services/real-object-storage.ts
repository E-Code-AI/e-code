import { Storage, Bucket, File } from '@google-cloud/storage';
import crypto from 'crypto';
import { db } from '../db';
import { projects, users } from '@shared/schema';
import { eq } from 'drizzle-orm';

const logger = {
  info: (message: string, ...args: any[]) => console.log(`[real-object-storage] INFO: ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[real-object-storage] ERROR: ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[real-object-storage] WARN: ${message}`, ...args),
};

interface StorageObject {
  id: string;
  bucketName: string;
  objectName: string;
  size: number;
  contentType: string;
  metadata: Record<string, string>;
  acl: AccessControlList;
  createdAt: Date;
  updatedAt: Date;
  etag: string;
  cacheControl?: string;
  contentEncoding?: string;
  contentDisposition?: string;
}

interface AccessControlList {
  owner: string;
  rules: AccessRule[];
}

interface AccessRule {
  entity: string; // user:email, group:groupname, allUsers, allAuthenticatedUsers
  role: 'READER' | 'WRITER' | 'OWNER';
}

interface StorageQuota {
  used: number;
  limit: number;
  objectCount: number;
  bandwidthUsed: number;
  bandwidthLimit: number;
}

export class RealObjectStorageService {
  private storage: Storage;
  private buckets = new Map<string, Bucket>();
  private quotas = new Map<string, StorageQuota>();
  private cdnEndpoints = new Map<string, string>();
  
  constructor() {
    // In production, use proper GCS credentials
    // For now, we'll simulate with local storage
    this.storage = new Storage({
      projectId: process.env.GCP_PROJECT_ID || 'e-code-platform',
      keyFilename: process.env.GCS_KEY_FILE,
    });
    
    logger.info('Real Object Storage Service initialized with Google Cloud Storage');
    this.initializeDefaultBuckets();
  }

  private async initializeDefaultBuckets() {
    try {
      // Create default buckets if they don't exist
      const defaultBuckets = [
        'e-code-user-uploads',
        'e-code-project-assets',
        'e-code-shared-storage',
      ];

      for (const bucketName of defaultBuckets) {
        try {
          const [bucket] = await this.storage.bucket(bucketName).get();
          this.buckets.set(bucketName, bucket);
        } catch (error: any) {
          if (error.code === 404) {
            // Create bucket if it doesn't exist
            const [bucket] = await this.storage.createBucket(bucketName, {
              location: 'US',
              storageClass: 'STANDARD',
              versioning: { enabled: true },
            });
            this.buckets.set(bucketName, bucket);
            logger.info(`Created bucket: ${bucketName}`);
          } else {
            logger.error(`Error checking bucket ${bucketName}:`, error);
          }
        }
      }
    } catch (error) {
      logger.error('Failed to initialize default buckets:', error);
    }
  }

  async createBucket(userId: number, projectId: number, bucketName: string, options?: {
    location?: string;
    storageClass?: 'STANDARD' | 'NEARLINE' | 'COLDLINE' | 'ARCHIVE';
    versioning?: boolean;
    lifecycle?: any;
  }): Promise<string> {
    try {
      // Generate unique bucket name
      const uniqueBucketName = `e-code-${projectId}-${bucketName}-${Date.now()}`.toLowerCase();
      
      const [bucket] = await this.storage.createBucket(uniqueBucketName, {
        location: options?.location || 'US',
        storageClass: options?.storageClass || 'STANDARD',
        versioning: { enabled: options?.versioning !== false },
        lifecycle: options?.lifecycle,
        labels: {
          'user-id': userId.toString(),
          'project-id': projectId.toString(),
          'created-by': 'e-code-platform',
        },
      });

      this.buckets.set(uniqueBucketName, bucket);
      
      // Set up CORS for web access
      await bucket.setCorsConfiguration([{
        origin: ['*'],
        method: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE'],
        responseHeader: ['*'],
        maxAgeSeconds: 3600,
      }]);

      // Initialize quota for the bucket
      this.quotas.set(uniqueBucketName, {
        used: 0,
        limit: 10 * 1024 * 1024 * 1024, // 10GB default
        objectCount: 0,
        bandwidthUsed: 0,
        bandwidthLimit: 100 * 1024 * 1024 * 1024, // 100GB/month
      });

      logger.info(`Created bucket: ${uniqueBucketName} for project ${projectId}`);
      return uniqueBucketName;
    } catch (error) {
      logger.error('Failed to create bucket:', error);
      throw new Error('Failed to create storage bucket');
    }
  }

  async uploadObject(bucketName: string, objectName: string, data: Buffer | string, options?: {
    contentType?: string;
    metadata?: Record<string, string>;
    acl?: AccessRule[];
    cacheControl?: string;
    resumable?: boolean;
  }): Promise<StorageObject> {
    try {
      const bucket = this.buckets.get(bucketName) || this.storage.bucket(bucketName);
      const file = bucket.file(objectName);
      
      // Check quota before upload
      const quota = this.quotas.get(bucketName);
      if (quota) {
        const dataSize = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data);
        if (quota.used + dataSize > quota.limit) {
          throw new Error('Storage quota exceeded');
        }
      }

      // Upload the file
      await file.save(data, {
        metadata: {
          contentType: options?.contentType || 'application/octet-stream',
          metadata: options?.metadata || {},
          cacheControl: options?.cacheControl || 'public, max-age=3600',
        },
        resumable: options?.resumable,
      });

      // Set ACL if provided
      if (options?.acl) {
        for (const rule of options.acl) {
          await file.acl.add({
            entity: rule.entity,
            role: rule.role,
          });
        }
      } else {
        // Default: make publicly readable
        await file.makePublic();
      }

      // Get file metadata
      const [metadata] = await file.getMetadata();
      
      // Update quota
      if (quota) {
        quota.used += parseInt(metadata.size);
        quota.objectCount++;
      }

      const storageObject: StorageObject = {
        id: metadata.id || `${bucketName}/${objectName}`,
        bucketName,
        objectName,
        size: parseInt(metadata.size || '0'),
        contentType: metadata.contentType || 'application/octet-stream',
        metadata: Object.entries(metadata.metadata || {}).reduce((acc, [key, value]) => {
          acc[key] = String(value);
          return acc;
        }, {} as Record<string, string>),
        acl: {
          owner: metadata.owner?.entity || 'unknown',
          rules: options?.acl || [{ entity: 'allUsers', role: 'READER' }],
        },
        createdAt: new Date(metadata.timeCreated || Date.now()),
        updatedAt: new Date(metadata.updated || Date.now()),
        etag: metadata.etag || '',
        cacheControl: metadata.cacheControl,
        contentEncoding: metadata.contentEncoding,
        contentDisposition: metadata.contentDisposition,
      };

      logger.info(`Uploaded object: ${objectName} to bucket ${bucketName}`);
      return storageObject;
    } catch (error) {
      logger.error('Failed to upload object:', error);
      throw error;
    }
  }

  async getObject(bucketName: string, objectName: string): Promise<Buffer> {
    try {
      const bucket = this.buckets.get(bucketName) || this.storage.bucket(bucketName);
      const file = bucket.file(objectName);
      
      const [exists] = await file.exists();
      if (!exists) {
        throw new Error('Object not found');
      }

      const [data] = await file.download();
      
      // Track bandwidth usage
      const quota = this.quotas.get(bucketName);
      if (quota) {
        quota.bandwidthUsed += data.length;
      }

      return data;
    } catch (error) {
      logger.error('Failed to get object:', error);
      throw error;
    }
  }

  async deleteObject(bucketName: string, objectName: string): Promise<void> {
    try {
      const bucket = this.buckets.get(bucketName) || this.storage.bucket(bucketName);
      const file = bucket.file(objectName);
      
      // Get file size before deletion
      const [metadata] = await file.getMetadata();
      const fileSize = parseInt(metadata.size || '0');
      
      await file.delete();
      
      // Update quota
      const quota = this.quotas.get(bucketName);
      if (quota) {
        quota.used -= fileSize;
        quota.objectCount--;
      }

      logger.info(`Deleted object: ${objectName} from bucket ${bucketName}`);
    } catch (error) {
      logger.error('Failed to delete object:', error);
      throw error;
    }
  }

  async listObjects(bucketName: string, options?: {
    prefix?: string;
    delimiter?: string;
    maxResults?: number;
    pageToken?: string;
  }): Promise<{ objects: StorageObject[]; nextPageToken?: string }> {
    try {
      const bucket = this.buckets.get(bucketName) || this.storage.bucket(bucketName);
      
      const [files, nextQuery] = await bucket.getFiles({
        prefix: options?.prefix,
        delimiter: options?.delimiter,
        maxResults: options?.maxResults || 1000,
        pageToken: options?.pageToken,
      });

      const objects: StorageObject[] = await Promise.all(
        files.map(async (file) => {
          const [metadata] = await file.getMetadata();
          return {
            id: metadata.id || file.name,
            bucketName,
            objectName: file.name,
            size: parseInt(metadata.size || '0'),
            contentType: metadata.contentType || 'application/octet-stream',
            metadata: Object.entries(metadata.metadata || {}).reduce((acc, [key, value]) => {
              acc[key] = String(value);
              return acc;
            }, {} as Record<string, string>),
            acl: {
              owner: metadata.owner?.entity || 'unknown',
              rules: [],
            },
            createdAt: new Date(metadata.timeCreated || Date.now()),
            updatedAt: new Date(metadata.updated || Date.now()),
            etag: metadata.etag || '',
            cacheControl: metadata.cacheControl,
            contentEncoding: metadata.contentEncoding,
            contentDisposition: metadata.contentDisposition,
          };
        })
      );

      return {
        objects,
        nextPageToken: nextQuery?.pageToken,
      };
    } catch (error) {
      logger.error('Failed to list objects:', error);
      throw error;
    }
  }

  async getSignedUrl(bucketName: string, objectName: string, options: {
    action: 'read' | 'write' | 'delete';
    expires: number; // minutes
    contentType?: string;
  }): Promise<string> {
    try {
      const bucket = this.buckets.get(bucketName) || this.storage.bucket(bucketName);
      const file = bucket.file(objectName);
      
      const [url] = await file.getSignedUrl({
        action: options.action,
        expires: Date.now() + options.expires * 60 * 1000,
        contentType: options.contentType,
      });

      return url;
    } catch (error) {
      logger.error('Failed to generate signed URL:', error);
      throw error;
    }
  }

  async copyObject(
    sourceBucket: string,
    sourceObject: string,
    destBucket: string,
    destObject: string
  ): Promise<StorageObject> {
    try {
      const srcBucket = this.buckets.get(sourceBucket) || this.storage.bucket(sourceBucket);
      const dstBucket = this.buckets.get(destBucket) || this.storage.bucket(destBucket);
      
      const srcFile = srcBucket.file(sourceObject);
      const dstFile = dstBucket.file(destObject);
      
      await srcFile.copy(dstFile);
      
      const [metadata] = await dstFile.getMetadata();
      
      // Update quota for destination bucket
      const quota = this.quotas.get(destBucket);
      if (quota) {
        quota.used += parseInt(metadata.size);
        quota.objectCount++;
      }

      logger.info(`Copied object from ${sourceBucket}/${sourceObject} to ${destBucket}/${destObject}`);
      
      return {
        id: metadata.id || `${destBucket}/${destObject}`,
        bucketName: destBucket,
        objectName: destObject,
        size: parseInt(metadata.size || '0'),
        contentType: metadata.contentType || 'application/octet-stream',
        metadata: Object.entries(metadata.metadata || {}).reduce((acc, [key, value]) => {
          acc[key] = String(value);
          return acc;
        }, {} as Record<string, string>),
        acl: {
          owner: metadata.owner?.entity || 'unknown',
          rules: [],
        },
        createdAt: new Date(metadata.timeCreated || Date.now()),
        updatedAt: new Date(metadata.updated || Date.now()),
        etag: metadata.etag || '',
      };
    } catch (error) {
      logger.error('Failed to copy object:', error);
      throw error;
    }
  }

  async getBucketQuota(bucketName: string): Promise<StorageQuota> {
    const quota = this.quotas.get(bucketName);
    if (!quota) {
      // Calculate actual usage if quota not tracked
      const bucket = this.buckets.get(bucketName) || this.storage.bucket(bucketName);
      const [files] = await bucket.getFiles();
      
      let totalSize = 0;
      for (const file of files) {
        const [metadata] = await file.getMetadata();
        totalSize += parseInt(metadata.size);
      }

      return {
        used: totalSize,
        limit: 10 * 1024 * 1024 * 1024, // 10GB default
        objectCount: files.length,
        bandwidthUsed: 0,
        bandwidthLimit: 100 * 1024 * 1024 * 1024, // 100GB/month
      };
    }
    
    return quota;
  }

  async updateBucketQuota(bucketName: string, newLimit: number): Promise<void> {
    const quota = this.quotas.get(bucketName);
    if (quota) {
      quota.limit = newLimit;
    } else {
      this.quotas.set(bucketName, {
        used: 0,
        limit: newLimit,
        objectCount: 0,
        bandwidthUsed: 0,
        bandwidthLimit: 100 * 1024 * 1024 * 1024,
      });
    }
    
    logger.info(`Updated quota for bucket ${bucketName} to ${newLimit} bytes`);
  }

  // CDN integration
  async enableCDN(bucketName: string, cdnConfig?: {
    customDomain?: string;
    ssl?: boolean;
    cacheRules?: any[];
  }): Promise<string> {
    try {
      // In production, integrate with a real CDN (CloudFront, Cloudflare, etc.)
      const cdnEndpoint = cdnConfig?.customDomain || 
        `https://cdn.e-code.app/${bucketName}`;
      
      this.cdnEndpoints.set(bucketName, cdnEndpoint);
      
      // Configure bucket for CDN
      const bucket = this.buckets.get(bucketName) || this.storage.bucket(bucketName);
      await bucket.setMetadata({
        website: {
          mainPageSuffix: 'index.html',
          notFoundPage: '404.html',
        },
      });

      logger.info(`Enabled CDN for bucket ${bucketName} at ${cdnEndpoint}`);
      return cdnEndpoint;
    } catch (error) {
      logger.error('Failed to enable CDN:', error);
      throw error;
    }
  }

  async getCDNUrl(bucketName: string, objectName: string): Promise<string> {
    const cdnEndpoint = this.cdnEndpoints.get(bucketName);
    if (cdnEndpoint) {
      return `${cdnEndpoint}/${objectName}`;
    }
    
    // Fallback to direct GCS URL
    return `https://storage.googleapis.com/${bucketName}/${objectName}`;
  }

  // Batch operations
  async uploadMultiple(bucketName: string, files: Array<{
    name: string;
    data: Buffer | string;
    contentType?: string;
    metadata?: Record<string, string>;
  }>): Promise<StorageObject[]> {
    const results: StorageObject[] = [];
    
    for (const file of files) {
      try {
        const result = await this.uploadObject(bucketName, file.name, file.data, {
          contentType: file.contentType,
          metadata: file.metadata,
        });
        results.push(result);
      } catch (error) {
        logger.error(`Failed to upload ${file.name}:`, error);
        // Continue with other files
      }
    }
    
    return results;
  }

  async deleteMultiple(bucketName: string, objectNames: string[]): Promise<void> {
    for (const objectName of objectNames) {
      try {
        await this.deleteObject(bucketName, objectName);
      } catch (error) {
        logger.error(`Failed to delete ${objectName}:`, error);
        // Continue with other deletions
      }
    }
  }
}

// Export singleton instance
export const realObjectStorageService = new RealObjectStorageService();