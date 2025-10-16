// @ts-nocheck
/**
 * Redis Cache Service
 * Fortune 500-grade caching implementation
 */

import Redis from 'ioredis';
import { createLogger } from '../utils/logger';

const logger = createLogger('redis-cache');

export class RedisCache {
  private client: Redis | null = null;
  private isConnected = false;
  private defaultTTL = 3600; // 1 hour default

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      // In production, use REDIS_URL from environment
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.client = new Redis(redisUrl, {
        retryStrategy: (times) => {
          if (times > 10) {
            logger.error('Redis connection failed after 10 retries');
            return null;
          }
          return Math.min(times * 100, 3000);
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: false
      });

      this.client.on('error', (err) => {
        logger.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis connected successfully');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        logger.info('Redis ready to accept commands');
        this.isConnected = true;
      });
    } catch (error) {
      logger.error('Failed to initialize Redis:', error);
      // Graceful degradation - app continues without cache
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected || !this.client) return null;
    
    try {
      const data = await this.client.get(key);
      if (!data) return null;
      
      return JSON.parse(data) as T;
    } catch (error) {
      logger.error(`Failed to get cache key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (!this.isConnected || !this.client) return;
    
    try {
      const serialized = JSON.stringify(value);
      const expiry = ttl || this.defaultTTL;
      
      await this.client.setEx(key, expiry, serialized);
    } catch (error) {
      logger.error(`Failed to set cache key ${key}:`, error);
    }
  }

  async del(key: string | string[]): Promise<void> {
    if (!this.isConnected || !this.client) return;
    
    try {
      const keys = Array.isArray(key) ? key : [key];
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch (error) {
      logger.error(`Failed to delete cache keys:`, error);
    }
  }

  async flush(): Promise<void> {
    if (!this.isConnected || !this.client) return;
    
    try {
      await this.client.flushAll();
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
    if (!this.isConnected || !this.client) return;
    
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
        logger.info(`Invalidated ${keys.length} cache keys matching pattern: ${pattern}`);
      }
    } catch (error) {
      logger.error(`Failed to invalidate cache pattern ${pattern}:`, error);
    }
  }

  // Rate limiting implementation
  async checkRateLimit(key: string, limit: number, window: number): Promise<{
    allowed: boolean;
    remaining: number;
    reset: number;
  }> {
    if (!this.isConnected || !this.client) {
      return { allowed: true, remaining: limit, reset: 0 };
    }

    try {
      const multi = this.client.multi();
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
    if (!this.isConnected || !this.client) return false;
    
    try {
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const redisCache = new RedisCache();