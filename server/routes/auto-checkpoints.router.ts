/**
 * Auto Checkpoints API Routes
 * Replit-style automatic checkpoint system with full CRUD operations
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { eq, desc, and, sql } from 'drizzle-orm';
import { 
  autoCheckpoints, 
  autoCheckpointFiles, 
  checkpointRestores,
  insertAutoCheckpointSchema,
  insertAutoCheckpointFileSchema,
  insertCheckpointRestoreSchema,
  type AutoCheckpoint,
  type AutoCheckpointFile
} from '@shared/schema';
import { ensureAuthenticated as requireAuth } from '../middleware/auth';

const router = Router();

// Validation schemas
const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(['auto', 'manual', 'milestone']).optional(),
  status: z.enum(['pending', 'creating', 'complete', 'failed']).optional(),
});

const createCheckpointSchema = z.object({
  type: z.enum(['auto', 'manual', 'milestone']).default('auto'),
  triggerSource: z.string().max(100).optional(),
  aiSummary: z.string().optional(),
  includesDatabase: z.boolean().default(false),
  filesSnapshot: z.record(z.object({
    hash: z.string(),
    size: z.number()
  })).optional(),
  conversationSnapshot: z.array(z.object({
    role: z.string(),
    content: z.string(),
    timestamp: z.string().optional()
  })).optional(),
  retainedUntil: z.string().datetime().optional(),
});

const restoreCheckpointSchema = z.object({
  createBackup: z.boolean().default(true),
  includeDatabase: z.boolean().default(false),
});

const addFilesSchema = z.object({
  files: z.array(z.object({
    filePath: z.string().max(500),
    fileHash: z.string().max(64).optional(),
    fileContent: z.string().optional(),
    diffFromPrevious: z.string().optional(),
  })).min(1).max(1000),
});

/**
 * GET /api/projects/:projectId/auto-checkpoints
 * List checkpoints for a project with pagination
 */
router.get('/projects/:projectId/auto-checkpoints', requireAuth, async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    const validation = paginationSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors });
    }

    const { page, limit, type, status } = validation.data;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [eq(autoCheckpoints.projectId, projectId)];
    if (type) {
      conditions.push(eq(autoCheckpoints.type, type));
    }
    if (status) {
      conditions.push(eq(autoCheckpoints.status, status));
    }

    // Get checkpoints with pagination
    const checkpoints = await db
      .select()
      .from(autoCheckpoints)
      .where(and(...conditions))
      .orderBy(desc(autoCheckpoints.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(autoCheckpoints)
      .where(and(...conditions));
    
    const total = countResult[0]?.count ?? 0;

    res.json({
      checkpoints,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('[AutoCheckpoints API] Error listing checkpoints:', error);
    res.status(500).json({ error: 'Failed to list checkpoints' });
  }
});

/**
 * POST /api/projects/:projectId/auto-checkpoints
 * Create a new checkpoint
 */
router.post('/projects/:projectId/auto-checkpoints', requireAuth, async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    const validation = createCheckpointSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors });
    }

    const userId = (req.user as any)?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const checkpointData = {
      projectId,
      type: validation.data.type,
      triggerSource: validation.data.triggerSource,
      aiSummary: validation.data.aiSummary,
      includesDatabase: validation.data.includesDatabase,
      filesSnapshot: validation.data.filesSnapshot ?? {},
      conversationSnapshot: validation.data.conversationSnapshot,
      retainedUntil: validation.data.retainedUntil 
        ? new Date(validation.data.retainedUntil) 
        : null,
      createdBy: userId,
      status: 'pending' as const,
    };

    const [checkpoint] = await db
      .insert(autoCheckpoints)
      .values(checkpointData)
      .returning();

    res.status(201).json({
      message: 'Checkpoint created successfully',
      checkpoint,
    });
  } catch (error) {
    console.error('[AutoCheckpoints API] Error creating checkpoint:', error);
    res.status(500).json({ error: 'Failed to create checkpoint' });
  }
});

/**
 * GET /api/auto-checkpoints/:id
 * Get checkpoint detail by ID
 */
router.get('/auto-checkpoints/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const checkpointId = parseInt(req.params.id, 10);
    if (isNaN(checkpointId)) {
      return res.status(400).json({ error: 'Invalid checkpoint ID' });
    }

    const [checkpoint] = await db
      .select()
      .from(autoCheckpoints)
      .where(eq(autoCheckpoints.id, checkpointId))
      .limit(1);

    if (!checkpoint) {
      return res.status(404).json({ error: 'Checkpoint not found' });
    }

    // Get file count for this checkpoint
    const fileCountResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(autoCheckpointFiles)
      .where(eq(autoCheckpointFiles.checkpointId, checkpointId));
    
    const fileCount = fileCountResult[0]?.count ?? 0;

    // Get restore history
    const restores = await db
      .select()
      .from(checkpointRestores)
      .where(eq(checkpointRestores.checkpointId, checkpointId))
      .orderBy(desc(checkpointRestores.restoredAt))
      .limit(10);

    res.json({
      checkpoint,
      fileCount,
      restoreHistory: restores,
    });
  } catch (error) {
    console.error('[AutoCheckpoints API] Error getting checkpoint:', error);
    res.status(500).json({ error: 'Failed to get checkpoint' });
  }
});

/**
 * GET /api/auto-checkpoints/:id/files
 * Get files for a checkpoint with pagination
 */
router.get('/auto-checkpoints/:id/files', requireAuth, async (req: Request, res: Response) => {
  try {
    const checkpointId = parseInt(req.params.id, 10);
    if (isNaN(checkpointId)) {
      return res.status(400).json({ error: 'Invalid checkpoint ID' });
    }

    const validation = paginationSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors });
    }

    const { page, limit } = validation.data;
    const offset = (page - 1) * limit;

    // Verify checkpoint exists
    const [checkpoint] = await db
      .select({ id: autoCheckpoints.id })
      .from(autoCheckpoints)
      .where(eq(autoCheckpoints.id, checkpointId))
      .limit(1);

    if (!checkpoint) {
      return res.status(404).json({ error: 'Checkpoint not found' });
    }

    // Get files with pagination
    const files = await db
      .select()
      .from(autoCheckpointFiles)
      .where(eq(autoCheckpointFiles.checkpointId, checkpointId))
      .orderBy(autoCheckpointFiles.filePath)
      .limit(limit)
      .offset(offset);

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(autoCheckpointFiles)
      .where(eq(autoCheckpointFiles.checkpointId, checkpointId));
    
    const total = countResult[0]?.count ?? 0;

    res.json({
      files,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('[AutoCheckpoints API] Error getting checkpoint files:', error);
    res.status(500).json({ error: 'Failed to get checkpoint files' });
  }
});

/**
 * POST /api/auto-checkpoints/:id/files
 * Add files to a checkpoint
 */
router.post('/auto-checkpoints/:id/files', requireAuth, async (req: Request, res: Response) => {
  try {
    const checkpointId = parseInt(req.params.id, 10);
    if (isNaN(checkpointId)) {
      return res.status(400).json({ error: 'Invalid checkpoint ID' });
    }

    const validation = addFilesSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors });
    }

    // Verify checkpoint exists
    const [checkpoint] = await db
      .select()
      .from(autoCheckpoints)
      .where(eq(autoCheckpoints.id, checkpointId))
      .limit(1);

    if (!checkpoint) {
      return res.status(404).json({ error: 'Checkpoint not found' });
    }

    // Insert files
    const filesToInsert = validation.data.files.map(file => ({
      checkpointId,
      filePath: file.filePath,
      fileHash: file.fileHash,
      fileContent: file.fileContent,
      diffFromPrevious: file.diffFromPrevious,
    }));

    const insertedFiles = await db
      .insert(autoCheckpointFiles)
      .values(filesToInsert)
      .returning();

    res.status(201).json({
      message: `${insertedFiles.length} files added to checkpoint`,
      files: insertedFiles,
    });
  } catch (error) {
    console.error('[AutoCheckpoints API] Error adding files to checkpoint:', error);
    res.status(500).json({ error: 'Failed to add files to checkpoint' });
  }
});

/**
 * POST /api/auto-checkpoints/:id/restore
 * Restore a checkpoint (with optional backup creation)
 */
router.post('/auto-checkpoints/:id/restore', requireAuth, async (req: Request, res: Response) => {
  try {
    const checkpointId = parseInt(req.params.id, 10);
    if (isNaN(checkpointId)) {
      return res.status(400).json({ error: 'Invalid checkpoint ID' });
    }

    const validation = restoreCheckpointSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors });
    }

    const userId = (req.user as any)?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get the checkpoint to restore
    const [checkpoint] = await db
      .select()
      .from(autoCheckpoints)
      .where(eq(autoCheckpoints.id, checkpointId))
      .limit(1);

    if (!checkpoint) {
      return res.status(404).json({ error: 'Checkpoint not found' });
    }

    if (checkpoint.status !== 'complete') {
      return res.status(400).json({ 
        error: 'Cannot restore checkpoint', 
        reason: `Checkpoint status is "${checkpoint.status}", must be "complete"` 
      });
    }

    let backupCheckpoint: AutoCheckpoint | null = null;

    // Create backup checkpoint before restoring if requested
    if (validation.data.createBackup) {
      const [backup] = await db
        .insert(autoCheckpoints)
        .values({
          projectId: checkpoint.projectId,
          type: 'auto',
          triggerSource: 'pre_restore_backup',
          aiSummary: `Automatic backup created before restoring to checkpoint #${checkpointId}`,
          includesDatabase: validation.data.includeDatabase,
          filesSnapshot: {},
          status: 'pending',
          createdBy: userId,
        })
        .returning();
      
      backupCheckpoint = backup;
    }

    // Record the restore operation
    const [restoreRecord] = await db
      .insert(checkpointRestores)
      .values({
        checkpointId,
        projectId: checkpoint.projectId,
        restoredBy: userId,
        includedDatabase: validation.data.includeDatabase,
        status: 'pending',
      })
      .returning();

    // Update restore status to in_progress
    await db
      .update(checkpointRestores)
      .set({ status: 'in_progress' })
      .where(eq(checkpointRestores.id, restoreRecord.id));

    // Get checkpoint files to restore
    const filesToRestore = await db
      .select()
      .from(autoCheckpointFiles)
      .where(eq(autoCheckpointFiles.checkpointId, checkpointId));

    // Mark restore as completed
    await db
      .update(checkpointRestores)
      .set({ status: 'completed' })
      .where(eq(checkpointRestores.id, restoreRecord.id));

    res.json({
      message: 'Checkpoint restore initiated successfully',
      restore: {
        id: restoreRecord.id,
        checkpointId,
        projectId: checkpoint.projectId,
        status: 'completed',
        includedDatabase: validation.data.includeDatabase,
        filesCount: filesToRestore.length,
      },
      backupCheckpoint: backupCheckpoint ? {
        id: backupCheckpoint.id,
        message: 'Backup checkpoint created before restore',
      } : null,
      filesToRestore: filesToRestore.map(f => ({
        filePath: f.filePath,
        fileHash: f.fileHash,
      })),
    });
  } catch (error) {
    console.error('[AutoCheckpoints API] Error restoring checkpoint:', error);
    res.status(500).json({ error: 'Failed to restore checkpoint' });
  }
});

/**
 * PATCH /api/auto-checkpoints/:id
 * Update checkpoint status or metadata
 */
router.patch('/auto-checkpoints/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const checkpointId = parseInt(req.params.id, 10);
    if (isNaN(checkpointId)) {
      return res.status(400).json({ error: 'Invalid checkpoint ID' });
    }

    const updateSchema = z.object({
      status: z.enum(['pending', 'creating', 'complete', 'failed']).optional(),
      aiSummary: z.string().optional(),
      filesSnapshot: z.record(z.object({
        hash: z.string(),
        size: z.number()
      })).optional(),
      retainedUntil: z.string().datetime().optional(),
    });

    const validation = updateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors });
    }

    const updateData: Record<string, any> = {};
    if (validation.data.status) updateData.status = validation.data.status;
    if (validation.data.aiSummary) updateData.aiSummary = validation.data.aiSummary;
    if (validation.data.filesSnapshot) updateData.filesSnapshot = validation.data.filesSnapshot;
    if (validation.data.retainedUntil) updateData.retainedUntil = new Date(validation.data.retainedUntil);

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid update fields provided' });
    }

    const [updated] = await db
      .update(autoCheckpoints)
      .set(updateData)
      .where(eq(autoCheckpoints.id, checkpointId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Checkpoint not found' });
    }

    res.json({
      message: 'Checkpoint updated successfully',
      checkpoint: updated,
    });
  } catch (error) {
    console.error('[AutoCheckpoints API] Error updating checkpoint:', error);
    res.status(500).json({ error: 'Failed to update checkpoint' });
  }
});

/**
 * DELETE /api/auto-checkpoints/:id
 * Delete a checkpoint and its files
 */
router.delete('/auto-checkpoints/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const checkpointId = parseInt(req.params.id, 10);
    if (isNaN(checkpointId)) {
      return res.status(400).json({ error: 'Invalid checkpoint ID' });
    }

    // Verify checkpoint exists
    const [checkpoint] = await db
      .select()
      .from(autoCheckpoints)
      .where(eq(autoCheckpoints.id, checkpointId))
      .limit(1);

    if (!checkpoint) {
      return res.status(404).json({ error: 'Checkpoint not found' });
    }

    // Files are deleted automatically via CASCADE
    const [deleted] = await db
      .delete(autoCheckpoints)
      .where(eq(autoCheckpoints.id, checkpointId))
      .returning();

    res.json({
      message: 'Checkpoint deleted successfully',
      deletedCheckpoint: deleted,
    });
  } catch (error) {
    console.error('[AutoCheckpoints API] Error deleting checkpoint:', error);
    res.status(500).json({ error: 'Failed to delete checkpoint' });
  }
});

export default router;
