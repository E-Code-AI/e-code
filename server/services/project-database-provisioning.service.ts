import {
projectDatabaseBackups,
projectDatabases,
projects,
type InsertProjectDatabase,
type InsertProjectDatabaseBackup,
type ProjectDatabase,
type ProjectDatabaseBackup
} from '@shared/schema';
import crypto from 'crypto';
import { and,desc,eq,lt } from 'drizzle-orm';
import { db } from '../db';
import { createLogger } from '../utils/logger';
import {
getProvider,
neonProvider,
PLAN_LIMITS,
selectBestProvider,
type DatabaseProvider,
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
      // Allow retry if status is 'error' - delete the failed record and re-provision
      if (existingDb.status === 'error') {
        logger.info(`Database for project ${projectId} has error status - deleting for retry`);
        await db.delete(projectDatabases).where(eq(projectDatabases.id, existingDb.id));
        // Continue to provision a new database
      } else {
        logger.info(`Database already exists for project ${projectId} with status ${existingDb.status}`);
        return existingDb;
      }
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

  async getDatabaseInfo(projectId: number): Promise<{
    provisioned: boolean;
    status?: string;
    host?: string;
    port?: number;
    databaseName?: string;
    username?: string;
    storageUsedMb?: number;
    storageLimitMb?: number;
    connectionCount?: number;
    maxConnections?: number;
    lastBackupAt?: Date | null;
    plan?: string;
    region?: string;
    computeHours?: number;
    historyRetentionDays?: number;
  } | null> {
    const database = await this.getProjectDatabase(projectId);
    if (!database) {
      return { provisioned: false };
    }

    let credentials: DatabaseCredentials | null = null;
    try {
      credentials = await this.getCredentials(projectId);
    } catch (e) {
      logger.warn(`Could not get credentials for project ${projectId}:`, e);
    }

    return {
      provisioned: database.status === 'running',
      status: database.status,
      host: credentials?.host || database.host || undefined,
      port: credentials?.port || database.port || undefined,
      databaseName: credentials?.database || database.name,
      username: credentials?.username || undefined,
      storageUsedMb: database.storageUsedMb || 0,
      storageLimitMb: database.storageLimitMb || 10240,
      connectionCount: database.connectionCount || 0,
      maxConnections: database.maxConnections || 20,
      lastBackupAt: database.lastBackupAt,
      plan: database.plan || 'free',
      region: database.region || 'us-east-1',
      computeHours: database.computeHoursUsed || 0,
      historyRetentionDays: database.historyRetentionDays || 7
    };
  }

  /**
   * Migrate an existing local-provider database to Neon (dedicated provider).
   *
   * Unlike provisionDatabase(), this method NEVER short-circuits when a DB record
   * already exists — it directly provisions a NEW Neon project and then hot-swaps
   * the existing record's credentials and provider.
   *
   * Caller must verify NEON_API_KEY is set before calling.
   * Caller is responsible for creating a pre-migration backup first.
   *
   * @returns The updated ProjectDatabase record with Neon credentials
   */
  async migrateToNeon(projectId: number): Promise<ProjectDatabase> {
    const database = await this.getProjectDatabase(projectId);
    if (!database) throw new Error(`Database not found for project ${projectId}`);
    if (database.provider !== 'local') throw new Error('migrateToNeon: source database must be provider=local');

    const plan = (database.plan || 'free') as PlanType;
    const region = database.region || 'us-east-1';

    logger.info(`[Migration] Starting local→Neon migration for project ${projectId}`, { plan, region });

    // Directly call neonProvider.provision() to create a NEW Neon project.
    // We pass database.id (the existing row's PK) as the "projectId" for provider
    // naming — the Neon project will be named "ecode-project-<database.id>".
    const provisioned = await neonProvider.provision(database.id, { plan, region });

    const encryptedPassword = encrypt(provisioned.password);
    const planLimits = PLAN_LIMITS[plan];

    // Hot-swap credentials on the EXISTING row — no new row is created.
    const [updated] = await db
      .update(projectDatabases)
      .set({
        provider: 'neon',
        status: 'running',
        host: provisioned.host,
        port: provisioned.port,
        database: provisioned.database,
        username: provisioned.username,
        encryptedPassword,
        connectionUrl: provisioned.connectionUrl,
        providerProjectId: provisioned.projectId,
        providerBranchId: provisioned.branchId,
        providerEndpointId: provisioned.endpointId,
        providerMetadata: {
          ...(typeof database.providerMetadata === 'object' && database.providerMetadata !== null
            ? database.providerMetadata
            : {}),
          ...(provisioned.metadata || {}),
          migratedFromLocal: true,
          migratedAt: new Date().toISOString(),
        },
        storageLimitMb: planLimits.storageMb,
        maxConnections: planLimits.maxConnections,
        backupRetentionDays: planLimits.backupRetentionDays,
        provisionedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(projectDatabases.id, database.id))
      .returning();

    if (!updated) throw new Error('Failed to update database record after Neon provisioning');

    logger.info(`[Migration] Completed local→Neon migration for project ${projectId}`, {
      neonProjectId: provisioned.projectId,
      host: provisioned.host,
    });

    return updated;
  }

  async executeQuery(projectId: number, query: string, params?: unknown[]): Promise<{
    rows: any[];
    rowCount: number;
    fields: Array<{ name: string; dataTypeID?: number }>;
  }> {
    const database = await this.getProjectDatabase(projectId);
    if (!database) {
      throw new Error('Database not found');
    }

    if (database.status !== 'running') {
      throw new Error(`Database is not running (status: ${database.status})`);
    }

    const credentials = await this.getCredentials(projectId);
    if (!credentials) {
      throw new Error('Could not get database credentials');
    }

    const provider = getProvider(database.provider as DatabaseProvider);
    
    try {
      const result = await provider.executeQuery(database.id, query, credentials, params);
      return {
        rows: result.rows || [],
        rowCount: result.rowCount || 0,
        fields: result.fields || []
      };
    } catch (error: any) {
      logger.error(`SQL execution error for project ${projectId}:`, error);
      throw new Error(error.message || 'Query execution failed');
    }
  }

  async pointInTimeRestore(projectId: number, timestamp: string, timezone: string): Promise<void> {
    const database = await this.getProjectDatabase(projectId);
    if (!database) {
      throw new Error('Database not found');
    }

    logger.info(`Initiating PITR for project ${projectId} to ${timestamp} (${timezone})`);

    const provider = getProvider(database.provider as DatabaseProvider);
    
    await db
      .update(projectDatabases)
      .set({ 
        status: 'restoring',
        updatedAt: new Date()
      })
      .where(eq(projectDatabases.projectId, projectId));

    try {
      await provider.pointInTimeRestore(database.id, timestamp, timezone);
      
      await db
        .update(projectDatabases)
        .set({ 
          status: 'running',
          updatedAt: new Date()
        })
        .where(eq(projectDatabases.projectId, projectId));

      logger.info(`PITR completed for project ${projectId}`);
    } catch (error: any) {
      await db
        .update(projectDatabases)
        .set({ 
          status: 'error',
          updatedAt: new Date()
        })
        .where(eq(projectDatabases.projectId, projectId));

      logger.error(`PITR failed for project ${projectId}:`, error);
      throw error;
    }
  }

  async updateSettings(projectId: number, settings: { historyRetentionDays?: number }): Promise<void> {
    const database = await this.getProjectDatabase(projectId);
    if (!database) {
      throw new Error('Database not found');
    }

    const updateData: any = { updatedAt: new Date() };
    
    if (settings.historyRetentionDays !== undefined) {
      updateData.historyRetentionDays = settings.historyRetentionDays;
    }

    await db
      .update(projectDatabases)
      .set(updateData)
      .where(eq(projectDatabases.projectId, projectId));

    logger.info(`Settings updated for project ${projectId}:`, settings);
  }
}

// ─── BRANCHING (Neon-style branches per project DB) ─────────────────

type BranchInfo = {
  id: number;
  name: string;
  providerBranchId: string;
  parentProviderBranchId: string | null;
  isMain: boolean;
  isProtected: boolean;
  host: string | null;
  database: string | null;
  username: string | null;
  createdAt: Date;
};

class ProjectDatabaseBranchService {
  async listBranches(projectId: number): Promise<BranchInfo[]> {
    const { projectDatabases, projectDatabaseBranches } = await import('@shared/schema');
    const [database] = await db
      .select()
      .from(projectDatabases)
      .where(eq(projectDatabases.projectId, projectId))
      .limit(1);
    if (!database) throw new Error('No database for project');

    const rows = await db
      .select()
      .from(projectDatabaseBranches)
      .where(eq(projectDatabaseBranches.projectDatabaseId, database.id))
      .orderBy(desc(projectDatabaseBranches.createdAt));

    return rows.map(r => ({
      id: r.id,
      name: r.name,
      providerBranchId: r.providerBranchId,
      parentProviderBranchId: r.parentProviderBranchId,
      isMain: r.isMain,
      isProtected: r.isProtected,
      host: r.host,
      database: r.database,
      username: r.username,
      createdAt: r.createdAt,
    }));
  }

  async createBranch(
    projectId: number,
    branchName: string,
    parentBranchId: string | undefined,
    userId: number | null
  ): Promise<BranchInfo> {
    const { projectDatabases, projectDatabaseBranches } = await import('@shared/schema');
    const [database] = await db
      .select()
      .from(projectDatabases)
      .where(eq(projectDatabases.projectId, projectId))
      .limit(1);
    if (!database) throw new Error('No database for project');
    if (database.provider !== 'neon') {
      throw new Error('Branching is only supported on Neon databases');
    }
    if (!database.providerProjectId) {
      throw new Error('Database has no Neon project ID');
    }

    if (!/^[a-zA-Z0-9_-]{1,40}$/.test(branchName)) {
      throw new Error('Branch name must be 1-40 chars, alphanumeric + _ -');
    }

    const { neonProvider } = await import('./providers/neon.provider');
    const created = await neonProvider.createBranch(
      database.providerProjectId,
      branchName,
      parentBranchId
    );

    const encryptedPassword = encrypt(created.password);
    const encryptedConnectionUrl = encrypt(created.connectionUrl);

    const [row] = await db
      .insert(projectDatabaseBranches)
      .values({
        projectDatabaseId: database.id,
        name: branchName,
        providerBranchId: created.branchId,
        providerEndpointId: created.endpointId,
        parentProviderBranchId: parentBranchId || database.providerBranchId || null,
        host: created.host,
        database: created.database,
        username: created.username,
        encryptedPassword,
        connectionUrl: encryptedConnectionUrl,
        isMain: false,
        isProtected: false,
        createdBy: userId,
      })
      .returning();

    return {
      id: row.id,
      name: row.name,
      providerBranchId: row.providerBranchId,
      parentProviderBranchId: row.parentProviderBranchId,
      isMain: row.isMain,
      isProtected: row.isProtected,
      host: row.host,
      database: row.database,
      username: row.username,
      createdAt: row.createdAt,
    };
  }

  async deleteBranch(projectId: number, branchId: number): Promise<void> {
    const { projectDatabases, projectDatabaseBranches } = await import('@shared/schema');
    const [database] = await db
      .select()
      .from(projectDatabases)
      .where(eq(projectDatabases.projectId, projectId))
      .limit(1);
    if (!database) throw new Error('No database for project');

    const [branch] = await db
      .select()
      .from(projectDatabaseBranches)
      .where(and(
        eq(projectDatabaseBranches.id, branchId),
        eq(projectDatabaseBranches.projectDatabaseId, database.id)
      ))
      .limit(1);
    if (!branch) throw new Error('Branch not found');
    if (branch.isProtected || branch.isMain) {
      throw new Error('Cannot delete main or protected branch');
    }

    if (database.provider === 'neon' && database.providerProjectId) {
      const { neonProvider } = await import('./providers/neon.provider');
      try {
        await neonProvider.deleteBranch(database.providerProjectId, branch.providerBranchId);
      } catch (err: any) {
        // Neon returns 404 if branch is already gone — treat as success and clean up local row
        const status = err?.status || err?.response?.status;
        const msg = String(err?.message || '');
        const alreadyGone = status === 404 || /not.?found/i.test(msg);
        if (!alreadyGone) {
          logger.error(`Neon branch deletion failed for ${branch.providerBranchId}; keeping local record for retry`, err);
          throw new Error(`Failed to delete branch on Neon: ${msg || 'unknown error'}. Please retry.`);
        }
        logger.warn(`Neon branch ${branch.providerBranchId} already gone (status ${status}); cleaning up local record`);
      }
    }

    await db.delete(projectDatabaseBranches).where(eq(projectDatabaseBranches.id, branchId));
  }

  async getBranchConnectionUrl(projectId: number, branchId: number): Promise<string> {
    const { projectDatabases, projectDatabaseBranches } = await import('@shared/schema');
    const [database] = await db
      .select()
      .from(projectDatabases)
      .where(eq(projectDatabases.projectId, projectId))
      .limit(1);
    if (!database) throw new Error('No database for project');

    const [branch] = await db
      .select()
      .from(projectDatabaseBranches)
      .where(and(
        eq(projectDatabaseBranches.id, branchId),
        eq(projectDatabaseBranches.projectDatabaseId, database.id)
      ))
      .limit(1);
    if (!branch || !branch.connectionUrl) throw new Error('Branch not found');

    return decrypt(branch.connectionUrl);
  }

  // ─── Replit-style Production / Development environments ────────────
  // - "Production" = the main DB (the existing projectDatabases row / Neon main branch)
  // - "Development" = a single Neon branch named "development", auto-managed.

  private static DEV_BRANCH_NAME = 'development';

  async getEnvironments(projectId: number): Promise<{
    production: {
      databaseId: number;
      provider: string;
      status: string;
      providerBranchId: string | null;
      host: string | null;
      database: string | null;
    };
    development: {
      branchId: number;
      providerBranchId: string;
      host: string | null;
      database: string | null;
      createdAt: Date;
    } | null;
  } | null> {
    const { projectDatabases, projectDatabaseBranches } = await import('@shared/schema');
    const [database] = await db
      .select()
      .from(projectDatabases)
      .where(eq(projectDatabases.projectId, projectId))
      .limit(1);
    if (!database) return null;

    const [dev] = await db
      .select()
      .from(projectDatabaseBranches)
      .where(and(
        eq(projectDatabaseBranches.projectDatabaseId, database.id),
        eq(projectDatabaseBranches.name, ProjectDatabaseBranchService.DEV_BRANCH_NAME)
      ))
      .limit(1);

    return {
      production: {
        databaseId: database.id,
        provider: database.provider,
        status: database.status,
        providerBranchId: database.providerBranchId,
        host: database.host,
        database: database.database,
      },
      development: dev
        ? {
            branchId: dev.id,
            providerBranchId: dev.providerBranchId,
            host: dev.host,
            database: dev.database,
            createdAt: dev.createdAt,
          }
        : null,
    };
  }

  async ensureDevelopmentBranch(projectId: number, userId: number | null): Promise<BranchInfo> {
    const { projectDatabases, projectDatabaseBranches } = await import('@shared/schema');
    const [database] = await db
      .select()
      .from(projectDatabases)
      .where(eq(projectDatabases.projectId, projectId))
      .limit(1);
    if (!database) throw new Error('No database for project');

    const [existing] = await db
      .select()
      .from(projectDatabaseBranches)
      .where(and(
        eq(projectDatabaseBranches.projectDatabaseId, database.id),
        eq(projectDatabaseBranches.name, ProjectDatabaseBranchService.DEV_BRANCH_NAME)
      ))
      .limit(1);

    const toInfo = (row: NonNullable<typeof existing>): BranchInfo => ({
      id: row.id,
      name: row.name,
      providerBranchId: row.providerBranchId,
      parentProviderBranchId: row.parentProviderBranchId,
      isMain: row.isMain,
      isProtected: row.isProtected,
      host: row.host,
      database: row.database,
      username: row.username,
      createdAt: row.createdAt,
    });

    if (existing) {
      return toInfo(existing);
    }

    try {
      return await this.createBranch(projectId, ProjectDatabaseBranchService.DEV_BRANCH_NAME, undefined, userId);
    } catch (err: any) {
      const isUniqueViolation =
        err?.code === '23505' ||
        (typeof err?.message === 'string' && /already exists|duplicate key/i.test(err.message));
      if (!isUniqueViolation) throw err;

      logger.warn(`ensureDevelopmentBranch: race detected for project ${projectId}, returning existing branch`);
      const [raced] = await db
        .select()
        .from(projectDatabaseBranches)
        .where(and(
          eq(projectDatabaseBranches.projectDatabaseId, database.id),
          eq(projectDatabaseBranches.name, ProjectDatabaseBranchService.DEV_BRANCH_NAME)
        ))
        .limit(1);
      if (!raced) throw err;
      return toInfo(raced);
    }
  }

  async resetDevelopmentBranch(projectId: number, userId: number | null): Promise<BranchInfo> {
    const { projectDatabases, projectDatabaseBranches } = await import('@shared/schema');
    const [database] = await db
      .select()
      .from(projectDatabases)
      .where(eq(projectDatabases.projectId, projectId))
      .limit(1);
    if (!database) throw new Error('No database for project');
    if (database.provider !== 'neon') {
      throw new Error('Reset development is only supported on Neon databases');
    }

    const [existing] = await db
      .select()
      .from(projectDatabaseBranches)
      .where(and(
        eq(projectDatabaseBranches.projectDatabaseId, database.id),
        eq(projectDatabaseBranches.name, ProjectDatabaseBranchService.DEV_BRANCH_NAME)
      ))
      .limit(1);

    if (existing) {
      logger.info(`Resetting development branch for project ${projectId} (deleting branch ${existing.id})`);
      await this.deleteBranch(projectId, existing.id);
    }

    logger.info(`Recreating development branch for project ${projectId} from main`);
    try {
      return await this.createBranch(projectId, ProjectDatabaseBranchService.DEV_BRANCH_NAME, undefined, userId);
    } catch (err: any) {
      logger.error(
        `resetDevelopmentBranch: recreation failed for project ${projectId} after delete; user must retry. Cause: ${err?.message || err}`
      );
      const friendly = new Error(
        `The old development database was removed but recreating it failed: ${err?.message || 'unknown error'}. Please click "Create development database" to try again.`
      );
      (friendly as any).cause = err;
      throw friendly;
    }
  }

  async getProductionConnectionUrl(projectId: number): Promise<string> {
    const credentials = await projectDatabaseService.getCredentials(projectId);
    if (!credentials) throw new Error('No production database for project');
    return credentials.connectionUrl;
  }
}

export const projectDatabaseBranchService = new ProjectDatabaseBranchService();
export const projectDatabaseService = new ProjectDatabaseProvisioningService();
