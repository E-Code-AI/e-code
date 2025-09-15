import { Router, Request, Response } from 'express';
import { WebContentIntegrationService } from '../services/web-content-integration-service';
import { ServerFeatureFlagService } from '../services/feature-flag-service';
import multer from 'multer';
import path from 'path';

const router = Router();
const webContentService = new WebContentIntegrationService();
const featureFlagService = ServerFeatureFlagService.getInstance();

// Configure multer for file uploads
const upload = multer({
  dest: 'temp/uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

// Import URL endpoint
router.post('/url', async (req: Request, res: Response) => {
  try {
    const { url, projectId, includeScreenshot = false, screenshotOptions = {} } = req.body;
    
    if (!url || !projectId) {
      return res.status(400).json({ error: 'URL and project ID are required' });
    }
    
    // Get user ID from session/auth (mock for now)
    const userId = 1; // TODO: Get from auth
    
    // Check feature flag
    const urlImportEnabled = await featureFlagService.isUserFlagEnabled(userId, 'import.url');
    if (!urlImportEnabled) {
      return res.status(403).json({ error: 'URL import feature is not enabled' });
    }
    
    const result = await webContentService.importWebContent(url, parseInt(projectId), userId, {
      includeScreenshot: Boolean(includeScreenshot),
      screenshotOptions,
    });
    
    res.json(result);
  } catch (error) {
    console.error('URL import error:', error);
    res.status(500).json({ 
      error: 'Failed to import URL content',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Batch URL import endpoint
router.post('/url/batch', async (req: Request, res: Response) => {
  try {
    const { urls, projectId, includeScreenshot = false, screenshotOptions = {} } = req.body;
    
    if (!urls || !Array.isArray(urls) || urls.length === 0 || !projectId) {
      return res.status(400).json({ error: 'URLs array and project ID are required' });
    }
    
    if (urls.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 URLs allowed per batch' });
    }
    
    // Get user ID from session/auth (mock for now)
    const userId = 1; // TODO: Get from auth
    
    // Check feature flag
    const urlImportEnabled = await featureFlagService.isUserFlagEnabled(userId, 'import.url');
    if (!urlImportEnabled) {
      return res.status(403).json({ error: 'URL import feature is not enabled' });
    }
    
    const results = await webContentService.batchImportWebContent(urls, parseInt(projectId), userId, {
      includeScreenshot: Boolean(includeScreenshot),
      screenshotOptions,
    });
    
    res.json({ results });
  } catch (error) {
    console.error('Batch URL import error:', error);
    res.status(500).json({ 
      error: 'Failed to import URLs',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Screenshot capture endpoint
router.post('/screenshot', async (req: Request, res: Response) => {
  try {
    const { url, width = 1920, height = 1080, fullPage = false, element } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    // Get user ID from session/auth (mock for now)
    const userId = 1; // TODO: Get from auth
    
    // Check feature flag
    const screenshotEnabled = await featureFlagService.isUserFlagEnabled(userId, 'import.screenshot');
    if (!screenshotEnabled) {
      return res.status(403).json({ error: 'Screenshot feature is not enabled' });
    }
    
    const result = await webContentService.captureScreenshot(url, {
      width: parseInt(width),
      height: parseInt(height),
      fullPage: Boolean(fullPage),
      element,
    });
    
    // Return screenshot info (not the buffer for API response)
    res.json({
      url,
      path: result.path,
      dimensions: result.dimensions,
      size: result.buffer.length,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Screenshot capture error:', error);
    res.status(500).json({ 
      error: 'Failed to capture screenshot',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Text extraction from HTML endpoint
router.post('/extract-text', async (req: Request, res: Response) => {
  try {
    const { html, baseUrl } = req.body;
    
    if (!html) {
      return res.status(400).json({ error: 'HTML content is required' });
    }
    
    // Get user ID from session/auth (mock for now)
    const userId = 1; // TODO: Get from auth
    
    // Check feature flag
    const textExtractEnabled = await featureFlagService.isUserFlagEnabled(userId, 'import.textExtract');
    if (!textExtractEnabled) {
      return res.status(403).json({ error: 'Text extraction feature is not enabled' });
    }
    
    const result = await webContentService.extractTextFromHTML(html, baseUrl);
    
    res.json(result);
  } catch (error) {
    console.error('Text extraction error:', error);
    res.status(500).json({ 
      error: 'Failed to extract text from HTML',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// File upload and text extraction endpoint
router.post('/extract-file', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'File is required' });
    }
    
    // Get user ID from session/auth (mock for now)
    const userId = 1; // TODO: Get from auth
    
    // Check feature flag
    const textExtractEnabled = await featureFlagService.isUserFlagEnabled(userId, 'import.textExtract');
    if (!textExtractEnabled) {
      return res.status(403).json({ error: 'Text extraction feature is not enabled' });
    }
    
    // Check file type
    const allowedTypes = ['text/html', 'text/plain', 'text/markdown'];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({ error: 'Unsupported file type' });
    }
    
    // Read file content
    const fs = await import('fs/promises');
    const content = await fs.readFile(file.path, 'utf-8');
    
    let result;
    if (file.mimetype === 'text/html') {
      result = await webContentService.extractTextFromHTML(content);
    } else {
      // For plain text and markdown, return as-is with word count
      const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
      result = {
        content,
        markdown: content,
        wordCount,
      };
    }
    
    // Clean up uploaded file
    await fs.unlink(file.path);
    
    res.json({
      ...result,
      originalFilename: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
    });
  } catch (error) {
    console.error('File extraction error:', error);
    res.status(500).json({ 
      error: 'Failed to extract text from file',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get screenshot file endpoint
router.get('/screenshot/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    
    // Validate filename to prevent path traversal
    if (!/^[a-zA-Z0-9_\-\.]+$/.test(filename)) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    
    const filePath = path.join(process.cwd(), 'temp', 'screenshots', filename);
    
    // Check if file exists and get info
    const fs = await import('fs/promises');
    try {
      const stats = await fs.stat(filePath);
      
      // Set appropriate headers
      res.setHeader('Content-Type', filename.endsWith('.png') ? 'image/png' : 'image/jpeg');
      res.setHeader('Content-Length', stats.size);
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
      
      // Stream the file
      const stream = require('fs').createReadStream(filePath);
      stream.pipe(res);
    } catch (error) {
      res.status(404).json({ error: 'Screenshot not found' });
    }
  } catch (error) {
    console.error('Screenshot retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve screenshot' });
  }
});

// Cleanup endpoint (for admin use)
router.post('/cleanup', async (req: Request, res: Response) => {
  try {
    // TODO: Add admin permission check
    
    await webContentService.cleanup();
    
    res.json({ message: 'Cleanup completed successfully' });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: 'Failed to perform cleanup' });
  }
});

export default router;