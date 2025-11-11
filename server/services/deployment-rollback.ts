import { EventEmitter } from 'events';
import { db } from '../db';
import { deploymentSnapshots, deploymentMetrics } from '@shared/schema';
import { eq, desc, and, lte } from 'drizzle-orm';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface DeploymentSnapshot {
  id?: string;
  deploymentId: string;
  version: string;
  environment: 'development' | 'staging' | 'production';
  config: {
    buildCommand?: string;
    startCommand?: string;
    environmentVars: Record<string, string>;
    dependencies: Record<string, string>;
    nodeVersion?: string;
    dockerImage?: string;
    resources?: {
      cpu: string;
      memory: string;
      disk: string;
    };
  };
  fileManifest: {
    path: string;
    hash: string;
    size: number;
  }[];
  databaseSchema?: {
    tables: string[];
    migrations: string[];
    version: string;
  };
  metadata: {
    commitHash?: string;
    branch?: string;
    author?: string;
    message?: string;
    deployedBy: string;
    reason?: string;
    tags?: string[];
  };
  status: 'active' | 'archived' | 'failed';
  createdAt: Date;
  size: number; // Total snapshot size in bytes
}

export interface RollbackOptions {
  skipDatabase?: boolean;
  skipFiles?: boolean;
  skipConfig?: boolean;
  dryRun?: boolean;
  reason?: string;
  force?: boolean;
}

export interface RollbackStatus {
  id: string;
  deploymentId: string;
  fromVersion: string;
  toVersion: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  startedAt: Date;
  completedAt?: Date;
  progress: number; // 0-100
  steps: {
    name: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    message?: string;
    startedAt?: Date;
    completedAt?: Date;
  }[];
  error?: string;
}

export interface VersionDiff {
  files: {
    added: string[];
    modified: string[];
    deleted: string[];
  };
  config: {
    added: Record<string, any>;
    modified: Record<string, { old: any; new: any }>;
    deleted: Record<string, any>;
  };
  database: {
    tablesAdded: string[];
    tablesModified: string[];
    tablesDeleted: string[];
    migrationsApplied: string[];
  };
}

export class DeploymentRollbackService extends EventEmitter {
  private snapshots = new Map<string, DeploymentSnapshot[]>();
  private rollbackStatus = new Map<string, RollbackStatus>();
  private readonly snapshotBasePath = '/tmp/deployment-snapshots';
  private readonly maxSnapshotsPerDeployment = 10;
  private readonly snapshotRetentionDays = 30;

  constructor() {
    super();
    this.ensureSnapshotDirectory();
    this.startCleanupJob();
  }

  private async ensureSnapshotDirectory() {
    try {
      await fs.mkdir(this.snapshotBasePath, { recursive: true });
    } catch (error) {
      console.error('Failed to create snapshot directory:', error);
    }
  }

  private startCleanupJob() {
    // Clean up old snapshots every day
    setInterval(async () => {
      await this.cleanupOldSnapshots();
    }, 24 * 60 * 60 * 1000);
  }

  async createSnapshot(
    deploymentId: string,
    version: string,
    deploymentPath: string,
    config: DeploymentSnapshot['config'],
    metadata: DeploymentSnapshot['metadata']
  ): Promise<DeploymentSnapshot> {
    const snapshotId = crypto.randomUUID();
    const snapshotPath = path.join(this.snapshotBasePath, deploymentId, snapshotId);
    
    try {
      // Create snapshot directory
      await fs.mkdir(snapshotPath, { recursive: true });
      
      // Create file manifest
      const fileManifest = await this.createFileManifest(deploymentPath);
      
      // Copy deployment files
      await this.copyDeploymentFiles(deploymentPath, snapshotPath);
      
      // Save configuration
      await fs.writeFile(
        path.join(snapshotPath, 'config.json'),
        JSON.stringify(config, null, 2)
      );
      
      // Save metadata
      await fs.writeFile(
        path.join(snapshotPath, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );
      
      // Get database schema snapshot
      const databaseSchema = await this.captureDatabaseSchema(deploymentId);
      
      // Calculate snapshot size
      const size = await this.calculateDirectorySize(snapshotPath);
      
      // Create snapshot record
      const snapshot: DeploymentSnapshot = {
        id: snapshotId,
        deploymentId,
        version,
        environment: config.environmentVars?.NODE_ENV as DeploymentSnapshot['environment'] || 'production',
        config,
        fileManifest,
        databaseSchema,
        metadata,
        status: 'active',
        createdAt: new Date(),
        size,
      };
      
      // Store in database
      await this.storeSnapshot(snapshot);
      
      // Update cache
      if (!this.snapshots.has(deploymentId)) {
        this.snapshots.set(deploymentId, []);
      }
      this.snapshots.get(deploymentId)!.push(snapshot);
      
      // Cleanup old snapshots if limit exceeded
      await this.enforceSnapshotLimit(deploymentId);
      
      this.emit('snapshotCreated', snapshot);
      return snapshot;
    } catch (error) {
      console.error('Failed to create snapshot:', error);
      throw new Error(`Snapshot creation failed: ${error}`);
    }
  }

  private async createFileManifest(deploymentPath: string): Promise<DeploymentSnapshot['fileManifest']> {
    const manifest: DeploymentSnapshot['fileManifest'] = [];
    
    async function walkDir(dir: string, baseDir: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(baseDir, fullPath);
        
        if (entry.isDirectory()) {
          // Skip node_modules and other large directories
          if (!['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
            await walkDir(fullPath, baseDir);
          }
        } else {
          const stats = await fs.stat(fullPath);
          const content = await fs.readFile(fullPath);
          const hash = crypto.createHash('sha256').update(content).digest('hex');
          
          manifest.push({
            path: relativePath,
            hash,
            size: stats.size,
          });
        }
      }
    }
    
    await walkDir(deploymentPath, deploymentPath);
    return manifest;
  }

  private async copyDeploymentFiles(source: string, destination: string): Promise<void> {
    try {
      // Use rsync for efficient copying, excluding unnecessary files
      await execAsync(
        `rsync -av --exclude='node_modules' --exclude='.git' --exclude='dist' --exclude='build' ${source}/ ${destination}/files/`
      );
    } catch (error) {
      // Fallback to manual copying if rsync is not available
      await this.manualCopyFiles(source, destination);
    }
  }

  private async manualCopyFiles(source: string, destination: string): Promise<void> {
    const filesDir = path.join(destination, 'files');
    await fs.mkdir(filesDir, { recursive: true });
    
    async function copyDir(src: string, dest: string) {
      const entries = await fs.readdir(src, { withFileTypes: true });
      
      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (entry.isDirectory()) {
          if (!['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
            await fs.mkdir(destPath, { recursive: true });
            await copyDir(srcPath, destPath);
          }
        } else {
          await fs.copyFile(srcPath, destPath);
        }
      }
    }
    
    await copyDir(source, filesDir);
  }

  private async captureDatabaseSchema(deploymentId: string): Promise<DeploymentSnapshot['databaseSchema']> {
    // In production, this would capture actual database schema
    // For now, return mock data
    return {
      tables: ['users', 'projects', 'deployments'],
      migrations: ['001_initial', '002_add_deployments'],
      version: '2.0.0',
    };
  }

  private async calculateDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0;
    
    async function getSize(filePath: string) {
      const stats = await fs.stat(filePath);
      if (stats.isDirectory()) {
        const entries = await fs.readdir(filePath);
        for (const entry of entries) {
          await getSize(path.join(filePath, entry));
        }
      } else {
        totalSize += stats.size;
      }
    }
    
    await getSize(dirPath);
    return totalSize;
  }

  private async storeSnapshot(snapshot: DeploymentSnapshot): Promise<void> {
    try {
      await db.insert(deploymentSnapshots).values({
        deploymentId: snapshot.deploymentId,
        version: snapshot.version,
        environment: snapshot.environment,
        config: snapshot.config,
        fileManifest: snapshot.fileManifest,
        databaseSchema: snapshot.databaseSchema,
        metadata: snapshot.metadata,
        status: snapshot.status,
        size: snapshot.size,
      });
    } catch (error) {
      console.error('Failed to store snapshot:', error);
    }
  }

  private async enforceSnapshotLimit(deploymentId: string): Promise<void> {
    const snapshots = this.snapshots.get(deploymentId) || [];
    
    if (snapshots.length > this.maxSnapshotsPerDeployment) {
      // Sort by creation date (newest first)
      snapshots.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      // Remove oldest snapshots
      const toRemove = snapshots.slice(this.maxSnapshotsPerDeployment);
      
      for (const snapshot of toRemove) {
        await this.deleteSnapshot(snapshot.id!);
      }
      
      // Update cache
      this.snapshots.set(
        deploymentId,
        snapshots.slice(0, this.maxSnapshotsPerDeployment)
      );
    }
  }

  private async deleteSnapshot(snapshotId: string): Promise<void> {
    try {
      // Delete from database
      await db
        .update(deploymentSnapshots)
        .set({ status: 'archived' })
        .where(eq(deploymentSnapshots.id, snapshotId));
      
      // Delete files (in production, this would be more careful)
      // const snapshotPath = path.join(this.snapshotBasePath, snapshotId);
      // await fs.rm(snapshotPath, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to delete snapshot:', error);
    }
  }

  async performRollback(
    deploymentId: string,
    targetVersion: string,
    options: RollbackOptions = {}
  ): Promise<RollbackStatus> {
    const rollbackId = crypto.randomUUID();
    const currentSnapshot = await this.getCurrentSnapshot(deploymentId);
    const targetSnapshot = await this.getSnapshot(deploymentId, targetVersion);
    
    if (!targetSnapshot) {
      throw new Error(`Target version ${targetVersion} not found`);
    }
    
    const status: RollbackStatus = {
      id: rollbackId,
      deploymentId,
      fromVersion: currentSnapshot?.version || 'unknown',
      toVersion: targetVersion,
      status: 'pending',
      startedAt: new Date(),
      progress: 0,
      steps: [
        { name: 'Validate target version', status: 'pending' },
        { name: 'Create backup of current state', status: 'pending' },
        { name: 'Stop current deployment', status: 'pending' },
        { name: 'Restore files', status: 'pending' },
        { name: 'Restore configuration', status: 'pending' },
        { name: 'Restore database', status: 'pending' },
        { name: 'Start deployment', status: 'pending' },
        { name: 'Verify deployment', status: 'pending' },
      ],
    };
    
    if (options.skipFiles) {
      status.steps[3].status = 'skipped';
    }
    if (options.skipConfig) {
      status.steps[4].status = 'skipped';
    }
    if (options.skipDatabase) {
      status.steps[5].status = 'skipped';
    }
    
    this.rollbackStatus.set(rollbackId, status);
    
    // Start rollback process
    this.executeRollback(rollbackId, deploymentId, targetSnapshot, options);
    
    return status;
  }

  private async executeRollback(
    rollbackId: string,
    deploymentId: string,
    targetSnapshot: DeploymentSnapshot,
    options: RollbackOptions
  ): Promise<void> {
    const status = this.rollbackStatus.get(rollbackId)!;
    
    try {
      status.status = 'in_progress';
      
      // Step 1: Validate target version
      await this.updateRollbackStep(rollbackId, 0, 'running');
      await this.validateSnapshot(targetSnapshot);
      await this.updateRollbackStep(rollbackId, 0, 'completed');
      status.progress = 12;
      
      // Step 2: Create backup of current state
      await this.updateRollbackStep(rollbackId, 1, 'running');
      if (!options.dryRun) {
        await this.createSnapshot(
          deploymentId,
          `rollback-backup-${Date.now()}`,
          '/tmp/current-deployment', // Mock path
          { environmentVars: {} },
          { deployedBy: 'system', reason: 'Rollback backup' }
        );
      }
      await this.updateRollbackStep(rollbackId, 1, 'completed');
      status.progress = 25;
      
      // Step 3: Stop current deployment
      await this.updateRollbackStep(rollbackId, 2, 'running');
      if (!options.dryRun) {
        await this.stopDeployment(deploymentId);
      }
      await this.updateRollbackStep(rollbackId, 2, 'completed');
      status.progress = 37;
      
      // Step 4: Restore files
      if (!options.skipFiles) {
        await this.updateRollbackStep(rollbackId, 3, 'running');
        if (!options.dryRun) {
          await this.restoreFiles(deploymentId, targetSnapshot);
        }
        await this.updateRollbackStep(rollbackId, 3, 'completed');
      }
      status.progress = 50;
      
      // Step 5: Restore configuration
      if (!options.skipConfig) {
        await this.updateRollbackStep(rollbackId, 4, 'running');
        if (!options.dryRun) {
          await this.restoreConfig(deploymentId, targetSnapshot);
        }
        await this.updateRollbackStep(rollbackId, 4, 'completed');
      }
      status.progress = 62;
      
      // Step 6: Restore database
      if (!options.skipDatabase) {
        await this.updateRollbackStep(rollbackId, 5, 'running');
        if (!options.dryRun) {
          await this.restoreDatabase(deploymentId, targetSnapshot);
        }
        await this.updateRollbackStep(rollbackId, 5, 'completed');
      }
      status.progress = 75;
      
      // Step 7: Start deployment
      await this.updateRollbackStep(rollbackId, 6, 'running');
      if (!options.dryRun) {
        await this.startDeployment(deploymentId, targetSnapshot);
      }
      await this.updateRollbackStep(rollbackId, 6, 'completed');
      status.progress = 87;
      
      // Step 8: Verify deployment
      await this.updateRollbackStep(rollbackId, 7, 'running');
      if (!options.dryRun) {
        await this.verifyDeployment(deploymentId);
      }
      await this.updateRollbackStep(rollbackId, 7, 'completed');
      status.progress = 100;
      
      // Rollback completed successfully
      status.status = 'completed';
      status.completedAt = new Date();
      
      this.emit('rollbackCompleted', {
        rollbackId,
        deploymentId,
        version: targetSnapshot.version,
      });
    } catch (error) {
      status.status = 'failed';
      status.error = error.message;
      status.completedAt = new Date();
      
      this.emit('rollbackFailed', {
        rollbackId,
        deploymentId,
        error: error.message,
      });
      
      // Attempt to recover
      if (!options.force) {
        await this.attemptRecovery(deploymentId);
      }
    }
  }

  private async updateRollbackStep(
    rollbackId: string,
    stepIndex: number,
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped',
    message?: string
  ): Promise<void> {
    const rollback = this.rollbackStatus.get(rollbackId);
    if (!rollback) return;
    
    const step = rollback.steps[stepIndex];
    step.status = status;
    if (message) step.message = message;
    
    if (status === 'running') {
      step.startedAt = new Date();
    } else if (status === 'completed' || status === 'failed') {
      step.completedAt = new Date();
    }
    
    this.emit('rollbackProgress', {
      rollbackId,
      step: step.name,
      status,
      progress: rollback.progress,
    });
  }

  private async validateSnapshot(snapshot: DeploymentSnapshot): Promise<void> {
    // Validate that snapshot files exist and are intact
    const snapshotPath = path.join(
      this.snapshotBasePath,
      snapshot.deploymentId,
      snapshot.id!
    );
    
    try {
      await fs.access(snapshotPath);
    } catch (error) {
      throw new Error('Snapshot files not found');
    }
  }

  private async stopDeployment(deploymentId: string): Promise<void> {
    // In production, this would stop the actual deployment
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private async restoreFiles(deploymentId: string, snapshot: DeploymentSnapshot): Promise<void> {
    // In production, this would restore actual files
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  private async restoreConfig(deploymentId: string, snapshot: DeploymentSnapshot): Promise<void> {
    // In production, this would restore configuration
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private async restoreDatabase(deploymentId: string, snapshot: DeploymentSnapshot): Promise<void> {
    // In production, this would restore database
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  private async startDeployment(deploymentId: string, snapshot: DeploymentSnapshot): Promise<void> {
    // In production, this would start the deployment with restored config
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  private async verifyDeployment(deploymentId: string): Promise<void> {
    // In production, this would verify the deployment is healthy
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Check health metrics
    const health = Math.random() > 0.1; // 90% success rate
    if (!health) {
      throw new Error('Deployment verification failed');
    }
  }

  private async attemptRecovery(deploymentId: string): Promise<void> {
    // In production, this would attempt to restore the previous working state
  }

  async getSnapshots(deploymentId: string): Promise<DeploymentSnapshot[]> {
    try {
      const snapshots = await db
        .select()
        .from(deploymentSnapshots)
        .where(eq(deploymentSnapshots.deploymentId, deploymentId))
        .orderBy(desc(deploymentSnapshots.createdAt))
        .limit(20);
      
      return snapshots.map(s => ({
        id: s.id,
        deploymentId: s.deploymentId,
        version: s.version,
        environment: s.environment as DeploymentSnapshot['environment'],
        config: s.config as DeploymentSnapshot['config'],
        fileManifest: s.fileManifest as DeploymentSnapshot['fileManifest'],
        databaseSchema: s.databaseSchema as DeploymentSnapshot['databaseSchema'],
        metadata: s.metadata as DeploymentSnapshot['metadata'],
        status: s.status as DeploymentSnapshot['status'],
        createdAt: s.createdAt,
        size: s.size,
      }));
    } catch (error) {
      console.error('Failed to get snapshots:', error);
      return [];
    }
  }

  private async getCurrentSnapshot(deploymentId: string): Promise<DeploymentSnapshot | null> {
    const snapshots = await this.getSnapshots(deploymentId);
    return snapshots.find(s => s.status === 'active') || null;
  }

  private async getSnapshot(deploymentId: string, version: string): Promise<DeploymentSnapshot | null> {
    const snapshots = await this.getSnapshots(deploymentId);
    return snapshots.find(s => s.version === version) || null;
  }

  async compareVersions(
    deploymentId: string,
    version1: string,
    version2: string
  ): Promise<VersionDiff> {
    const snapshot1 = await this.getSnapshot(deploymentId, version1);
    const snapshot2 = await this.getSnapshot(deploymentId, version2);
    
    if (!snapshot1 || !snapshot2) {
      throw new Error('One or both versions not found');
    }
    
    // Compare file manifests
    const files1 = new Set(snapshot1.fileManifest.map(f => f.path));
    const files2 = new Set(snapshot2.fileManifest.map(f => f.path));
    
    const filesAdded = Array.from(files2).filter(f => !files1.has(f));
    const filesDeleted = Array.from(files1).filter(f => !files2.has(f));
    
    const filesModified = Array.from(files1).filter(f => {
      if (!files2.has(f)) return false;
      const hash1 = snapshot1.fileManifest.find(fm => fm.path === f)?.hash;
      const hash2 = snapshot2.fileManifest.find(fm => fm.path === f)?.hash;
      return hash1 !== hash2;
    });
    
    // Compare configurations
    const configDiff = this.diffObjects(snapshot1.config, snapshot2.config);
    
    // Compare database schemas
    const tables1 = new Set(snapshot1.databaseSchema?.tables || []);
    const tables2 = new Set(snapshot2.databaseSchema?.tables || []);
    
    return {
      files: {
        added: filesAdded,
        modified: filesModified,
        deleted: filesDeleted,
      },
      config: configDiff,
      database: {
        tablesAdded: Array.from(tables2).filter(t => !tables1.has(t)),
        tablesModified: [], // Would need deeper comparison
        tablesDeleted: Array.from(tables1).filter(t => !tables2.has(t)),
        migrationsApplied: snapshot2.databaseSchema?.migrations.filter(
          m => !snapshot1.databaseSchema?.migrations.includes(m)
        ) || [],
      },
    };
  }

  private diffObjects(obj1: any, obj2: any): VersionDiff['config'] {
    const result: VersionDiff['config'] = {
      added: {},
      modified: {},
      deleted: {},
    };
    
    // Check for added and modified keys
    for (const key in obj2) {
      if (!(key in obj1)) {
        result.added[key] = obj2[key];
      } else if (JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
        result.modified[key] = { old: obj1[key], new: obj2[key] };
      }
    }
    
    // Check for deleted keys
    for (const key in obj1) {
      if (!(key in obj2)) {
        result.deleted[key] = obj1[key];
      }
    }
    
    return result;
  }

  async getRollbackStatus(rollbackId: string): Promise<RollbackStatus | null> {
    return this.rollbackStatus.get(rollbackId) || null;
  }

  async cancelRollback(rollbackId: string): Promise<void> {
    const status = this.rollbackStatus.get(rollbackId);
    if (!status) return;
    
    if (status.status === 'in_progress') {
      status.status = 'cancelled';
      status.completedAt = new Date();
      
      this.emit('rollbackCancelled', {
        rollbackId,
        deploymentId: status.deploymentId,
      });
    }
  }

  async setAutoRollback(
    deploymentId: string,
    enabled: boolean,
    healthThreshold: number = 50
  ): Promise<void> {
    if (enabled) {
      // Monitor health and trigger automatic rollback if needed
      deploymentMetricsService.on('alert', async (alert) => {
        if (alert.deploymentId === deploymentId && alert.level === 'critical') {
          const health = await deploymentMetricsService.getHealthStatus(deploymentId);
          if (health.score < healthThreshold) {
            const snapshots = await this.getSnapshots(deploymentId);
            if (snapshots.length > 1) {
              // Rollback to previous version
              await this.performRollback(deploymentId, snapshots[1].version, {
                reason: `Automatic rollback due to low health score (${health.score})`,
              });
            }
          }
        }
      });
    }
  }

  private async cleanupOldSnapshots(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.snapshotRetentionDays);
    
    try {
      await db
        .update(deploymentSnapshots)
        .set({ status: 'archived' })
        .where(
          and(
            eq(deploymentSnapshots.status, 'active'),
            lte(deploymentSnapshots.createdAt, cutoffDate)
          )
        );
    } catch (error) {
      console.error('Failed to cleanup old snapshots:', error);
    }
  }

  destroy(): void {
    this.removeAllListeners();
  }
}

export const deploymentRollbackService = new DeploymentRollbackService();