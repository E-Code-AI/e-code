import { Router } from 'express';
import { storage } from '../storage';
// Import removed - ensureAuthenticated will be defined locally

// Middleware to ensure a user is authenticated
const ensureAuthenticated = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

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

import path from 'path';

const router = Router();

// Live preview for HTML/CSS/JS projects
router.get('/api/projects/:id/preview/:filepath(*)', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const filepath = req.params.filepath || 'index.html';
    
    // Get all project files
    const files = await storage.getFilesByProject(projectId);
    
    // Find the requested file
    const file = files.find(f => f.name === filepath && !f.isFolder);
    
    if (!file) {
      // Try to find index.html as default
      const indexFile = files.find(f => f.name === 'index.html' && !f.isFolder);
      if (indexFile) {
        res.type('html').send(indexFile.content || '');
        return;
      }
      return res.status(404).send('File not found');
    }
    
    // Set appropriate content type
    const ext = path.extname(filepath).toLowerCase();
    switch (ext) {
      case '.html':
        res.type('text/html');
        break;
      case '.css':
        res.type('text/css');
        break;
      case '.js':
        res.type('application/javascript');
        break;
      case '.json':
        res.type('application/json');
        break;
      case '.png':
        res.type('image/png');
        break;
      case '.jpg':
      case '.jpeg':
        res.type('image/jpeg');
        break;
      case '.gif':
        res.type('image/gif');
        break;
      case '.svg':
        res.type('image/svg+xml');
        break;
      default:
        res.type('text/plain');
    }
    
    // For HTML files, inject a script to handle relative paths
    if (ext === '.html' && file.content) {
      const modifiedContent = file.content.replace(
        /<head>/i,
        `<head>
        <base href="/api/projects/${projectId}/preview/">
        <script>
          // Handle relative imports for JS modules
          const originalFetch = window.fetch;
          window.fetch = function(url, ...args) {
            if (typeof url === 'string' && !url.startsWith('http') && !url.startsWith('/api')) {
              url = '/api/projects/${projectId}/preview/' + url;
            }
            return originalFetch(url, ...args);
          };
        </script>`
      );
      res.send(modifiedContent);
    } else {
      res.send(file.content || '');
    }
  } catch (error) {
    console.error('Error serving preview:', error);
    res.status(500).send('Failed to serve preview');
  }
});

// Get preview URL for a project
router.get('/api/projects/:id/preview-url', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const project = await storage.getProject(projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Check if it's an HTML project
    const files = await storage.getFilesByProject(projectId);
    const hasHtmlFile = files.some(f => f.name.endsWith('.html') && !f.isFolder);
    
    if (!hasHtmlFile) {
      return res.status(400).json({ error: 'No HTML files found in project' });
    }
    
    const previewUrl = `/api/projects/${projectId}/preview/`;
    res.json({ previewUrl });
  } catch (error) {
    console.error('Error getting preview URL:', error);
    res.status(500).json({ error: 'Failed to get preview URL' });
  }
});

export default router;