import express from 'express';
import { webContentService } from '../services/web-content-service';
import { featureFlagsService } from '../services/feature-flags-service';
import { createLogger } from '../utils/logger';
import { z } from 'zod';

const router = express.Router();
const logger = createLogger('WebImportRoutes');

// Input validation schemas
const urlImportSchema = z.object({
  url: z.string().url('Invalid URL format'),
  projectId: z.number().optional(),
  options: z.object({
    includeScreenshot: z.boolean().optional().default(false),
    saveArtifacts: z.boolean().optional().default(true),
    extractionType: z.enum(['full', 'content-only', 'readability']).optional().default('readability')
  }).optional().default({})
});

const screenshotSchema = z.object({
  url: z.string().url('Invalid URL format'),
  viewport: z.object({
    width: z.number().min(320).max(1920).optional().default(1920),
    height: z.number().min(240).max(1080).optional().default(1080)
  }).optional()
});

const featureFlagUpdateSchema = z.object({
  feature: z.enum(['urlImport', 'screenshotCapture', 'textExtraction', 'readabilityAlgorithm', 'htmlToMarkdown']),
  enabled: z.boolean()
});

// Telemetry data collection
interface TelemetryData {
  userId: number;
  action: 'import_success' | 'import_failure' | 'screenshot_success' | 'screenshot_failure';
  url: string;
  processingTime: number;
  contentLength?: number;
  errorMessage?: string;
  userAgent?: string;
  timestamp: Date;
}

async function logTelemetry(data: TelemetryData): Promise<void> {
  try {
    logger.info('Web import telemetry:', data);
    // In a real implementation, this would send to analytics service
    // await analyticsService.track('web_import', data);
  } catch (error) {
    logger.error('Failed to log telemetry:', error);
  }
}

// Middleware to check authentication
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!req.user?.id) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

// POST /api/import/url - Import content from URL
router.post('/url', requireAuth, async (req: express.Request, res: express.Response) => {
  const startTime = Date.now();
  const userId = req.user!.id;

  try {
    // Validate input
    const { url, projectId, options } = urlImportSchema.parse(req.body);

    logger.info(`URL import request from user ${userId}: ${url}`);

    // Check if user has permission to import
    const canImport = await featureFlagsService.isWebImportEnabled(userId);
    if (!canImport) {
      await logTelemetry({
        userId,
        action: 'import_failure',
        url,
        processingTime: Date.now() - startTime,
        errorMessage: 'Feature not enabled',
        timestamp: new Date()
      });
      
      return res.status(403).json({ 
        error: 'Web import feature is not enabled for your account',
        code: 'FEATURE_DISABLED'
      });
    }

    // Perform the import
    const result = await webContentService.importFromUrl(url, userId, projectId, options);

    const processingTime = Date.now() - startTime;

    if (result.metadata.success) {
      await logTelemetry({
        userId,
        action: 'import_success',
        url,
        processingTime,
        contentLength: result.content.content?.length || 0,
        userAgent: req.headers['user-agent'],
        timestamp: new Date()
      });

      res.json({
        success: true,
        data: {
          content: result.content,
          screenshot: result.screenshot,
          artifacts: result.artifacts,
          metadata: {
            importId: result.metadata.importId,
            processingTime: result.metadata.processingTime,
            wordCount: result.content.wordCount,
            readingTime: result.content.readingTime
          }
        }
      });
    } else {
      await logTelemetry({
        userId,
        action: 'import_failure',
        url,
        processingTime,
        errorMessage: result.metadata.error,
        timestamp: new Date()
      });

      res.status(400).json({
        success: false,
        error: result.metadata.error || 'Failed to import content',
        code: 'IMPORT_FAILED'
      });
    }

  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await logTelemetry({
      userId,
      action: 'import_failure',
      url: req.body.url || 'unknown',
      processingTime,
      errorMessage,
      timestamp: new Date()
    });

    logger.error(`URL import failed for user ${userId}:`, error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input parameters',
        details: error.errors,
        code: 'VALIDATION_ERROR'
      });
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /api/import/screenshot - Capture screenshot only
router.post('/screenshot', requireAuth, async (req: express.Request, res: express.Response) => {
  const startTime = Date.now();
  const userId = req.user!.id;

  try {
    // Validate input
    const { url, viewport } = screenshotSchema.parse(req.body);

    logger.info(`Screenshot request from user ${userId}: ${url}`);

    // Check if user has permission to capture screenshots
    const canScreenshot = await featureFlagsService.isScreenshotEnabled(userId);
    if (!canScreenshot) {
      await logTelemetry({
        userId,
        action: 'screenshot_failure',
        url,
        processingTime: Date.now() - startTime,
        errorMessage: 'Feature not enabled',
        timestamp: new Date()
      });

      return res.status(403).json({
        error: 'Screenshot capture feature is not enabled for your account',
        code: 'FEATURE_DISABLED'
      });
    }

    // Capture screenshot
    const screenshot = await webContentService.captureScreenshot(url, userId);

    const processingTime = Date.now() - startTime;

    await logTelemetry({
      userId,
      action: 'screenshot_success',
      url,
      processingTime,
      userAgent: req.headers['user-agent'],
      timestamp: new Date()
    });

    res.json({
      success: true,
      data: {
        screenshot,
        metadata: {
          processingTime,
          capturedAt: screenshot.metadata.capturedAt
        }
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await logTelemetry({
      userId,
      action: 'screenshot_failure',
      url: req.body.url || 'unknown',
      processingTime,
      errorMessage,
      timestamp: new Date()
    });

    logger.error(`Screenshot capture failed for user ${userId}:`, error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input parameters',
        details: error.errors,
        code: 'VALIDATION_ERROR'
      });
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /api/import/status - Get import feature status
router.get('/status', requireAuth, async (req: express.Request, res: express.Response) => {
  try {
    const userId = req.user!.id;
    const flags = await featureFlagsService.getWebImportFeatureFlags(userId);

    res.json({
      success: true,
      data: {
        features: {
          urlImport: flags.urlImport,
          screenshotCapture: flags.screenshotCapture,
          textExtraction: flags.textExtraction,
          readabilityAlgorithm: flags.readabilityAlgorithm,
          htmlToMarkdown: flags.htmlToMarkdown
        },
        enabled: flags.urlImport
      }
    });

  } catch (error) {
    logger.error('Failed to get import status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get feature status',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /api/import/feature-flags - Update feature flags (admin only)
router.post('/feature-flags', requireAuth, async (req: express.Request, res: express.Response) => {
  try {
    const userId = req.user!.id;
    
    // In a real implementation, check if user is admin
    // if (!req.user.isAdmin) {
    //   return res.status(403).json({ error: 'Admin access required' });
    // }

    const { feature, enabled } = featureFlagUpdateSchema.parse(req.body);

    if (enabled) {
      await featureFlagsService.enableWebImportFeature(userId, feature);
    } else {
      await featureFlagsService.disableWebImportFeature(userId, feature);
    }

    logger.info(`Feature flag updated for user ${userId}: ${feature} = ${enabled}`);

    res.json({
      success: true,
      message: `Feature '${feature}' ${enabled ? 'enabled' : 'disabled'} successfully`
    });

  } catch (error) {
    logger.error('Failed to update feature flags:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input parameters',
        details: error.errors,
        code: 'VALIDATION_ERROR'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update feature flags',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /api/import/artifacts/:importId - Get import artifacts
router.get('/artifacts/:importId', requireAuth, async (req: express.Request, res: express.Response) => {
  try {
    const { importId } = req.params;
    const { type } = req.query;

    // In a real implementation, validate user access to this import
    // and serve the requested artifact file

    logger.info(`Artifact request for import ${importId}, type: ${type}`);

    // Placeholder implementation
    res.status(501).json({
      success: false,
      error: 'Artifact serving not yet implemented',
      code: 'NOT_IMPLEMENTED'
    });

  } catch (error) {
    logger.error('Failed to get artifacts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get artifacts',
      code: 'INTERNAL_ERROR'
    });
  }
});

export default router;