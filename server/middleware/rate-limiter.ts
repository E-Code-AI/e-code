import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage.js';

// Rate limit configurations
export const AUTH_RATE_LIMITS = {
  login: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxAttempts: 5,
    blockDurationMs: 30 * 60 * 1000 // 30 minutes
  },
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxAttempts: 3,
    blockDurationMs: 60 * 60 * 1000 // 1 hour
  },
  emailVerification: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxAttempts: 5,
    blockDurationMs: 60 * 60 * 1000 // 1 hour
  }
};

export type RateLimitConfig = typeof AUTH_RATE_LIMITS[keyof typeof AUTH_RATE_LIMITS];

// Enhanced in-memory store for rate limiting with periodic cleanup
const rateLimitStore = new Map<string, { attempts: number; firstAttempt: Date; blockedUntil?: Date }>();

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = new Date();
  for (const [key, record] of rateLimitStore.entries()) {
    // Remove records older than 2 hours
    if (now.getTime() - record.firstAttempt.getTime() > 2 * 60 * 60 * 1000) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Create rate limiter middleware
export function createRateLimiter(endpoint: keyof typeof AUTH_RATE_LIMITS) {
  const config = AUTH_RATE_LIMITS[endpoint];
  
  return async (req: Request, res: Response, next: NextFunction) => {
    const identifier = `${endpoint}:${req.ip}`;
    const now = new Date();
    
    // Check if IP is currently blocked
    const record = rateLimitStore.get(identifier);
    if (record?.blockedUntil && record.blockedUntil > now) {
      const remainingTime = Math.ceil((record.blockedUntil.getTime() - now.getTime()) / 1000 / 60);
      return res.status(429).json({
        error: 'Too many attempts',
        retryAfter: remainingTime,
        message: `Please try again in ${remainingTime} minutes`
      });
    }
    
    // Initialize or update rate limit record
    if (!record) {
      rateLimitStore.set(identifier, { attempts: 1, firstAttempt: now });
    } else if (now.getTime() - record.firstAttempt.getTime() > config.windowMs) {
      // Reset if outside window
      rateLimitStore.set(identifier, { attempts: 1, firstAttempt: now });
    } else {
      // Increment attempts
      record.attempts++;
      
      // Block if exceeded max attempts
      if (record.attempts > config.maxAttempts) {
        record.blockedUntil = new Date(now.getTime() + config.blockDurationMs);
        return res.status(429).json({
          error: 'Too many attempts',
          message: `Too many ${endpoint} attempts. Please try again later.`
        });
      }
    }
    
    next();
  };
}

// Check account lockout status
export async function checkAccountLockout(userId: number): Promise<{ isLocked: boolean; lockedUntil?: Date }> {
  const user = await storage.getUser(userId);
  if (!user) {
    return { isLocked: false };
  }
  
  if (user.accountLockedUntil && new Date(user.accountLockedUntil) > new Date()) {
    return { isLocked: true, lockedUntil: new Date(user.accountLockedUntil) };
  }
  
  return { isLocked: false };
}

// Log login attempt
export async function logLoginAttempt(
  userId: number, 
  ipAddress: string, 
  successful: boolean,
  failureReason?: string
) {
  await storage.createLoginHistory({
    userId,
    ipAddress,
    userAgent: null,
    successful,
    failureReason: failureReason || null
  });
  
  if (!successful) {
    // Increment failed attempts
    const user = await storage.getUser(userId);
    if (user) {
      const failedAttempts = (user.failedLoginAttempts || 0) + 1;
      
      // Lock account after 5 failed attempts
      if (failedAttempts >= 5) {
        const lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        await storage.updateUser(userId, {
          failedLoginAttempts: failedAttempts,
          accountLockedUntil: lockedUntil
        });
      } else {
        await storage.updateUser(userId, {
          failedLoginAttempts: failedAttempts
        });
      }
    }
  } else {
    // Reset failed attempts on successful login
    await storage.updateUser(userId, {
      failedLoginAttempts: 0,
      accountLockedUntil: null,
      lastLoginAt: new Date(),
      lastLoginIp: ipAddress
    });
  }
}

// Clean up old rate limit records periodically
setInterval(() => {
  const now = new Date();
  const keysToDelete: string[] = [];
  rateLimitStore.forEach((record, key) => {
    if (record.blockedUntil && record.blockedUntil < now) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach(key => rateLimitStore.delete(key));
}, 5 * 60 * 1000); // Clean up every 5 minutes