import { Request, Response, NextFunction } from "express";
import multer, { MulterError } from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { FileUploadService } from "../services/fileUploadService";
import { FileMetadataService } from "../services/fileMetadataService";
import { HttpError } from "../utils/HttpError";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "application/pdf",
  "text/plain",
];

const storage = multer.memoryStorage();

const fileFilter: multer.Options["fileFilter"] = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(
      new HttpError(
        400,
        `Unsupported file type: undefined. Allowed types: undefined`
      )
    );
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
  },
  fileFilter,
});

export const uploadSingleFileMiddleware = upload.single("file");

export class FileController {
  private readonly fileUploadService: FileUploadService;
  private readonly fileMetadataService: FileMetadataService;

  constructor(
    fileUploadService: FileUploadService,
    fileMetadataService: FileMetadataService
  ) {
    this.fileUploadService = fileUploadService;
    this.fileMetadataService = fileMetadataService;

    this.uploadFile = this.uploadFile.bind(this);
    this.getFileMetadata = this.getFileMetadata.bind(this);
    this.listFiles = this.listFiles.bind(this);
    this.deleteFile = this.deleteFile.bind(this);
  }

  public async uploadFile(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.file) {
        throw new HttpError(400, "No file provided in request");
      }

      const { originalname, mimetype, size, buffer } = req.file;
      const userId = (req as any).user?.id ?? null;

      const fileExtension = path.extname(originalname);
      const generatedFileName = `undefinedundefined`;

      const uploadResult = await this.fileUploadService.uploadFile({
        buffer,
        filename: generatedFileName,
        mimetype,
      });

      const metadata = await this.fileMetadataService.createMetadata({
        originalName: originalname,
        storedName: generatedFileName,
        mimeType: mimetype,
        size,
        url: uploadResult.url,
        storageKey: uploadResult.key,
        userId,
      });

      res.status(201).json({
        success: true,
        data: metadata,
      });
    } catch (error) {
      if (error instanceof MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          return next(
            new HttpError(
              400,
              `File size exceeds limit of undefinedMB`
            )
          );
        }
        return next(new HttpError(400, error.message));
      }
      next(error);
    }
  }

  public async getFileMetadata(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        throw new HttpError(400, "File id is required");
      }

      const metadata = await this.fileMetadataService.getMetadataById(id);

      if (!metadata) {
        throw new HttpError(404, "File not found");
      }

      res.status(200).json({
        success: true,
        data: metadata,
      });
    } catch (error) {
      next(error);
    }
  }

  public async listFiles(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const userId = (req as any).user?.id ?? null;

      const result = await this.fileMetadataService.listMetadata({
        page,
        limit,
        userId,
      });

      res.status(200).json({
        success: true,
        data: result.items,
        pagination: {
          page: result.page,
          limit: result.limit,
          totalItems: result.totalItems,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public async deleteFile(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        throw new HttpError(400, "File id is required");
      }

      const metadata = await this.fileMetadataService.getMetadataById(id);

      if (!metadata) {
        throw new HttpError(404, "File not found");
      }

      await this.fileUploadService.deleteFile(metadata.storageKey);
      await this.fileMetadataService.deleteMetadata(id);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export default FileController;