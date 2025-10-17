// @ts-nocheck
/**
 * Redis Cache Service
 * Fortune 500-grade caching implementation
 */

import Redis from 'ioredis';
import { readFileSync } from 'fs';
import { createLogger } from '../utils/logger';

const logger = createLogger('redis-cache');

export class RedisCache {
  private client: Redis | null = null;
  private isConnected = false;
  private defaultTTL = 3600; // 1 hour default
  private initializing = false;
  private reconnectTimeout: any = null;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    if (this.initializing) {
      return;
    }

    this.initializing = true;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    const redisUrl = process.env.REDIS_TLS_URL || process.env.REDIS_URL || 'redis://localhost:6379';

    try {
      this.disposeClient();

      const { options, tlsEnabled } = this.buildRedisOptions(redisUrl);

      logger.info(
        `Initializing Redis cache${tlsEnabled ? ' with TLS enabled' : ''}`
      );

      const client = new Redis(redisUrl, options);

      this.attachEventHandlers(client);

      this.client = client;

      await client.connect();

      this.isConnected = true;
    } catch (error) {
      logger.error('Failed to initialize Redis:', error);
      this.isConnected = false;

      if (this.client) {
        try {
          this.client.removeAllListeners();
          this.client.disconnect();
        } catch (disconnectError) {
          logger.warn('Error while cleaning up Redis client:', disconnectError);
        }
      }

      this.client = null;

      this.scheduleReconnect();
    } finally {
      this.initializing = false;
    }
  }

  private disposeClient() {
    if (!this.client) return;

    try {
      this.client.removeAllListeners();
      this.client.disconnect();
    } catch (error) {
      logger.warn('Error while disposing existing Redis client:', error);
    } finally {
      this.client = null;
      this.isConnected = false;
    }
  }

  private attachEventHandlers(client: Redis) {
    client.on('error', (err) => {
      logger.error('Redis Client Error:', err);
      this.isConnected = false;

      if (!this.initializing) {
        this.scheduleReconnect();
      }
    });

    client.on('connect', () => {
      logger.info('Redis TCP connection established');
    });

    client.on('ready', () => {
      logger.info('Redis ready to accept commands');
      this.isConnected = true;
    });

    client.on('end', () => {
      logger.warn('Redis connection ended');
      this.isConnected = false;
      this.scheduleReconnect();
    });

    client.on('close', () => {
      logger.warn('Redis connection closed');
      this.isConnected = false;
      this.scheduleReconnect();
    });

    client.on('reconnecting', (delay) => {
      logger.warn(`Redis reconnecting in ${delay}ms`);
      this.isConnected = false;
    });
  }

  private scheduleReconnect(delay = 5000) {
    if (this.reconnectTimeout) return;

    logger.warn(`Scheduling Redis reconnect in ${delay}ms`);
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.initialize();
    }, delay);
  }

  private buildRedisOptions(redisUrl: string) {
    const options: any = {
      retryStrategy: (times: number) => {
        if (times > 10) {
          logger.error('Redis connection failed after 10 retries');
          return null;
        }
        return Math.min(times * 100, 3000);
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true
    };

    const tlsEnabled = this.shouldUseTLS(redisUrl);

    if (tlsEnabled) {
      options.tls = this.buildTlsOptions();
    }

    return { options, tlsEnabled };
  }

  private shouldUseTLS(redisUrl: string) {
    if (!redisUrl) return false;

    if (redisUrl.startsWith('rediss://')) return true;

    const explicitFlag = process.env.REDIS_USE_TLS || process.env.REDIS_TLS_ENABLED;
    if (explicitFlag) {
      return ['1', 'true', 'yes', 'on'].includes(explicitFlag.toLowerCase());
    }

    return false;
  }

  private buildTlsOptions() {
    const tlsOptions: any = {
      rejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== 'false'
    };

    const servername =
      process.env.REDIS_TLS_SERVERNAME ||
      process.env.REDIS_TLS_SERVER_NAME ||
      process.env.REDIS_SERVERNAME;
    if (servername) {
      tlsOptions.servername = servername;
    }

    const ca = this.loadCertificateFromEnv(
      ['REDIS_TLS_CA', 'REDIS_TLS_CA_CERT', 'REDIS_CA_CERT'],
      ['REDIS_TLS_CA_FILE', 'REDIS_CA_FILE']
    );

    if (ca) {
      tlsOptions.ca = ca;
    }

    const cert = this.loadCertificateFromEnv(
      ['REDIS_TLS_CERT', 'REDIS_CLIENT_CERT'],
      ['REDIS_TLS_CERT_FILE', 'REDIS_CLIENT_CERT_FILE']
    );

    if (cert) {
      tlsOptions.cert = cert;
    }

    const key = this.loadCertificateFromEnv(
      ['REDIS_TLS_KEY', 'REDIS_CLIENT_KEY'],
      ['REDIS_TLS_KEY_FILE', 'REDIS_CLIENT_KEY_FILE']
    );

    if (key) {
      tlsOptions.key = key;
    }

    const passphrase = process.env.REDIS_TLS_PASSPHRASE || process.env.REDIS_CLIENT_PASSPHRASE;
    if (passphrase) {
      tlsOptions.passphrase = passphrase;
    }

    return tlsOptions;
  }

  private loadCertificateFromEnv(valueNames: string[], fileNames: string[]) {
    for (const fileEnv of fileNames) {
      const filePath = process.env[fileEnv];
      if (!filePath) continue;

      try {
        const content = readFileSync(filePath, 'utf8');
        if (content) {
          return this.normalizeMultilineValue(content);
        }
      } catch (error) {
        logger.warn(`Failed to read Redis TLS file ${filePath}:`, error);
      }
    }

    for (const name of valueNames) {
      const value = process.env[name];
      if (!value) continue;

      const normalized = this.normalizeMultilineValue(value);
      if (normalized) {
        return normalized;
      }
    }

    return null;
  }

  private normalizeMultilineValue(value: string) {
    if (!value) return null;

    const trimmed = value.trim();
    if (!trimmed) return null;

    if (trimmed.includes('-----BEGIN')) {
      return trimmed.replace(/\r?\n/g, '\n');
    }

    const unescaped = trimmed.replace(/\\n/g, '\n');
    if (unescaped.includes('-----BEGIN')) {
      return unescaped;
    }

    try {
      const decoded = Buffer.from(trimmed, 'base64').toString('utf8').trim();
      if (decoded) {
        return decoded.replace(/\r?\n/g, '\n');
      }
    } catch {
      // Not base64 encoded, fall back to unescaped text
    }

    return unescaped;
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

export const redisCache = new RedisCache();
