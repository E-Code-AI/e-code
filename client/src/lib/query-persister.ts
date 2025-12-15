/**
 * Fortune 500 Grade TanStack Query Persistence Layer
 * Integrates IndexedDB for offline-first cache with automatic hydration
 * Falls back to no-op persister when storage APIs are unavailable
 */

import { get, set, del, createStore } from 'idb-keyval';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';

const CACHE_KEY = 'ecode-tanstack-query-cache';
const CACHE_VERSION = 1;
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

function isStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    if (!window.indexedDB) return false;
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

const storageAvailable = isStorageAvailable();
const queryStore = storageAvailable ? createStore('ecode-query-cache', 'tanstack-queries') : null;

interface CacheMetadata {
  version: number;
  timestamp: number;
  deviceId: string;
}

function getDeviceId(): string {
  if (!storageAvailable) return 'anonymous';
  try {
    let deviceId = localStorage.getItem('ecode-device-id');
    if (!deviceId) {
      deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('ecode-device-id', deviceId);
    }
    return deviceId;
  } catch {
    return 'anonymous';
  }
}

function createNoOpPersister(): Persister {
  return {
    persistClient: async () => {},
    restoreClient: async () => undefined,
    removeClient: async () => {},
  };
}

export function createIDBPersister(): Persister {
  if (!storageAvailable || !queryStore) {
    console.log('[QueryPersister] Storage unavailable, using no-op persister');
    return createNoOpPersister();
  }

  return {
    persistClient: async (client: PersistedClient) => {
      try {
        const metadata: CacheMetadata = {
          version: CACHE_VERSION,
          timestamp: Date.now(),
          deviceId: getDeviceId(),
        };
        
        await set(CACHE_KEY, { client, metadata }, queryStore);
        console.log('[QueryPersister] Cache persisted to IndexedDB');
      } catch (error) {
        console.error('[QueryPersister] Failed to persist cache:', error);
      }
    },
    
    restoreClient: async (): Promise<PersistedClient | undefined> => {
      try {
        const data = await get<{ client: PersistedClient; metadata: CacheMetadata }>(
          CACHE_KEY,
          queryStore
        );
        
        if (!data) {
          console.log('[QueryPersister] No cached data found');
          return undefined;
        }
        
        const { client, metadata } = data;
        
        if (metadata.version !== CACHE_VERSION) {
          console.log('[QueryPersister] Cache version mismatch, clearing');
          await del(CACHE_KEY, queryStore);
          return undefined;
        }
        
        const age = Date.now() - metadata.timestamp;
        if (age > MAX_AGE_MS) {
          console.log('[QueryPersister] Cache expired, clearing');
          await del(CACHE_KEY, queryStore);
          return undefined;
        }
        
        console.log(`[QueryPersister] Cache restored (age: ${Math.round(age / 1000)}s)`);
        return client;
      } catch (error) {
        console.error('[QueryPersister] Failed to restore cache:', error);
        return undefined;
      }
    },
    
    removeClient: async () => {
      try {
        await del(CACHE_KEY, queryStore);
        console.log('[QueryPersister] Cache cleared');
      } catch (error) {
        console.error('[QueryPersister] Failed to clear cache:', error);
      }
    },
  };
}

export async function clearQueryCache(): Promise<void> {
  if (queryStore) {
    await del(CACHE_KEY, queryStore);
  }
}

export async function getQueryCacheStats(): Promise<{
  exists: boolean;
  age?: number;
  version?: number;
  deviceId?: string;
}> {
  if (!queryStore) {
    return { exists: false };
  }
  try {
    const data = await get<{ client: PersistedClient; metadata: CacheMetadata }>(
      CACHE_KEY,
      queryStore
    );
    
    if (!data) {
      return { exists: false };
    }
    
    return {
      exists: true,
      age: Date.now() - data.metadata.timestamp,
      version: data.metadata.version,
      deviceId: data.metadata.deviceId,
    };
  } catch {
    return { exists: false };
  }
}
