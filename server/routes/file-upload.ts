// @ts-nocheck
import { Router } from 'express';
import { storage } from '../storage';
// Import removed - ensureAuthenticated will be defined locally
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

const router = Router();

// Middleware to ensure a user is authenticated
const ensureAuthenticated = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

// Configure multer for file uploads
const upload = multer({
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  storage: multer.memoryStorage()
});

// Middleware to ensure user has access to project
const ensureProjectAccess = async (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const userId = req.user!.id;
  const projectId = parseInt(req.params.projectId || req.params.id);
  
  if (isNaN(projectId)) {
    return res.status(400).json({ message: "Invalid project ID" });
  }
  
  const project = await storage.getProject(projectId);
  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }
  
  if (project.ownerId === userId) {
    return next();
  }
  
  const collaborators = await storage.getProjectCollaborators(projectId);
  const isCollaborator = collaborators.some((c: any) => c.userId === userId);
  
  if (isCollaborator) {
    return next();
  }
  
  res.status(403).json({ message: "You don't have access to this project" });
};

// Upload single file
router.post('/api/projects/:id/upload', 
  ensureAuthenticated, 
  ensureProjectAccess, 
  upload.single('file'),
  async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const file = req.file;
      const { path: filepath = '', parentId } = req.body;
      
      if (!file) {
        return res.status(400).json({ error: 'No file provided' });
      }
      
      // Create the file in storage
      const newFile = await storage.createFile({
        projectId,
        name: file.originalname,
        content: file.buffer.toString('utf-8'),
        isFolder: false,
        parentId: parentId ? parseInt(parentId) : null
      });
      
      res.json(newFile);
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({ error: 'Failed to upload file' });
    }
  }
);

// Upload multiple files
router.post('/api/projects/:id/upload-multiple', 
  ensureAuthenticated, 
  ensureProjectAccess, 
  upload.array('files', 100),
  async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const files = req.files as Express.Multer.File[];
      const { parentId } = req.body;
      
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files provided' });
      }
      
      const createdFiles = [];
      
      for (const file of files) {
        const newFile = await storage.createFile({
          projectId,
          name: file.originalname,
          content: file.buffer.toString('utf-8'),
          isFolder: false,
          parentId: parentId ? parseInt(parentId) : null
        });
        createdFiles.push(newFile);
      }
      
      res.json({ files: createdFiles });
    } catch (error) {
      console.error('Error uploading files:', error);
      res.status(500).json({ error: 'Failed to upload files' });
    }
  }
);

// Download file
router.get('/api/files/:id/download', ensureAuthenticated, async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);
    const file = await storage.getFile(fileId);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Check user access
    const project = await storage.getProject(file.projectId);
    if (!project || project.ownerId !== req.user!.id) {
      const collaborators = await storage.getProjectCollaborators(file.projectId);
      const isCollaborator = collaborators.some((c: any) => c.userId === req.user!.id);
      if (!isCollaborator) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(file.content || '');
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

export default router;