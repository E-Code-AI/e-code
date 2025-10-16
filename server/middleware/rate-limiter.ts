// @ts-nocheck
/**
 * Rate Limiting Middleware
 * Simplified rate limiting for development and production
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

// Different rate limits for different endpoints
export const rateLimiters = {
  // Strict limit for auth endpoints
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 requests per window
    message: 'Too many authentication attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req: Request) => req.ip === '127.0.0.1' || req.ip === '::1' // Skip for localhost in dev
  }),

  // Standard API rate limit
  api: rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: 'API rate limit exceeded, please slow down',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req: Request) => req.path === '/api/monitoring/health'
  }),

  // Relaxed limit for static assets
  static: rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false
  }),

  // Very strict limit for expensive operations
  expensive: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 requests per hour
    message: 'This operation is resource intensive. Please wait before trying again.',
    standardHeaders: true,
    legacyHeaders: false
  })
};

// Middleware for dynamic rate limiting based on user tier
export const dynamicRateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Apply default rate limit for all requests
    return rateLimiters.api(req, res, next);
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