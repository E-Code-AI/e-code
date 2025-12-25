import { db } from '../db';
import { 
  projectDatabases, 
  projectDatabaseBackups,
  projects, 
  type InsertProjectDatabase, 
  type InsertProjectDatabaseBackup,
  type ProjectDatabase,
  type ProjectDatabaseBackup 
} from '@shared/schema';
import { eq, and, lt, desc } from 'drizzle-orm';
import { createLogger } from '../utils/logger';
import crypto from 'crypto';
import { 
  selectBestProvider, 
  getProvider, 
  PLAN_LIMITS,
  type DatabaseProvider,
  type ProvisioningOptions as ProviderOptions,
  type IDatabaseProvider,
  type PlanType
} from './providers';

const logger = createLogger('ProjectDatabaseProvisioning');

const ENCRYPTION_KEY = process.env.DATABASE_ENCRYPTION_KEY;
if (!ENCRYPTION_KEY) {
  console.warn('[ProjectDatabaseProvisioning] DATABASE_ENCRYPTION_KEY not set - using derived key from DATABASE_URL');
}

function getEncryptionKey(): string {
  if (ENCRYPTION_KEY) {
    return ENCRYPTION_KEY.padEnd(32).slice(0, 32);
  }
  const dbUrl = process.env.DATABASE_URL || 'ecode-fallback-key';
  const hash = crypto.createHash('sha256').update(dbUrl).digest('hex');
  return hash.slice(0, 32);
}

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(getEncryptionKey()), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text: string): string {
  const parts = text.split(':');
  const iv = Buffer.from(parts.shift()!, 'hex');
  const encrypted = Buffer.from(parts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(getEncryptionKey()), iv);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

export interface ProvisioningOptions {
  type?: 'postgresql' | 'mysql';
  region?: string;
  version?: string;
  plan?: 'free' | 'starter' | 'pro' | 'enterprise';
  provider?: DatabaseProvider;
  suspendTimeoutSeconds?: number;
  k8sNamespace?: string;
}

export interface DatabaseCredentials {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  connectionUrl: string;
  sslEnabled: boolean;
}

class ProjectDatabaseProvisioningService {
  async getProjectDatabase(projectId: number): Promise<ProjectDatabase | null> {
    const [database] = await db
      .select()
      .from(projectDatabases)
      .where(eq(projectDatabases.projectId, projectId))
      .limit(1);
    
    return database || null;
  }

  async provisionDatabase(projectId: number, options: ProvisioningOptions = {}): Promise<ProjectDatabase> {
    logger.info(`Provisioning database for project ${projectId}`, options);
    
    const existingDb = await this.getProjectDatabase(projectId);
    if (existingDb) {
      logger.info(`Database already exists for project ${projectId}`);
      return existingDb;
    }

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    const provider = await selectBestProvider(options);
    const plan = (options.plan || 'free') as PlanType;
    const planLimits = PLAN_LIMITS[plan];
    
    logger.info(`Using provider ${provider.name} for project ${projectId}`);

    const insertData: InsertProjectDatabase = {
      projectId,
      name: `ecode_proj_${projectId}`,
      type: options.type || 'postgresql',
      status: 'provisioning',
      region: options.region || 'us-east-1',
      version: options.version || '16',
      plan,
      provider: provider.name,
      sslEnabled: true,
      storageUsedMb: 0,
      storageLimitMb: planLimits.storageMb,
      connectionCount: 0,
      maxConnections: planLimits.maxConnections,
      autoBackup: true,
      backupRetentionDays: planLimits.backupRetentionDays,
      k8sNamespace: options.k8sNamespace
    };

    const [newDatabase] = await db
      .insert(projectDatabases)
      .values(insertData)
      .returning();

    // Helper function to update database with provisioned credentials
    const updateWithCredentials = async (dbRecord: typeof newDatabase, provisionedDb: any, providerName: string) => {
      const encryptedPassword = encrypt(provisionedDb.password);
      
      const [updatedDb] = await db
        .update(projectDatabases)
        .set({ 
          status: 'running',
          provisionedAt: new Date(),
          host: provisionedDb.host,
          port: provisionedDb.port,
          database: provisionedDb.database,
          username: provisionedDb.username,
          encryptedPassword,
          connectionUrl: provisionedDb.connectionUrl,
          providerProjectId: provisionedDb.projectId,
          providerBranchId: provisionedDb.branchId,
          providerEndpointId: provisionedDb.endpointId,
          providerMetadata: provisionedDb.metadata,
          k8sClusterName: provisionedDb.metadata?.clusterName as string,
          provider: providerName,
          updatedAt: new Date()
        })
        .where(eq(projectDatabases.id, dbRecord.id))
        .returning();
      
      return updatedDb;
    };

    try {
      const provisionedDb = await provider.provision(projectId, options);
      const updatedDb = await updateWithCredentials(newDatabase, provisionedDb, provider.name);
      logger.info(`Database provisioned successfully for project ${projectId} via ${provider.name}`);
      return updatedDb;
    } catch (error) {
      logger.warn(`Primary provider ${provider.name} failed for project ${projectId}:`, error);
      
      // FALLBACK: If primary provider fails (e.g., Neon), try local provider
      if (provider.name !== 'local') {
        logger.info(`Attempting fallback to local provider for project ${projectId}`);
        try {
          const { localProvider } = await import('./providers/local.provider');
          const provisionedDb = await localProvider.provision(projectId, options);
          const updatedDb = await updateWithCredentials(newDatabase, provisionedDb, 'local');
          logger.info(`Database provisioned successfully for project ${projectId} via local (fallback)`);
          return updatedDb;
        } catch (fallbackError) {
          logger.error(`Fallback to local provider also failed for project ${projectId}:`, fallbackError);
        }
      }
      
      // Both providers failed - mark as error
      await db
        .update(projectDatabases)
        .set({ status: 'error' })
        .where(eq(projectDatabases.id, newDatabase.id));
      
      logger.error(`Failed to provision database for project ${projectId} (all providers failed):`, error);
      throw error;
    }
  }

  async getCredentials(projectId: number): Promise<DatabaseCredentials | null> {
    const database = await this.getProjectDatabase(projectId);
    if (!database || !database.encryptedPassword) {
      return null;
    }

    const password = decrypt(database.encryptedPassword);

    return {
      host: database.host || 'localhost',
      port: database.port || 5432,
      database: database.database || '',
      username: database.username || '',
      password,
      connectionUrl: `postgresql://${database.username}:${password}@${database.host}:${database.port}/${database.database}?sslmode=require`,
      sslEnabled: database.sslEnabled ?? true
    };
  }

  async getConnectionUrl(projectId: number): Promise<string | null> {
    const credentials = await this.getCredentials(projectId);
    return credentials?.connectionUrl || null;
  }

  async rotateCredentials(projectId: number): Promise<DatabaseCredentials | null> {
    const database = await this.getProjectDatabase(projectId);
    if (!database) {
      return null;
    }

    const provider = getProvider(database.provider as DatabaseProvider);
    const newCredentials = await provider.rotateCredentials(database.id);
    
    const encryptedPassword = encrypt(newCredentials.password);
    
    await db
      .update(projectDatabases)
      .set({ 
        encryptedPassword,
        updatedAt: new Date()
      })
      .where(eq(projectDatabases.id, database.id));

    logger.info(`Credentials rotated for project ${projectId}`);
    return newCredentials;
  }

  async updateStatus(projectId: number, status: ProjectDatabase['status']): Promise<void> {
    await db
      .update(projectDatabases)
      .set({ status, updatedAt: new Date() })
      .where(eq(projectDatabases.projectId, projectId));
  }

  async deleteDatabase(projectId: number): Promise<boolean> {
    const database = await this.getProjectDatabase(projectId);
    if (!database) {
      return false;
    }

    try {
      const provider = getProvider(database.provider as DatabaseProvider);
      await provider.deprovision(database.id);
    } catch (error) {
      logger.error(`Failed to deprovision database from provider:`, error);
    }

    await db
      .update(projectDatabases)
      .set({ status: 'deleted', updatedAt: new Date() })
      .where(eq(projectDatabases.id, database.id));

    logger.info(`Database for project ${projectId} marked as deleted`);
    return true;
  }

  async suspendDatabase(projectId: number): Promise<void> {
    const database = await this.getProjectDatabase(projectId);
    if (!database) {
      throw new Error(`Database not found for project ${projectId}`);
    }

    const provider = getProvider(database.provider as DatabaseProvider);
    await provider.suspend(database.id);

    await db
      .update(projectDatabases)
      .set({ 
        status: 'stopped',
        suspendedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(projectDatabases.id, database.id));

    logger.info(`Database suspended for project ${projectId}`);
  }

  async resumeDatabase(projectId: number): Promise<void> {
    const database = await this.getProjectDatabase(projectId);
    if (!database) {
      throw new Error(`Database not found for project ${projectId}`);
    }

    const provider = getProvider(database.provider as DatabaseProvider);
    await provider.resume(database.id);

    await db
      .update(projectDatabases)
      .set({ 
        status: 'running',
        suspendedAt: null,
        updatedAt: new Date()
      })
      .where(eq(projectDatabases.id, database.id));

    logger.info(`Database resumed for project ${projectId}`);
  }

  async getMetrics(projectId: number): Promise<{
    storageUsedMb: number;
    connectionCount: number;
    activeQueries: number;
    cpuPercent?: number;
    memoryUsedMb?: number;
  } | null> {
    const database = await this.getProjectDatabase(projectId);
    if (!database) {
      return null;
    }

    const provider = getProvider(database.provider as DatabaseProvider);
    const metrics = await provider.getMetrics(database.id);

    await db
      .update(projectDatabases)
      .set({ 
        storageUsedMb: metrics.storageUsedMb,
        connectionCount: metrics.connectionCount,
        updatedAt: new Date()
      })
      .where(eq(projectDatabases.id, database.id));

    return metrics;
  }

  async updateStorageUsage(projectId: number, usedMb: number): Promise<void> {
    await db
      .update(projectDatabases)
      .set({ 
        storageUsedMb: usedMb,
        updatedAt: new Date()
      })
      .where(eq(projectDatabases.projectId, projectId));
  }

  async updateConnectionCount(projectId: number, count: number): Promise<void> {
    await db
      .update(projectDatabases)
      .set({ 
        connectionCount: count,
        updatedAt: new Date()
      })
      .where(eq(projectDatabases.projectId, projectId));
  }

  // ============ Backup Management ============

  async createBackup(projectId: number, options: {
    name?: string;
    backupType?: 'scheduled' | 'manual' | 'pre_migration' | 'pitr';
    initiatedBy?: string;
  } = {}): Promise<ProjectDatabaseBackup> {
    const database = await this.getProjectDatabase(projectId);
    if (!database) {
      throw new Error(`Database not found for project ${projectId}`);
    }

    const provider = getProvider(database.provider as DatabaseProvider);
    const backupName = options.name || `backup-${Date.now()}`;
    
    const retentionDays = database.backupRetentionDays || PLAN_LIMITS[database.plan as PlanType]?.backupRetentionDays || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + retentionDays);

    const insertData: InsertProjectDatabaseBackup = {
      projectDatabaseId: database.id,
      name: backupName,
      backupType: options.backupType || 'manual',
      status: 'pending',
      initiatedBy: options.initiatedBy || 'user',
      expiresAt
    };

    const [newBackup] = await db
      .insert(projectDatabaseBackups)
      .values(insertData)
      .returning();

    try {
      const providerBackup = await provider.createBackup(database.id, {
        name: backupName,
        backupType: options.backupType
      });

      const [updatedBackup] = await db
        .update(projectDatabaseBackups)
        .set({
          status: providerBackup.status,
          providerBackupId: providerBackup.id,
          sizeBytes: providerBackup.sizeBytes,
          restorePoint: providerBackup.restorePoint,
          completedAt: providerBackup.status === 'completed' ? new Date() : null
        })
        .where(eq(projectDatabaseBackups.id, newBackup.id))
        .returning();

      await db
        .update(projectDatabases)
        .set({ lastBackupAt: new Date() })
        .where(eq(projectDatabases.id, database.id));

      logger.info(`Backup created for project ${projectId}: ${backupName}`);
      return updatedBackup;
    } catch (error) {
      await db
        .update(projectDatabaseBackups)
        .set({ 
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        })
        .where(eq(projectDatabaseBackups.id, newBackup.id));

      throw error;
    }
  }

  async listBackups(projectId: number): Promise<ProjectDatabaseBackup[]> {
    const database = await this.getProjectDatabase(projectId);
    if (!database) {
      return [];
    }

    const backups = await db
      .select()
      .from(projectDatabaseBackups)
      .where(eq(projectDatabaseBackups.projectDatabaseId, database.id))
      .orderBy(desc(projectDatabaseBackups.createdAt));

    return backups;
  }

  async restoreBackup(projectId: number, backupId: number): Promise<void> {
    const database = await this.getProjectDatabase(projectId);
    if (!database) {
      throw new Error(`Database not found for project ${projectId}`);
    }

    const [backup] = await db
      .select()
      .from(projectDatabaseBackups)
      .where(and(
        eq(projectDatabaseBackups.id, backupId),
        eq(projectDatabaseBackups.projectDatabaseId, database.id)
      ))
      .limit(1);

    if (!backup) {
      throw new Error(`Backup ${backupId} not found`);
    }

    if (!backup.providerBackupId) {
      throw new Error(`Backup ${backupId} has no provider backup ID`);
    }

    const provider = getProvider(database.provider as DatabaseProvider);
    await provider.restoreBackup(database.id, backup.providerBackupId);

    logger.info(`Backup ${backupId} restored for project ${projectId}`);
  }

  async deleteBackup(projectId: number, backupId: number): Promise<void> {
    const database = await this.getProjectDatabase(projectId);
    if (!database) {
      throw new Error(`Database not found for project ${projectId}`);
    }

    const [backup] = await db
      .select()
      .from(projectDatabaseBackups)
      .where(and(
        eq(projectDatabaseBackups.id, backupId),
        eq(projectDatabaseBackups.projectDatabaseId, database.id)
      ))
      .limit(1);

    if (!backup) {
      throw new Error(`Backup ${backupId} not found`);
    }

    if (backup.providerBackupId) {
      const provider = getProvider(database.provider as DatabaseProvider);
      await provider.deleteBackup(database.id, backup.providerBackupId);
    }

    await db
      .delete(projectDatabaseBackups)
      .where(eq(projectDatabaseBackups.id, backupId));

    logger.info(`Backup ${backupId} deleted for project ${projectId}`);
  }

  async pruneExpiredBackups(): Promise<number> {
    const now = new Date();
    
    const expiredBackups = await db
      .select()
      .from(projectDatabaseBackups)
      .where(and(
        lt(projectDatabaseBackups.expiresAt, now),
        eq(projectDatabaseBackups.status, 'completed')
      ));

    let prunedCount = 0;
    for (const backup of expiredBackups) {
      try {
        const [database] = await db
          .select()
          .from(projectDatabases)
          .where(eq(projectDatabases.id, backup.projectDatabaseId))
          .limit(1);

        if (database && backup.providerBackupId) {
          const provider = getProvider(database.provider as DatabaseProvider);
          await provider.deleteBackup(database.id, backup.providerBackupId);
        }

        await db
          .update(projectDatabaseBackups)
          .set({ status: 'expired' })
          .where(eq(projectDatabaseBackups.id, backup.id));

        prunedCount++;
      } catch (error) {
        logger.error(`Failed to prune backup ${backup.id}:`, error);
      }
    }

    logger.info(`Pruned ${prunedCount} expired backups`);
    return prunedCount;
  }

  async recordBackup(projectId: number): Promise<void> {
    await db
      .update(projectDatabases)
      .set({ 
        lastBackupAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(projectDatabases.projectId, projectId));
  }

  async getDatabaseStats(projectId: number): Promise<{
    storagePercent: number;
    connectionPercent: number;
    status: string;
    lastBackup: Date | null;
    provider: string;
    backupCount: number;
  } | null> {
    const database = await this.getProjectDatabase(projectId);
    if (!database) {
      return null;
    }

    const backups = await this.listBackups(projectId);
    const completedBackups = backups.filter(b => b.status === 'completed');

    return {
      storagePercent: database.storageLimitMb 
        ? ((database.storageUsedMb || 0) / database.storageLimitMb) * 100 
        : 0,
      connectionPercent: database.maxConnections 
        ? ((database.connectionCount || 0) / database.maxConnections) * 100 
        : 0,
      status: database.status,
      lastBackup: database.lastBackupAt,
      provider: database.provider || 'local',
      backupCount: completedBackups.length
    };
  }
}

export const projectDatabaseService = new ProjectDatabaseProvisioningService();
