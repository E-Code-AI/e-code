import { db, client } from '../db';
import { sql, eq, and } from 'drizzle-orm';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import type { PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';
import * as schema from '@shared/schema';

export type IsolationLevel = 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE';

export type TransactionHandle = PgTransaction<PostgresJsQueryResultHKT, typeof schema, any>;

export interface TenantScopedQueries {
  readonly tenantId: number;
  getProjects(): Promise<(typeof schema.projects.$inferSelect)[]>;
  getProjectById(projectId: number): Promise<typeof schema.projects.$inferSelect | null>;
  createProject(data: Omit<typeof schema.projects.$inferInsert, 'tenantId'>): Promise<typeof schema.projects.$inferSelect>;
  updateProject(projectId: number, data: Partial<Omit<typeof schema.projects.$inferInsert, 'tenantId'>>): Promise<typeof schema.projects.$inferSelect | null>;
  deleteProject(projectId: number): Promise<typeof schema.projects.$inferSelect | null>;
  getFilesByProject(projectId: number): Promise<(typeof schema.files.$inferSelect)[]>;
  getDeploymentsByProject(projectId: number): Promise<(typeof schema.deployments.$inferSelect)[]>;
}

export function createTenantScopedQueries(tx: TransactionHandle, tenantId: number): TenantScopedQueries {
  const getProjectById = async (projectId: number): Promise<typeof schema.projects.$inferSelect | null> => {
    const results = await tx
      .select()
      .from(schema.projects)
      .where(
        and(
          eq(schema.projects.id, projectId),
          eq(schema.projects.tenantId, tenantId)
        )
      )
      .limit(1);
    return results[0] ?? null;
  };

  const api: TenantScopedQueries = {
    tenantId,

    async getProjects() {
      return await tx
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.tenantId, tenantId));
    },

    getProjectById,

    async createProject(data) {
      const results = await tx
        .insert(schema.projects)
        .values({ ...data, tenantId })
        .returning();
      return results[0];
    },

    async updateProject(projectId, data) {
      const results = await tx
        .update(schema.projects)
        .set(data)
        .where(
          and(
            eq(schema.projects.id, projectId),
            eq(schema.projects.tenantId, tenantId)
          )
        )
        .returning();
      return results[0] ?? null;
    },

    async deleteProject(projectId) {
      const results = await tx
        .delete(schema.projects)
        .where(
          and(
            eq(schema.projects.id, projectId),
            eq(schema.projects.tenantId, tenantId)
          )
        )
        .returning();
      return results[0] ?? null;
    },

    async getFilesByProject(projectId) {
      const project = await getProjectById(projectId);
      if (!project) return [];
      
      return await tx
        .select()
        .from(schema.files)
        .where(eq(schema.files.projectId, projectId));
    },

    async getDeploymentsByProject(projectId) {
      const project = await getProjectById(projectId);
      if (!project) return [];
      
      return await tx
        .select()
        .from(schema.deployments)
        .where(eq(schema.deployments.projectId, projectId));
    }
  };

  return Object.freeze(api);
}

export interface TenantContext {
  tenantId: number | null;
  userId: number;
  sessionId?: string;
}

export interface TransactionOptions {
  isolationLevel?: IsolationLevel;
  timeout?: number;
  retries?: number;
  tenantContext: TenantContext;
}

export interface CommitResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  transactionId: string;
  duration: number;
  retryCount: number;
}

type TransactionCallback<T> = (
  tx: PgTransaction<PostgresJsQueryResultHKT, typeof schema, any>,
  context: TenantContext
) => Promise<T>;

class PersistenceEngine {
  private static instance: PersistenceEngine;
  private transactionCounter = 0;

  private constructor() {}

  static getInstance(): PersistenceEngine {
    if (!PersistenceEngine.instance) {
      PersistenceEngine.instance = new PersistenceEngine();
    }
    return PersistenceEngine.instance;
  }

  private generateTransactionId(): string {
    const timestamp = Date.now().toString(36);
    const counter = (++this.transactionCounter).toString(36).padStart(4, '0');
    const random = Math.random().toString(36).substring(2, 8);
    return `txn_${timestamp}_${counter}_${random}`;
  }

  async withTransaction<T>(
    callback: TransactionCallback<T>,
    options: TransactionOptions
  ): Promise<CommitResult<T>> {
    const {
      isolationLevel = 'REPEATABLE READ',
      timeout = 30000,
      retries = 3,
      tenantContext
    } = options;

    const transactionId = this.generateTransactionId();
    const startTime = Date.now();
    let lastError: Error | undefined;
    let retryCount = 0;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const result = await this.executeTransaction(
          callback,
          tenantContext,
          isolationLevel,
          timeout,
          transactionId
        );

        return {
          success: true,
          data: result,
          transactionId,
          duration: Date.now() - startTime,
          retryCount
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        retryCount = attempt + 1;

        const isRetryable = this.isRetryableError(lastError);
        if (!isRetryable || attempt === retries - 1) {
          break;
        }

        const backoffMs = Math.min(100 * Math.pow(2, attempt), 2000);
        await this.delay(backoffMs);
      }
    }

    return {
      success: false,
      error: lastError,
      transactionId,
      duration: Date.now() - startTime,
      retryCount
    };
  }

  private async executeTransaction<T>(
    callback: TransactionCallback<T>,
    tenantContext: TenantContext,
    isolationLevel: IsolationLevel,
    timeout: number,
    transactionId: string
  ): Promise<T> {
    return db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET TRANSACTION ISOLATION LEVEL ${isolationLevel}`));
      
      await tx.execute(sql.raw(`SET LOCAL statement_timeout = '${timeout}ms'`));
      
      await tx.execute(sql.raw(`SET LOCAL app.tenant_id = '${tenantContext.tenantId ?? 0}'`));
      await tx.execute(sql.raw(`SET LOCAL app.user_id = '${tenantContext.userId}'`));
      await tx.execute(sql.raw(`SET LOCAL app.transaction_id = '${transactionId}'`));

      return await callback(tx, tenantContext);
    });
  }

  private isRetryableError(error: Error): boolean {
    const retryablePatterns = [
      'deadlock detected',
      'could not serialize access',
      'concurrent update',
      'connection reset',
      'connection terminated',
      'ECONNRESET',
      'ETIMEDOUT'
    ];

    const message = error.message.toLowerCase();
    return retryablePatterns.some(pattern => message.includes(pattern.toLowerCase()));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async atomicCommit<T>(
    operations: Array<{
      table: string;
      operation: 'insert' | 'update' | 'delete';
      data: any;
      where?: any;
    }>,
    options: TransactionOptions
  ): Promise<CommitResult<T[]>> {
    return this.withTransaction(async (tx, context) => {
      const results: any[] = [];

      for (const op of operations) {
        if (op.data) {
          op.data = this.enforceTenantPredicate(op.data, context.tenantId);
        }

        let result: any;
        
        switch (op.operation) {
          case 'insert':
            result = await this.executeInsert(tx, op.table, op.data);
            break;
          case 'update':
            result = await this.executeUpdate(tx, op.table, op.data, op.where, context);
            break;
          case 'delete':
            result = await this.executeDelete(tx, op.table, op.where, context);
            break;
        }

        results.push(result);
      }

      return results as T[];
    }, options);
  }

  private async executeInsert(
    tx: PgTransaction<PostgresJsQueryResultHKT, typeof schema, any>,
    tableName: string,
    data: any
  ): Promise<any> {
    const table = (schema as any)[tableName];
    if (!table) {
      throw new Error(`Table ${tableName} not found in schema`);
    }

    const [result] = await tx.insert(table).values(data).returning();
    return result;
  }

  private async executeUpdate(
    tx: PgTransaction<PostgresJsQueryResultHKT, typeof schema, any>,
    tableName: string,
    data: any,
    where: any,
    context: TenantContext
  ): Promise<any> {
    const table = (schema as any)[tableName];
    if (!table) {
      throw new Error(`Table ${tableName} not found in schema`);
    }

    const conditions = this.buildConditions(table, where, context);
    const [result] = await tx.update(table).set(data).where(conditions).returning();
    return result;
  }

  private async executeDelete(
    tx: PgTransaction<PostgresJsQueryResultHKT, typeof schema, any>,
    tableName: string,
    where: any,
    context: TenantContext
  ): Promise<any> {
    const table = (schema as any)[tableName];
    if (!table) {
      throw new Error(`Table ${tableName} not found in schema`);
    }

    const conditions = this.buildConditions(table, where, context);
    const [result] = await tx.delete(table).where(conditions).returning();
    return result;
  }

  private buildConditions(table: any, where: any, context: TenantContext): any {
    const conditions: any[] = [];

    if (where) {
      for (const [key, value] of Object.entries(where)) {
        if (table[key]) {
          conditions.push(eq(table[key], value));
        }
      }
    }

    if (context.tenantId !== null && table.tenantId) {
      conditions.push(eq(table.tenantId, context.tenantId));
    }

    if (conditions.length === 0) {
      throw new Error('At least one condition is required for update/delete operations');
    }

    return conditions.length === 1 ? conditions[0] : and(...conditions);
  }

  async verifyTenantAccess(
    tenantId: number,
    userId: number
  ): Promise<{ hasAccess: boolean; role?: string }> {
    try {
      const membership = await db
        .select({
          role: schema.teamMembers.role,
          isActive: schema.teamMembers.isActive
        })
        .from(schema.teamMembers)
        .where(
          and(
            eq(schema.teamMembers.teamId, tenantId),
            eq(schema.teamMembers.userId, userId),
            eq(schema.teamMembers.isActive, true)
          )
        )
        .limit(1);

      if (membership.length > 0) {
        return { hasAccess: true, role: membership[0].role };
      }

      const team = await db
        .select({ ownerId: schema.teams.ownerId })
        .from(schema.teams)
        .where(eq(schema.teams.id, tenantId))
        .limit(1);

      if (team.length > 0 && team[0].ownerId === userId) {
        return { hasAccess: true, role: 'owner' };
      }

      return { hasAccess: false };
    } catch (error) {
      console.error('[PersistenceEngine] Tenant access verification failed:', error);
      return { hasAccess: false };
    }
  }

  async createTenantIsolatedQuery<T>(
    tenantId: number,
    queryFn: (scopedQueries: TenantScopedQueries) => Promise<T>
  ): Promise<T> {
    return db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.tenant_id = '${tenantId}'`));
      const scopedQueries = createTenantScopedQueries(tx, tenantId);
      return queryFn(scopedQueries);
    });
  }

  enforceTenantPredicate<T extends { tenantId?: number | null }>(
    data: T,
    tenantId: number | null
  ): T {
    if (tenantId !== null) {
      return { ...data, tenantId };
    }
    return data;
  }

  validateTenantMatch(
    recordTenantId: number | null | undefined,
    contextTenantId: number | null
  ): boolean {
    if (contextTenantId === null) {
      return true;
    }
    return recordTenantId === contextTenantId;
  }

  getTransactionStats(): {
    totalTransactions: number;
  } {
    return {
      totalTransactions: this.transactionCounter
    };
  }
}

export const persistenceEngine = PersistenceEngine.getInstance();

export function createTenantContext(
  userId: number,
  tenantId: number | null = null,
  sessionId?: string
): TenantContext {
  return {
    tenantId,
    userId,
    sessionId
  };
}

/**
 * @deprecated Use `withScopedTransaction` for tenant-isolated operations.
 * This function exposes raw transaction handle which can bypass tenant isolation.
 * Only use for internal/admin operations that need cross-tenant access.
 */
export async function withTenantTransaction<T>(
  tenantId: number | null,
  userId: number,
  callback: TransactionCallback<T>,
  options: Partial<Omit<TransactionOptions, 'tenantContext'>> = {}
): Promise<CommitResult<T>> {
  if (tenantId !== null) {
    console.warn('[PersistenceEngine] DEPRECATED: withTenantTransaction used with tenantId. Use withScopedTransaction for tenant isolation.');
  }
  const tenantContext = createTenantContext(userId, tenantId);
  
  return persistenceEngine.withTransaction(callback, {
    ...options,
    tenantContext
  });
}

/**
 * @deprecated Use `withScopedTransaction` with isolationLevel: 'SERIALIZABLE' instead.
 * This function exposes raw transaction handle which can bypass tenant isolation.
 */
export async function withSerializableTransaction<T>(
  tenantId: number | null,
  userId: number,
  callback: TransactionCallback<T>
): Promise<CommitResult<T>> {
  return withTenantTransaction(tenantId, userId, callback, {
    isolationLevel: 'SERIALIZABLE',
    retries: 5
  });
}

export type ScopedTransactionCallback<T> = (
  scopedQueries: TenantScopedQueries,
  context: TenantContext
) => Promise<T>;

export async function withScopedTransaction<T>(
  tenantId: number,
  userId: number,
  callback: ScopedTransactionCallback<T>,
  options: { isolationLevel?: IsolationLevel; timeout?: number; retries?: number } = {}
): Promise<CommitResult<T>> {
  const { isolationLevel = 'REPEATABLE READ', timeout = 30000, retries = 3 } = options;
  const tenantContext = createTenantContext(userId, tenantId);
  const transactionId = `txn_scoped_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
  const startTime = Date.now();
  let lastError: Error | undefined;
  let retryCount = 0;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const result = await db.transaction(async (tx) => {
        await tx.execute(sql.raw(`SET TRANSACTION ISOLATION LEVEL ${isolationLevel}`));
        await tx.execute(sql.raw(`SET LOCAL statement_timeout = '${timeout}ms'`));
        await tx.execute(sql.raw(`SET LOCAL app.tenant_id = '${tenantId}'`));
        
        const scopedQueries = createTenantScopedQueries(tx, tenantId);
        return await callback(scopedQueries, tenantContext);
      });

      return {
        success: true,
        data: result,
        transactionId,
        duration: Date.now() - startTime,
        retryCount
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      retryCount = attempt + 1;

      const errorMessage = lastError.message.toLowerCase();
      const isRetryable = 
        errorMessage.includes('deadlock') ||
        errorMessage.includes('serialization') ||
        errorMessage.includes('could not serialize') ||
        errorMessage.includes('40001') ||
        errorMessage.includes('40p01');

      if (!isRetryable || attempt === retries - 1) {
        break;
      }

      const backoffMs = Math.min(100 * Math.pow(2, attempt), 2000);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }

  return {
    success: false,
    error: lastError,
    transactionId,
    duration: Date.now() - startTime,
    retryCount
  };
}
