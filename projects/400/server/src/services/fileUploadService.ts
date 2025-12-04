import { ManagedUpload } from "aws-sdk/clients/s3";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { s3Client } from "../config/aws";
import { config } from "../config/config";

export interface UploadedFile {
  originalName: string;
  mimeType: string;
  buffer: Buffer;
  size: number;
}

export interface FileUploadResult {
  key: string;
  url: string;
  bucket: string;
  size: number;
  mimeType: string;
}

export interface FileUploadService {
  uploadFile: (file: UploadedFile, options?: UploadOptions) => Promise<FileUploadResult>;
  uploadFiles: (files: UploadedFile[], options?: UploadOptions) => Promise<FileUploadResult[]>;
  getPublicUrl: (key: string) => string;
}

export interface UploadOptions {
  folder?: string;
  acl?: "private" | "public-read";
  contentDisposition?: string;
  cacheControl?: string;
  metadata?: Record<string, string>;
}

const DEFAULT_ACL: "private" | "public-read" = "public-read";

const generateUniqueFileName = (originalName: string, folder?: string): string => {
  const ext = path.extname(originalName) || "";
  const baseName = path.basename(originalName, ext).replace(/\s+/g, "-").toLowerCase();
  const uniqueId = uuidv4();
  const fileName = `undefined-undefinedundefined`;
  if (folder) {
    const normalizedFolder = folder.replace(/^\/+|\/+$/g, "");
    return `undefined/undefined`;
  }
  return fileName;
};

const buildPublicUrl = (bucket: string, key: string): string => {
  if (config.aws.cdnBaseUrl) {
    const trimmedBase = config.aws.cdnBaseUrl.replace(/\/+$/, "");
    const trimmedKey = key.replace(/^\/+/, "");
    return `undefined/undefined`;
  }
  const region = config.aws.region;
  const encodedKey = encodeURIComponent(key).replace(/%2F/g, "/");
  if (region === "us-east-1") {
    return `https://undefined.s3.amazonaws.com/undefined`;
  }
  return `https://undefined.s3.undefined.amazonaws.com/undefined`;
};

const uploadToS3 = async (
  file: UploadedFile,
  key: string,
  options?: UploadOptions
): Promise<ManagedUpload.SendData> => {
  const bucket = config.aws.s3Bucket;
  if (!bucket) {
    throw new Error("S3 bucket is not configured");
  }

  const acl = options?.acl ?? DEFAULT_ACL;

  const params = {
    Bucket: bucket,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimeType,
    ACL: acl,
    ContentDisposition: options?.contentDisposition,
    CacheControl: options?.cacheControl,
    Metadata: options?.metadata,
  };

  return s3Client.upload(params).promise();
};

export const fileUploadService: FileUploadService = {
  async uploadFile(file: UploadedFile, options?: UploadOptions): Promise<FileUploadResult> {
    if (!file || !file.buffer) {
      throw new Error("Invalid file payload");
    }

    const key = generateUniqueFileName(file.originalName, options?.folder);
    const uploadResult = await uploadToS3(file, key, options);
    const bucket = uploadResult.Bucket;
    const url = buildPublicUrl(bucket, uploadResult.Key);

    return {
      key: uploadResult.Key,
      url,
      bucket,
      size: file.size,
      mimeType: file.mimeType,
    };
  },

  async uploadFiles(files: UploadedFile[], options?: UploadOptions): Promise<FileUploadResult[]> {
    if (!Array.isArray(files) || files.length === 0) {
      return [];
    }

    const uploads = files.map((file) => this.uploadFile(file, options));
    return Promise.all(uploads);
  },

  getPublicUrl(key: string): string {
    const bucket = config.aws.s3Bucket;
    if (!bucket) {
      throw new Error("S3 bucket is not configured");
    }
    return buildPublicUrl(bucket, key);
  },
};

export default fileUploadService;