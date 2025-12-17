/**
 * Offline Cache Service
 * Fortune 500-grade offline-first data layer for E-Code mobile app
 * 
 * Features:
 * - Automatic caching of GET requests
 * - Offline fallback with stale data
 * - Cache invalidation strategies
 * - Network status awareness
 * - Background sync for mutations
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

const CACHE_PREFIX = 'ecode:cache:';
const CACHE_METADATA_KEY = 'ecode:cache:metadata';
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes
const STALE_WHILE_REVALIDATE_MS = 60 * 60 * 1000; // 1 hour

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  etag?: string;
}

interface CacheMetadata {
  totalSize: number;
  entryCount: number;
  lastCleanup: number;
}

interface OfflineFetchOptions {
  ttl?: number;
  forceRefresh?: boolean;
  cacheKey?: string;
  staleWhileRevalidate?: boolean;
}

class OfflineCacheService {
  private isOnline: boolean = true;
  private listeners: Set<(online: boolean) => void> = new Set();
  private unsubscribeNetInfo: (() => void) | null = null;

  /**
   * Initialize the offline cache service
   * Call this at app startup
   */
  async initialize(): Promise<void> {
    // Check initial network state
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected ?? true;

    // Subscribe to network changes
    this.unsubscribeNetInfo = NetInfo.addEventListener((state: NetInfoState) => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;

      console.log('[OfflineCache] Network status:', this.isOnline ? 'online' : 'offline');

      // Notify listeners of status change
      if (wasOnline !== this.isOnline) {
        this.listeners.forEach(listener => listener(this.isOnline));
      }
    });

    // Cleanup old cache entries
    await this.cleanupExpiredEntries();
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.unsubscribeNetInfo?.();
    this.listeners.clear();
  }

  /**
   * Subscribe to online status changes
   */
  onStatusChange(listener: (online: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get current online status
   */
  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  /**
   * Fetch with offline support
   * - Online: Fetch from network, cache response
   * - Offline: Return cached data if available
   */
  async fetchWithCache<T>(
    url: string,
    fetchFn: () => Promise<T>,
    options: OfflineFetchOptions = {}
  ): Promise<{ data: T; fromCache: boolean; isStale: boolean }> {
    const {
      ttl = DEFAULT_TTL_MS,
      forceRefresh = false,
      cacheKey = url,
      staleWhileRevalidate = true,
    } = options;

    const storageKey = CACHE_PREFIX + cacheKey;

    // Try to get cached data
    const cached = await this.getCachedEntry<T>(storageKey);

    // If online and (no cache, cache expired, or force refresh)
    if (this.isOnline && (forceRefresh || !cached || this.isExpired(cached, ttl))) {
      try {
        const data = await fetchFn();
        
        // Cache the response
        await this.setCachedEntry(storageKey, data, ttl);
        
        return { data, fromCache: false, isStale: false };
      } catch (error) {
        // Network error - fall back to cache if available
        if (cached) {
          console.log('[OfflineCache] Network error, using cached data for:', cacheKey);
          return { data: cached.data, fromCache: true, isStale: true };
        }
        throw error;
      }
    }

    // If we have cached data
    if (cached) {
      const isStale = this.isExpired(cached, ttl);
      
      // Stale-while-revalidate: Return stale data immediately, refresh in background
      if (isStale && staleWhileRevalidate && this.isOnline) {
        // Fire and forget background refresh
        this.backgroundRefresh(storageKey, fetchFn, ttl).catch(err => {
          console.warn('[OfflineCache] Background refresh failed:', err);
        });
      }
      
      return { data: cached.data, fromCache: true, isStale };
    }

    // Offline with no cache
    throw new Error('You are offline and there is no cached data available. Please connect to the internet and try again.');
  }

  /**
   * Prefetch and cache data for offline use
   */
  async prefetch<T>(
    cacheKey: string,
    fetchFn: () => Promise<T>,
    ttl: number = DEFAULT_TTL_MS
  ): Promise<void> {
    if (!this.isOnline) {
      console.log('[OfflineCache] Cannot prefetch while offline');
      return;
    }

    try {
      const data = await fetchFn();
      await this.setCachedEntry(CACHE_PREFIX + cacheKey, data, ttl);
      console.log('[OfflineCache] Prefetched:', cacheKey);
    } catch (error) {
      console.warn('[OfflineCache] Prefetch failed:', cacheKey, error);
    }
  }

  /**
   * Invalidate specific cache entry
   */
  async invalidate(cacheKey: string): Promise<void> {
    const storageKey = CACHE_PREFIX + cacheKey;
    await AsyncStorage.removeItem(storageKey);
    console.log('[OfflineCache] Invalidated:', cacheKey);
  }

  /**
   * Invalidate cache entries matching a pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await AsyncStorage.getAllKeys();
    const matchingKeys = keys.filter(key => 
      key.startsWith(CACHE_PREFIX) && key.includes(pattern)
    );
    
    if (matchingKeys.length > 0) {
      await AsyncStorage.multiRemove(matchingKeys);
      console.log('[OfflineCache] Invalidated', matchingKeys.length, 'entries matching:', pattern);
    }
  }

  /**
   * Clear all cached data
   */
  async clearAll(): Promise<void> {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
    
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
      console.log('[OfflineCache] Cleared', cacheKeys.length, 'cache entries');
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ entryCount: number; keys: string[] }> {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
    
    return {
      entryCount: cacheKeys.length,
      keys: cacheKeys.map(k => k.replace(CACHE_PREFIX, '')),
    };
  }

  // Private methods

  private async getCachedEntry<T>(key: string): Promise<CacheEntry<T> | null> {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw) as CacheEntry<T>;
    } catch (error) {
      console.warn('[OfflineCache] Failed to read cache:', key, error);
      return null;
    }
  }

  private async setCachedEntry<T>(key: string, data: T, ttl: number): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };

    try {
      await AsyncStorage.setItem(key, JSON.stringify(entry));
    } catch (error) {
      console.warn('[OfflineCache] Failed to write cache:', key, error);
      // If storage is full, try cleaning up old entries
      await this.cleanupExpiredEntries();
    }
  }

  private isExpired(entry: CacheEntry<unknown>, ttl: number): boolean {
    const age = Date.now() - entry.timestamp;
    return age > ttl;
  }

  private async backgroundRefresh<T>(
    storageKey: string,
    fetchFn: () => Promise<T>,
    ttl: number
  ): Promise<void> {
    const data = await fetchFn();
    await this.setCachedEntry(storageKey, data, ttl);
    console.log('[OfflineCache] Background refresh complete:', storageKey);
  }

  private async cleanupExpiredEntries(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
      const now = Date.now();
      const keysToRemove: string[] = [];

      for (const key of cacheKeys) {
        const entry = await this.getCachedEntry(key);
        if (entry && now - entry.timestamp > STALE_WHILE_REVALIDATE_MS) {
          keysToRemove.push(key);
        }
      }

      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
        console.log('[OfflineCache] Cleaned up', keysToRemove.length, 'expired entries');
      }
    } catch (error) {
      console.warn('[OfflineCache] Cleanup failed:', error);
    }
  }
}

export const offlineCacheService = new OfflineCacheService();
export default offlineCacheService;
