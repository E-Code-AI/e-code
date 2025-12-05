import express, { Request, Response, NextFunction, Router } from "express";
import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import { promisify } from "util";

const unlinkAsync = promisify(fs.unlink);

interface MulterFile extends Express.Multer.File {
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
}

interface DocumentMetadata {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  status: "processing" | "ready" | "failed";
  error?: string;
}

interface RAGService {
  indexDocument: (filePath: string, options?: { originalName?: string }) => Promise<{ documentId: string }>;
  deleteDocument: (documentId: string) => Promise<void>;
  listDocuments: () => Promise<DocumentMetadata[]>;
}

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/markdown"
];

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB

const uploadDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    cb(null, `undefined-undefined`);
  }
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error("Unsupported file type"));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 10
  }
});

const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);

export const createDocumentRouter = (ragService: RAGService): Router => {
  const router = express.Router();

  router.post(
    "/upload",
    upload.array("files"),
    asyncHandler(async (req: Request, res: Response) => {
      const files = req.files as MulterFile[] | undefined;

      if (!files || files.length === 0) {
        res.status(400).json({ error: "No files uploaded" });
        return;
      }

      const results: {
        originalName: string;
        documentId?: string;
        status: "success" | "failed";
        error?: string;
      }[] = [];

      for (const file of files) {
        try {
          const { documentId } = await ragService.indexDocument(file.path, {
            originalName: file.originalname
          });

          results.push({
            originalName: file.originalname,
            documentId,
            status: "success"
          });

          // Optionally remove file after indexing
          try {
            await unlinkAsync(file.path);
          } catch {
            // Non-fatal; log in real implementation
          }
        } catch (err) {
          results.push({
            originalName: file.originalname,
            status: "failed",
            error: err instanceof Error ? err.message : "Failed to index document"
          });
          try {
            await unlinkAsync(file.path);
          } catch {
            // Non-fatal; log in real implementation
          }
        }
      }

      const hasSuccess = results.some(r => r.status === "success");
      const statusCode = hasSuccess ? 207 : 500;

      res.status(statusCode).json({
        results
      });
    })
  );

  router.get(
    "/",
    asyncHandler(async (_req: Request, res: Response) => {
      const documents = await ragService.listDocuments();
      res.json({ documents });
    })
  );

  router.delete(
    "/:id",
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ error: "Document ID is required" });
        return;
      }

      await ragService.deleteDocument(id);
      res.status(204).send();
    })
  );

  return router;
};

export default createDocumentRouter;