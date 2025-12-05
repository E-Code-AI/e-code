import { Request, Response, NextFunction } from "express";
import multer, { FileFilterCallback } from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import { promisify } from "util";

const unlinkAsync = promisify(fs.unlink);

type SupportedMimeType =
  | "application/pdf"
  | "text/plain"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const SUPPORTED_MIME_TYPES: SupportedMimeType[] = [
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB

export interface DocumentMetadata {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  pages?: number;
  createdAt: string;
  status: "processing" | "ready" | "failed";
  errorMessage?: string;
}

export interface ExtractedDocument {
  id: string;
  text: string;
  metadata: DocumentMetadata;
}

export interface EmbeddingResult {
  documentId: string;
  vectorId: string;
  dimensions: number;
}

export interface DocumentService {
  extractTextFromFile(filePath: string, mimeType: string): Promise<ExtractedDocument>;
  generateEmbeddings(document: ExtractedDocument): Promise<EmbeddingResult>;
  getDocumentMetadata(documentId: string): Promise<DocumentMetadata | null>;
}

export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export interface DocumentControllerDeps {
  documentService: DocumentService;
  logger: Logger;
  uploadDir?: string;
}

const createMulterStorage = (uploadDir: string): multer.StorageEngine => {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || "";
      const baseName = path.basename(file.originalname, ext);
      const safeBaseName = baseName.replace(/[^a-zA-Z0-9-_]/g, "_");
      const uniqueSuffix = `undefined-undefined`;
      cb(null, `undefined-undefinedundefined`);
    },
  });
};

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  if (!SUPPORTED_MIME_TYPES.includes(file.mimetype as SupportedMimeType)) {
    const error: multer.MulterError = new multer.MulterError("LIMIT_UNEXPECTED_FILE");
    (error as Error).name = "UnsupportedFileTypeError";
    (error as Error).message = `Unsupported file type: undefined`;
    return cb(error);
  }
  cb(null, true);
};

const createUploadMiddleware = (uploadDir: string): multer.Multer => {
  return multer({
    storage: createMulterStorage(uploadDir),
    fileFilter,
    limits: {
      fileSize: MAX_FILE_SIZE_BYTES,
      files: 1,
    },
  });
};

const buildErrorResponse = (error: unknown): { status: number; body: unknown } => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return {
        status: 413,
        body: {
          error: "FileTooLarge",
          message: `File size exceeds the maximum allowed size of undefinedMB`,
        },
      };
    }
    if (error.code === "LIMIT_UNEXPECTED_FILE" && error.name === "UnsupportedFileTypeError") {
      return {
        status: 415,
        body: {
          error: "UnsupportedFileType",
          message: error.message || "Unsupported file type",
          supportedMimeTypes: SUPPORTED_MIME_TYPES,
        },
      };
    }
    return {
      status: 400,
      body: {
        error: "UploadError",
        message: error.message || "Error processing upload",
      },
    };
  }

  if (error instanceof Error) {
    return {
      status: 500,
      body: {
        error: "InternalServerError",
        message: error.message,
      },
    };
  }

  return {
    status: 500,
    body: {
      error: "InternalServerError",
      message: "An unknown error occurred",
    },
  };
};

export const createDocumentController = (deps: DocumentControllerDeps) => {
  const uploadDir = deps.uploadDir || path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const upload = createUploadMiddleware(uploadDir);

  const uploadSingle = upload.single("file");

  const uploadDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    uploadSingle(req, res, async (uploadErr: any) => {
      if (uploadErr) {
        const { status, body } = buildErrorResponse(uploadErr);
        deps.logger.warn("Upload error", { error: uploadErr, status });
        res.status(status).json(body);
        return;
      }

      const file = req.file;
      if (!file) {
        res.status(400).json({
          error: "NoFileProvided",
          message: "No file was provided in the 'file' field",
        });
        return;
      }

      const filePath = file.path;
      const mimeType = file.mimetype;

      try {
        deps.logger.info("Starting text extraction", {
          originalName: file.originalname,
          mimeType,
          size: file.size,
        });

        const extracted = await deps.documentService.extractTextFromFile(filePath, mimeType);

        deps.logger.info("Text extraction completed", {
          documentId: extracted.id,
          textLength: extracted.text.length,
        });

        deps.logger.info("Starting embedding generation", {
          documentId: extracted.id,
        });

        const embeddingResult = await deps.documentService.generateEmbeddings(extracted);

        deps.logger.info("Embedding generation completed", {
          documentId: extracted.id,
          vectorId: embeddingResult.vectorId,
          dimensions: embeddingResult.dimensions,
        });

        const metadata: DocumentMetadata = {
          ...extracted.metadata,
          status: "ready",
        };

        res.status(201).json({
          document: metadata,
          embedding: embeddingResult,
        });
      } catch (err) {
        deps.logger.error("Document processing failed", {
          error: err,
          fileName: file.originalname,
        });

        const { status, body } = buildErrorResponse(err);
        res.status(status).json(body);
      } finally {
        try {
          if (filePath && fs.existsSync(filePath)) {
            await unlinkAsync(filePath);
          }
        } catch (cleanupErr) {
          deps.logger.warn("Failed to cleanup uploaded file", {
            error: cleanupErr,
            path: filePath,
          });
        }
      }
    });
  };

  const getDocumentMetadata = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      res.status(400).json({
        error: "InvalidDocumentId",
        message: "A valid document ID must be provided",
      });
      return;
    }

    try {
      const metadata = await deps.documentService.getDocumentMetadata(id);

      if (!metadata) {
        res.status(404).json({
          error: "DocumentNotFound",
          message: `No document found with id 'undefined'`,
        });
        return;
      }

      res.status(200).json({ document: metadata });
    } catch (err) {
      deps.logger.error("Failed to fetch document metadata", {
        error: err,
        documentId: id,
      });

      const { status, body } = buildErrorResponse(err);
      res.status(status).json(body);
    }
  };

  const validateSupportedTypes = (_req: Request, res: Response): void => {
    res.status(200).json({
      supportedMimeTypes: SUPPORTED_MIME_TYPES,
      maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
    });
  };

  return {
    uploadDocument,
    getDocumentMetadata,
    validateSupportedTypes,
  };
};

export type DocumentController = ReturnType<typeof createDocumentController>;