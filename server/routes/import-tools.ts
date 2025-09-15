import { Router, Request, Response } from 'express';
import { EnhancedFigmaImportService } from '../services/enhanced-figma-import-service';
import { BoltMigrationService } from '../services/bolt-migration-service';
import { EnhancedGitHubImportService } from '../services/enhanced-github-import-service';
import { ServerFeatureFlagService } from '../services/feature-flag-service';
import multer from 'multer';
import path from 'path';

const router = Router();
const figmaService = new EnhancedFigmaImportService();
const boltService = new BoltMigrationService();
const githubService = new EnhancedGitHubImportService();
const featureFlagService = ServerFeatureFlagService.getInstance();

// Configure multer for file uploads
const upload = multer({
  dest: 'temp/uploads/',
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit for Bolt.new projects
  },
});

// Figma Import Routes
router.post('/figma', async (req: Request, res: Response) => {
  try {
    const { figmaUrl, accessToken, projectId } = req.body;
    
    if (!figmaUrl || !accessToken || !projectId) {
      return res.status(400).json({ error: 'Figma URL, access token, and project ID are required' });
    }
    
    // Get user ID from session/auth (mock for now)
    const userId = 1; // TODO: Get from auth
    
    // Check feature flag
    const figmaEnabled = await featureFlagService.isUserFlagEnabled(userId, 'import.figma');
    if (!figmaEnabled) {
      return res.status(403).json({ error: 'Figma import feature is not enabled' });
    }
    
    // Validate token
    const isValidToken = await figmaService.validateFigmaToken(accessToken);
    if (!isValidToken) {
      return res.status(401).json({ error: 'Invalid Figma access token' });
    }
    
    const result = await figmaService.importFromFigma({
      projectId: parseInt(projectId),
      userId,
      figmaUrl,
      accessToken,
    });
    
    res.json(result);
  } catch (error) {
    console.error('Figma import error:', error);
    res.status(500).json({ 
      error: 'Failed to import from Figma',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Validate Figma token
router.post('/figma/validate-token', async (req: Request, res: Response) => {
  try {
    const { accessToken } = req.body;
    
    if (!accessToken) {
      return res.status(400).json({ error: 'Access token is required' });
    }
    
    const isValid = await figmaService.validateFigmaToken(accessToken);
    
    if (isValid) {
      const userInfo = await figmaService.getFigmaUserInfo(accessToken);
      res.json({ valid: true, user: userInfo });
    } else {
      res.json({ valid: false });
    }
  } catch (error) {
    console.error('Figma token validation error:', error);
    res.status(500).json({ error: 'Failed to validate token' });
  }
});

// Bolt.new Migration Routes
router.post('/bolt/zip', upload.single('project'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    const { projectId } = req.body;
    
    if (!file || !projectId) {
      return res.status(400).json({ error: 'Project ZIP file and project ID are required' });
    }
    
    // Get user ID from session/auth (mock for now)
    const userId = 1; // TODO: Get from auth
    
    // Check feature flag
    const boltEnabled = await featureFlagService.isUserFlagEnabled(userId, 'import.bolt');
    if (!boltEnabled) {
      return res.status(403).json({ error: 'Bolt.new import feature is not enabled' });
    }
    
    const result = await boltService.migrateBoltProject({
      projectId: parseInt(projectId),
      userId,
      source: file.path,
      sourceType: 'zip',
    });
    
    // Clean up uploaded file
    const fs = await import('fs/promises');
    await fs.unlink(file.path);
    
    res.json(result);
  } catch (error) {
    console.error('Bolt.new migration error:', error);
    res.status(500).json({ 
      error: 'Failed to migrate Bolt.new project',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/bolt/url', async (req: Request, res: Response) => {
  try {
    const { url, projectId } = req.body;
    
    if (!url || !projectId) {
      return res.status(400).json({ error: 'Project URL and project ID are required' });
    }
    
    // Get user ID from session/auth (mock for now)
    const userId = 1; // TODO: Get from auth
    
    // Check feature flag
    const boltEnabled = await featureFlagService.isUserFlagEnabled(userId, 'import.bolt');
    if (!boltEnabled) {
      return res.status(403).json({ error: 'Bolt.new import feature is not enabled' });
    }
    
    const result = await boltService.migrateBoltProject({
      projectId: parseInt(projectId),
      userId,
      source: url,
      sourceType: 'url',
    });
    
    res.json(result);
  } catch (error) {
    console.error('Bolt.new URL migration error:', error);
    res.status(500).json({ 
      error: 'Failed to migrate Bolt.new project from URL',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Enhanced GitHub Import Routes
router.post('/github', async (req: Request, res: Response) => {
  try {
    const { 
      repoUrl, 
      projectId, 
      accessToken, 
      branch = 'main', 
      subdirectory, 
      includeLFS = false 
    } = req.body;
    
    if (!repoUrl || !projectId) {
      return res.status(400).json({ error: 'Repository URL and project ID are required' });
    }
    
    // Get user ID from session/auth (mock for now)
    const userId = 1; // TODO: Get from auth
    
    // Check feature flag
    const githubEnabled = await featureFlagService.isUserFlagEnabled(userId, 'import.githubEnhanced');
    if (!githubEnabled) {
      return res.status(403).json({ error: 'Enhanced GitHub import feature is not enabled' });
    }
    
    // Validate GitHub token if provided
    if (accessToken) {
      const tokenValidation = await githubService.validateGitHubToken(accessToken);
      if (!tokenValidation.valid) {
        return res.status(401).json({ error: 'Invalid GitHub access token' });
      }
    }
    
    // Set up progress tracking via WebSocket or SSE
    const progressCallback = (progress: any) => {
      // In a real implementation, this would send progress updates
      // via WebSocket or Server-Sent Events
      console.log('Import progress:', progress);
    };
    
    const result = await githubService.importGitHubRepo({
      projectId: parseInt(projectId),
      userId,
      repoUrl,
      accessToken,
      branch,
      subdirectory,
      includeLFS,
    }, progressCallback);
    
    res.json(result);
  } catch (error) {
    console.error('GitHub import error:', error);
    res.status(500).json({ 
      error: 'Failed to import from GitHub',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Validate GitHub token
router.post('/github/validate-token', async (req: Request, res: Response) => {
  try {
    const { accessToken } = req.body;
    
    if (!accessToken) {
      return res.status(400).json({ error: 'Access token is required' });
    }
    
    const validation = await githubService.validateGitHubToken(accessToken);
    
    res.json(validation);
  } catch (error) {
    console.error('GitHub token validation error:', error);
    res.status(500).json({ error: 'Failed to validate token' });
  }
});

// Search GitHub repositories
router.get('/github/search', async (req: Request, res: Response) => {
  try {
    const { q, sort, order, per_page, page } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const results = await githubService.searchRepositories(q as string, {
      sort: sort as 'stars' | 'forks' | 'updated',
      order: order as 'asc' | 'desc',
      per_page: per_page ? parseInt(per_page as string) : undefined,
      page: page ? parseInt(page as string) : undefined,
    });
    
    res.json(results);
  } catch (error) {
    console.error('GitHub search error:', error);
    res.status(500).json({ 
      error: 'Failed to search repositories',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// List user repositories
router.get('/github/user/:username/repos', async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    
    const repos = await githubService.listUserRepositories(username);
    
    res.json({ repositories: repos });
  } catch (error) {
    console.error('GitHub user repos error:', error);
    res.status(500).json({ 
      error: 'Failed to list user repositories',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Import Tools status endpoint
router.get('/status', async (req: Request, res: Response) => {
  try {
    // Get user ID from session/auth (mock for now)
    const userId = 1; // TODO: Get from auth
    
    const status = {
      figma: await featureFlagService.isUserFlagEnabled(userId, 'import.figma'),
      bolt: await featureFlagService.isUserFlagEnabled(userId, 'import.bolt'),
      githubEnhanced: await featureFlagService.isUserFlagEnabled(userId, 'import.githubEnhanced'),
      url: await featureFlagService.isUserFlagEnabled(userId, 'import.url'),
      screenshot: await featureFlagService.isUserFlagEnabled(userId, 'import.screenshot'),
      textExtract: await featureFlagService.isUserFlagEnabled(userId, 'import.textExtract'),
    };
    
    res.json(status);
  } catch (error) {
    console.error('Import tools status error:', error);
    res.status(500).json({ error: 'Failed to get import tools status' });
  }
});

// Import Tools capabilities endpoint
router.get('/capabilities', async (req: Request, res: Response) => {
  try {
    const capabilities = {
      figma: {
        name: 'Figma Import',
        description: 'Import designs from Figma with design tokens and components',
        features: [
          'Design token extraction',
          'Component code generation',
          'Theme file creation',
          'Real Figma API integration'
        ],
        requirements: ['Figma access token']
      },
      bolt: {
        name: 'Bolt.new Migration',
        description: 'Migrate projects from Bolt.new to E-Code',
        features: [
          'Project structure migration',
          'Dependency conversion',
          'Configuration generation',
          'Framework detection'
        ],
        requirements: ['ZIP file or repository URL']
      },
      githubEnhanced: {
        name: 'Enhanced GitHub Import',
        description: 'Advanced GitHub repository import with LFS support',
        features: [
          'Large repository support',
          'LFS file handling',
          'Progress tracking',
          'Rate limit management',
          'Subdirectory selection'
        ],
        requirements: ['GitHub access token (optional for public repos)']
      }
    };
    
    res.json(capabilities);
  } catch (error) {
    console.error('Import tools capabilities error:', error);
    res.status(500).json({ error: 'Failed to get import tools capabilities' });
  }
});

export default router;