import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { db } from '../db';
import {
  fileOperations,
  agentSessions,
  agentAuditTrail,
  type FileOperation,
  type InsertFileOperation,
  type AgentSession
} from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { diff_match_patch } from 'diff-match-patch';
import * as chokidar from 'chokidar';
import { EventEmitter } from 'events';

// File operation events for real-time streaming
export interface FileOperationEvent {
  type: 'start' | 'progress' | 'complete' | 'error';
  operation: string;
  filePath: string;
  sessionId: string;
  details?: any;
  error?: string;
}

export class AgentFileOperationsService extends EventEmitter {
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_EXTENSIONS = [
    '.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.html', '.css', '.scss',
    '.py', '.java', '.cpp', '.c', '.go', '.rs', '.rb', '.php', '.sh',
    '.yml', '.yaml', '.toml', '.xml', '.svg', '.txt', '.env', '.gitignore'
  ];
  private fileWatcher?: chokidar.FSWatcher;
  private diffTool = new diff_match_patch();

  constructor() {
    super();
  }

  // Initialize file watcher for real-time monitoring
  async initializeWatcher(projectPath: string) {
    if (this.fileWatcher) {
      await this.fileWatcher.close();
    }

    this.fileWatcher = chokidar.watch(projectPath, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true
    });

    this.fileWatcher
      .on('add', path => this.emit('file:added', path))
      .on('change', path => this.emit('file:changed', path))
      .on('unlink', path => this.emit('file:deleted', path));
  }

  // Create or update a file with version control
  async createOrUpdateFile(
    sessionId: string,
    filePath: string,
    content: string,
    userId: string
  ): Promise<FileOperation> {
    try {
      // Validate session
      const session = await this.validateSession(sessionId);
      
      // Security checks
      this.validateFilePath(filePath);
      this.validateFileSize(content);
      
      // Get absolute path
      const absolutePath = this.getAbsolutePath(filePath, session.context?.workingDirectory || '.');
      
      // Check if file exists for versioning
      let previousContent: string | null = null;
      let operationType: 'file_create' | 'file_update' = 'file_create';
      
      try {
        previousContent = await fs.readFile(absolutePath, 'utf-8');
        operationType = 'file_update';
      } catch (err) {
        // File doesn't exist, will create
      }

      // Calculate checksum
      const checksum = this.calculateChecksum(content);
      
      // Create file operation record
      const operation: InsertFileOperation = {
        sessionId,
        operationType,
        filePath,
        content,
        previousContent,
        checksum,
        status: 'in_progress',
        metadata: {
          fileSize: Buffer.byteLength(content),
          mimeType: this.getMimeType(filePath),
          encoding: 'utf-8',
          diff: previousContent ? this.createDiff(previousContent, content) : undefined
        }
      };

      // Start operation
      this.emitProgress(sessionId, 'start', operationType, filePath);
      
      const [fileOp] = await db.insert(fileOperations).values(operation).returning();
      
      // Ensure directory exists
      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      
      // Write file
      await fs.writeFile(absolutePath, content, 'utf-8');
      
      // Update operation status
      await db.update(fileOperations)
        .set({ 
          status: 'completed',
          completedAt: new Date(),
          executedAt: new Date()
        })
        .where(eq(fileOperations.id, fileOp.id));

      // Audit trail
      await this.createAuditEntry(sessionId, userId, operationType, filePath);
      
      // Emit completion
      this.emitProgress(sessionId, 'complete', operationType, filePath, {
        checksum,
        size: Buffer.byteLength(content)
      });

      return fileOp;
    } catch (error: any) {
      this.emitProgress(sessionId, 'error', 'file_operation', filePath, null, error.message);
      throw error;
    }
  }

  // Read file with caching
  async readFile(
    sessionId: string,
    filePath: string,
    userId: string
  ): Promise<{ content: string; metadata: any }> {
    try {
      const session = await this.validateSession(sessionId);
      this.validateFilePath(filePath);
      
      const absolutePath = this.getAbsolutePath(filePath, session.context?.workingDirectory || '.');
      
      // Read file
      const content = await fs.readFile(absolutePath, 'utf-8');
      const stats = await fs.stat(absolutePath);
      
      // Log read operation
      await db.insert(fileOperations).values({
        sessionId,
        operationType: 'file_read',
        filePath,
        status: 'completed',
        executedAt: new Date(),
        completedAt: new Date(),
        metadata: {
          fileSize: stats.size,
          mimeType: this.getMimeType(filePath),
          lastModified: stats.mtime
        }
      });

      await this.createAuditEntry(sessionId, userId, 'file_read', filePath);
      
      return {
        content,
        metadata: {
          size: stats.size,
          mimeType: this.getMimeType(filePath),
          lastModified: stats.mtime,
          checksum: this.calculateChecksum(content)
        }
      };
    } catch (error: any) {
      throw new Error(`Failed to read file: ${error.message}`);
    }
  }

  // Delete file with backup
  async deleteFile(
    sessionId: string,
    filePath: string,
    userId: string
  ): Promise<FileOperation> {
    try {
      const session = await this.validateSession(sessionId);
      this.validateFilePath(filePath);
      
      const absolutePath = this.getAbsolutePath(filePath, session.context?.workingDirectory || '.');
      
      // Read file for backup
      const previousContent = await fs.readFile(absolutePath, 'utf-8');
      
      // Create operation record
      const [fileOp] = await db.insert(fileOperations).values({
        sessionId,
        operationType: 'file_delete',
        filePath,
        previousContent,
        status: 'in_progress',
        metadata: {
          fileSize: Buffer.byteLength(previousContent),
          mimeType: this.getMimeType(filePath)
        }
      }).returning();

      // Delete file
      await fs.unlink(absolutePath);
      
      // Update operation status
      await db.update(fileOperations)
        .set({ 
          status: 'completed',
          completedAt: new Date(),
          executedAt: new Date()
        })
        .where(eq(fileOperations.id, fileOp.id));

      await this.createAuditEntry(sessionId, userId, 'file_delete', filePath);
      
      this.emitProgress(sessionId, 'complete', 'file_delete', filePath);
      
      return fileOp;
    } catch (error: any) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  // Rename or move file
  async renameFile(
    sessionId: string,
    oldPath: string,
    newPath: string,
    userId: string
  ): Promise<FileOperation> {
    try {
      const session = await this.validateSession(sessionId);
      this.validateFilePath(oldPath);
      this.validateFilePath(newPath);
      
      const workingDir = session.context?.workingDirectory || '.';
      const absoluteOldPath = this.getAbsolutePath(oldPath, workingDir);
      const absoluteNewPath = this.getAbsolutePath(newPath, workingDir);
      
      // Read content for backup
      const content = await fs.readFile(absoluteOldPath, 'utf-8');
      
      // Create operation record
      const [fileOp] = await db.insert(fileOperations).values({
        sessionId,
        operationType: 'file_rename',
        filePath: oldPath,
        newPath,
        content,
        status: 'in_progress',
        metadata: {
          fileSize: Buffer.byteLength(content),
          mimeType: this.getMimeType(newPath)
        }
      }).returning();

      // Ensure target directory exists
      await fs.mkdir(path.dirname(absoluteNewPath), { recursive: true });
      
      // Rename/move file
      await fs.rename(absoluteOldPath, absoluteNewPath);
      
      // Update operation status
      await db.update(fileOperations)
        .set({ 
          status: 'completed',
          completedAt: new Date(),
          executedAt: new Date()
        })
        .where(eq(fileOperations.id, fileOp.id));

      await this.createAuditEntry(sessionId, userId, 'file_rename', `${oldPath} -> ${newPath}`);
      
      return fileOp;
    } catch (error: any) {
      throw new Error(`Failed to rename file: ${error.message}`);
    }
  }

  // List directory contents
  async listDirectory(
    sessionId: string,
    dirPath: string,
    recursive: boolean = false
  ): Promise<any[]> {
    try {
      const session = await this.validateSession(sessionId);
      const absolutePath = this.getAbsolutePath(dirPath, session.context?.workingDirectory || '.');
      
      const items: any[] = [];
      
      if (recursive) {
        // Recursive directory walk
        const walk = async (dir: string) => {
          const entries = await fs.readdir(dir, { withFileTypes: true });
          
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relativePath = path.relative(absolutePath, fullPath);
            
            if (entry.isDirectory()) {
              items.push({
                type: 'directory',
                name: entry.name,
                path: relativePath
              });
              await walk(fullPath);
            } else {
              const stats = await fs.stat(fullPath);
              items.push({
                type: 'file',
                name: entry.name,
                path: relativePath,
                size: stats.size,
                modified: stats.mtime
              });
            }
          }
        };
        
        await walk(absolutePath);
      } else {
        // Non-recursive listing
        const entries = await fs.readdir(absolutePath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(absolutePath, entry.name);
          
          if (entry.isDirectory()) {
            items.push({
              type: 'directory',
              name: entry.name
            });
          } else {
            const stats = await fs.stat(fullPath);
            items.push({
              type: 'file',
              name: entry.name,
              size: stats.size,
              modified: stats.mtime
            });
          }
        }
      }
      
      return items;
    } catch (error: any) {
      throw new Error(`Failed to list directory: ${error.message}`);
    }
  }

  // Rollback file operation
  async rollbackOperation(
    operationId: string,
    sessionId: string,
    userId: string
  ): Promise<FileOperation> {
    try {
      // Get original operation
      const [originalOp] = await db.select()
        .from(fileOperations)
        .where(eq(fileOperations.id, operationId));
      
      if (!originalOp) {
        throw new Error('Operation not found');
      }
      
      if (!originalOp.previousContent && originalOp.operationType !== 'file_create') {
        throw new Error('Cannot rollback: no previous content available');
      }
      
      const session = await this.validateSession(sessionId);
      const absolutePath = this.getAbsolutePath(
        originalOp.filePath, 
        session.context?.workingDirectory || '.'
      );
      
      // Determine rollback action
      let rollbackOp: InsertFileOperation;
      
      if (originalOp.operationType === 'file_create' || originalOp.operationType === 'file_delete') {
        // For create, we delete; for delete, we recreate
        if (originalOp.operationType === 'file_create') {
          await fs.unlink(absolutePath);
          rollbackOp = {
            sessionId,
            operationType: 'file_delete',
            filePath: originalOp.filePath,
            status: 'completed',
            rollbackOf: operationId
          };
        } else {
          await fs.writeFile(absolutePath, originalOp.previousContent!, 'utf-8');
          rollbackOp = {
            sessionId,
            operationType: 'file_create',
            filePath: originalOp.filePath,
            content: originalOp.previousContent!,
            status: 'completed',
            rollbackOf: operationId
          };
        }
      } else if (originalOp.operationType === 'file_update') {
        // Restore previous content
        await fs.writeFile(absolutePath, originalOp.previousContent!, 'utf-8');
        rollbackOp = {
          sessionId,
          operationType: 'file_update',
          filePath: originalOp.filePath,
          content: originalOp.previousContent!,
          status: 'completed',
          rollbackOf: operationId
        };
      } else if (originalOp.operationType === 'file_rename' || originalOp.operationType === 'file_move') {
        // Reverse the rename/move
        const oldAbsPath = this.getAbsolutePath(
          originalOp.newPath!, 
          session.context?.workingDirectory || '.'
        );
        await fs.rename(oldAbsPath, absolutePath);
        rollbackOp = {
          sessionId,
          operationType: 'file_rename',
          filePath: originalOp.newPath!,
          newPath: originalOp.filePath,
          status: 'completed',
          rollbackOf: operationId
        };
      } else {
        throw new Error(`Cannot rollback operation type: ${originalOp.operationType}`);
      }
      
      const [rolledBack] = await db.insert(fileOperations)
        .values({
          ...rollbackOp,
          executedAt: new Date(),
          completedAt: new Date()
        })
        .returning();
      
      // Update original operation
      await db.update(fileOperations)
        .set({ status: 'rolled_back' })
        .where(eq(fileOperations.id, operationId));
      
      await this.createAuditEntry(sessionId, userId, 'file_rollback', originalOp.filePath);
      
      return rolledBack;
    } catch (error: any) {
      throw new Error(`Rollback failed: ${error.message}`);
    }
  }

  // Get file operation history
  async getOperationHistory(
    sessionId: string,
    filePath?: string,
    limit: number = 50
  ): Promise<FileOperation[]> {
    let query = db.select()
      .from(fileOperations)
      .where(eq(fileOperations.sessionId, sessionId))
      .orderBy(desc(fileOperations.executedAt))
      .limit(limit);
    
    if (filePath) {
      query = query.where(and(
        eq(fileOperations.sessionId, sessionId),
        eq(fileOperations.filePath, filePath)
      ));
    }
    
    return await query;
  }

  // Private helper methods
  private async validateSession(sessionId: string): Promise<AgentSession> {
    const [session] = await db.select()
      .from(agentSessions)
      .where(and(
        eq(agentSessions.id, sessionId),
        eq(agentSessions.isActive, true)
      ));
    
    if (!session) {
      throw new Error('Invalid or inactive session');
    }
    
    return session;
  }

  private validateFilePath(filePath: string) {
    // Security: prevent directory traversal
    if (filePath.includes('..') || path.isAbsolute(filePath)) {
      throw new Error('Invalid file path');
    }
    
    // Check extension
    const ext = path.extname(filePath).toLowerCase();
    if (ext && !this.ALLOWED_EXTENSIONS.includes(ext)) {
      throw new Error(`File extension not allowed: ${ext}`);
    }
  }

  private validateFileSize(content: string) {
    const size = Buffer.byteLength(content);
    if (size > this.MAX_FILE_SIZE) {
      throw new Error(`File too large: ${size} bytes (max: ${this.MAX_FILE_SIZE})`);
    }
  }

  private getAbsolutePath(filePath: string, workingDir: string): string {
    // Ensure we stay within project boundaries
    const projectRoot = process.cwd();
    const resolved = path.resolve(projectRoot, workingDir, filePath);
    
    if (!resolved.startsWith(projectRoot)) {
      throw new Error('File path outside project boundaries');
    }
    
    return resolved;
  }

  private calculateChecksum(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.js': 'application/javascript',
      '.jsx': 'application/javascript',
      '.ts': 'application/typescript',
      '.tsx': 'application/typescript',
      '.json': 'application/json',
      '.html': 'text/html',
      '.css': 'text/css',
      '.md': 'text/markdown',
      '.py': 'text/x-python',
      '.java': 'text/x-java',
      '.cpp': 'text/x-c++',
      '.go': 'text/x-go',
      '.rs': 'text/x-rust',
      '.rb': 'text/x-ruby',
      '.php': 'text/x-php',
      '.sh': 'text/x-shellscript',
      '.yml': 'text/x-yaml',
      '.yaml': 'text/x-yaml',
      '.xml': 'text/xml',
      '.svg': 'image/svg+xml',
      '.txt': 'text/plain'
    };
    
    return mimeTypes[ext] || 'text/plain';
  }

  private createDiff(oldContent: string, newContent: string): string {
    const diffs = this.diffTool.diff_main(oldContent, newContent);
    this.diffTool.diff_cleanupSemantic(diffs);
    return this.diffTool.patch_toText(this.diffTool.patch_make(oldContent, diffs));
  }

  private emitProgress(
    sessionId: string,
    type: 'start' | 'progress' | 'complete' | 'error',
    operation: string,
    filePath: string,
    details?: any,
    error?: string
  ) {
    const event: FileOperationEvent = {
      type,
      operation,
      filePath,
      sessionId,
      details,
      error
    };
    
    this.emit('operation:progress', event);
  }

  private async createAuditEntry(
    sessionId: string,
    userId: string,
    action: string,
    resourceId: string
  ) {
    await db.insert(agentAuditTrail).values({
      sessionId,
      userId,
      action,
      resourceType: 'file',
      resourceId,
      severity: 'info',
      details: { timestamp: new Date().toISOString() }
    });
  }

  // Cleanup on service shutdown
  async cleanup() {
    if (this.fileWatcher) {
      await this.fileWatcher.close();
    }
  }
}

// Export singleton instance
export const agentFileOperations = new AgentFileOperationsService();