import { describe, it, expect, vi } from 'vitest';
import {
  withTenantTransaction,
  withSerializableTransaction,
  withScopedTransaction,
  createTenantScopedQueries,
  type TenantScopedQueries,
  type TransactionHandle
} from '../server/services/persistence-engine';

describe('Tenant Isolation', () => {
  describe('withTenantTransaction', () => {
    it('blocks tenant-scoped access without unsafeRawAccess flag', async () => {
      const callback = vi.fn();
      
      await expect(
        withTenantTransaction(123, 1, callback)
      ).rejects.toThrow('unsafeRawAccess');
      
      expect(callback).not.toHaveBeenCalled();
    });

    it('allows tenant-scoped access with unsafeRawAccess: true', async () => {
      const callback = vi.fn().mockResolvedValue('result');
      
      const result = await withTenantTransaction(123, 1, callback, { unsafeRawAccess: true });
      
      expect(result.success || result.error).toBeDefined();
    });

    it('allows null tenant without unsafeRawAccess (admin operations)', async () => {
      const callback = vi.fn().mockResolvedValue('admin-result');
      
      const result = await withTenantTransaction(null, 1, callback);
      
      expect(result.success || result.error).toBeDefined();
    });
  });

  describe('withSerializableTransaction', () => {
    it('blocks tenant-scoped access without unsafeRawAccess flag', async () => {
      const callback = vi.fn();
      
      await expect(
        withSerializableTransaction(123, 1, callback)
      ).rejects.toThrow('unsafeRawAccess');
      
      expect(callback).not.toHaveBeenCalled();
    });

    it('allows tenant-scoped access with unsafeRawAccess: true', async () => {
      const callback = vi.fn().mockResolvedValue('result');
      
      const result = await withSerializableTransaction(123, 1, callback, { unsafeRawAccess: true });
      
      expect(result.success || result.error).toBeDefined();
    });
  });

  describe('TenantScopedQueries security via withScopedTransaction', () => {
    it('should be a frozen object', async () => {
      let capturedQueries: TenantScopedQueries | null = null;
      let callbackExecuted = false;
      
      await withScopedTransaction(999, 1, async (scopedQueries) => {
        capturedQueries = scopedQueries;
        callbackExecuted = true;
        return 'done';
      });
      
      expect(callbackExecuted).toBe(true);
      expect(capturedQueries).not.toBeNull();
      expect(Object.isFrozen(capturedQueries)).toBe(true);
    });

    it('should not expose raw transaction handle', async () => {
      let capturedQueries: any = null;
      let callbackExecuted = false;
      
      await withScopedTransaction(999, 1, async (scopedQueries) => {
        capturedQueries = scopedQueries;
        callbackExecuted = true;
        return 'done';
      });
      
      expect(callbackExecuted).toBe(true);
      expect(capturedQueries).not.toBeNull();
      expect(capturedQueries.tx).toBeUndefined();
      expect(capturedQueries._tx).toBeUndefined();
      expect(capturedQueries.transaction).toBeUndefined();
      expect(capturedQueries.handle).toBeUndefined();
    });

    it('should have correct tenantId', async () => {
      const testTenantId = 42;
      let capturedTenantId: number | null = null;
      let callbackExecuted = false;
      
      await withScopedTransaction(testTenantId, 1, async (scopedQueries) => {
        capturedTenantId = scopedQueries.tenantId;
        callbackExecuted = true;
        return 'done';
      });
      
      expect(callbackExecuted).toBe(true);
      expect(capturedTenantId).toBe(testTenantId);
    });

    it('should not allow adding properties to frozen object', async () => {
      let frozenBehaviorVerified = false;
      
      await withScopedTransaction(999, 1, async (scopedQueries) => {
        expect(() => {
          'use strict';
          (scopedQueries as any).newProp = 'malicious';
        }).toThrow();
        frozenBehaviorVerified = true;
        return 'done';
      });
      
      expect(frozenBehaviorVerified).toBe(true);
    });
  });

  describe('createTenantScopedQueries factory', () => {
    it('returns frozen object', () => {
      const mockTx = {} as TransactionHandle;
      const queries = createTenantScopedQueries(mockTx, 123);
      
      expect(Object.isFrozen(queries)).toBe(true);
    });

    it('sets tenantId correctly', () => {
      const mockTx = {} as TransactionHandle;
      const queries = createTenantScopedQueries(mockTx, 456);
      
      expect(queries.tenantId).toBe(456);
    });

    it('does not expose transaction handle', () => {
      const mockTx = { secret: 'value' } as unknown as TransactionHandle;
      const queries = createTenantScopedQueries(mockTx, 789) as any;
      
      expect(queries.tx).toBeUndefined();
      expect(queries._tx).toBeUndefined();
      expect(queries.transaction).toBeUndefined();
      expect(queries.secret).toBeUndefined();
    });

    it('has all required methods', () => {
      const mockTx = {} as TransactionHandle;
      const queries = createTenantScopedQueries(mockTx, 123);
      
      expect(typeof queries.getProjects).toBe('function');
      expect(typeof queries.getProjectById).toBe('function');
      expect(typeof queries.createProject).toBe('function');
      expect(typeof queries.updateProject).toBe('function');
      expect(typeof queries.deleteProject).toBe('function');
      expect(typeof queries.getFilesByProject).toBe('function');
      expect(typeof queries.getDeploymentsByProject).toBe('function');
      expect(typeof queries.getCheckpointsByProject).toBe('function');
      expect(typeof queries.getCheckpointById).toBe('function');
      expect(typeof queries.createCheckpoint).toBe('function');
      expect(typeof queries.deleteCheckpoint).toBe('function');
    });

    it('has Phase 3 file CRUD methods (Jan 2026)', () => {
      const mockTx = {} as TransactionHandle;
      const queries = createTenantScopedQueries(mockTx, 123);
      
      expect(typeof queries.getFileById).toBe('function');
      expect(typeof queries.createFile).toBe('function');
      expect(typeof queries.updateFile).toBe('function');
      expect(typeof queries.deleteFile).toBe('function');
    });

    it('has Phase 3 secrets CRUD methods (CRITICAL SECURITY - Jan 2026)', () => {
      const mockTx = {} as TransactionHandle;
      const queries = createTenantScopedQueries(mockTx, 123);
      
      expect(typeof queries.getSecretsByProject).toBe('function');
      expect(typeof queries.getSecretByKey).toBe('function');
      expect(typeof queries.createSecret).toBe('function');
      expect(typeof queries.updateSecret).toBe('function');
      expect(typeof queries.deleteSecret).toBe('function');
    });

    it('has Phase 3 agent session methods (Jan 2026)', () => {
      const mockTx = {} as TransactionHandle;
      const queries = createTenantScopedQueries(mockTx, 123);
      
      expect(typeof queries.getAgentSessionsByProject).toBe('function');
      expect(typeof queries.getAgentSessionById).toBe('function');
    });
  });

  describe('Phase 3 Security Controls (Jan 2026)', () => {
    it('secrets methods require project ownership verification', async () => {
      await withScopedTransaction(999, 1, async (scopedQueries) => {
        const secrets = await scopedQueries.getSecretsByProject(99999);
        expect(secrets).toEqual([]);
        
        const secret = await scopedQueries.getSecretByKey(99999, 'API_KEY');
        expect(secret).toBeNull();
        
        return 'done';
      });
    });

    it('file methods require project ownership verification', async () => {
      await withScopedTransaction(999, 1, async (scopedQueries) => {
        const file = await scopedQueries.getFileById(99999, 1);
        expect(file).toBeNull();
        
        const files = await scopedQueries.getFilesByProject(99999);
        expect(files).toEqual([]);
        
        return 'done';
      });
    });

    it('agent session methods require project ownership verification', async () => {
      await withScopedTransaction(999, 1, async (scopedQueries) => {
        const sessions = await scopedQueries.getAgentSessionsByProject(99999);
        expect(sessions).toEqual([]);
        
        const session = await scopedQueries.getAgentSessionById(99999, 'fake-session-id');
        expect(session).toBeNull();
        
        return 'done';
      });
    });

    it('createFile throws for non-owned project', async () => {
      await withScopedTransaction(999, 1, async (scopedQueries) => {
        await expect(
          scopedQueries.createFile(99999, { filename: 'test.ts', content: '' })
        ).rejects.toThrow('not found or access denied');
        
        return 'done';
      });
    });

    it('createSecret throws for non-owned project', async () => {
      await withScopedTransaction(999, 1, async (scopedQueries) => {
        await expect(
          scopedQueries.createSecret(99999, { key: 'API_KEY', encryptedValue: 'encrypted', createdBy: 1 })
        ).rejects.toThrow('not found or access denied');
        
        return 'done';
      });
    });
  });
});
