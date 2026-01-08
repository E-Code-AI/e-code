import { Router, Request, Response, NextFunction } from "express";
import { insertFileSchema } from "@shared/schema";
import { type IStorage } from "../storage";
import { ensureAuthenticated } from "../middleware/auth";
import { csrfProtection } from "../middleware/csrf";
import type { User } from "@shared/schema";
import path from 'path';
import { previewEvents } from '../preview/preview-websocket';
import { withScopedTransaction, TenantScopedQueries } from '../services/persistence-engine';

export class FilesRouter {
  private router: Router;
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.router = Router();
    this.storage = storage;
    this.initializeRoutes();
  }

  private emitFileChange(projectId: string, filePath: string, changeType: 'create' | 'update' | 'delete') {
    previewEvents.emit('preview:file-change', {
      projectId: parseInt(projectId, 10),
      filePath,
      changeType,
      timestamp: new Date().toISOString()
    });
  }

  // Use the shared ensureAuthenticated middleware for consistent authentication
  private ensureAuthenticated = ensureAuthenticated;

  private initializeRoutes() {
    this.router.get("/api/projects/:projectId/files", this.ensureAuthenticated, async (req: Request, res: Response) => {
      try {
        const projectId = parseInt(req.params.projectId, 10);
        const userId = req.user!.id;

        if (isNaN(projectId) || projectId <= 0) {
          return res.status(400).json({
            message: "Invalid project ID",
            code: "INVALID_PROJECT_ID"
          });
        }

        const result = await withScopedTransaction(userId, userId, async (scopedQueries) => {
          const files = await scopedQueries.getFilesByProject(projectId);
          return files;
        });

        if (!result.success) {
          if (result.error?.message?.includes('not found or access denied')) {
            return res.status(403).json({
              message: "Access denied",
              code: "ACCESS_DENIED"
            });
          }
          console.error('Failed to fetch files:', result.error);
          return res.status(500).json({ 
            message: "Failed to fetch files",
            code: "FETCH_ERROR"
          });
        }

        const transformedFiles = (result.data || []).map(file => ({
          ...file,
          type: file.isDirectory ? "folder" : "file"
        }));
        res.json(transformedFiles);
      } catch (error) {
        console.error('Error fetching files:', error);
        res.status(500).json({ 
          message: "Failed to fetch files",
          code: "FETCH_ERROR"
        });
      }
    });

    this.router.get("/api/projects/:projectId/files/*", this.ensureAuthenticated, async (req: Request, res: Response) => {
      try {
        const projectId = parseInt(req.params.projectId, 10);
        const userId = req.user!.id;
        let fileIdentifier = req.params[0];
        
        if (!fileIdentifier) {
          return res.status(400).json({
            message: "File identifier is required",
            code: "IDENTIFIER_REQUIRED"
          });
        }

        if (isNaN(projectId) || projectId <= 0) {
          return res.status(400).json({
            message: "Invalid project ID",
            code: "INVALID_PROJECT_ID"
          });
        }

        const result = await withScopedTransaction(userId, userId, async (scopedQueries) => {
          let file;
          
          if (/^\d+$/.test(fileIdentifier)) {
            const fileId = parseInt(fileIdentifier, 10);
            file = await scopedQueries.getFileById(projectId, fileId);
          } else {
            const { aiSecurityService } = await import('../services/ai-security.service');
            const pathValidation = aiSecurityService.validatePath(fileIdentifier);
            if (pathValidation.valid && pathValidation.sanitized) {
              fileIdentifier = pathValidation.sanitized;
            }
            
            const allFiles = await scopedQueries.getFilesByProject(projectId);
            file = allFiles.find(f => f.path === fileIdentifier);
          }
          
          return file;
        });

        if (!result.success) {
          if (result.error?.message?.includes('not found or access denied')) {
            return res.status(403).json({
              message: "Access denied",
              code: "ACCESS_DENIED"
            });
          }
          console.error('Failed to fetch file:', result.error);
          return res.status(500).json({ 
            message: "Failed to fetch file",
            code: "FETCH_ERROR"
          });
        }
        
        if (!result.data) {
          return res.status(404).json({
            message: "File not found",
            code: "FILE_NOT_FOUND",
            identifier: fileIdentifier
          });
        }
        
        res.json(result.data);
      } catch (error) {
        console.error('Error fetching file:', error);
        res.status(500).json({ 
          message: "Failed to fetch file",
          code: "FETCH_ERROR"
        });
      }
    });

    this.router.post("/api/projects/:projectId/files", this.ensureAuthenticated, csrfProtection, async (req: Request, res: Response) => {
      try {
        const projectId = parseInt(req.params.projectId, 10);
        const userId = req.user!.id;
        
        if (isNaN(projectId) || projectId <= 0) {
          return res.status(400).json({
            message: "Invalid project ID",
            code: "INVALID_PROJECT_ID"
          });
        }
        
        const MAX_FILE_SIZE = 5 * 1024 * 1024;
        if (req.body.content && req.body.content.length > MAX_FILE_SIZE) {
          return res.status(413).json({
            error: "File too large",
            message: "File size limit exceeded (5MB maximum)",
            code: "FILE_TOO_LARGE"
          });
        }
        
        const requestData = { ...req.body, projectId };
        if (!requestData.name && requestData.path) {
          requestData.name = requestData.path.split('/').pop() || requestData.path;
        }
        
        const validatedData = insertFileSchema.parse(requestData);
        
        const { aiSecurityService } = await import('../services/ai-security.service');
        const pathValidation = aiSecurityService.validatePath(validatedData.path);
        
        if (!pathValidation.valid) {
          console.warn(`[FILES-SECURITY] Blocked: ${validatedData.path} - ${pathValidation.reason}`);
          
          await aiSecurityService.logAction(
            userId,
            String(projectId),
            { type: 'create_file', path: validatedData.path, content: validatedData.content || '' },
            { success: false, error: `Path blocked: ${pathValidation.reason}` }
          );
          
          return res.status(400).json({
            message: `Security: ${pathValidation.reason}`,
            code: "SECURITY_PATH_BLOCKED"
          });
        }
        
        validatedData.path = pathValidation.sanitized!;

        const result = await withScopedTransaction(userId, userId, async (scopedQueries) => {
          const allFiles = await scopedQueries.getFilesByProject(projectId);
          const existingFile = allFiles.find(f => f.path === validatedData.path);
          
          if (existingFile) {
            const updated = await scopedQueries.updateFile(projectId, existingFile.id, {
              content: validatedData.content || ''
            });
            return { file: updated, isUpdate: true };
          } else {
            const { projectId: _, ...fileData } = validatedData;
            const created = await scopedQueries.createFile(projectId, fileData);
            return { file: created, isUpdate: false };
          }
        });

        if (!result.success) {
          if (result.error?.message?.includes('not found or access denied')) {
            return res.status(403).json({
              message: "Access denied",
              code: "ACCESS_DENIED"
            });
          }
          console.error('Failed to save file:', result.error);
          return res.status(500).json({ 
            error: "Failed to save file",
            message: "Failed to save file",
            code: "SAVE_ERROR"
          });
        }

        await aiSecurityService.logAction(
          userId,
          String(projectId),
          { type: result.data!.isUpdate ? 'edit_file' : 'create_file', path: validatedData.path, content: validatedData.content || '' },
          { success: true, fileId: String(result.data!.file?.id) }
        );

        res.json({ file: result.data!.file });
        
        this.emitFileChange(String(projectId), validatedData.path, result.data!.isUpdate ? 'update' : 'create');
      } catch (error: any) {
        console.error('Error saving file:', error);
        if (error.name === 'ZodError') {
          return res.status(400).json({ 
            error: "Invalid file data",
            message: "Invalid file data",
            code: "INVALID_INPUT",
            errors: error.errors
          });
        }
        res.status(500).json({ 
          error: "Failed to save file",
          message: "Failed to save file",
          code: "SAVE_ERROR"
        });
      }
    });

    this.router.put("/api/projects/:projectId/files/*", this.ensureAuthenticated, csrfProtection, async (req: Request, res: Response) => {
      try {
        const projectId = parseInt(req.params.projectId, 10);
        const userId = req.user!.id;
        let filePath = req.params[0];
        const { content } = req.body;
        
        if (!filePath) {
          return res.status(400).json({
            message: "File path is required",
            code: "PATH_REQUIRED"
          });
        }

        if (isNaN(projectId) || projectId <= 0) {
          return res.status(400).json({
            message: "Invalid project ID",
            code: "INVALID_PROJECT_ID"
          });
        }

        const { aiSecurityService } = await import('../services/ai-security.service');
        const pathValidation = aiSecurityService.validatePath(filePath);
        if (pathValidation.valid && pathValidation.sanitized) {
          filePath = pathValidation.sanitized;
        }

        const result = await withScopedTransaction(userId, userId, async (scopedQueries) => {
          const allFiles = await scopedQueries.getFilesByProject(projectId);
          const file = allFiles.find(f => f.path === filePath);
          
          if (!file) {
            throw new Error('FILE_NOT_FOUND');
          }
          
          const updated = await scopedQueries.updateFile(projectId, file.id, { content });
          return updated;
        });

        if (!result.success) {
          if (result.error?.message === 'FILE_NOT_FOUND') {
            return res.status(404).json({
              message: "File not found",
              code: "FILE_NOT_FOUND"
            });
          }
          if (result.error?.message?.includes('not found or access denied')) {
            return res.status(403).json({
              message: "Access denied",
              code: "ACCESS_DENIED"
            });
          }
          console.error('Failed to update file:', result.error);
          return res.status(500).json({ 
            message: "Failed to update file",
            code: "UPDATE_ERROR"
          });
        }
        
        res.json(result.data);
        
        this.emitFileChange(String(projectId), filePath, 'update');
      } catch (error) {
        console.error('Error updating file:', error);
        res.status(500).json({ 
          message: "Failed to update file",
          code: "UPDATE_ERROR"
        });
      }
    });

    this.router.delete("/api/projects/:projectId/files/*", this.ensureAuthenticated, csrfProtection, async (req: Request, res: Response) => {
      try {
        const projectId = parseInt(req.params.projectId, 10);
        const userId = req.user!.id;
        let filePath = req.params[0];
        
        if (!filePath) {
          return res.status(400).json({
            message: "File path is required",
            code: "PATH_REQUIRED"
          });
        }

        if (isNaN(projectId) || projectId <= 0) {
          return res.status(400).json({
            message: "Invalid project ID",
            code: "INVALID_PROJECT_ID"
          });
        }

        const { aiSecurityService } = await import('../services/ai-security.service');
        const pathValidation = aiSecurityService.validatePath(filePath);
        if (pathValidation.valid && pathValidation.sanitized) {
          filePath = pathValidation.sanitized;
        }

        const result = await withScopedTransaction(userId, userId, async (scopedQueries) => {
          const allFiles = await scopedQueries.getFilesByProject(projectId);
          const file = allFiles.find(f => f.path === filePath);
          
          if (!file) {
            throw new Error('FILE_NOT_FOUND');
          }
          
          await scopedQueries.deleteFile(projectId, file.id);
          return true;
        });

        if (!result.success) {
          if (result.error?.message === 'FILE_NOT_FOUND') {
            return res.status(404).json({
              message: "File not found",
              code: "FILE_NOT_FOUND"
            });
          }
          if (result.error?.message?.includes('not found or access denied')) {
            return res.status(403).json({
              message: "Access denied",
              code: "ACCESS_DENIED"
            });
          }
          console.error('Failed to delete file:', result.error);
          return res.status(500).json({ 
            message: "Failed to delete file",
            code: "DELETE_ERROR"
          });
        }

        res.json({ message: "File deleted successfully" });
        
        this.emitFileChange(String(projectId), filePath, 'delete');
      } catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).json({ 
          message: "Failed to delete file",
          code: "DELETE_ERROR"
        });
      }
    });

    this.router.patch("/api/files/:fileId", this.ensureAuthenticated, csrfProtection, async (req: Request, res: Response) => {
      try {
        const fileId = parseInt(req.params.fileId, 10);
        const userId = req.user!.id;
        const { content, name } = req.body;
        
        if (isNaN(fileId) || fileId <= 0) {
          return res.status(400).json({
            message: "Invalid file ID",
            code: "INVALID_FILE_ID"
          });
        }

        const result = await withScopedTransaction(userId, userId, async (scopedQueries) => {
          const projects = await scopedQueries.getProjects();
          
          for (const project of projects) {
            const file = await scopedQueries.getFileById(project.id, fileId);
            if (file) {
              const updated = await scopedQueries.updateFile(project.id, fileId, { content, name });
              return { file: updated, projectId: project.id, originalPath: file.path || file.name };
            }
          }
          
          throw new Error('FILE_NOT_FOUND');
        });

        if (!result.success) {
          if (result.error?.message === 'FILE_NOT_FOUND') {
            return res.status(404).json({
              message: "File not found",
              code: "FILE_NOT_FOUND"
            });
          }
          console.error('Failed to update file:', result.error);
          return res.status(500).json({ 
            message: "Failed to update file",
            code: "UPDATE_ERROR"
          });
        }
        
        res.json(result.data!.file);
        
        this.emitFileChange(String(result.data!.projectId), result.data!.originalPath, 'update');
      } catch (error) {
        console.error('Error updating file:', error);
        res.status(500).json({ 
          message: "Failed to update file",
          code: "UPDATE_ERROR"
        });
      }
    });

    this.router.delete("/api/files/:fileId", this.ensureAuthenticated, csrfProtection, async (req: Request, res: Response) => {
      try {
        const fileId = parseInt(req.params.fileId, 10);
        const userId = req.user!.id;
        
        if (isNaN(fileId) || fileId <= 0) {
          return res.status(400).json({
            message: "Invalid file ID",
            code: "INVALID_FILE_ID"
          });
        }

        const result = await withScopedTransaction(userId, userId, async (scopedQueries) => {
          const projects = await scopedQueries.getProjects();
          
          for (const project of projects) {
            const file = await scopedQueries.getFileById(project.id, fileId);
            if (file) {
              await scopedQueries.deleteFile(project.id, fileId);
              return { projectId: project.id, path: file.path || file.name };
            }
          }
          
          throw new Error('FILE_NOT_FOUND');
        });

        if (!result.success) {
          if (result.error?.message === 'FILE_NOT_FOUND') {
            return res.status(404).json({
              message: "File not found",
              code: "FILE_NOT_FOUND"
            });
          }
          console.error('Failed to delete file:', result.error);
          return res.status(500).json({ 
            message: "Failed to delete file",
            code: "DELETE_ERROR"
          });
        }

        res.json({ message: "File deleted successfully" });
        
        this.emitFileChange(String(result.data!.projectId), result.data!.path, 'delete');
      } catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).json({ 
          message: "Failed to delete file",
          code: "DELETE_ERROR"
        });
      }
    });

    this.router.post("/api/files/:projectId", this.ensureAuthenticated, csrfProtection, async (req: Request, res: Response) => {
      try {
        const projectId = parseInt(req.params.projectId, 10);
        const userId = req.user!.id;
        
        if (isNaN(projectId) || projectId <= 0) {
          return res.status(400).json({
            message: "Invalid project ID",
            code: "INVALID_PROJECT_ID"
          });
        }
        
        let filePath = req.body.path;
        
        if (!filePath && req.body.name) {
          const { name, parentId } = req.body;
          
          if (parentId) {
            const parent = await this.storage.getFile(parentId);
            if (!parent) {
              return res.status(400).json({
                message: "Parent folder not found",
                code: "PARENT_NOT_FOUND"
              });
            }
            filePath = parent.path.endsWith('/') ? `${parent.path}${name}` : `${parent.path}/${name}`;
          } else {
            filePath = name;
          }
        }
        
        const validatedData = insertFileSchema.parse({
          ...req.body,
          path: filePath,
          projectId
        });
        
        const { aiSecurityService } = await import('../services/ai-security.service');
        const pathValidation = aiSecurityService.validatePath(validatedData.path);
        
        if (!pathValidation.valid) {
          console.warn(`[FILES-SECURITY] Blocked (compat): ${validatedData.path} - ${pathValidation.reason}`);
          
          await aiSecurityService.logAction(
            userId,
            String(projectId),
            { type: 'create_file', path: validatedData.path, content: validatedData.content || '' },
            { success: false, error: `Path blocked: ${pathValidation.reason}` }
          );
          
          return res.status(400).json({
            message: `Security: ${pathValidation.reason}`,
            code: "SECURITY_PATH_BLOCKED"
          });
        }
        
        validatedData.path = pathValidation.sanitized!;

        const result = await withScopedTransaction(userId, userId, async (scopedQueries) => {
          const allFiles = await scopedQueries.getFilesByProject(projectId);
          const existingFile = allFiles.find(f => f.path === validatedData.path);
          
          if (existingFile) {
            const updated = await scopedQueries.updateFile(projectId, existingFile.id, {
              content: validatedData.content
            });
            return { file: updated, isUpdate: true };
          } else {
            const { projectId: _, ...fileData } = validatedData;
            const created = await scopedQueries.createFile(projectId, fileData);
            return { file: created, isUpdate: false };
          }
        });

        if (!result.success) {
          if (result.error?.message?.includes('not found or access denied')) {
            return res.status(403).json({
              message: "Access denied",
              code: "ACCESS_DENIED"
            });
          }
          console.error('Failed to save file:', result.error);
          return res.status(500).json({ 
            error: "Failed to save file",
            message: "Failed to save file",
            code: "SAVE_ERROR"
          });
        }

        await aiSecurityService.logAction(
          userId,
          String(projectId),
          { type: result.data!.isUpdate ? 'edit_file' : 'create_file', path: validatedData.path, content: validatedData.content || '' },
          { success: true, fileId: result.data!.file?.id ? String(result.data!.file.id) : undefined }
        );

        res.json(result.data!.file);
      } catch (error: any) {
        console.error('Error saving file:', error);
        if (error.name === 'ZodError') {
          return res.status(400).json({ 
            error: "Invalid file data",
            message: "Invalid file data",
            code: "INVALID_INPUT",
            errors: error.errors
          });
        }
        res.status(500).json({ 
          error: "Failed to save file",
          message: "Failed to save file",
          code: "SAVE_ERROR"
        });
      }
    });

    this.router.post("/api/projects/:projectId/folders", this.ensureAuthenticated, csrfProtection, async (req: Request, res: Response) => {
      try {
        const projectId = parseInt(req.params.projectId, 10);
        const userId = req.user!.id;
        const { path: folderPath } = req.body;
        
        if (isNaN(projectId) || projectId <= 0) {
          return res.status(400).json({
            message: "Invalid project ID",
            code: "INVALID_PROJECT_ID"
          });
        }
        
        if (!folderPath || folderPath.includes('..')) {
          return res.status(400).json({
            message: "Invalid folder path",
            code: "INVALID_PATH"
          });
        }

        const result = await withScopedTransaction(userId, userId, async (scopedQueries) => {
          const file = await scopedQueries.createFile(projectId, {
            name: '.gitkeep',
            path: path.join(folderPath, '.gitkeep'),
            content: '',
            isDirectory: false
          });
          return file;
        });

        if (!result.success) {
          if (result.error?.message?.includes('not found or access denied')) {
            return res.status(403).json({
              message: "Access denied",
              code: "ACCESS_DENIED"
            });
          }
          console.error('Failed to create folder:', result.error);
          return res.status(500).json({ 
            message: "Failed to create folder",
            code: "CREATE_ERROR"
          });
        }

        res.json({ 
          success: true, 
          path: folderPath,
          file: result.data
        });
        
        this.emitFileChange(String(projectId), folderPath, 'create');
      } catch (error) {
        console.error('Error creating folder:', error);
        res.status(500).json({ 
          message: "Failed to create folder",
          code: "CREATE_ERROR"
        });
      }
    });
  }

  getRouter(): Router {
    return this.router;
  }
}
