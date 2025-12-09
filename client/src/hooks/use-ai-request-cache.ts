/**
 * AI Request Cache Hook - Fortune 500-Grade Request Deduplication
 * 
 * Implements client-side request deduplication and caching to reduce:
 * - Duplicate API calls during component re-renders
 * - Redundant requests from multiple platforms (web, desktop, tablet, mobile)
 * - Unnecessary token usage for identical queries
 * 
 * Works across all platforms: web, desktop, tablet, responsive, and mobile
 * 
 * @author E-Code Platform
 * @version 1.0.0
 * @since December 2025
 */

import { useCallback, useRef, useMemo } from 'react';

interface CachedRequest<T> {
  hash: string;
  data: T;
  timestamp: number;
  hitCount: number;
}

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

interface RequestCacheConfig {
  maxCacheSize?: number;
  cacheTTL?: number;
  enableDeduplication?: boolean;
  enableResponseCache?: boolean;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  deduplicatedRequests: number;
  cacheSize: number;
}

const DEFAULT_CONFIG: Required<RequestCacheConfig> = {
  maxCacheSize: 50,
  cacheTTL: 300000,
  enableDeduplication: true,
  enableResponseCache: true,
};

function generateHash(data: any): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

class AIRequestCache {
  private cache: Map<string, CachedRequest<any>> = new Map();
  private pendingRequests: Map<string, PendingRequest<any>> = new Map();
  private config: Required<RequestCacheConfig>;
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    deduplicatedRequests: 0,
    cacheSize: 0,
  };

  constructor(config: RequestCacheConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async executeRequest<T>(
    key: string,
    requestFn: () => Promise<T>,
    options?: { bypassCache?: boolean; bypassDedup?: boolean }
  ): Promise<T> {
    const hash = generateHash(key);

    if (this.config.enableResponseCache && !options?.bypassCache) {
      const cached = this.cache.get(hash);
      if (cached && Date.now() - cached.timestamp < this.config.cacheTTL) {
        cached.hitCount++;
        this.metrics.hits++;
        return cached.data;
      }
    }

    if (this.config.enableDeduplication && !options?.bypassDedup) {
      const pending = this.pendingRequests.get(hash);
      if (pending && Date.now() - pending.timestamp < 30000) {
        this.metrics.deduplicatedRequests++;
        return pending.promise;
      }
    }

    this.metrics.misses++;

    const promise = requestFn();
    this.pendingRequests.set(hash, { promise, timestamp: Date.now() });

    try {
      const result = await promise;

      if (this.config.enableResponseCache) {
        if (this.cache.size >= this.config.maxCacheSize) {
          this.evictLRU();
        }

        this.cache.set(hash, {
          hash,
          data: result,
          timestamp: Date.now(),
          hitCount: 1,
        });
        this.metrics.cacheSize = this.cache.size;
      }

      return result;
    } finally {
      this.pendingRequests.delete(hash);
    }
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, value] of this.cache.entries()) {
      if (value.timestamp < oldestTime) {
        oldestTime = value.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  clearCache(): void {
    this.cache.clear();
    this.metrics.cacheSize = 0;
  }

  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  getCacheStats(): {
    hitRate: number;
    deduplicationRate: number;
    cacheSize: number;
  } {
    const total = this.metrics.hits + this.metrics.misses;
    const hitRate = total > 0 ? (this.metrics.hits / total) * 100 : 0;
    const dedupTotal = this.metrics.deduplicatedRequests + this.metrics.misses;
    const deduplicationRate = dedupTotal > 0 
      ? (this.metrics.deduplicatedRequests / dedupTotal) * 100 
      : 0;

    return {
      hitRate: Math.round(hitRate * 100) / 100,
      deduplicationRate: Math.round(deduplicationRate * 100) / 100,
      cacheSize: this.cache.size,
    };
  }
}

const globalCache = new AIRequestCache();

export function useAIRequestCache(config?: RequestCacheConfig) {
  const cacheRef = useRef<AIRequestCache | null>(null);

  if (!cacheRef.current) {
    cacheRef.current = config ? new AIRequestCache(config) : globalCache;
  }

  const executeRequest = useCallback(async <T>(
    key: string,
    requestFn: () => Promise<T>,
    options?: { bypassCache?: boolean; bypassDedup?: boolean }
  ): Promise<T> => {
    return cacheRef.current!.executeRequest(key, requestFn, options);
  }, []);

  const clearCache = useCallback(() => {
    cacheRef.current!.clearCache();
  }, []);

  const getMetrics = useCallback(() => {
    return cacheRef.current!.getMetrics();
  }, []);

  const getCacheStats = useCallback(() => {
    return cacheRef.current!.getCacheStats();
  }, []);

  return useMemo(() => ({
    executeRequest,
    clearCache,
    getMetrics,
    getCacheStats,
  }), [executeRequest, clearCache, getMetrics, getCacheStats]);
}

export function useAIModelCache() {
  const modelCacheRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map());
  const MODEL_CACHE_TTL = 60000;

  const getCachedModels = useCallback(<T>(key: string): T | null => {
    const cached = modelCacheRef.current.get(key);
    if (cached && Date.now() - cached.timestamp < MODEL_CACHE_TTL) {
      return cached.data;
    }
    return null;
  }, []);

  const setCachedModels = useCallback(<T>(key: string, data: T): void => {
    modelCacheRef.current.set(key, { data, timestamp: Date.now() });
  }, []);

  const invalidateModelsCache = useCallback((key?: string): void => {
    if (key) {
      modelCacheRef.current.delete(key);
    } else {
      modelCacheRef.current.clear();
    }
  }, []);

  return useMemo(() => ({
    getCachedModels,
    setCachedModels,
    invalidateModelsCache,
  }), [getCachedModels, setCachedModels, invalidateModelsCache]);
}

export function useConversationCache() {
  const conversationCacheRef = useRef<Map<string, {
    messages: any[];
    hash: string;
    timestamp: number;
  }>>(new Map());

  const CONVERSATION_CACHE_TTL = 300000;

  const getConversationHash = useCallback((messages: any[]): string => {
    return generateHash(messages.map(m => `${m.role}:${m.content?.substring?.(0, 100) || ''}`));
  }, []);

  const getCachedConversation = useCallback((conversationId: string): any[] | null => {
    const cached = conversationCacheRef.current.get(conversationId);
    if (cached && Date.now() - cached.timestamp < CONVERSATION_CACHE_TTL) {
      return cached.messages;
    }
    return null;
  }, []);

  const setCachedConversation = useCallback((
    conversationId: string,
    messages: any[]
  ): void => {
    conversationCacheRef.current.set(conversationId, {
      messages,
      hash: getConversationHash(messages),
      timestamp: Date.now(),
    });
  }, [getConversationHash]);

  const shouldRefetch = useCallback((
    conversationId: string,
    currentMessages: any[]
  ): boolean => {
    const cached = conversationCacheRef.current.get(conversationId);
    if (!cached) return true;

    const currentHash = getConversationHash(currentMessages);
    return cached.hash !== currentHash;
  }, [getConversationHash]);

  const invalidateConversation = useCallback((conversationId?: string): void => {
    if (conversationId) {
      conversationCacheRef.current.delete(conversationId);
    } else {
      conversationCacheRef.current.clear();
    }
  }, []);

  return useMemo(() => ({
    getCachedConversation,
    setCachedConversation,
    shouldRefetch,
    invalidateConversation,
    getConversationHash,
  }), [
    getCachedConversation,
    setCachedConversation,
    shouldRefetch,
    invalidateConversation,
    getConversationHash,
  ]);
}

export { AIRequestCache, generateHash };
export type { CachedRequest, RequestCacheConfig, CacheMetrics };
