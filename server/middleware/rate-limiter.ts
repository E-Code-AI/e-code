/**
 * Rate Limiting Middleware
 * Enhanced rate limiting with Redis support for distributed systems
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import Redis from 'ioredis';
import { createLogger } from '../utils/logger';

const logger = createLogger('rate-limiter');

// Check if running in test environment
const isTestEnv = process.env.NODE_ENV === 'test';

// Initialize Redis client if available
// Disabled for now to prevent blocking startup - will use memory rate limiter
let redisClient: Redis | null = null;

// Enhanced rate limiters with Redis or memory fallback
// In test environment, use much higher thresholds to prevent false failures
export const rateLimiters = {
  // Strict rate limiter for auth endpoints
  // Test: 5000 requests/min | Prod: 5 requests/15min
  auth: redisClient ? new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rl_auth',
    points: isTestEnv ? 5000 : 5,
    duration: isTestEnv ? 60 : 900,
    blockDuration: isTestEnv ? 1 : 900,
    execEvenly: false,
  }) : new RateLimiterMemory({
    keyPrefix: 'rl_auth',
    points: isTestEnv ? 5000 : 5,
    duration: isTestEnv ? 60 : 900,
    blockDuration: isTestEnv ? 1 : 900,
  }),
  
  // Standard API rate limiter
  // Test: 5000 requests/min | Prod: 100 requests/min
  api: redisClient ? new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rl_api',
    points: isTestEnv ? 5000 : 100,
    duration: 60,
    blockDuration: isTestEnv ? 1 : 60,
    execEvenly: false,
  }) : new RateLimiterMemory({
    keyPrefix: 'rl_api',
    points: isTestEnv ? 5000 : 100,
    duration: 60,
    blockDuration: isTestEnv ? 1 : 60,
  }),
  
  // AI endpoint rate limiter
  ai: redisClient ? new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rl_ai',
    points: 10, // 10 requests
    duration: 60, // per minute
    blockDuration: 300, // block for 5 minutes
    execEvenly: true, // spread requests evenly
  }) : new RateLimiterMemory({
    keyPrefix: 'rl_ai',
    points: 10,
    duration: 60,
    blockDuration: 300,
    execEvenly: true,
  }),
  
  // Deployment rate limiter
  deployment: redisClient ? new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rl_deploy',
    points: 5, // 5 deployments
    duration: 3600, // per hour
    blockDuration: 3600,
    execEvenly: false,
  }) : new RateLimiterMemory({
    keyPrefix: 'rl_deploy',
    points: 5,
    duration: 3600,
    blockDuration: 3600,
  }),
};

/**
 * Create rate limit middleware for specific endpoint type
 */
export function createRateLimitMiddleware(type: keyof typeof rateLimiters) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Bypass rate limiting entirely in test mode (unless explicitly enabled)
    if (isTestEnv && process.env.ENABLE_RATE_LIMITING !== 'true') {
      return next();
    }
    
    try {
      const key = (req.user as any)?.id || req.ip || 'unknown';
      await rateLimiters[type].consume(key);
      
      // Set rate limit headers
      const rateLimiterRes = await rateLimiters[type].get(key);
      if (rateLimiterRes) {
        res.setHeader('X-RateLimit-Limit', rateLimiters[type].points);
        res.setHeader('X-RateLimit-Remaining', rateLimiterRes.remainingPoints || 0);
        res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString());
      }
      
      next();
    } catch (rejRes: any) {
      const retryAfter = Math.round(rejRes.msBeforeNext / 1000) || 60;
      
      logger.warn('Rate limit exceeded', {
        type,
        key: (req.user as any)?.id || req.ip,
        path: req.path,
        retryAfter
      });
      
      res.setHeader('Retry-After', retryAfter);
      res.setHeader('X-RateLimit-Limit', rateLimiters[type].points);
      res.setHeader('X-RateLimit-Remaining', rejRes.remainingPoints || 0);
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rejRes.msBeforeNext).toISOString());
      
      res.status(429).json({
        error: 'Too many requests',
        message: `Please wait ${retryAfter} seconds before making another request`,
        retryAfter,
      });
    }
  };
}

// Legacy express-rate-limit middleware (kept for backward compatibility)
// Configured to properly handle trusted proxies and extract real client IPs
// In test environment, use much higher limits to prevent test failures
export const legacyRateLimiters = {
  // Strict limit for auth endpoints
  // Test: 5000 requests/min | Prod: 10 requests/15min
  auth: rateLimit({
    windowMs: isTestEnv ? 60 * 1000 : 15 * 60 * 1000,
    max: isTestEnv ? 5000 : 10,
    message: 'Too many authentication attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
    skip: (req: Request) => {
      // Skip rate limiting in test mode (unless explicitly enabled)
      if (isTestEnv && process.env.ENABLE_RATE_LIMITING !== 'true') {
        return true;
      }
      return req.ip === '127.0.0.1' || req.ip === '::1';
    }
  }),

  // Standard API rate limit
  // Test: 5000 requests/min | Prod: 100 requests/min
  api: rateLimit({
    windowMs: 1 * 60 * 1000,
    max: isTestEnv ? 5000 : 100,
    message: 'API rate limit exceeded, please slow down',
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
    skip: (req: Request) => {
      // Skip rate limiting in test mode (unless explicitly enabled)
      if (isTestEnv && process.env.ENABLE_RATE_LIMITING !== 'true') {
        return true;
      }
      return req.path === '/api/monitoring/health';
    }
  }),

  // Relaxed limit for static assets
  static: rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    // Skip validation warnings since Express trust proxy is enabled at app level
    validate: false,
    skip: (req: Request) => {
      // Skip rate limiting in test mode (unless explicitly enabled)
      if (isTestEnv && process.env.ENABLE_RATE_LIMITING !== 'true') {
        return true;
      }
      return false;
    }
  }),

  // Very strict limit for expensive operations
  expensive: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 requests per hour
    message: 'This operation is resource intensive. Please wait before trying again.',
    standardHeaders: true,
    legacyHeaders: false,
    // Skip validation warnings since Express trust proxy is enabled at app level
    validate: false,
    skip: (req: Request) => {
      // Skip rate limiting in test mode (unless explicitly enabled)
      if (isTestEnv && process.env.ENABLE_RATE_LIMITING !== 'true') {
        return true;
      }
      return false;
    }
  })
};

// Middleware for dynamic rate limiting based on user tier
export const dynamicRateLimiter = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const path = req.path || '';

    if (path.startsWith('/api/ai') || path.startsWith('/api/deployments')) {
      return legacyRateLimiters.expensive(req, res, next);
    }

    return next();
  } catch (error) {
    console.error('Rate limiter error:', error);
    // Continue without rate limiting if there's an error
    next();
  }
};

// Rate limit violation logging
export const logRateLimitViolations = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const originalSend = res.send;
  
  res.send = function(body: any) {
    if (res.statusCode === 429) {
      console.warn(`Rate limit exceeded for ${req.ip} on ${req.path}`);
    }
    return originalSend.call(this, body);
  };
  
  next();
};