/**
 * Rate Limiting Middleware
 * Fortune 500-grade API protection
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { redisCache } from '../services/redis-cache';
import { createLogger } from '../utils/logger';

const logger = createLogger('rate-limiter');

// Rate limit store using Redis
class RedisStore {
  constructor(private prefix: string = 'rl:') {}

  async increment(key: string): Promise<{ totalHits: number; resetTime?: Date }> {
    const fullKey = `${this.prefix}${key}`;
    const result = await redisCache.checkRateLimit(fullKey, 100, 60); // 100 req/min default
    
    return {
      totalHits: 100 - result.remaining,
      resetTime: new Date(result.reset * 1000)
    };
  }

  async decrement(key: string): Promise<void> {
    // Not needed for our implementation
  }

  async resetKey(key: string): Promise<void> {
    await redisCache.del(`${this.prefix}${key}`);
  }
}

// Different rate limits for different endpoints
export const rateLimiters = {
  // Strict limit for auth endpoints
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    message: 'Too many authentication attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore('rl:auth:'),
    skip: (req: Request) => req.ip === '127.0.0.1' // Skip for localhost in dev
  }),

  // Standard API rate limit
  api: rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: 'API rate limit exceeded, please slow down',
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore('rl:api:'),
    skip: (req: Request) => req.path === '/api/monitoring/health'
  }),

  // Relaxed limit for static assets
  static: rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore('rl:static:')
  }),

  // Very strict limit for expensive operations
  expensive: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 requests per hour
    message: 'This operation is resource intensive. Please wait before trying again.',
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore('rl:expensive:')
  }),

  // Custom rate limiter for specific users/tiers
  tiered: (tier: 'free' | 'pro' | 'enterprise') => {
    const limits = {
      free: { windowMs: 60000, max: 50 },
      pro: { windowMs: 60000, max: 500 },
      enterprise: { windowMs: 60000, max: 5000 }
    };

    return rateLimit({
      ...limits[tier],
      keyGenerator: (req: Request) => {
        // Use user ID if authenticated, otherwise IP
        return req.user?.id || req.ip;
      },
      standardHeaders: true,
      legacyHeaders: false,
      store: new RedisStore(`rl:${tier}:`)
    });
  }
};

// Advanced rate limiting with custom logic
export class AdvancedRateLimiter {
  constructor(
    private options: {
      points: number; // Number of points
      duration: number; // Per duration in seconds
      blockDuration?: number; // Block for seconds if consumed more than points
    }
  ) {}

  async consume(key: string, points: number = 1): Promise<{
    allowed: boolean;
    remainingPoints: number;
    msBeforeNext: number;
  }> {
    const result = await redisCache.checkRateLimit(
      `arl:${key}`,
      this.options.points,
      this.options.duration
    );

    if (!result.allowed && this.options.blockDuration) {
      // Block the key for specified duration
      await redisCache.set(
        `blocked:${key}`,
        true,
        this.options.blockDuration
      );
    }

    return {
      allowed: result.allowed,
      remainingPoints: result.remaining,
      msBeforeNext: result.reset * 1000 - Date.now()
    };
  }

  async isBlocked(key: string): Promise<boolean> {
    const blocked = await redisCache.get(`blocked:${key}`);
    return blocked === true;
  }
}

// Middleware for dynamic rate limiting based on user tier
export const dynamicRateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      // Apply default rate limit for unauthenticated users
      return rateLimiters.api(req, res, next);
    }

    // Get user tier from database or cache
    const userTier = await redisCache.remember(
      `user:tier:${userId}`,
      3600,
      async () => {
        // In production, fetch from database
        return 'free';
      }
    );

    // Apply tier-specific rate limit
    const tierLimiter = rateLimiters.tiered(userTier as 'free' | 'pro' | 'enterprise');
    return tierLimiter(req, res, next);
  } catch (error) {
    logger.error('Dynamic rate limiter error:', error);
    // Fail open - continue without rate limiting if error
    next();
  }
};

// IP-based rate limiting with whitelist/blacklist
export const ipRateLimiter = (
  whitelist: string[] = [],
  blacklist: string[] = []
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const clientIp = req.ip;

    // Check blacklist
    if (blacklist.includes(clientIp)) {
      return res.status(429).json({
        error: 'Your IP has been blocked due to suspicious activity'
      });
    }

    // Skip rate limiting for whitelisted IPs
    if (whitelist.includes(clientIp)) {
      return next();
    }

    // Apply standard rate limiting
    return rateLimiters.api(req, res, next);
  };
};

// Cost-based rate limiting for expensive operations
export const costBasedRateLimiter = (
  costFunction: (req: Request) => number
) => {
  const limiter = new AdvancedRateLimiter({
    points: 1000, // 1000 cost points
    duration: 3600, // per hour
    blockDuration: 3600 // block for 1 hour if exceeded
  });

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cost = costFunction(req);
      const key = req.user?.id || req.ip;
      
      const result = await limiter.consume(key, cost);
      
      if (!result.allowed) {
        res.setHeader('X-RateLimit-Cost', cost.toString());
        res.setHeader('X-RateLimit-Remaining', result.remainingPoints.toString());
        res.setHeader('Retry-After', Math.ceil(result.msBeforeNext / 1000).toString());
        
        return res.status(429).json({
          error: 'Cost limit exceeded',
          cost,
          remainingPoints: result.remainingPoints,
          retryAfter: Math.ceil(result.msBeforeNext / 1000)
        });
      }

      // Add headers for transparency
      res.setHeader('X-RateLimit-Cost', cost.toString());
      res.setHeader('X-RateLimit-Remaining', result.remainingPoints.toString());
      
      next();
    } catch (error) {
      logger.error('Cost-based rate limiter error:', error);
      next();
    }
  };
};

// Log rate limit violations
export const logRateLimitViolations = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const originalSend = res.send;
  
  res.send = function(data: any) {
    if (res.statusCode === 429) {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        method: req.method,
        userId: req.user?.id,
        userAgent: req.get('user-agent')
      });
    }
    return originalSend.call(this, data);
  };
  
  next();
};

// Legacy exports for backward compatibility
export const createRateLimiter = () => rateLimiters.auth;

export const checkAccountLockout = async (userId: string): Promise<boolean> => {
  const blocked = await redisCache.get(`blocked:${userId}`);
  return blocked === true;
};

export const logLoginAttempt = async (
  userId: string, 
  success: boolean, 
  ip?: string
): Promise<void> => {
  const key = `login:attempts:${userId}`;
  const attempt = {
    timestamp: Date.now(),
    success,
    ip
  };
  
  // Store login attempts for monitoring
  await redisCache.set(key, attempt, 86400); // 24 hour retention
  
  if (!success) {
    // Track failed attempts
    const failedKey = `login:failed:${userId}`;
    const attempts = await redisCache.get<number>(failedKey) || 0;
    await redisCache.set(failedKey, attempts + 1, 3600); // 1 hour window
    
    // Auto-block after 5 failed attempts
    if (attempts >= 4) {
      await redisCache.set(`blocked:${userId}`, true, 3600); // Block for 1 hour
      logger.warn('Account locked due to failed login attempts', { userId, attempts: attempts + 1 });
    }
  } else {
    // Clear failed attempts on successful login
    await redisCache.del([`login:failed:${userId}`, `blocked:${userId}`]);
  }
};