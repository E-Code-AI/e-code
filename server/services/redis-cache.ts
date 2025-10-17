// @ts-nocheck
/**
 * Redis Cache Service
 * Fortune 500-grade caching implementation
 */

import Redis from 'ioredis';
import { createLogger } from '../utils/logger';

const logger = createLogger('redis-cache');
const RETRY_DELAY_MS = parseInt(process.env.REDIS_RETRY_DELAY_MS || '60000', 10);

const DEFAULT_REDIS_URL = 'redis://localhost:6379';

export class RedisCache {
  private client: Redis | null = null;
  private isConnected = false;
  private defaultTTL = 3600; // 1 hour default
  private initializing: Promise<void> | null = null;
  private nextRetryAt = 0;
  private disabled = false;
  private redisUrl: string | null = null;

  constructor() {
    const configuredUrl = process.env.REDIS_URL?.trim();

    if (!configuredUrl) {
      if (process.env.NODE_ENV === 'production') {
        logger.warn('REDIS_URL not configured. Redis cache disabled.');
        this.disabled = true;
        return;
      }

      logger.info(`REDIS_URL not configured. Falling back to ${DEFAULT_REDIS_URL} for development.`);
      this.redisUrl = DEFAULT_REDIS_URL;
      return;
    }

    this.redisUrl = configuredUrl;
  }

  private async ensureClient(): Promise<Redis | null> {
    if (this.disabled) return null;

    if (this.client && this.isConnected) {
      return this.client;
    }

    if (Date.now() < this.nextRetryAt) {
      return null;
    }

    if (!this.initializing) {
      this.initializing = this.initialize();
    }

    try {
      await this.initializing;
    } finally {
      this.initializing = null;
    }

    return this.client && this.isConnected ? this.client : null;
  }

  private async initialize(): Promise<void> {
    if (this.disabled) return;

    const redisUrl = this.redisUrl || process.env.REDIS_URL?.trim();
    if (!redisUrl) {
      logger.warn('Redis URL unavailable. Disabling cache service.');
      this.disabled = true;
      return;
    }

    this.redisUrl = redisUrl;

    if (this.client) {
      try {
        this.client.removeAllListeners();
        this.client.disconnect();
      } catch (error) {
        logger.debug('Error cleaning up previous Redis client', error);
      }
      this.client = null;
    }

    try {
      const client = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 0,
        enableReadyCheck: false,
        retryStrategy: () => null
      });

      client.on('error', (err) => {
        logger.error('Redis Client Error:', err);
        this.handleConnectionLoss();
      });

      client.on('close', () => {
        logger.warn('Redis connection closed');
        this.handleConnectionLoss();
      });

      client.on('end', () => {
        logger.warn('Redis connection ended');
        this.handleConnectionLoss();
      });

      client.on('connect', () => {
        logger.info('Redis connected successfully');
      });

      client.on('ready', () => {
        logger.info('Redis ready to accept commands');
        this.isConnected = true;
        this.nextRetryAt = 0;
      });

      await client.connect();

      this.client = client;
      this.isConnected = true;
      this.nextRetryAt = 0;
    } catch (error) {
      logger.error('Failed to initialize Redis:', error);
      this.handleConnectionLoss();
    }
  }

  private handleConnectionLoss() {
    this.isConnected = false;
    this.nextRetryAt = Date.now() + RETRY_DELAY_MS;

    if (this.client) {
      try {
        this.client.removeAllListeners();
        this.client.disconnect();
      } catch (error) {
        logger.debug('Error while disconnecting Redis client', error);
      }
    }

    this.client = null;
  }

  async get<T>(key: string): Promise<T | null> {
    const client = await this.ensureClient();
    if (!client) return null;

    try {
      const data = await client.get(key);
      if (!data) return null;

      return JSON.parse(data) as T;
    } catch (error) {
      logger.error(`Failed to get cache key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const client = await this.ensureClient();
    if (!client) return;

    try {
      const serialized = JSON.stringify(value);
      const expiry = ttl || this.defaultTTL;

      await client.setEx(key, expiry, serialized);
    } catch (error) {
      logger.error(`Failed to set cache key ${key}:`, error);
    }
  }

  async del(key: string | string[]): Promise<void> {
    const client = await this.ensureClient();
    if (!client) return;

    try {
      const keys = Array.isArray(key) ? key : [key];
      if (keys.length > 0) {
        await client.del(...keys);
      }
    } catch (error) {
      logger.error('Failed to delete cache keys:', error);
    }
  }

  async flush(): Promise<void> {
    const client = await this.ensureClient();
    if (!client) return;

    try {
      await client.flushAll();
      logger.info('Redis cache flushed');
    } catch (error) {
      logger.error('Failed to flush cache:', error);
    }
  }

  // Cache patterns for common use cases
  async remember<T>(key: string, ttl: number, callback: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const fresh = await callback();
    await this.set(key, fresh, ttl);
    return fresh;
  }

  // Invalidate related cache keys
  async invalidatePattern(pattern: string): Promise<void> {
    const client = await this.ensureClient();
    if (!client) return;

    try {
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(...keys);
        logger.info(`Invalidated ${keys.length} cache keys matching pattern: ${pattern}`);
      }
    } catch (error) {
      logger.error(`Failed to invalidate cache pattern ${pattern}:`, error);
    }
  }

  // Rate limiting implementation
  async checkRateLimit(
    key: string,
    limit: number,
    window: number
  ): Promise<{ allowed: boolean; remaining: number; reset: number; }> {
    const client = await this.ensureClient();
    if (!client) {
      return { allowed: true, remaining: limit, reset: 0 };
    }

    try {
      const multi = client.multi();
      const now = Date.now();
      const windowStart = now - window * 1000;

      // Remove old entries
      multi.zremrangebyscore(key, '-inf', windowStart.toString());

      // Add current request
      multi.zadd(key, now, now.toString());

      // Count requests in window
      multi.zcard(key);

      // Set expiry
      multi.expire(key, window);

      const results = await multi.exec();
      const count = (results?.[2]?.[1] || 0) as number;

      return {
        allowed: count <= limit,
        remaining: Math.max(0, limit - count),
        reset: Math.ceil((windowStart + window * 1000) / 1000)
      };
    } catch (error) {
      logger.error('Rate limit check failed:', error);
      return { allowed: true, remaining: limit, reset: 0 };
    }
  }

  // Session storage
  async getSession(sessionId: string): Promise<any> {
    return this.get(`session:${sessionId}`);
  }

  async setSession(sessionId: string, data: any, ttl = 86400): Promise<void> {
    await this.set(`session:${sessionId}`, data, ttl);
  }

  async destroySession(sessionId: string): Promise<void> {
    await this.del(`session:${sessionId}`);
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    const client = await this.ensureClient();
    if (!client) return false;

    try {
      await client.ping();
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const redisCache = new RedisCache();
