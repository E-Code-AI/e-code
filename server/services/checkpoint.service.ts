/**
 * Checkpoint Service
 * Manages Replit-style automatic checkpoint system for project versioning
 * 
 * Provides functionality for creating, retrieving, and managing checkpoints
 * that capture project state at specific points in time.
 */

import { db } from '../db';
import { 
  autoCheckpoints, 
  autoCheckpointFiles, 
  checkpointRestores,
  type AutoCheckpoint,
  type InsertAutoCheckpoint,
  type AutoCheckpointFile,
  type CheckpointRestore
} from '../../shared/schema';
import { eq, desc, lt, and, sql, inArray } from 'drizzle-orm';
import { EventEmitter } from 'events';

export interface CheckpointWithFiles extends AutoCheckpoint {
  files?: AutoCheckpointFile[];
}

export interface CreateCheckpointOptions {
  type?: 'auto' | 'manual' | 'milestone';
  triggerSource?: string;
  includesDatabase?: boolean;
  aiSummary?: string;
  filesSnapshot?: Record<string, { hash: string; size: number }>;
  conversationSnapshot?: Array<{ role: string; content: string; timestamp?: string }>;
  createdBy?: number;
}

export interface RestoreOptions {
  includedDatabase?: boolean;
  status: string;
}

export class CheckpointService extends EventEmitter {
  constructor() {
    super();
  }

  /**
   * Create a new checkpoint for a project
   */
  async createCheckpoint(
    projectId: number, 
    options: CreateCheckpointOptions = {}
  ): Promise<AutoCheckpoint> {
    const {
      type = 'auto',
      triggerSource,
      includesDatabase = false,
      aiSummary,
      filesSnapshot = {},
      conversationSnapshot,
      createdBy
    } = options;

    const insertData: InsertAutoCheckpoint = {
      projectId,
      type,
      triggerSource,
      status: 'complete',
      aiSummary,
      includesDatabase,
      filesSnapshot,
      conversationSnapshot,
      createdBy
    };

    const [checkpoint] = await db
      .insert(autoCheckpoints)
      .values(insertData)
      .returning();

    this.emit('checkpointCreated', { projectId, checkpoint });
    console.log(`[CheckpointService] Created checkpoint ${checkpoint.id} for project ${projectId}`);

    return checkpoint;
  }

  /**
   * Get all checkpoints for a project, ordered by creation date (newest first)
   */
  async getCheckpoints(projectId: number, limit: number = 50): Promise<AutoCheckpoint[]> {
    const checkpoints = await db
      .select()
      .from(autoCheckpoints)
      .where(eq(autoCheckpoints.projectId, projectId))
      .orderBy(desc(autoCheckpoints.createdAt))
      .limit(limit);

    return checkpoints;
  }

  /**
   * Get a single checkpoint by ID
   */
  async getCheckpoint(id: number): Promise<AutoCheckpoint | null> {
    const [checkpoint] = await db
      .select()
      .from(autoCheckpoints)
      .where(eq(autoCheckpoints.id, id))
      .limit(1);

    return checkpoint || null;
  }

  /**
   * Get a checkpoint with its associated files
   */
  async getCheckpointWithFiles(id: number): Promise<CheckpointWithFiles | null> {
    const checkpoint = await this.getCheckpoint(id);
    if (!checkpoint) {
      return null;
    }

    const files = await db
      .select()
      .from(autoCheckpointFiles)
      .where(eq(autoCheckpointFiles.checkpointId, id));

    return {
      ...checkpoint,
      files
    };
  }

  /**
   * Add files to a checkpoint
   */
  async addCheckpointFiles(
    checkpointId: number,
    files: Array<{
      filePath: string;
      fileHash?: string;
      fileContent?: string;
      diffFromPrevious?: string;
    }>
  ): Promise<AutoCheckpointFile[]> {
    if (files.length === 0) {
      return [];
    }

    const insertData = files.map(file => ({
      checkpointId,
      filePath: file.filePath,
      fileHash: file.fileHash,
      fileContent: file.fileContent,
      diffFromPrevious: file.diffFromPrevious
    }));

    const insertedFiles = await db
      .insert(autoCheckpointFiles)
      .values(insertData)
      .returning();

    return insertedFiles;
  }

  /**
   * Delete old checkpoints for retention management
   * Keeps the most recent `keepCount` checkpoints and deletes the rest
   * Returns the number of checkpoints deleted
   */
  async pruneOldCheckpoints(projectId: number, keepCount: number): Promise<number> {
    const allCheckpoints = await db
      .select({ id: autoCheckpoints.id })
      .from(autoCheckpoints)
      .where(eq(autoCheckpoints.projectId, projectId))
      .orderBy(desc(autoCheckpoints.createdAt));

    if (allCheckpoints.length <= keepCount) {
      return 0;
    }

    const checkpointsToDelete = allCheckpoints.slice(keepCount);
    const idsToDelete = checkpointsToDelete.map(c => c.id);

    await db
      .delete(autoCheckpoints)
      .where(inArray(autoCheckpoints.id, idsToDelete));

    this.emit('checkpointsPruned', { projectId, count: idsToDelete.length });
    console.log(`[CheckpointService] Pruned ${idsToDelete.length} old checkpoints for project ${projectId}`);

    return idsToDelete.length;
  }

  /**
   * Delete a specific checkpoint by ID
   */
  async deleteCheckpoint(id: number): Promise<boolean> {
    const result = await db
      .delete(autoCheckpoints)
      .where(eq(autoCheckpoints.id, id))
      .returning({ id: autoCheckpoints.id });

    if (result.length > 0) {
      this.emit('checkpointDeleted', { checkpointId: id });
      console.log(`[CheckpointService] Deleted checkpoint ${id}`);
      return true;
    }

    return false;
  }

  /**
   * Log a restore action for audit purposes
   */
  async logRestore(
    checkpointId: number, 
    projectId: number, 
    userId: number, 
    options: RestoreOptions
  ): Promise<CheckpointRestore> {
    const { includedDatabase = false, status } = options;

    const [restoreLog] = await db
      .insert(checkpointRestores)
      .values({
        checkpointId,
        projectId,
        restoredBy: userId,
        includedDatabase,
        status
      })
      .returning();

    this.emit('checkpointRestored', { checkpointId, projectId, userId, status });
    console.log(`[CheckpointService] Logged restore of checkpoint ${checkpointId} by user ${userId}`);

    return restoreLog;
  }

  /**
   * Get restore history for a project
   */
  async getRestoreHistory(projectId: number, limit: number = 20): Promise<CheckpointRestore[]> {
    const history = await db
      .select()
      .from(checkpointRestores)
      .where(eq(checkpointRestores.projectId, projectId))
      .orderBy(desc(checkpointRestores.restoredAt))
      .limit(limit);

    return history;
  }

  /**
   * Update checkpoint status
   */
  async updateCheckpointStatus(
    id: number, 
    status: 'pending' | 'creating' | 'complete' | 'failed'
  ): Promise<AutoCheckpoint | null> {
    const [updated] = await db
      .update(autoCheckpoints)
      .set({ status })
      .where(eq(autoCheckpoints.id, id))
      .returning();

    return updated || null;
  }

  /**
   * Get the latest checkpoint for a project
   */
  async getLatestCheckpoint(projectId: number): Promise<AutoCheckpoint | null> {
    const [checkpoint] = await db
      .select()
      .from(autoCheckpoints)
      .where(eq(autoCheckpoints.projectId, projectId))
      .orderBy(desc(autoCheckpoints.createdAt))
      .limit(1);

    return checkpoint || null;
  }

  /**
   * Count checkpoints for a project
   */
  async countCheckpoints(projectId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(autoCheckpoints)
      .where(eq(autoCheckpoints.projectId, projectId));

    return result[0]?.count || 0;
  }
}

export const checkpointService = new CheckpointService();
