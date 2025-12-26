/**
 * Centralized SSE Headers Utility
 * Fortune 500 Production-Grade - Cross-Origin Security for SSE
 * 
 * This utility provides consistent, secure SSE header handling across
 * all streaming endpoints. It enforces origin validation to prevent
 * cross-origin data exfiltration attacks.
 * 
 * Date: December 26, 2025
 * Status: Production-ready
 */

import { Response, Request } from 'express';
import { createLogger } from './logger';

const logger = createLogger('sse-headers');

/**
 * Get allowed origin for SSE response headers
 * NO WILDCARDS - Fortune 500 security requirement
 */
export function getSSEAllowedOrigin(req?: Request): string {
  const origin = req?.headers?.origin as string | undefined;
  
  const allowedOrigins = [
    process.env.APP_URL || 'http://localhost:5000',
    'https://e-code.ai',
    'http://localhost:5000',
    'http://localhost:3000',
  ];
  
  if (process.env.REPLIT_DEV_DOMAIN) {
    allowedOrigins.push(`https://${process.env.REPLIT_DEV_DOMAIN}`);
  }
  if (process.env.REPLIT_DEV_URL) {
    allowedOrigins.push(process.env.REPLIT_DEV_URL);
  }
  
  if (process.env.NODE_ENV === 'development' && origin) {
    const replitPatterns = [
      /^https:\/\/[a-f0-9-]+\.replit\.dev$/,
      /^https:\/\/[a-f0-9-]+-\d+-[a-z0-9]+\.riker\.replit\.dev$/,
      /^https:\/\/[a-z0-9-]+\.repl\.co$/,
    ];
    if (replitPatterns.some(pattern => pattern.test(origin))) {
      return origin;
    }
  }
  
  if (origin && allowedOrigins.includes(origin)) {
    return origin;
  }
  
  return allowedOrigins[0];
}

/**
 * Set SSE headers with Fortune 500-grade security
 * @param res Express Response object
 * @param req Express Request object (for origin validation)
 */
export function setSSEHeaders(res: Response, req?: Request): void {
  const allowedOrigin = getSSEAllowedOrigin(req);
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('X-Accel-Buffering', 'no');
  
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }
}

/**
 * Full SSE setup with cleanup handling
 * Returns a function to register cleanup handlers for connection close
 */
export function setupSSE(res: Response, req?: Request): (cleanupFn?: () => void) => void {
  setSSEHeaders(res, req);
  
  res.write('event: connected\n');
  res.write('data: {"status": "connected"}\n\n');
  
  const cleanupHandlers: (() => void)[] = [];
  
  if (req) {
    const handleClose = () => {
      logger.info('[SSE] Client connection closed - running cleanup');
      cleanupHandlers.forEach(fn => {
        try { fn(); } catch (e) { /* ignore cleanup errors */ }
      });
    };
    
    req.on('close', handleClose);
    req.on('error', (err: Error) => {
      logger.warn('[SSE] Client connection error', { error: err.message });
      handleClose();
    });
  }
  
  return (cleanupFn?: () => void) => {
    if (cleanupFn) cleanupHandlers.push(cleanupFn);
  };
}

/**
 * Send SSE event with proper formatting
 */
export function sendSSE(res: Response, event: string, data: any): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}
