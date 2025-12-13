/**
 * Checkpoint Restore Service
 * Handles restoring project state from checkpoints
 * 
 * Works with the CheckpointService and WorkspaceSnapshotService
 * to perform full project rollbacks.
 */

import { db } from '../db';
import { autoCheckpoints, autoCheckpointFiles, projects } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { checkpointService } from './checkpoint.service';
import { workspaceSnapshotService, type FileSnapshot } from './workspace-snapshot.service';
import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface RestoreResult {
  success: boolean;
  checkpointId: number;
  projectId: number;
  restoredFiles: number;
  errors: string[];
  duration: number;
}

export interface RestoreOptions {
  restoreFiles?: boolean;
  createBackupCheckpoint?: boolean;
  userId?: number;
}

export class CheckpointRestoreService extends EventEmitter {
  constructor() {
    super();
  }

  /**
   * Get project base path for file operations
   */
  private getProjectBasePath(projectId: number): string {
    return path.join(process.cwd(), 'projects', String(projectId));
  }

  /**
   * Restore a project to a specific checkpoint
   */
  async restoreToCheckpoint(
    checkpointId: number,
    options: RestoreOptions = {}
  ): Promise<RestoreResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    console.log(`[CheckpointRestore] Starting restore to checkpoint ${checkpointId}`);

    try {
      // Get checkpoint details
      const checkpoint = await checkpointService.getCheckpointWithFiles(checkpointId);
      
      if (!checkpoint) {
        throw new Error(`Checkpoint ${checkpointId} not found`);
      }

      const projectId = checkpoint.projectId;
      const projectBasePath = this.getProjectBasePath(projectId);

      // Create backup checkpoint before restore if requested
      if (options.createBackupCheckpoint) {
        try {
          const filesSnapshot = await workspaceSnapshotService.captureFileMetadata(
            projectBasePath,
            projectId
          );

          await checkpointService.createCheckpoint(projectId, {
            type: 'auto',
            triggerSource: 'before_restore',
            aiSummary: `Backup before restoring to checkpoint ${checkpointId}`,
            filesSnapshot,
            createdBy: options.userId,
          });

          console.log(`[CheckpointRestore] Created backup checkpoint before restore`);
        } catch (backupError: any) {
          console.warn(`[CheckpointRestore] Failed to create backup checkpoint: ${backupError.message}`);
          errors.push(`Backup creation failed: ${backupError.message}`);
        }
      }

      let restoredFiles = 0;

      // Restore files if checkpoint has file content stored
      if (options.restoreFiles !== false && checkpoint.files && checkpoint.files.length > 0) {
        // Convert checkpoint files to FileSnapshot format
        const fileSnapshots: FileSnapshot[] = checkpoint.files
          .filter(f => f.fileContent)
          .map(f => ({
            path: f.filePath,
            content: f.fileContent!,
            hash: f.fileHash || '',
            size: f.fileContent!.length,
            isDirectory: false,
          }));

        if (fileSnapshots.length > 0) {
          const restoreResult = await workspaceSnapshotService.restoreFileState(
            projectBasePath,
            {
              projectId,
              basePath: projectBasePath,
              files: fileSnapshots,
              capturedAt: checkpoint.createdAt,
              totalFiles: fileSnapshots.length,
              totalSize: fileSnapshots.reduce((sum, f) => sum + f.size, 0),
            }
          );

          restoredFiles = restoreResult.restoredCount;
          errors.push(...restoreResult.errors);
        }
      }

      // Update project's current checkpoint pointer
      await db
        .update(projects)
        .set({ currentCheckpointId: checkpointId })
        .where(eq(projects.id, projectId));

      // Log the restore action
      if (options.userId) {
        await checkpointService.logRestore(
          checkpointId,
          projectId,
          options.userId,
          { status: 'success', includedDatabase: false }
        );
      }

      const duration = Date.now() - startTime;
      console.log(`[CheckpointRestore] Restored to checkpoint ${checkpointId} in ${duration}ms (${restoredFiles} files)`);

      this.emit('restored', { checkpointId, projectId, restoredFiles, duration });

      return {
        success: true,
        checkpointId,
        projectId,
        restoredFiles,
        errors,
        duration,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`[CheckpointRestore] Restore failed:`, error);

      // Log failed restore if userId provided
      if (options.userId) {
        try {
          const checkpoint = await checkpointService.getCheckpoint(checkpointId);
          if (checkpoint) {
            await checkpointService.logRestore(
              checkpointId,
              checkpoint.projectId,
              options.userId,
              { status: 'failed', includedDatabase: false }
            );
          }
        } catch (logError) {
          console.error(`[CheckpointRestore] Failed to log restore error:`, logError);
        }
      }

      return {
        success: false,
        checkpointId,
        projectId: 0,
        restoredFiles: 0,
        errors: [error.message, ...errors],
        duration,
      };
    }
  }

  /**
   * Compare current state to a checkpoint
   */
  async compareToCheckpoint(
    checkpointId: number
  ): Promise<{ added: string[]; modified: string[]; deleted: string[] } | null> {
    const checkpoint = await checkpointService.getCheckpointWithFiles(checkpointId);
    
    if (!checkpoint || !checkpoint.files) {
      return null;
    }

    const projectBasePath = this.getProjectBasePath(checkpoint.projectId);
    const currentSnapshot = await workspaceSnapshotService.captureFileState(
      projectBasePath,
      checkpoint.projectId
    );

    // Build checkpoint snapshot from stored files
    const checkpointFiles: FileSnapshot[] = checkpoint.files.map(f => ({
      path: f.filePath,
      content: f.fileContent || '',
      hash: f.fileHash || '',
      size: f.fileContent?.length || 0,
      isDirectory: false,
    }));

    const checkpointSnapshot = {
      projectId: checkpoint.projectId,
      basePath: projectBasePath,
      files: checkpointFiles,
      capturedAt: checkpoint.createdAt,
      totalFiles: checkpointFiles.length,
      totalSize: checkpointFiles.reduce((sum, f) => sum + f.size, 0),
    };

    return workspaceSnapshotService.compareSnapshots(checkpointSnapshot, currentSnapshot);
  }
}

export const checkpointRestoreService = new CheckpointRestoreService();
