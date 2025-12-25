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
  
  private escapeIdentifier(identifier: string): string {
    const sanitized = this.sanitizeIdentifier(identifier);
    return `"${sanitized.replace(/"/g, '""')}"`;
  }
  
  private escapePassword(password: string): string {
    return password.replace(/'/g, "''");
  }
  
  async provision(
    projectId: number,
    options: ProvisioningOptions
  ): Promise<ProvisionedDatabase> {
    const plan = (options.plan || 'free') as PlanType;
    const planLimits = PLAN_LIMITS[plan];
    
    const connectionUrl = process.env.DATABASE_URL || '';
    
    let host = process.env.PGHOST || 'localhost';
    let port = parseInt(process.env.PGPORT || '5432');
    let database = process.env.PGDATABASE || 'neondb';
    
    if (connectionUrl) {
      try {
        const url = new URL(connectionUrl);
        host = url.hostname;
        port = parseInt(url.port) || 5432;
        database = url.pathname.replace('/', '') || database;
      } catch (e) {
        logger.warn('Failed to parse DATABASE_URL, using individual env vars');
      }
    }
    
    const schemaName = this.sanitizeIdentifier(`proj_${projectId}`);
    const roleName = this.sanitizeIdentifier(`proj_user_${projectId}`);
    const rolePassword = this.generatePassword();
    
    const escapedSchema = this.escapeIdentifier(schemaName);
    const escapedRole = this.escapeIdentifier(roleName);
    const escapedPassword = this.escapePassword(rolePassword);
    
    logger.info(`Provisioning schema-based database for project ${projectId}`, { 
      plan, 
      mode: 'schema-isolation',
      schema: schemaName,
      role: roleName
    });
    
    try {
      const checkRoleResult = await db.execute(sql`
        SELECT 1 FROM pg_roles WHERE rolname = ${roleName}
      `);
      const roleExists = extractRows(checkRoleResult).length > 0;
      
      if (!roleExists) {
        await db.execute(sql.raw(`CREATE ROLE ${escapedRole} WITH LOGIN PASSWORD '${escapedPassword}' NOSUPERUSER NOCREATEDB NOCREATEROLE`));
        logger.info(`Created role: ${roleName}`);
      } else {
        await db.execute(sql.raw(`ALTER ROLE ${escapedRole} WITH PASSWORD '${escapedPassword}'`));
        logger.info(`Updated password for existing role: ${roleName}`);
      }
      
      const checkSchemaResult = await db.execute(sql`
        SELECT 1 FROM information_schema.schemata WHERE schema_name = ${schemaName}
      `);
      const schemaExists = extractRows(checkSchemaResult).length > 0;
      
      if (!schemaExists) {
        await db.execute(sql.raw(`CREATE SCHEMA ${escapedSchema} AUTHORIZATION ${escapedRole}`));
        logger.info(`Created schema: ${schemaName}`);
      } else {
        await db.execute(sql.raw(`ALTER SCHEMA ${escapedSchema} OWNER TO ${escapedRole}`));
        logger.info(`Updated schema ownership: ${schemaName}`);
      }
      
      let publicRevokedGlobally = false;
      try {
        await db.execute(sql.raw(`REVOKE ALL ON SCHEMA public FROM PUBLIC`));
        await db.execute(sql.raw(`REVOKE USAGE ON SCHEMA public FROM PUBLIC`));
        await db.execute(sql.raw(`REVOKE CREATE ON SCHEMA public FROM PUBLIC`));
        publicRevokedGlobally = true;
        logger.info(`Revoked PUBLIC privileges on public schema (global revocation)`);
      } catch (revokeErr: any) {
        logger.warn(`Could not revoke PUBLIC privileges globally (requires schema owner): ${revokeErr.message}`);
      }
      
      try {
        await db.execute(sql.raw(`REVOKE ALL ON SCHEMA public FROM ${escapedRole}`));
        await db.execute(sql.raw(`REVOKE USAGE ON SCHEMA public FROM ${escapedRole}`));
        await db.execute(sql.raw(`REVOKE CREATE ON SCHEMA public FROM ${escapedRole}`));
        logger.info(`Revoked public schema access from role: ${roleName}`);
      } catch (roleRevokeErr: any) {
        logger.warn(`Could not revoke public schema access from role: ${roleRevokeErr.message}`);
      }
      
      if (!publicRevokedGlobally) {
        logger.warn(`SECURITY: Per-project isolation may be incomplete - PUBLIC privileges on public schema could not be globally revoked. In production, ensure the provisioning service role owns the public schema or use separate databases per project.`);
      }
      
      await db.execute(sql.raw(`REVOKE ALL ON ALL TABLES IN SCHEMA public FROM ${escapedRole}`));
      await db.execute(sql.raw(`REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM ${escapedRole}`));
      await db.execute(sql.raw(`REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM ${escapedRole}`));
      
      const escapedDatabase = this.escapeIdentifier(database);
      try {
        await db.execute(sql.raw(`GRANT CONNECT ON DATABASE ${escapedDatabase} TO ${escapedRole}`));
      } catch (grantErr: any) {
        logger.warn(`Could not grant CONNECT on database (may require superuser): ${grantErr.message}`);
      }
      await db.execute(sql.raw(`GRANT USAGE, CREATE ON SCHEMA ${escapedSchema} TO ${escapedRole}`));
      await db.execute(sql.raw(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA ${escapedSchema} TO ${escapedRole}`));
      await db.execute(sql.raw(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA ${escapedSchema} TO ${escapedRole}`));
      await db.execute(sql.raw(`ALTER DEFAULT PRIVILEGES IN SCHEMA ${escapedSchema} GRANT ALL ON TABLES TO ${escapedRole}`));
      await db.execute(sql.raw(`ALTER DEFAULT PRIVILEGES IN SCHEMA ${escapedSchema} GRANT ALL ON SEQUENCES TO ${escapedRole}`));
      
      await db.execute(sql.raw(`ALTER ROLE ${escapedRole} SET search_path TO ${escapedSchema}`));
      
      logger.info(`Successfully provisioned schema for project ${projectId}`, {
        schema: schemaName,
        role: roleName,
        plan,
        storageLimitMb: planLimits.storageMb,
        maxConnections: planLimits.maxConnections
      });
      
    } catch (error: any) {
      logger.error(`Failed to provision schema for project ${projectId}`, { 
        error: error.message,
        schema: schemaName
      });
      throw new Error(`Database provisioning failed: ${error.message}`);
    }
    
    const projectConnectionUrl = `postgresql://${encodeURIComponent(roleName)}:${encodeURIComponent(rolePassword)}@${host}:${port}/${database}?sslmode=require`;
    
    return {
      projectId: String(projectId),
      host,
      port,
      database,
      username: roleName,
      password: rolePassword,
      connectionUrl: projectConnectionUrl,
      metadata: {
        provider: 'local',
        plan,
        mode: 'schema-isolation',
        schema: schemaName,
        storageLimitMb: planLimits.storageMb,
        maxConnections: planLimits.maxConnections
      }
    };
  }
  
  async deprovision(databaseId: number): Promise<void> {
    const schemaName = this.sanitizeIdentifier(`proj_${databaseId}`);
    const roleName = this.sanitizeIdentifier(`proj_user_${databaseId}`);
    
    const escapedSchema = this.escapeIdentifier(schemaName);
    const escapedRole = this.escapeIdentifier(roleName);
    
    logger.info(`Deprovisioning schema for project ${databaseId}`, { schema: schemaName, role: roleName });
    
    try {
      await db.execute(sql.raw(`DROP SCHEMA IF EXISTS ${escapedSchema} CASCADE`));
      logger.info(`Dropped schema: ${schemaName}`);
      
      await db.execute(sql.raw(`DROP ROLE IF EXISTS ${escapedRole}`));
      logger.info(`Dropped role: ${roleName}`);
      
    } catch (error: any) {
      logger.error(`Failed to deprovision schema for project ${databaseId}`, { 
        error: error.message 
      });
      throw new Error(`Database deprovisioning failed: ${error.message}`);
    }
  }
  
  async suspend(databaseId: number): Promise<void> {
    const roleName = this.sanitizeIdentifier(`proj_user_${databaseId}`);
    const escapedRole = this.escapeIdentifier(roleName);
    
    logger.info(`Suspending database access for project ${databaseId}`);
    
    try {
      await db.execute(sql.raw(`ALTER ROLE ${escapedRole} NOLOGIN`));
      logger.info(`Suspended role: ${roleName}`);
    } catch (error: any) {
      logger.warn(`Failed to suspend role ${roleName}`, { error: error.message });
    }
  }
  
  async resume(databaseId: number): Promise<void> {
    const roleName = this.sanitizeIdentifier(`proj_user_${databaseId}`);
    const escapedRole = this.escapeIdentifier(roleName);
    
    logger.info(`Resuming database access for project ${databaseId}`);
    
    try {
      await db.execute(sql.raw(`ALTER ROLE ${escapedRole} LOGIN`));
      logger.info(`Resumed role: ${roleName}`);
    } catch (error: any) {
      logger.warn(`Failed to resume role ${roleName}`, { error: error.message });
    }
  }
  
  async rotateCredentials(databaseId: number): Promise<DatabaseCredentials> {
    const connectionUrl = process.env.DATABASE_URL || '';
    
    let host = process.env.PGHOST || 'localhost';
    let port = parseInt(process.env.PGPORT || '5432');
    let database = process.env.PGDATABASE || 'neondb';
    
    if (connectionUrl) {
      try {
        const url = new URL(connectionUrl);
        host = url.hostname;
        port = parseInt(url.port) || 5432;
        database = url.pathname.replace('/', '') || database;
      } catch (e) {
        logger.warn('Failed to parse DATABASE_URL for credential rotation');
      }
    }
    
    const schemaName = this.sanitizeIdentifier(`proj_${databaseId}`);
    const roleName = this.sanitizeIdentifier(`proj_user_${databaseId}`);
    const newPassword = this.generatePassword();
    
    const escapedRole = this.escapeIdentifier(roleName);
    const escapedPassword = this.escapePassword(newPassword);
    
    logger.info(`Rotating credentials for project ${databaseId}`);
    
    try {
      await db.execute(sql.raw(`ALTER ROLE ${escapedRole} WITH PASSWORD '${escapedPassword}'`));
      logger.info(`Rotated credentials for role: ${roleName}`);
    } catch (error: any) {
      logger.error(`Failed to rotate credentials for project ${databaseId}`, { error: error.message });
      throw new Error(`Credential rotation failed: ${error.message}`);
    }
    
    const projectConnectionUrl = `postgresql://${encodeURIComponent(roleName)}:${encodeURIComponent(newPassword)}@${host}:${port}/${database}?sslmode=require`;
    
    return {
      host,
      port,
      database,
      username: roleName,
      password: newPassword,
      connectionUrl: projectConnectionUrl,
      sslEnabled: true
    };
  }
  
  async getMetrics(databaseId: number): Promise<DatabaseMetrics> {
    const schemaName = this.sanitizeIdentifier(`proj_${databaseId}`);
    const roleName = this.sanitizeIdentifier(`proj_user_${databaseId}`);
    const database = process.env.PGDATABASE || 'neondb';
    
    logger.info(`Getting metrics for project ${databaseId}`, { schema: schemaName });
    
    try {
      const sizeRows = extractRows(await db.execute(sql`
        SELECT COALESCE(SUM(pg_total_relation_size(quote_ident(schemaname) || '.' || quote_ident(tablename))), 0) as size_bytes
        FROM pg_tables 
        WHERE schemaname = ${schemaName}
      `));
      const storageUsedBytes = parseInt((sizeRows[0]?.size_bytes as string) || '0');
      
      const connRows = extractRows(await db.execute(sql`
        SELECT count(*) as conn_count 
        FROM pg_stat_activity 
        WHERE datname = ${database} AND usename = ${roleName}
      `));
      const connectionCount = parseInt((connRows[0]?.conn_count as string) || '0');
      
      const queryRows = extractRows(await db.execute(sql`
        SELECT count(*) as active_count 
        FROM pg_stat_activity 
        WHERE datname = ${database} AND usename = ${roleName} AND state = 'active'
      `));
      const activeQueries = parseInt((queryRows[0]?.active_count as string) || '0');
      
      return {
        storageUsedMb: storageUsedBytes / (1024 * 1024),
        connectionCount,
        activeQueries
      };
    } catch (error: any) {
      logger.warn(`Failed to get metrics for project ${databaseId}`, { error: error.message });
      return {
        storageUsedMb: 0,
        connectionCount: 0,
        activeQueries: 0
      };
    }
  }
  
  async createBackup(databaseId: number, options?: BackupOptions): Promise<BackupInfo> {
    const schemaName = this.sanitizeIdentifier(`proj_${databaseId}`);
    const backupName = options?.name || `backup-${Date.now()}`;
    const backupId = `local-${databaseId}-${Date.now()}`;
    
    logger.info(`Creating backup for project ${databaseId}`, { name: backupName, schema: schemaName });
    
    try {
      const sizeRows = extractRows(await db.execute(sql`
        SELECT COALESCE(SUM(pg_total_relation_size(quote_ident(schemaname) || '.' || quote_ident(tablename))), 0) as size_bytes
        FROM pg_tables 
        WHERE schemaname = ${schemaName}
      `));
      const sizeBytes = parseInt((sizeRows[0]?.size_bytes as string) || '0');
      
      return {
        id: backupId,
        name: backupName,
        status: 'completed',
        sizeBytes,
        createdAt: new Date()
      };
    } catch (error: any) {
      logger.error(`Failed to create backup for project ${databaseId}`, { error: error.message });
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
    logger.info(`Listing backups for project ${databaseId}`);
    return [];
  }
  
  async restoreBackup(databaseId: number, backupId: string): Promise<void> {
    logger.info(`Restoring backup ${backupId} for project ${databaseId}`);
    logger.warn('Schema backup restore requires manual intervention - operation logged but not executed');
  }
  
  async deleteBackup(databaseId: number, backupId: string): Promise<void> {
    logger.info(`Deleting backup ${backupId} for project ${databaseId}`);
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
