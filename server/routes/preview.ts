// @ts-nocheck
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

// Get preview URL for a project with port support
router.get('/api/projects/:id/preview-url', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const { port } = req.query;
    const project = await storage.getProject(projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Check if it's an HTML project or has runnable code
    const files = await storage.getFilesByProject(projectId);
    const hasHtmlFile = files.some(f => f.name.endsWith('.html') && !f.isFolder);
    const hasPackageJson = files.some(f => f.name === 'package.json' && !f.isFolder);
    const hasPythonFiles = files.some(f => f.name.endsWith('.py') && !f.isFolder);
    
    if (!hasHtmlFile && !hasPackageJson && !hasPythonFiles) {
      return res.status(400).json({ error: 'No runnable files found in project' });
    }
    
    const { previewService } = await import('../preview/preview-service');
    const preview = previewService.getPreview(projectId);
    
    if (!preview || preview.status !== 'running') {
      // Return potential preview URL for client to start preview
      const previewUrl = `/api/projects/${projectId}/preview/`;
      return res.json({ 
        previewUrl,
        status: 'stopped',
        message: 'Preview server not running. Click start to begin.'
      });
    }
    
    const targetPort = port ? parseInt(port as string) : preview.primaryPort;
    const previewUrl = previewService.getPreviewUrl(projectId, targetPort);
    const availablePorts = previewService.getPreviewPorts(projectId);
    const services = previewService.getPreviewServices(projectId);
    
    res.json({ 
      previewUrl,
      status: preview.status,
      runId: preview.runId,
      ports: availablePorts,
      primaryPort: preview.primaryPort,
      currentPort: targetPort,
      services,
      frameworkType: preview.frameworkType,
      lastHealthCheck: preview.lastHealthCheck
    });
  } catch (error) {
    console.error('Error getting preview URL:', error);
    res.status(500).json({ error: 'Failed to get preview URL' });
  }
});

// Start preview server
router.post('/api/projects/:id/preview/start', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const { runId } = req.body;
    
    const { previewService } = await import('../preview/preview-service');
    const preview = await previewService.startPreview(projectId, runId);
    
    res.json({
      success: true,
      preview: {
        runId: preview.runId,
        status: preview.status,
        ports: preview.ports,
        primaryPort: preview.primaryPort,
        services: preview.exposedServices,
        frameworkType: preview.frameworkType
      }
    });
  } catch (error) {
    console.error('Error starting preview:', error);
    res.status(500).json({ error: 'Failed to start preview server' });
  }
});

// Stop preview server
router.post('/api/projects/:id/preview/stop', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    
    const { previewService } = await import('../preview/preview-service');
    await previewService.stopPreview(projectId);
    
    res.json({ success: true, message: 'Preview server stopped' });
  } catch (error) {
    console.error('Error stopping preview:', error);
    res.status(500).json({ error: 'Failed to stop preview server' });
  }
});

// Switch preview port
router.post('/api/projects/:id/preview/switch-port', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const { port } = req.body;
    
    if (!port || typeof port !== 'number') {
      return res.status(400).json({ error: 'Port number is required' });
    }
    
    const { previewService } = await import('../preview/preview-service');
    const success = await previewService.switchPort(projectId, port);
    
    if (success) {
      res.json({ 
        success: true, 
        port,
        url: previewService.getPreviewUrl(projectId, port)
      });
    } else {
      res.status(400).json({ error: 'Failed to switch to port. Port may not be available or unhealthy.' });
    }
  } catch (error) {
    console.error('Error switching preview port:', error);
    res.status(500).json({ error: 'Failed to switch preview port' });
  }
});

// Get preview status and health
router.get('/api/projects/:id/preview/status', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    
    const { previewService } = await import('../preview/preview-service');
    const preview = previewService.getPreview(projectId);
    
    if (!preview) {
      return res.json({
        status: 'stopped',
        message: 'No preview session found'
      });
    }
    
    res.json({
      status: preview.status,
      runId: preview.runId,
      ports: preview.ports,
      primaryPort: preview.primaryPort,
      services: preview.exposedServices,
      healthChecks: Object.fromEntries(preview.healthChecks),
      lastHealthCheck: preview.lastHealthCheck,
      frameworkType: preview.frameworkType,
      logs: preview.logs.slice(-50) // Return last 50 log lines
    });
  } catch (error) {
    console.error('Error getting preview status:', error);
    res.status(500).json({ error: 'Failed to get preview status' });
  }
});

export default router;