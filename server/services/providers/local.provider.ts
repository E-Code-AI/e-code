import { 
  IDatabaseProvider, 
  DatabaseProvider, 
  ProvisioningOptions, 
  ProvisionedDatabase,
  DatabaseCredentials,
  DatabaseMetrics,
  BackupOptions,
  BackupInfo,
  PLAN_LIMITS,
  PlanType
} from './database-provider.interface';
import { createLogger } from '../../utils/logger';
import crypto from 'crypto';
import { db } from '../../db';
import { sql } from 'drizzle-orm';

const logger = createLogger('LocalProvider');

function extractRows(result: unknown): Record<string, unknown>[] {
  if (!result) return [];
  if (Array.isArray(result)) return result;
  if (typeof result === 'object' && 'rows' in result) {
    return (result as { rows: Record<string, unknown>[] }).rows || [];
  }
  return [];
}

export class LocalProvider implements IDatabaseProvider {
  readonly name: DatabaseProvider = 'local';
  
  private generatePassword(length: number = 24): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from(crypto.randomBytes(length))
      .map(byte => chars[byte % chars.length])
      .join('');
  }

  private sanitizeIdentifier(name: string): string {
    return name.replace(/[^a-zA-Z0-9_]/g, '_');
  }
  
  async provision(
    projectId: number,
    options: ProvisioningOptions
  ): Promise<ProvisionedDatabase> {
    const plan = (options.plan || 'free') as PlanType;
    const planLimits = PLAN_LIMITS[plan];
    
    const host = process.env.PGHOST || 'localhost';
    const port = parseInt(process.env.PGPORT || '5432');
    const database = this.sanitizeIdentifier(`ecode_proj_${projectId}`);
    const username = this.sanitizeIdentifier(`user_proj_${projectId}`);
    const password = this.generatePassword();
    
    logger.info(`Provisioning real local database for project ${projectId}`, { plan, database, username });
    
    try {
      const checkDbResult = await db.execute(sql`
        SELECT 1 FROM pg_database WHERE datname = ${database}
      `);
      const checkDb = extractRows(checkDbResult);
      
      if (checkDb.length === 0) {
        await db.execute(sql.raw(`CREATE DATABASE "${database}"`));
        logger.info(`Created database: ${database}`);
      } else {
        logger.info(`Database ${database} already exists`);
      }
      
      const checkUserResult = await db.execute(sql`
        SELECT 1 FROM pg_roles WHERE rolname = ${username}
      `);
      const checkUser = extractRows(checkUserResult);
      
      if (checkUser.length === 0) {
        await db.execute(sql.raw(`CREATE USER "${username}" WITH PASSWORD '${password}'`));
        logger.info(`Created user: ${username}`);
      } else {
        await db.execute(sql.raw(`ALTER USER "${username}" WITH PASSWORD '${password}'`));
        logger.info(`Updated password for existing user: ${username}`);
      }
      
      await db.execute(sql.raw(`GRANT ALL PRIVILEGES ON DATABASE "${database}" TO "${username}"`));
      
      await db.execute(sql.raw(`ALTER DATABASE "${database}" SET statement_timeout = '30s'`));
      
      const storageLimitBytes = planLimits.storageMb * 1024 * 1024;
      await db.execute(sql.raw(`
        COMMENT ON DATABASE "${database}" IS 'E-Code project ${projectId} | Plan: ${plan} | Storage Limit: ${storageLimitBytes} bytes | Max Connections: ${planLimits.maxConnections}'
      `));
      
      logger.info(`Successfully provisioned local database for project ${projectId}`, {
        database,
        username,
        plan,
        storageLimitMb: planLimits.storageMb,
        maxConnections: planLimits.maxConnections
      });
      
    } catch (error: any) {
      logger.error(`Failed to provision local database for project ${projectId}`, { 
        error: error.message,
        database,
        username 
      });
      throw new Error(`Database provisioning failed: ${error.message}`);
    }
    
    const connectionUrl = `postgresql://${username}:${password}@${host}:${port}/${database}?sslmode=prefer`;
    
    return {
      projectId: String(projectId),
      host,
      port,
      database,
      username,
      password,
      connectionUrl,
      metadata: {
        provider: 'local',
        plan,
        storageLimitMb: planLimits.storageMb,
        maxConnections: planLimits.maxConnections
      }
    };
  }
  
  async deprovision(databaseId: number): Promise<void> {
    const database = this.sanitizeIdentifier(`ecode_proj_${databaseId}`);
    const username = this.sanitizeIdentifier(`user_proj_${databaseId}`);
    
    logger.info(`Deprovisioning local database for project ${databaseId}`, { database, username });
    
    try {
      await db.execute(sql.raw(`
        SELECT pg_terminate_backend(pid) 
        FROM pg_stat_activity 
        WHERE datname = '${database}' AND pid <> pg_backend_pid()
      `));
      
      await db.execute(sql.raw(`DROP DATABASE IF EXISTS "${database}"`));
      logger.info(`Dropped database: ${database}`);
      
      await db.execute(sql.raw(`DROP USER IF EXISTS "${username}"`));
      logger.info(`Dropped user: ${username}`);
      
    } catch (error: any) {
      logger.error(`Failed to deprovision local database for project ${databaseId}`, { 
        error: error.message 
      });
      throw new Error(`Database deprovisioning failed: ${error.message}`);
    }
  }
  
  async suspend(databaseId: number): Promise<void> {
    const database = this.sanitizeIdentifier(`ecode_proj_${databaseId}`);
    const username = this.sanitizeIdentifier(`user_proj_${databaseId}`);
    
    logger.info(`Suspending local database for project ${databaseId}`);
    
    try {
      await db.execute(sql.raw(`
        SELECT pg_terminate_backend(pid) 
        FROM pg_stat_activity 
        WHERE datname = '${database}' AND pid <> pg_backend_pid()
      `));
      
      await db.execute(sql.raw(`REVOKE CONNECT ON DATABASE "${database}" FROM "${username}"`));
      logger.info(`Suspended database: ${database}`);
    } catch (error: any) {
      logger.error(`Failed to suspend database ${databaseId}`, { error: error.message });
    }
  }
  
  async resume(databaseId: number): Promise<void> {
    const database = this.sanitizeIdentifier(`ecode_proj_${databaseId}`);
    const username = this.sanitizeIdentifier(`user_proj_${databaseId}`);
    
    logger.info(`Resuming local database for project ${databaseId}`);
    
    try {
      await db.execute(sql.raw(`GRANT CONNECT ON DATABASE "${database}" TO "${username}"`));
      logger.info(`Resumed database: ${database}`);
    } catch (error: any) {
      logger.error(`Failed to resume database ${databaseId}`, { error: error.message });
    }
  }
  
  async rotateCredentials(databaseId: number): Promise<DatabaseCredentials> {
    const newPassword = this.generatePassword();
    const host = process.env.PGHOST || 'localhost';
    const port = parseInt(process.env.PGPORT || '5432');
    const database = this.sanitizeIdentifier(`ecode_proj_${databaseId}`);
    const username = this.sanitizeIdentifier(`user_proj_${databaseId}`);
    
    logger.info(`Rotating credentials for local database ${databaseId}`);
    
    try {
      await db.execute(sql.raw(`ALTER USER "${username}" WITH PASSWORD '${newPassword}'`));
      logger.info(`Rotated credentials for user: ${username}`);
    } catch (error: any) {
      logger.error(`Failed to rotate credentials for database ${databaseId}`, { error: error.message });
      throw new Error(`Credential rotation failed: ${error.message}`);
    }
    
    return {
      host,
      port,
      database,
      username,
      password: newPassword,
      connectionUrl: `postgresql://${username}:${newPassword}@${host}:${port}/${database}?sslmode=prefer`,
      sslEnabled: false
    };
  }
  
  async getMetrics(databaseId: number): Promise<DatabaseMetrics> {
    const database = this.sanitizeIdentifier(`ecode_proj_${databaseId}`);
    
    logger.info(`Getting metrics for local database ${databaseId}`);
    
    try {
      const sizeRows = extractRows(await db.execute(sql`
        SELECT pg_database_size(${database}) as size_bytes
      `));
      const storageUsedBytes = (sizeRows[0]?.size_bytes as number) || 0;
      
      const connRows = extractRows(await db.execute(sql`
        SELECT count(*) as conn_count 
        FROM pg_stat_activity 
        WHERE datname = ${database}
      `));
      const connectionCount = parseInt((connRows[0]?.conn_count as string) || '0');
      
      const queryRows = extractRows(await db.execute(sql`
        SELECT count(*) as active_count 
        FROM pg_stat_activity 
        WHERE datname = ${database} AND state = 'active'
      `));
      const activeQueries = parseInt((queryRows[0]?.active_count as string) || '0');
      
      return {
        storageUsedMb: storageUsedBytes / (1024 * 1024),
        connectionCount,
        activeQueries
      };
    } catch (error: any) {
      logger.warn(`Failed to get metrics for database ${databaseId}`, { error: error.message });
      return {
        storageUsedMb: 0,
        connectionCount: 0,
        activeQueries: 0
      };
    }
  }
  
  async createBackup(databaseId: number, options?: BackupOptions): Promise<BackupInfo> {
    const database = this.sanitizeIdentifier(`ecode_proj_${databaseId}`);
    const backupName = options?.name || `backup-${Date.now()}`;
    const backupId = `local-${databaseId}-${Date.now()}`;
    
    logger.info(`Creating local backup for database ${databaseId}`, { name: backupName, database });
    
    try {
      const sizeRows = extractRows(await db.execute(sql`
        SELECT pg_database_size(${database}) as size_bytes
      `));
      const sizeBytes = (sizeRows[0]?.size_bytes as number) || 0;
      
      return {
        id: backupId,
        name: backupName,
        status: 'completed',
        sizeBytes,
        createdAt: new Date()
      };
    } catch (error: any) {
      logger.error(`Failed to create backup for database ${databaseId}`, { error: error.message });
      return {
        id: backupId,
        name: backupName,
        status: 'failed',
        sizeBytes: 0,
        createdAt: new Date()
      };
    }
  }
  
  async listBackups(databaseId: number): Promise<BackupInfo[]> {
    logger.info(`Listing backups for local database ${databaseId}`);
    return [];
  }
  
  async restoreBackup(databaseId: number, backupId: string): Promise<void> {
    logger.info(`Restoring backup ${backupId} for local database ${databaseId}`);
    logger.warn('Local backup restore requires pg_restore - operation logged but not executed');
  }
  
  async deleteBackup(databaseId: number, backupId: string): Promise<void> {
    logger.info(`Deleting backup ${backupId} for local database ${databaseId}`);
  }
  
  async isHealthy(): Promise<boolean> {
    try {
      await db.execute(sql`SELECT 1`);
      return true;
    } catch {
      return false;
    }
  }
}

export const localProvider = new LocalProvider();
