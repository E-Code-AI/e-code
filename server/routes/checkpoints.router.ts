import { Router, Request, Response } from 'express';
import { checkpointService } from '../services/checkpoint-service';
import { rollbackService } from '../services/rollback-service';
import { z } from 'zod';
import { createLogger } from '../utils/logger';

const router = Router();
const logger = createLogger('checkpoints-router');

// 🔥 REPLIT AGENT 3: Checkpoint & Rollback API Routes
// Production-ready with atomic transactions, row-level locks, and post-commit validation

/**
 * Validation schemas for request bodies
 */
const CreateCheckpointSchema = z.object({
  projectId: z.number(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.enum(['manual', 'automatic', 'before_action', 'error_recovery']).default('manual'),
  userId: z.number(),
  includeDatabase: z.boolean().default(true),
  includeEnvironment: z.boolean().default(true),
  conversationSnapshot: z.any().optional(),
  conversationId: z.string().optional(),
  userPrompt: z.string().optional(),
  changedFiles: z.array(z.string()).optional(),
  testResults: z.any().optional(),
  parentCheckpointId: z.number().optional(),
  environment: z.enum(['development', 'production']).default('development'),
});

const RestoreCheckpointSchema = z.object({
  checkpointId: z.number(),
  userId: z.number(),
  restoreFiles: z.boolean().default(true),
  restoreDatabase: z.boolean().default(true),
  restoreEnvironment: z.boolean().default(true),
});

const RollbackSchema = z.object({
  projectId: z.number(),
  checkpointId: z.number(),
  userId: z.number(),
  restoreConversation: z.boolean().default(false),
  direction: z.enum(['backward', 'forward']),
});

/**
 * POST /api/checkpoints
 * Create a new checkpoint with atomic transaction + row-level lock
 */
router.post('/checkpoints', async (req: Request, res: Response) => {
  try {
    const data = CreateCheckpointSchema.parse(req.body);

    logger.info(`Creating checkpoint "${data.name}" for project ${data.projectId}`, {
      type: data.type,
      includeDatabase: data.includeDatabase,
      includeEnvironment: data.includeEnvironment,
    });

    const checkpoint = await checkpointService.createCheckpoint(data);

    res.status(201).json({
      success: true,
      checkpoint,
      message: `Checkpoint "${checkpoint.name}" created successfully`,
    });
  } catch (error) {
    logger.error('Failed to create checkpoint:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create checkpoint',
    });
  }
});

/**
 * GET /api/checkpoints/:id
 * Get checkpoint details by ID (direct SELECT, no project filtering)
 */
router.get('/checkpoints/:id', async (req: Request, res: Response) => {
  try {
    const checkpointId = parseInt(req.params.id, 10);
    
    if (isNaN(checkpointId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid checkpoint ID',
      });
    }

    // Get checkpoint from service (direct SELECT by ID)
    const checkpoint = await checkpointService.getCheckpointById(checkpointId);

    if (!checkpoint) {
      return res.status(404).json({
        success: false,
        error: 'Checkpoint not found',
      });
    }

    res.json({
      success: true,
      checkpoint,
    });
  } catch (error) {
    logger.error('Failed to get checkpoint:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get checkpoint',
    });
  }
});

/**
 * GET /api/projects/:projectId/checkpoints
 * List all checkpoints for a project
 */
router.get('/projects/:projectId/checkpoints', async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    const limit = parseInt(req.query.limit as string, 10) || 20;

    if (isNaN(projectId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid project ID',
      });
    }

    const checkpoints = await checkpointService.listCheckpoints(projectId, limit);

    res.json({
      success: true,
      checkpoints,
      count: checkpoints.length,
    });
  } catch (error) {
    logger.error('Failed to list checkpoints:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list checkpoints',
    });
  }
});

/**
 * POST /api/checkpoints/:id/restore
 * Restore a checkpoint (files, database, environment)
 */
router.post('/checkpoints/:id/restore', async (req: Request, res: Response) => {
  try {
    const checkpointId = parseInt(req.params.id, 10);
    
    if (isNaN(checkpointId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid checkpoint ID',
      });
    }

    const data = RestoreCheckpointSchema.parse({
      ...req.body,
      checkpointId,
    });

    logger.info(`Restoring checkpoint ${checkpointId}`, {
      restoreFiles: data.restoreFiles,
      restoreDatabase: data.restoreDatabase,
      restoreEnvironment: data.restoreEnvironment,
    });

    const success = await checkpointService.restoreCheckpoint(data);

    res.json({
      success,
      message: success ? 'Checkpoint restored successfully' : 'Failed to restore checkpoint',
    });
  } catch (error) {
    logger.error('Failed to restore checkpoint:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to restore checkpoint',
    });
  }
});

/**
 * POST /api/checkpoints/rollback
 * Rollback to a previous checkpoint
 */
router.post('/checkpoints/rollback', async (req: Request, res: Response) => {
  try {
    const data = RollbackSchema.parse({
      ...req.body,
      direction: 'backward',
    });

    logger.info(`Rolling back project ${data.projectId} to checkpoint ${data.checkpointId}`);

    const result = await rollbackService.rollbackToCheckpoint(data);

    res.json({
      success: result.success,
      result,
      message: result.success 
        ? `Rolled back to checkpoint ${data.checkpointId}` 
        : `Rollback failed: ${result.error}`,
    });
  } catch (error) {
    logger.error('Rollback failed:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Rollback failed',
    });
  }
});

/**
 * POST /api/checkpoints/rollforward
 * Rollforward to a future checkpoint
 */
router.post('/checkpoints/rollforward', async (req: Request, res: Response) => {
  try {
    const data = RollbackSchema.parse({
      ...req.body,
      direction: 'forward',
    });

    logger.info(`Rolling forward project ${data.projectId} to checkpoint ${data.checkpointId}`);

    const result = await rollbackService.rollforwardToCheckpoint(data);

    res.json({
      success: result.success,
      result,
      message: result.success 
        ? `Rolled forward to checkpoint ${data.checkpointId}` 
        : `Rollforward failed: ${result.error}`,
    });
  } catch (error) {
    logger.error('Rollforward failed:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Rollforward failed',
    });
  }
});

/**
 * GET /api/projects/:projectId/checkpoints/tree
 * Get checkpoint tree structure for visualization
 */
router.get('/projects/:projectId/checkpoints/tree', async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);

    if (isNaN(projectId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid project ID',
      });
    }

    const tree = await rollbackService.getCheckpointTree(projectId);

    res.json({
      success: true,
      tree,
      count: tree.length,
    });
  } catch (error) {
    logger.error('Failed to get checkpoint tree:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get checkpoint tree',
    });
  }
});

/**
 * GET /api/projects/:projectId/checkpoints/navigation
 * Get backward/forward navigation options from current checkpoint
 */
router.get('/projects/:projectId/checkpoints/navigation', async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);

    if (isNaN(projectId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid project ID',
      });
    }

    const navigation = await rollbackService.getNavigationOptions(projectId);

    res.json({
      success: true,
      navigation,
    });
  } catch (error) {
    logger.error('Failed to get navigation options:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get navigation options',
    });
  }
});

/**
 * DELETE /api/checkpoints/:id
 * Delete a checkpoint
 */
router.delete('/checkpoints/:id', async (req: Request, res: Response) => {
  try {
    const checkpointId = parseInt(req.params.id, 10);
    
    if (isNaN(checkpointId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid checkpoint ID',
      });
    }

    logger.info(`Deleting checkpoint ${checkpointId}`);

    const success = await checkpointService.deleteCheckpoint(checkpointId);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Checkpoint not found',
      });
    }

    res.json({
      success: true,
      message: 'Checkpoint deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete checkpoint:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete checkpoint',
    });
  }
});

export default router;
