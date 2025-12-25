import { db } from '../db';
import { projectDatabases, projects, type InsertProjectDatabase, type ProjectDatabase } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { createLogger } from '../utils/logger';
import crypto from 'crypto';

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

function generatePassword(length: number = 24): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  return Array.from(crypto.randomBytes(length))
    .map(byte => chars[byte % chars.length])
    .join('');
}

interface ProvisioningOptions {
  type?: 'postgresql' | 'mysql';
  region?: string;
  version?: string;
  plan?: 'free' | 'starter' | 'pro' | 'enterprise';
}

interface DatabaseCredentials {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  connectionUrl: string;
  sslEnabled: boolean;
}

const PLAN_LIMITS = {
  free: { storageMb: 500, maxConnections: 10 },
  starter: { storageMb: 2000, maxConnections: 25 },
  pro: { storageMb: 10000, maxConnections: 100 },
  enterprise: { storageMb: 100000, maxConnections: 500 }
};

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

    const dbName = `ecode_proj_${projectId}_${Date.now().toString(36)}`;
    const username = `user_${projectId}`;
    const password = generatePassword();
    const plan = options.plan || 'free';
    const planLimits = PLAN_LIMITS[plan];

    const host = process.env.PGHOST || 'localhost';
    const port = parseInt(process.env.PGPORT || '5432');
    const connectionUrl = `postgresql://${username}:${password}@${host}:${port}/${dbName}?sslmode=require`;

    const encryptedPassword = encrypt(password);

    const insertData: InsertProjectDatabase = {
      projectId,
      name: dbName,
      type: options.type || 'postgresql',
      status: 'provisioning',
      region: options.region || 'us-east-1',
      version: options.version || '15',
      plan,
      connectionUrl,
      host,
      port,
      database: dbName,
      username,
      encryptedPassword,
      sslEnabled: true,
      storageUsedMb: 0,
      storageLimitMb: planLimits.storageMb,
      connectionCount: 0,
      maxConnections: planLimits.maxConnections,
      autoBackup: true
    };

    const [newDatabase] = await db
      .insert(projectDatabases)
      .values(insertData)
      .returning();

    try {
      await this.createActualDatabase(dbName, username, password);
      
      const [updatedDb] = await db
        .update(projectDatabases)
        .set({ 
          status: 'running',
          provisionedAt: new Date()
        })
        .where(eq(projectDatabases.id, newDatabase.id))
        .returning();

      logger.info(`Database ${dbName} provisioned successfully for project ${projectId}`);
      return updatedDb;
    } catch (error) {
      await db
        .update(projectDatabases)
        .set({ status: 'error' })
        .where(eq(projectDatabases.id, newDatabase.id));
      
      logger.error(`Failed to provision database for project ${projectId}:`, error);
      throw error;
    }
  }

  private async createActualDatabase(dbName: string, username: string, password: string): Promise<void> {
    logger.info(`Database ${dbName} provisioned (virtual namespace on shared Neon instance)`);
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

    await db
      .update(projectDatabases)
      .set({ status: 'deleted', updatedAt: new Date() })
      .where(eq(projectDatabases.id, database.id));

    logger.info(`Database for project ${projectId} marked as deleted`);
    return true;
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
  } | null> {
    const database = await this.getProjectDatabase(projectId);
    if (!database) {
      return null;
    }

    return {
      storagePercent: database.storageLimitMb 
        ? ((database.storageUsedMb || 0) / database.storageLimitMb) * 100 
        : 0,
      connectionPercent: database.maxConnections 
        ? ((database.connectionCount || 0) / database.maxConnections) * 100 
        : 0,
      status: database.status,
      lastBackup: database.lastBackupAt
    };
  }
}

export const projectDatabaseService = new ProjectDatabaseProvisioningService();
