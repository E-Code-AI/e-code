import { Storage } from '@google-cloud/storage';
import type { CreateWriteStreamOptions, GetSignedUrlConfig, StorageOptions } from '@google-cloud/storage';
import { Readable } from 'node:stream';

export type StorageData = Buffer | Readable | string;

export type UploadOptions = {
  contentType?: string;
  metadata?: Record<string, string>;
  cacheControl?: string;
  resumable?: boolean;
  public?: boolean;
};

export type ListOptions = {
  delimiter?: string;
  maxResults?: number;
  pageToken?: string;
};

export type ListedObject = {
  bucket: string;
  key: string;
  size?: number;
  contentType?: string;
  updated?: string;
  generation?: string;
};

export type SignedUrlAction = 'read' | 'write';

export type EcodeStorage = ReturnType<typeof createStorageClient>;

const defaultStorage = new Storage();

function getStorage(options?: StorageOptions): Storage {
  return options ? new Storage(options) : defaultStorage;
}

function toReadable(data: StorageData): Readable {
  if (data instanceof Readable) return data;
  return Readable.from([data]);
}

function signedUrlAction(action: SignedUrlAction): GetSignedUrlConfig['action'] {
  return action === 'read' ? 'read' : 'write';
}

export function createStorageClient(options?: StorageOptions) {
  const storage = getStorage(options);

  return {
    async upload(bucket: string, key: string, data: StorageData, opts: UploadOptions = {}): Promise<ListedObject> {
      const file = storage.bucket(bucket).file(key);
      const streamOptions: CreateWriteStreamOptions = {
        contentType: opts.contentType,
        metadata: opts.metadata ? { metadata: opts.metadata } : undefined,
        resumable: opts.resumable ?? false,
      };

      if (opts.cacheControl) {
        streamOptions.metadata = {
          ...(streamOptions.metadata || {}),
          cacheControl: opts.cacheControl,
        };
      }

      await new Promise<void>((resolve, reject) => {
        toReadable(data)
          .pipe(file.createWriteStream(streamOptions))
          .on('finish', resolve)
          .on('error', reject);
      });

      if (opts.public) {
        await file.makePublic();
      }

      const [metadata] = await file.getMetadata();
      return {
        bucket,
        key,
        size: Number(metadata.size || 0),
        contentType: metadata.contentType,
        updated: metadata.updated,
        generation: metadata.generation == null ? undefined : String(metadata.generation),
      };
    },

    async download(bucket: string, key: string): Promise<Buffer> {
      const [buffer] = await storage.bucket(bucket).file(key).download();
      return buffer;
    },

    downloadStream(bucket: string, key: string): Readable {
      return storage.bucket(bucket).file(key).createReadStream();
    },

    async exists(bucket: string, key: string): Promise<boolean> {
      const [exists] = await storage.bucket(bucket).file(key).exists();
      return exists;
    },

    async delete(bucket: string, key: string): Promise<void> {
      await storage.bucket(bucket).file(key).delete({ ignoreNotFound: true });
    },

    async list(bucket: string, prefix = '', opts: ListOptions = {}): Promise<ListedObject[]> {
      const [files] = await storage.bucket(bucket).getFiles({
        prefix,
        delimiter: opts.delimiter,
        maxResults: opts.maxResults,
        pageToken: opts.pageToken,
      });

      return files.map((file) => ({
        bucket,
        key: file.name,
        size: Number(file.metadata.size || 0),
        contentType: file.metadata.contentType,
        updated: file.metadata.updated,
        generation: file.metadata.generation == null ? undefined : String(file.metadata.generation),
      }));
    },

    async copy(srcBucket: string, srcKey: string, destBucket: string, destKey: string): Promise<ListedObject> {
      const [file] = await storage.bucket(srcBucket).file(srcKey).copy(storage.bucket(destBucket).file(destKey));
      const [metadata] = await file.getMetadata();
      return {
        bucket: destBucket,
        key: destKey,
        size: Number(metadata.size || 0),
        contentType: metadata.contentType,
        updated: metadata.updated,
        generation: metadata.generation == null ? undefined : String(metadata.generation),
      };
    },

    async signedUrl(bucket: string, key: string, action: SignedUrlAction, ttlSec: number): Promise<string> {
      const [url] = await storage.bucket(bucket).file(key).getSignedUrl({
        version: 'v4',
        action: signedUrlAction(action),
        expires: Date.now() + ttlSec * 1000,
      });
      return url;
    },

    async resumableUploadUrl(bucket: string, key: string, opts: UploadOptions = {}): Promise<string> {
      const [url] = await storage.bucket(bucket).file(key).createResumableUpload({
        metadata: {
          contentType: opts.contentType,
          metadata: opts.metadata,
          cacheControl: opts.cacheControl,
        },
      });
      return url;
    },
  };
}

export const storage = createStorageClient();

export async function upload(bucket: string, key: string, data: StorageData, opts?: UploadOptions) {
  return storage.upload(bucket, key, data, opts);
}

export async function download(bucket: string, key: string) {
  return storage.download(bucket, key);
}

export function downloadStream(bucket: string, key: string) {
  return storage.downloadStream(bucket, key);
}

export async function exists(bucket: string, key: string) {
  return storage.exists(bucket, key);
}

export async function deleteObject(bucket: string, key: string) {
  return storage.delete(bucket, key);
}

export async function list(bucket: string, prefix?: string, opts?: ListOptions) {
  return storage.list(bucket, prefix, opts);
}

export async function copy(srcBucket: string, srcKey: string, destBucket: string, destKey: string) {
  return storage.copy(srcBucket, srcKey, destBucket, destKey);
}

export async function signedUrl(bucket: string, key: string, action: SignedUrlAction, ttlSec: number) {
  return storage.signedUrl(bucket, key, action, ttlSec);
}

export async function resumableUploadUrl(bucket: string, key: string, opts?: UploadOptions) {
  return storage.resumableUploadUrl(bucket, key, opts);
}
