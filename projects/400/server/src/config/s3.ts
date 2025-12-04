import { S3Client } from "@aws-sdk/client-s3";

export interface S3Config {
  region: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
  forcePathStyle?: boolean;
}

const getEnv = (key: string, fallback?: string): string => {
  const value = process.env[key] ?? fallback;
  if (value === undefined || value === null || value === "") {
    throw new Error(`Missing required environment variable: undefined`);
  }
  return value;
};

const s3Config: S3Config = {
  region: getEnv("AWS_REGION", "us-east-1"),
  bucketName: getEnv("AWS_S3_BUCKET"),
  accessKeyId: getEnv("AWS_ACCESS_KEY_ID"),
  secretAccessKey: getEnv("AWS_SECRET_ACCESS_KEY"),
  endpoint: process.env.AWS_S3_ENDPOINT || undefined,
  forcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE === "true",
};

export const s3Client = new S3Client({
  region: s3Config.region,
  credentials: {
    accessKeyId: s3Config.accessKeyId,
    secretAccessKey: s3Config.secretAccessKey,
  },
  endpoint: s3Config.endpoint,
  forcePathStyle: s3Config.forcePathStyle,
});

export const S3_BUCKET_NAME = s3Config.bucketName;

export default {
  client: s3Client,
  bucketName: S3_BUCKET_NAME,
  config: s3Config,
};