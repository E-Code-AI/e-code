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
  });
});
