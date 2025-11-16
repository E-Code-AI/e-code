/**
 * Tier-Based Rate Limiting Middleware (Fortune 500)
 * Implements intelligent rate limiting based on user subscription tier
 * - Free: 100 req/min (API), 10 req/min (AI)
 * - Pro: 1000 req/min (API), 100 req/min (AI)
 * - Enterprise: 10000 req/min (API), 1000 req/min (AI)
 */

import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { db } from '../db';
import { rateLimitViolations } from '@shared/schema';
import { createLogger } from '../utils/logger';

const logger = createLogger('tier-rate-limiter');

type SubscriptionTier = 'free' | 'pro' | 'enterprise';
type LimitType = 'api' | 'ai' | 'auth';

interface TierLimits {
  points: number;
  duration: number;
}

// Fortune 500 Rate Limits per Tier
const TIER_LIMITS: Record<SubscriptionTier, Record<LimitType, TierLimits>> = {
  free: {
    api: { points: 100, duration: 60 },      // 100 req/min
    ai: { points: 10, duration: 60 },        // 10 req/min
    auth: { points: 5, duration: 900 },      // 5 req/15min
  },
  pro: {
    api: { points: 1000, duration: 60 },     // 1000 req/min (10x)
    ai: { points: 100, duration: 60 },       // 100 req/min (10x)
    auth: { points: 20, duration: 900 },     // 20 req/15min (4x)
  },
  enterprise: {
    api: { points: 10000, duration: 60 },    // 10000 req/min (100x)
    ai: { points: 1000, duration: 60 },      // 1000 req/min (100x)
    auth: { points: 100, duration: 900 },    // 100 req/15min (20x)
  },
};

// Development mode: 10x multiplier for all tiers
const DEV_MULTIPLIER = process.env.NODE_ENV === 'development' ? 10 : 1;

// In-memory rate limiters per tier/type
const rateLimiters = new Map<string, RateLimiterMemory>();

function getRateLimiter(tier: SubscriptionTier, limitType: LimitType): RateLimiterMemory {
  const key = `${tier}_${limitType}`;
  
  if (!rateLimiters.has(key)) {
    const limits = TIER_LIMITS[tier][limitType];
    const limiter = new RateLimiterMemory({
      keyPrefix: `rl_tier_${key}`,
      points: limits.points * DEV_MULTIPLIER,
      duration: limits.duration,
      blockDuration: process.env.NODE_ENV === 'development' ? 1 : limits.duration,
    });
    rateLimiters.set(key, limiter);
  }
  
  return rateLimiters.get(key)!;
}

async function logViolation(req: Request, tier: SubscriptionTier, limitType: LimitType, attempted: number, allowed: number) {
  try {
    await db.insert(rateLimitViolations).values({
      userId: (req.user as any)?.id || null,
      ip: req.ip || 'unknown',
      endpoint: req.path,
      method: req.method,
      userTier: tier,
      limitType,
      attemptedRequests: attempted,
      allowedLimit: allowed,
      userAgent: req.get('user-agent') || null,
      metadata: {
        query: req.query,
        tier,
        env: process.env.NODE_ENV,
      },
    });
  } catch (error) {
    logger.error('Failed to log rate limit violation', { error });
  }
}

export function createTierRateLimitMiddleware(limitType: LimitType) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip rate limiting in test mode (unless explicitly enabled)
    if (process.env.NODE_ENV === 'test' && process.env.ENABLE_RATE_LIMITING !== 'true') {
      return next();
    }

    // Skip localhost in development
    if (process.env.NODE_ENV === 'development' && 
        (req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1')) {
      return next();
    }

    try {
      // Determine user tier (default to 'free' if not authenticated or no tier)
      const user = req.user as any;
      const tier: SubscriptionTier = user?.subscriptionTier || 'free';
      
      // Get appropriate rate limiter for this tier/type
      const limiter = getRateLimiter(tier, limitType);
      const key = user?.id || req.ip || 'anonymous';
      
      // Consume a point
      await limiter.consume(key);
      
      // Set rate limit headers
      const rateLimiterRes = await limiter.get(key);
      if (rateLimiterRes) {
        const limits = TIER_LIMITS[tier][limitType];
        res.setHeader('X-RateLimit-Limit', limits.points * DEV_MULTIPLIER);
        res.setHeader('X-RateLimit-Remaining', rateLimiterRes.remainingPoints || 0);
        res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString());
        res.setHeader('X-RateLimit-Tier', tier);
      }
      
      next();
    } catch (rejRes: any) {
      const user = req.user as any;
      const tier: SubscriptionTier = user?.subscriptionTier || 'free';
      const limits = TIER_LIMITS[tier][limitType];
      const retryAfter = Math.round(rejRes.msBeforeNext / 1000) || 60;
      
      logger.warn('Rate limit exceeded', {
        tier,
        limitType,
        userId: user?.id,
        ip: req.ip,
        path: req.path,
        retryAfter
      });
      
      // Log violation to database (async, don't block response)
      logViolation(req, tier, limitType, rejRes.consumedPoints || 0, limits.points).catch(() => {});
      
      res.setHeader('Retry-After', retryAfter);
      res.setHeader('X-RateLimit-Limit', limits.points * DEV_MULTIPLIER);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rejRes.msBeforeNext).toISOString());
      res.setHeader('X-RateLimit-Tier', tier);
      
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Your ${tier} tier allows ${limits.points} requests per ${limits.duration}s for ${limitType} endpoints. Please wait ${retryAfter} seconds or upgrade your plan.`,
        tier,
        limit: limits.points,
        retryAfter,
        upgradeTo: tier === 'free' ? 'pro' : tier === 'pro' ? 'enterprise' : null,
      });
    }
  };
}

// Export specific middleware for different endpoint types
export const tierRateLimiters = {
  api: createTierRateLimitMiddleware('api'),
  ai: createTierRateLimitMiddleware('ai'),
  auth: createTierRateLimitMiddleware('auth'),
};
