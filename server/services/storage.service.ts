import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs/promises';
import { createReadStream } from 'fs';
import { Readable } from 'stream';
import { createLogger } from '../utils/logger';
import type { S3Client as S3ClientType } from '@aws-sdk/client-s3';

const logger = createLogger('storage-service');

export type StorageBackend = 'replit' | 's3' | 'local';

export interface StorageObject {
  key: string;
  size: number;
  contentType: string;
  lastModified: Date;
  etag: string;
  url?: string;
  metadata?: Record<string, string>;
  /** Populated by listFiles() from durable backend state — not from in-memory registry. */
  isPublic?: boolean;
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

export interface StorageServiceConfig {
  backend: StorageBackend;
  replitBucket?: string;
  replitSidecarEndpoint?: string;
  s3Region?: string;
  s3Bucket?: string;
  s3Endpoint?: string;
  s3AccessKeyId?: string;
  s3SecretAccessKey?: string;
  s3ForcePathStyle?: boolean;
  localPath?: string;
}

function resolveConfig(): StorageServiceConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  const replitBucket = process.env.PRIVATE_OBJECT_DIR?.split('/')[1] ||
                       process.env.REPLIT_OBJECT_STORAGE_BUCKET ||
                       process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID || '';
  const isReplit = !!(
    process.env.REPL_ID ||
    process.env.REPL_SLUG ||
    process.env.REPLIT_DEPLOYMENT ||
    process.env.REPLIT
  );
  const hasReplit = !!replitBucket && isReplit;
  const hasS3 = !!process.env.S3_BUCKET && !!process.env.S3_ACCESS_KEY_ID;

  let backend: StorageBackend;
  const envBackend = process.env.STORAGE_BACKEND?.toLowerCase();
  if (envBackend === 'replit' || envBackend === 's3' || envBackend === 'local') {
    if (isProduction && envBackend === 'local') {
      throw new Error(
        'STORAGE_BACKEND=local is not supported in production. ' +
        'Use "replit" or "s3" with the required credentials.'
      );
    }
    backend = envBackend;
  } else if (hasReplit && isProduction) {
    backend = 'replit';
  } else if (hasS3) {
    backend = 's3';
  } else {
    if (isProduction) {
      throw new Error(
        'Object storage is not configured. In production, set STORAGE_BACKEND to "replit" or "s3" ' +
        'with the required credentials (REPLIT_OBJECT_STORAGE_BUCKET or S3_BUCKET/S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY). ' +
        'Local filesystem storage is not supported in production.'
      );
    }
    backend = 'local';
  }

  if (isProduction && backend === 's3') {
    if (!process.env.S3_BUCKET || !process.env.S3_ACCESS_KEY_ID || !process.env.S3_SECRET_ACCESS_KEY) {
      throw new Error(
        'S3 storage backend selected but required credentials are missing. ' +
        'Set S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY environment variables.'
      );
    }
  }

  if (isProduction && backend === 'replit' && !replitBucket) {
    throw new Error(
      'Replit storage backend selected but REPLIT_OBJECT_STORAGE_BUCKET (or PRIVATE_OBJECT_DIR) is not set.'
    );
  }

  return {
    backend,
    replitBucket,
    replitSidecarEndpoint: process.env.REPLIT_SIDECAR_ENDPOINT || 'http://127.0.0.1:1106',
    s3Region: process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1',
    s3Bucket: process.env.S3_BUCKET || process.env.AWS_S3_BUCKET || '',
    s3Endpoint: process.env.S3_ENDPOINT || process.env.AWS_S3_ENDPOINT,
    s3AccessKeyId: process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
    s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY,
    s3ForcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    localPath: process.env.STORAGE_PATH || path.join(process.cwd(), 'storage'),
  };
}

export class StorageService {
  private config: StorageServiceConfig;
  private s3Client: S3ClientType | null = null;
  private initPromise: Promise<void>;

  constructor(config?: StorageServiceConfig) {
    this.config = config || resolveConfig();
    this.initPromise = this.initialize();
  }

  get activeBackend(): StorageBackend {
    return this.config.backend;
  }

  private async ensureInitialized(): Promise<void> {
    await this.initPromise;
  }

  private async initialize(): Promise<void> {
    logger.info(`StorageService initializing with backend: ${this.config.backend}`);

    switch (this.config.backend) {
      case 'replit':
        logger.info('Using Replit Object Storage (GCS sidecar)');
        break;
      case 's3':
        await this.initS3();
        break;
      case 'local':
        logger.info('Using local filesystem storage (development mode)');
        await fs.mkdir(this.config.localPath!, { recursive: true }).catch(() => {});
        break;
    }
  }

  private async initS3(): Promise<void> {
    try {
      const { S3Client } = await import('@aws-sdk/client-s3');
      const s3Config: ConstructorParameters<typeof S3Client>[0] = {
        region: this.config.s3Region,
        credentials: {
          accessKeyId: this.config.s3AccessKeyId!,
          secretAccessKey: this.config.s3SecretAccessKey!,
        },
      };
      if (this.config.s3Endpoint) {
        s3Config.endpoint = this.config.s3Endpoint;
      }
      if (this.config.s3ForcePathStyle) {
        s3Config.forcePathStyle = true;
      }
      this.s3Client = new S3Client(s3Config);
      logger.info(`Using S3 storage: bucket=${this.config.s3Bucket}, region=${this.config.s3Region}`);
    } catch (error) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Failed to initialize S3 client in production: ${error}`);
      }
      logger.error(`Failed to initialize S3 client: ${error}. Falling back to local.`);
      this.config.backend = 'local';
      await fs.mkdir(this.config.localPath!, { recursive: true }).catch(() => {});
    }
  }

  private async getGcsStorage() {
    const { Storage } = await import('@google-cloud/storage');
    return new Storage({
      // External-account credentials shape lives in google-auth-library; the
      // GCS Storage typings don't re-export it, so we cast through `any`.
      credentials: {
        audience: 'replit',
        subject_token_type: 'access_token',
        token_url: `${this.config.replitSidecarEndpoint}/token`,
        type: 'external_account',
        credential_source: {
          url: `${this.config.replitSidecarEndpoint}/credential`,
          format: { type: 'json', subject_token_field_name: 'access_token' },
        },
        universe_domain: 'googleapis.com',
      } as any,
      projectId: '',
    });
  }

  private sanitizeKey(key: string): string {
    const normalized = path.posix.normalize(key).replace(/^\.\.\/|\/\.\.\//g, '');
    const cleaned = normalized.replace(/\.\.\//g, '').replace(/^\/+/, '');
    if (cleaned.includes('..')) {
      throw new Error(`Invalid storage key: path traversal detected in "${key}"`);
    }
    return cleaned;
  }

  private getLocalPath(key: string): string {
    const safePath = path.resolve(this.config.localPath!, key);
    const rootPath = path.resolve(this.config.localPath!);
    if (!safePath.startsWith(rootPath + path.sep) && safePath !== rootPath) {
      throw new Error(`Invalid storage key: path escapes storage root`);
    }
    return safePath;
  }

  private async ensureDir(filePath: string) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
  }

  private async toBuffer(content: Buffer | Readable | string): Promise<Buffer> {
    if (Buffer.isBuffer(content)) return content;
    if (typeof content === 'string') return Buffer.from(content);
    const chunks: Buffer[] = [];
    for await (const chunk of content) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async uploadFile(
    key: string,
    content: Buffer | Readable | string,
    options: UploadOptions = {}
  ): Promise<StorageObject> {
    await this.ensureInitialized();
    key = this.sanitizeKey(key);
    // Overwriting an existing key reverts it to private — clear any prior public state.
    // Callers must re-invoke setObjectVisibility() if they want the new content public.
    this.publicKeys.delete(key);
    const buffer = await this.toBuffer(content);
    logger.info(`Uploading: ${key} (${buffer.length} bytes) via ${this.config.backend}`);

    switch (this.config.backend) {
      case 'replit':
        return this.uploadReplit(key, buffer, options);
      case 's3':
        return this.uploadS3(key, buffer, options);
      default:
        return this.uploadLocal(key, buffer, options);
    }
  }

  private async uploadReplit(key: string, buffer: Buffer, options: UploadOptions): Promise<StorageObject> {
    try {
      const storage = await this.getGcsStorage();
      const bucket = storage.bucket(this.config.replitBucket!);
      const file = bucket.file(key);
      await file.save(buffer, {
        contentType: options.contentType || 'application/octet-stream',
        metadata: options.metadata,
      });
      const etag = crypto.createHash('md5').update(buffer).digest('hex');
      return {
        key,
        size: buffer.length,
        contentType: options.contentType || 'application/octet-stream',
        lastModified: new Date(),
        etag,
        url: options.public ? `/storage/${key}` : undefined,
        metadata: options.metadata,
      };
    } catch (error) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Replit Object Storage upload failed for ${key}: ${error}`);
      }
      logger.error(`Replit upload failed for ${key}, falling back to local: ${error}`);
      return this.uploadLocal(key, buffer, options);
    }
  }

  private async uploadS3(key: string, buffer: Buffer, options: UploadOptions): Promise<StorageObject> {
    try {
      const { PutObjectCommand } = await import('@aws-sdk/client-s3');
      const contentType = options.contentType || 'application/octet-stream';
      await this.s3Client!.send(new PutObjectCommand({
        Bucket: this.config.s3Bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        Metadata: options.metadata,
      }));
      const etag = crypto.createHash('md5').update(buffer).digest('hex');
      return {
        key,
        size: buffer.length,
        contentType,
        lastModified: new Date(),
        etag,
        url: options.public ? `/storage/${key}` : undefined,
        metadata: options.metadata,
      };
    } catch (error) {
      logger.error(`S3 upload failed for ${key}: ${error}`);
      throw error;
    }
  }

  private async uploadLocal(key: string, buffer: Buffer, options: UploadOptions): Promise<StorageObject> {
    const filePath = this.getLocalPath(key);
    await this.ensureDir(filePath);
    await fs.writeFile(filePath, buffer);
    const stats = await fs.stat(filePath);
    const etag = crypto.createHash('md5').update(buffer).digest('hex');
    return {
      key,
      size: stats.size,
      contentType: options.contentType || 'application/octet-stream',
      lastModified: stats.mtime,
      etag,
      url: options.public ? `/storage/${key}` : undefined,
      metadata: options.metadata,
    };
  }

  async downloadFile(key: string, options: DownloadOptions = {}): Promise<Buffer> {
    await this.ensureInitialized();
    key = this.sanitizeKey(key);
    logger.info(`Downloading: ${key} via ${this.config.backend}`);

    switch (this.config.backend) {
      case 'replit':
        return this.downloadReplit(key, options);
      case 's3':
        return this.downloadS3(key, options);
      default:
        return this.downloadLocal(key, options);
    }
  }

  private async downloadReplit(key: string, options: DownloadOptions): Promise<Buffer> {
    try {
      const storage = await this.getGcsStorage();
      const bucket = storage.bucket(this.config.replitBucket!);
      const file = bucket.file(key);
      const [buffer] = await file.download();
      return this.applyRange(buffer, options);
    } catch (error) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Replit Object Storage download failed for ${key}: ${error}`);
      }
      logger.error(`Replit download failed for ${key}, trying local: ${error}`);
      return this.downloadLocal(key, options);
    }
  }

  private async downloadS3(key: string, options: DownloadOptions): Promise<Buffer> {
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const rangeHeader = (options.start !== undefined || options.end !== undefined)
      ? `bytes=${options.start ?? 0}-${options.end ?? ''}`
      : undefined;
    const resp = await this.s3Client!.send(new GetObjectCommand({
      Bucket: this.config.s3Bucket,
      Key: key,
      Range: rangeHeader,
    }));
    if (!resp.Body) throw new Error(`S3 download returned empty body for key: ${key}`);
    const stream = resp.Body as AsyncIterable<Uint8Array>;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  private async downloadLocal(key: string, options: DownloadOptions): Promise<Buffer> {
    const filePath = this.getLocalPath(key);
    try { await fs.access(filePath); } catch { throw new Error(`File not found: ${key}`); }
    const buffer = await fs.readFile(filePath);
    return this.applyRange(buffer, options);
  }

  private applyRange(buffer: Buffer, options: DownloadOptions): Buffer {
    if (options.start !== undefined || options.end !== undefined) {
      return buffer.subarray(options.start || 0, options.end || buffer.length);
    }
    return buffer;
  }

  async deleteFile(key: string): Promise<void> {
    await this.ensureInitialized();
    key = this.sanitizeKey(key);
    logger.info(`Deleting: ${key} via ${this.config.backend}`);

    switch (this.config.backend) {
      case 'replit':
        await this.deleteReplit(key);
        break;
      case 's3':
        await this.deleteS3(key);
        break;
      default:
        await this.deleteLocal(key);
    }
    // Always clear from the visibility registry — deleted objects are never public
    this.publicKeys.delete(key);
  }

  private async deleteReplit(key: string): Promise<void> {
    try {
      const storage = await this.getGcsStorage();
      const bucket = storage.bucket(this.config.replitBucket!);
      await bucket.file(key).delete();
    } catch (error) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Replit Object Storage delete failed for ${key}: ${error}`);
      }
      logger.error(`Replit delete failed for ${key}, trying local: ${error}`);
      await this.deleteLocal(key);
    }
  }

  private async deleteS3(key: string): Promise<void> {
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    await this.s3Client!.send(new DeleteObjectCommand({
      Bucket: this.config.s3Bucket,
      Key: key,
    }));
  }

  private async deleteLocal(key: string): Promise<void> {
    const filePath = this.getLocalPath(key);
    await fs.unlink(filePath);
  }

  async listFiles(prefix?: string, maxResults?: number): Promise<StorageObject[]> {
    await this.ensureInitialized();
    if (prefix) prefix = this.sanitizeKey(prefix);
    switch (this.config.backend) {
      case 'replit':
        return this.listReplit(prefix, maxResults);
      case 's3':
        return this.listS3(prefix, maxResults);
      default:
        return this.listLocal(prefix, maxResults);
    }
  }

  /** Returns `projects/{id}/storage` prefix extracted from any key under it. */
  private static projectPrefixFromKey(key: string): string {
    const m = key.match(/^(projects\/\d+\/storage)/);
    return m ? m[1] : key.split('/').slice(0, 3).join('/');
  }

  /** S3 sidecar key that stores the visibility index for a project prefix. */
  private s3VisibilityIndexKey(prefix: string): string {
    return `${prefix}/.replit-visibility-index`;
  }

  /**
   * Load visibility index for S3 from the sidecar object.
   * Returns a Set of keys that are currently public.
   * Non-existent sidecar → empty set (all private).
   */
  private async loadS3VisibilityIndex(prefix: string): Promise<Set<string>> {
    try {
      const { GetObjectCommand } = await import('@aws-sdk/client-s3');
      const resp = await this.s3Client!.send(new GetObjectCommand({
        Bucket: this.config.s3Bucket,
        Key: this.s3VisibilityIndexKey(prefix),
      }));
      const body = resp.Body as NodeJS.ReadableStream;
      const chunks: Buffer[] = [];
      for await (const chunk of body) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const data = JSON.parse(Buffer.concat(chunks).toString('utf-8')) as string[];
      return new Set(Array.isArray(data) ? data : []);
    } catch {
      return new Set();
    }
  }

  /**
   * Persist the visibility index for S3 as a small JSON sidecar object.
   */
  private async saveS3VisibilityIndex(prefix: string, publicSet: Set<string>): Promise<void> {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    const body = Buffer.from(JSON.stringify(Array.from(publicSet)), 'utf-8');
    await this.s3Client!.send(new PutObjectCommand({
      Bucket: this.config.s3Bucket,
      Key: this.s3VisibilityIndexKey(prefix),
      Body: body,
      ContentType: 'application/json',
    }));
  }

  private async listReplit(prefix?: string, maxResults?: number): Promise<StorageObject[]> {
    try {
      const storage = await this.getGcsStorage();
      const bucket = storage.bucket(this.config.replitBucket!);
      const [files] = await bucket.getFiles({ prefix, maxResults });
      const results: StorageObject[] = [];
      for (const file of files) {
        const [metadata] = await file.getMetadata();
        // Read durable visibility from GCS custom object metadata.
        // This survives process restarts and works across instances.
        const isPublic = (metadata.metadata as Record<string, string> | undefined)?.['replit-visibility'] === 'public';
        results.push({
          key: file.name,
          size: parseInt(metadata.size as string) || 0,
          contentType: metadata.contentType || 'application/octet-stream',
          lastModified: new Date(metadata.updated || Date.now()),
          etag: metadata.etag || '',
          isPublic,
        });
      }
      return results;
    } catch (error) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Replit Object Storage list failed: ${error}`);
      }
      logger.error(`Replit list failed, trying local: ${error}`);
      return this.listLocal(prefix, maxResults);
    }
  }

  private async listS3(prefix?: string, maxResults?: number): Promise<StorageObject[]> {
    const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
    const resp = await this.s3Client!.send(new ListObjectsV2Command({
      Bucket: this.config.s3Bucket,
      Prefix: prefix,
      MaxKeys: maxResults,
    }));
    const allObjects = resp.Contents ?? [];
    // Derive project prefix to load visibility sidecar (one extra API call per list).
    const projectPrefix = prefix ? StorageService.projectPrefixFromKey(prefix + '/dummy') : '';
    const publicSet = projectPrefix ? await this.loadS3VisibilityIndex(projectPrefix) : new Set<string>();
    const sidecarKey = projectPrefix ? this.s3VisibilityIndexKey(projectPrefix) : '';
    return allObjects
      .filter(obj => obj.Key !== sidecarKey)   // hide the sidecar from file listings
      .map((obj) => ({
        key: obj.Key ?? '',
        size: obj.Size ?? 0,
        contentType: 'application/octet-stream',
        lastModified: obj.LastModified ?? new Date(),
        etag: obj.ETag ?? '',
        isPublic: publicSet.has(obj.Key ?? ''),
      }));
  }

  private async listLocal(prefix?: string, maxResults?: number): Promise<StorageObject[]> {
    const searchPath = prefix ? this.getLocalPath(prefix) : this.config.localPath!;
    const files: StorageObject[] = [];

    const walk = async (dir: string) => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (maxResults && files.length >= maxResults) break;
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            await walk(fullPath);
          } else {
            const stats = await fs.stat(fullPath);
            const key = path.relative(this.config.localPath!, fullPath);
            files.push({
              key,
              size: stats.size,
              contentType: 'application/octet-stream',
              lastModified: stats.mtime,
              etag: '',
              isPublic: this.publicKeys.has(key),
            });
          }
        }
      } catch { }
    };

    await walk(searchPath);
    return files.slice(0, maxResults);
  }

  async getSignedUrl(key: string, ttlSeconds: number = 3600, action: 'read' | 'write' = 'read'): Promise<string> {
    await this.ensureInitialized();
    key = this.sanitizeKey(key);
    switch (this.config.backend) {
      case 'replit':
        return this.signedUrlReplit(key, ttlSeconds, action);
      case 's3':
        return this.signedUrlS3(key, ttlSeconds, action);
      default:
        return this.signedUrlLocal(key, ttlSeconds);
    }
  }

  private async signedUrlReplit(key: string, ttlSeconds: number, action: 'read' | 'write'): Promise<string> {
    try {
      const method = action === 'write' ? 'PUT' : 'GET';
      const response = await fetch(
        `${this.config.replitSidecarEndpoint}/object-storage/signed-object-url`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bucket_name: this.config.replitBucket,
            object_name: key,
            method,
            expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
          }),
        }
      );
      if (!response.ok) throw new Error(`Sidecar returned ${response.status}`);
      const { signed_url } = await response.json() as { signed_url: string };
      return signed_url;
    } catch (error) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Replit signed URL generation failed for ${key}: ${error}`);
      }
      logger.error(`Replit signed URL failed for ${key}: ${error}`);
      return this.signedUrlLocal(key, ttlSeconds);
    }
  }

  private async signedUrlS3(key: string, ttlSeconds: number, action: 'read' | 'write'): Promise<string> {
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    const command = action === 'write'
      ? new (await import('@aws-sdk/client-s3')).PutObjectCommand({ Bucket: this.config.s3Bucket, Key: key })
      : new (await import('@aws-sdk/client-s3')).GetObjectCommand({ Bucket: this.config.s3Bucket, Key: key });
    return getSignedUrl(this.s3Client!, command, { expiresIn: ttlSeconds });
  }

  private signedUrlLocal(key: string, ttlSeconds: number): string {
    return `/storage/${key}?expires=${Date.now() + ttlSeconds * 1000}`;
  }

  async fileExists(key: string): Promise<boolean> {
    await this.ensureInitialized();
    key = this.sanitizeKey(key);
    switch (this.config.backend) {
      case 'replit':
        try {
          const storage = await this.getGcsStorage();
          const [exists] = await storage.bucket(this.config.replitBucket!).file(key).exists();
          return exists;
        } catch (error) {
          if (process.env.NODE_ENV === 'production') {
            throw new Error(`Replit Object Storage fileExists failed for ${key}: ${error}`);
          }
          return this.localFileExists(key);
        }
      case 's3':
        try {
          const { HeadObjectCommand } = await import('@aws-sdk/client-s3');
          await this.s3Client!.send(new HeadObjectCommand({ Bucket: this.config.s3Bucket, Key: key }));
          return true;
        } catch {
          return false;
        }
      default:
        return this.localFileExists(key);
    }
  }

  private async localFileExists(key: string): Promise<boolean> {
    try {
      await fs.access(this.getLocalPath(key));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Set an object's public/private visibility. Writes state to both the backend
   * AND a durable secondary store so that `listFiles()` reflects the correct
   * `isPublic` value after process restarts and across instances:
   *
   * - GCS (replit): makePublic/makePrivate + custom object metadata tag
   *   `replit-visibility: public|private` readable via getMetadata() in list.
   * - S3: PutObjectAcl + update project-level sidecar JSON index for list queries.
   * - local: in-memory registry only (dev/test use-case; no restart concern).
   */
  async setObjectVisibility(key: string, isPublic: boolean): Promise<void> {
    await this.ensureInitialized();
    key = this.sanitizeKey(key);
    switch (this.config.backend) {
      case 'replit': {
        const storage = await this.getGcsStorage();
        const file = storage.bucket(this.config.replitBucket!).file(key);
        if (isPublic) {
          await file.makePublic();
        } else {
          await file.makePrivate();
        }
        // Also write custom metadata so listReplit() can read isPublic without
        // extra ACL API calls and correctly survives process restarts.
        await file.setMetadata({
          metadata: { 'replit-visibility': isPublic ? 'public' : 'private' },
        });
        break;
      }
      case 's3': {
        const { PutObjectAclCommand } = await import('@aws-sdk/client-s3');
        await this.s3Client!.send(new PutObjectAclCommand({
          Bucket: this.config.s3Bucket,
          Key: key,
          ACL: isPublic ? 'public-read' : 'private',
        }));
        // Update the sidecar index so listS3() reflects the new state durably.
        const prefix = StorageService.projectPrefixFromKey(key);
        if (prefix) {
          const publicSet = await this.loadS3VisibilityIndex(prefix);
          if (isPublic) {
            publicSet.add(key);
          } else {
            publicSet.delete(key);
          }
          await this.saveS3VisibilityIndex(prefix, publicSet);
        }
        break;
      }
      default:
        // local — in-memory registry is sufficient (dev/test only, single process)
        break;
    }
    // Keep the in-memory registry in sync for the local backend public route gate.
    if (isPublic) {
      this.publicKeys.add(key);
    } else {
      this.publicKeys.delete(key);
    }
  }

  /**
   * In-memory visibility registry for the LOCAL backend only.
   * GCS and S3 visibility is stored durably in object metadata / sidecar index;
   * this Set is only the authoritative gate for the local dev-mode public route.
   */
  private publicKeys: Set<string> = new Set();

  /** Returns true if the key has been explicitly marked public via setObjectVisibility(). */
  isPublic(key: string): boolean {
    return this.publicKeys.has(key);
  }

  /**
   * Read the durable visibility state of an object from the backend.
   * Unlike `isPublic()` (which reads only the in-memory registry), this method
   * queries the actual backend metadata so it survives process restarts and
   * works correctly in multi-instance deployments.
   *
   * - GCS: reads `replit-visibility` custom object metadata tag
   * - S3: reads the project sidecar visibility index
   * - local: falls back to in-memory `publicKeys` (dev/test only)
   */
  private async getObjectVisibility(key: string): Promise<boolean> {
    await this.ensureInitialized();
    key = this.sanitizeKey(key);
    try {
      switch (this.config.backend) {
        case 'replit': {
          const storage = await this.getGcsStorage();
          const file = storage.bucket(this.config.replitBucket!).file(key);
          const [metadata] = await file.getMetadata();
          const tag = (metadata.metadata as Record<string, string> | undefined)?.['replit-visibility'];
          if (tag !== undefined) {
            // Durable tag is present — it is authoritative
            return tag === 'public';
          }
          // Tag absent (legacy object or manual ACL change): probe whether the object
          // is publicly readable by checking the IAM / ACL. Fall through to in-memory
          // as a safe default so we never expose a private object incorrectly.
          return this.publicKeys.has(key);
        }
        case 's3': {
          const prefix = StorageService.projectPrefixFromKey(key);
          if (prefix) {
            const publicSet = await this.loadS3VisibilityIndex(prefix);
            return publicSet.has(key);
          }
          return false;
        }
        default:
          // local: in-memory registry is authoritative for dev/test
          return this.publicKeys.has(key);
      }
    } catch {
      // If metadata read fails, fall back to in-memory registry to avoid breaking the copy/move
      return this.publicKeys.has(key);
    }
  }

  async copyFile(sourceKey: string, destKey: string): Promise<StorageObject> {
    // Read durable visibility from backend — survives process restarts
    const srcPublic = await this.getObjectVisibility(sourceKey);
    const content = await this.downloadFile(sourceKey);
    const result = await this.uploadFile(destKey, content);
    // Propagate visibility: if source was public, make dest public too
    if (srcPublic) {
      await this.setObjectVisibility(destKey, true);
    }
    return result;
  }

  async moveFile(sourceKey: string, destKey: string): Promise<StorageObject> {
    // Read durable visibility from backend — survives process restarts
    const srcPublic = await this.getObjectVisibility(sourceKey);
    const content = await this.downloadFile(sourceKey);
    // uploadFile clears destKey from publicKeys; uploadFile clears sourceKey when overwriting
    const result = await this.uploadFile(destKey, content);
    await this.deleteFile(sourceKey);
    // Transfer visibility from source to dest
    if (srcPublic) {
      await this.setObjectVisibility(destKey, true);
    }
    return result;
  }

  /**
   * Recursively delete all objects under a virtual folder prefix.
   * Lists everything under `prefix/`, deletes each one in sequence.
   * Returns the count of successfully deleted objects.
   */
  async deleteFolder(prefix: string): Promise<{ deletedCount: number }> {
    await this.ensureInitialized();
    prefix = this.sanitizeKey(prefix);
    const files = await this.listFiles(prefix);
    let deletedCount = 0;
    for (const file of files) {
      try {
        await this.deleteFile(file.key);
        deletedCount++;
      } catch (err) {
        logger.warn(`deleteFolder: could not delete ${file.key}`, { error: err });
      }
    }
    return { deletedCount };
  }

  /**
   * Rename a virtual folder by moving every object under `oldPrefix/` to
   * `newPrefix/`, preserving relative paths and visibility state.
   * Returns the count of successfully moved objects.
   */
  async renameFolder(oldPrefix: string, newPrefix: string): Promise<{ movedCount: number }> {
    await this.ensureInitialized();
    oldPrefix = this.sanitizeKey(oldPrefix);
    newPrefix = this.sanitizeKey(newPrefix);
    const files = await this.listFiles(oldPrefix);
    let movedCount = 0;
    for (const file of files) {
      const relativePath = file.key.slice(oldPrefix.length + 1); // strip "prefix/"
      const destKey = `${newPrefix}/${relativePath}`;
      try {
        await this.moveFile(file.key, destKey);
        movedCount++;
      } catch (err) {
        logger.warn(`renameFolder: could not move ${file.key}`, { error: err });
      }
    }
    return { movedCount };
  }

  /**
   * Returns the byte size of an object without downloading its content.
   * GCS: file.getMetadata(); S3: HeadObjectCommand; local: fs.stat().
   */
  async getObjectSize(key: string): Promise<number> {
    await this.ensureInitialized();
    key = this.sanitizeKey(key);
    switch (this.config.backend) {
      case 'replit': {
        const storage = await this.getGcsStorage();
        const file = storage.bucket(this.config.replitBucket!).file(key);
        const [metadata] = await file.getMetadata();
        return parseInt(metadata.size as string) || 0;
      }
      case 's3': {
        const { HeadObjectCommand } = await import('@aws-sdk/client-s3');
        const head = await this.s3Client!.send(new HeadObjectCommand({
          Bucket: this.config.s3Bucket,
          Key: key,
        }));
        return head.ContentLength || 0;
      }
      default: {
        const filePath = this.getLocalPath(key);
        const stat = await fs.stat(filePath);
        return stat.size;
      }
    }
  }

  /**
   * Streaming download with optional byte range. Returns a Readable stream.
   * - GCS: file.createReadStream({ start, end })
   * - S3:  GetObjectCommand with Range header; pipes body stream
   * - local: fs.createReadStream with start/end
   */
  async downloadStream(
    key: string,
    options: DownloadOptions = {}
  ): Promise<{ stream: Readable; totalSize: number; contentType: string }> {
    await this.ensureInitialized();
    key = this.sanitizeKey(key);

    switch (this.config.backend) {
      case 'replit': {
        const storage = await this.getGcsStorage();
        const bucket = storage.bucket(this.config.replitBucket!);
        const file = bucket.file(key);
        const [metadata] = await file.getMetadata();
        const totalSize = parseInt(metadata.size as string) || 0;
        const contentType = (metadata.contentType as string) || 'application/octet-stream';
        const streamOptions: { start?: number; end?: number } = {};
        if (options.start !== undefined) streamOptions.start = options.start;
        if (options.end !== undefined) streamOptions.end = options.end;
        return { stream: file.createReadStream(streamOptions), totalSize, contentType };
      }
      case 's3': {
        const { GetObjectCommand, HeadObjectCommand } = await import('@aws-sdk/client-s3');
        const head = await this.s3Client!.send(new HeadObjectCommand({
          Bucket: this.config.s3Bucket,
          Key: key,
        }));
        const totalSize = head.ContentLength || 0;
        const contentType = head.ContentType || 'application/octet-stream';
        const rangeHeader = (options.start !== undefined || options.end !== undefined)
          ? `bytes=${options.start ?? 0}-${options.end ?? ''}`
          : undefined;
        const resp = await this.s3Client!.send(new GetObjectCommand({
          Bucket: this.config.s3Bucket,
          Key: key,
          Range: rangeHeader,
        }));
        if (!resp.Body) throw new Error(`S3 download returned empty body for key: ${key}`);
        return { stream: Readable.from(resp.Body as AsyncIterable<Uint8Array>), totalSize, contentType };
      }
      default: {
        const filePath = this.getLocalPath(key);
        try { await fs.access(filePath); } catch { throw new Error(`File not found: ${key}`); }
        const stat = await fs.stat(filePath);
        const totalSize = stat.size;
        const streamOptions: Parameters<typeof createReadStream>[1] = {};
        if (options.start !== undefined) streamOptions.start = options.start;
        if (options.end !== undefined) streamOptions.end = options.end;
        return {
          stream: createReadStream(filePath, streamOptions),
          totalSize,
          contentType: 'application/octet-stream',
        };
      }
    }
  }

  /**
   * Returns the backend-native public URL for GCS/S3 backends, or null for local.
   * Only valid after setObjectVisibility(key, true) has been called.
   */
  getBackendPublicUrl(key: string): string | null {
    switch (this.config.backend) {
      case 'replit':
        return `https://storage.googleapis.com/${this.config.replitBucket}/${key}`;
      case 's3': {
        const endpoint = this.config.s3Endpoint;
        if (endpoint) {
          return `${endpoint}/${this.config.s3Bucket}/${key}`;
        }
        const region = this.config.s3Region || 'us-east-1';
        return `https://${this.config.s3Bucket}.s3.${region}.amazonaws.com/${key}`;
      }
      default:
        return null;
    }
  }

  async getFileMetadata(key: string): Promise<StorageObject> {
    await this.ensureInitialized();
    key = this.sanitizeKey(key);
    switch (this.config.backend) {
      case 'replit': {
        const storage = await this.getGcsStorage();
        const file = storage.bucket(this.config.replitBucket!).file(key);
        const [metadata] = await file.getMetadata();
        return {
          key,
          size: parseInt(metadata.size as string) || 0,
          contentType: metadata.contentType || 'application/octet-stream',
          lastModified: new Date(metadata.updated || Date.now()),
          etag: metadata.etag || '',
        };
      }
      case 's3': {
        const { HeadObjectCommand } = await import('@aws-sdk/client-s3');
        const resp = await this.s3Client!.send(new HeadObjectCommand({ Bucket: this.config.s3Bucket, Key: key }));
        return {
          key,
          size: resp.ContentLength || 0,
          contentType: resp.ContentType || 'application/octet-stream',
          lastModified: resp.LastModified || new Date(),
          etag: resp.ETag || '',
        };
      }
      default: {
        const filePath = this.getLocalPath(key);
        const stats = await fs.stat(filePath);
        return {
          key,
          size: stats.size,
          contentType: 'application/octet-stream',
          lastModified: stats.mtime,
          etag: '',
        };
      }
    }
  }

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
    return { totalSize, fileCount: files.length, largestFile };
  }

  async uploadBuildArtifact(
    projectId: number,
    buildId: string,
    filename: string,
    content: Buffer,
    contentType?: string
  ): Promise<{ storageObject: StorageObject; downloadUrl: string }> {
    const key = `builds/${projectId}/${buildId}/${filename}`;
    const storageObject = await this.uploadFile(key, content, {
      contentType: contentType || 'application/octet-stream',
      metadata: { projectId: String(projectId), buildId },
    });
    const downloadUrl = await this.getSignedUrl(key, 86400);
    return { storageObject, downloadUrl };
  }

  async uploadDatabaseBackup(
    databaseId: number | string,
    backupId: string,
    content: Buffer
  ): Promise<{ storageObject: StorageObject; downloadUrl: string }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const key = `backups/db-${databaseId}/${backupId}-${timestamp}.sql.gz`;
    const storageObject = await this.uploadFile(key, content, {
      contentType: 'application/gzip',
      metadata: { databaseId: String(databaseId), backupId, timestamp },
    });
    const downloadUrl = await this.getSignedUrl(key, 86400 * 7);
    return { storageObject, downloadUrl };
  }

  async uploadProjectBackup(
    projectId: number,
    backupId: string,
    content: Buffer
  ): Promise<{ storageObject: StorageObject; downloadUrl: string }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const key = `backups/project-${projectId}/${backupId}-${timestamp}.zip`;
    const storageObject = await this.uploadFile(key, content, {
      contentType: 'application/zip',
      metadata: { projectId: String(projectId), backupId, timestamp },
    });
    const downloadUrl = await this.getSignedUrl(key, 86400 * 7);
    return { storageObject, downloadUrl };
  }

  async downloadDatabaseBackup(
    databaseId: number | string,
    backupId: string
  ): Promise<Buffer> {
    const prefix = `backups/db-${databaseId}/`;
    const objects = await this.listFiles(prefix);
    const match = objects.find(obj => obj.key.includes(backupId));
    if (!match) {
      throw new Error(`Database backup ${backupId} not found in object storage (prefix: ${prefix})`);
    }
    return this.downloadFile(match.key);
  }

  async downloadProjectBackup(
    projectId: number,
    backupId: string
  ): Promise<Buffer> {
    const prefix = `backups/project-${projectId}/`;
    const objects = await this.listFiles(prefix);
    const match = objects.find(obj => obj.key.includes(backupId));
    if (!match) {
      throw new Error(`Project backup ${backupId} not found in object storage (prefix: ${prefix})`);
    }
    return this.downloadFile(match.key);
  }

  async uploadUserFile(
    projectId: number,
    filePath: string,
    content: Buffer | string,
    contentType?: string
  ): Promise<StorageObject> {
    const key = `projects/${projectId}/storage/${filePath}`;
    return this.uploadFile(key, content, {
      contentType: contentType || 'application/octet-stream',
      metadata: { projectId: String(projectId), filePath },
    });
  }
}

export const storageService = new StorageService();
