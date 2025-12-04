import multer, { FileFilterCallback } from "multer";
import { Request } from "express";
import path from "path";

export interface UploadedFile extends Express.Multer.File {
  buffer: Buffer;
}

export interface UploadRequest extends Request {
  file?: UploadedFile;
  files?: UploadedFile[] | { [fieldname: string]: UploadedFile[] };
}

type AllowedMimeTypes = string[];

const DEFAULT_ALLOWED_MIME_TYPES: AllowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const memoryStorage = multer.memoryStorage();

const createFileFilter =
  (allowedMimeTypes: AllowedMimeTypes = DEFAULT_ALLOWED_MIME_TYPES) =>
  (req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
    const isAllowedMime = allowedMimeTypes.includes(file.mimetype);

    const ext = path.extname(file.originalname || "").toLowerCase();
    const isImageExt =
      [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"].includes(ext) &&
      file.mimetype.startsWith("image/");

    if (!isAllowedMime && !isImageExt) {
      return cb(
        new multer.MulterError(
          "LIMIT_UNEXPECTED_FILE",
          `Unsupported file type: undefined`
        )
      );
    }

    cb(null, true);
  };

export const uploadSingle = (
  fieldName: string,
  allowedMimeTypes?: AllowedMimeTypes
) =>
  multer({
    storage: memoryStorage,
    limits: {
      fileSize: MAX_FILE_SIZE_BYTES,
      files: 1,
    },
    fileFilter: createFileFilter(allowedMimeTypes),
  }).single(fieldName);

export const uploadArray = (
  fieldName: string,
  maxCount: number,
  allowedMimeTypes?: AllowedMimeTypes
) =>
  multer({
    storage: memoryStorage,
    limits: {
      fileSize: MAX_FILE_SIZE_BYTES,
      files: maxCount,
    },
    fileFilter: createFileFilter(allowedMimeTypes),
  }).array(fieldName, maxCount);

export const uploadFields = (
  fields: { name: string; maxCount?: number }[],
  allowedMimeTypes?: AllowedMimeTypes
) =>
  multer({
    storage: memoryStorage,
    limits: {
      fileSize: MAX_FILE_SIZE_BYTES,
    },
    fileFilter: createFileFilter(allowedMimeTypes),
  }).fields(fields);

export const uploadAny = (allowedMimeTypes?: AllowedMimeTypes) =>
  multer({
    storage: memoryStorage,
    limits: {
      fileSize: MAX_FILE_SIZE_BYTES,
    },
    fileFilter: createFileFilter(allowedMimeTypes),
  }).any();