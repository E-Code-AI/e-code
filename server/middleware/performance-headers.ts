/**
 * Fortune 500-Grade Performance Headers Middleware
 * 
 * Optimizes web preview loading through:
 * - Aggressive caching for static assets
 * - Preload hints for critical resources
 * - Compression hints
 * - Security headers that don't impact performance
 */

import { Request, Response, NextFunction } from 'express';

interface CacheConfig {
  maxAge: number;
  staleWhileRevalidate?: number;
  immutable?: boolean;
}

const CACHE_CONFIGS: Record<string, CacheConfig> = {
  // Immutable assets (hashed filenames) - cache forever
  immutable: {
    maxAge: 31536000, // 1 year
    immutable: true,
  },
  // Static assets - aggressive caching
  static: {
    maxAge: 86400, // 1 day
    staleWhileRevalidate: 604800, // 7 days
  },
  // API responses - short cache
  api: {
    maxAge: 0,
  },
  // HTML - no cache (always fresh)
  html: {
    maxAge: 0,
  },
};

/**
 * Determines cache configuration based on request path
 */
function getCacheConfig(path: string, contentType?: string): CacheConfig {
  // Hashed assets (Vite generates these)
  if (path.match(/\.[a-f0-9]{8,}\.(js|css|woff2?|ttf|eot)$/)) {
    return CACHE_CONFIGS.immutable;
  }
  
  // Static assets
  if (path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot)$/)) {
    return CACHE_CONFIGS.static;
  }
  
  // API endpoints
  if (path.startsWith('/api/')) {
    return CACHE_CONFIGS.api;
  }
  
  // HTML and everything else
  return CACHE_CONFIGS.html;
}

/**
 * Performance headers middleware
 */
export function performanceHeaders() {
  return (req: Request, res: Response, next: NextFunction) => {
    const config = getCacheConfig(req.path);
    
    // Build Cache-Control header
    const cacheDirectives: string[] = [];
    
    if (config.maxAge === 0) {
      cacheDirectives.push('no-cache', 'no-store', 'must-revalidate');
    } else {
      cacheDirectives.push(`max-age=${config.maxAge}`);
      cacheDirectives.push('public');
      
      if (config.staleWhileRevalidate) {
        cacheDirectives.push(`stale-while-revalidate=${config.staleWhileRevalidate}`);
      }
      
      if (config.immutable) {
        cacheDirectives.push('immutable');
      }
    }
    
    res.setHeader('Cache-Control', cacheDirectives.join(', '));
    
    // Add performance-related headers
    
    // Enable compression hint
    res.setHeader('Vary', 'Accept-Encoding');
    
    // Timing-Allow-Origin for performance monitoring
    res.setHeader('Timing-Allow-Origin', '*');
    
    // X-Content-Type-Options for security without perf impact
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    next();
  };
}

/**
 * Early hints middleware (103 Early Hints support)
 * Sends preload hints before the main response
 */
export function earlyHints() {
  const criticalResources = [
    { path: '/src/main.tsx', as: 'script' },
    { path: '/src/index.css', as: 'style' },
  ];
  
  return (req: Request, res: Response, next: NextFunction) => {
    // Only for HTML requests
    if (req.accepts('html') && !req.path.startsWith('/api/')) {
      // Note: 103 Early Hints requires HTTP/2 support
      // For HTTP/1.1, we use Link headers instead
      const linkHeaders = criticalResources
        .map(r => `<${r.path}>; rel=preload; as=${r.as}`)
        .join(', ');
      
      res.setHeader('Link', linkHeaders);
    }
    
    next();
  };
}

/**
 * Server timing header for performance debugging
 */
export function serverTiming() {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = process.hrtime.bigint();
    
    // Add timing on response finish
    res.on('finish', () => {
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1000000;
      
      // Only add if not already sent
      if (!res.headersSent) {
        res.setHeader('Server-Timing', `total;dur=${durationMs.toFixed(2)}`);
      }
    });
    
    next();
  };
}

export default performanceHeaders;
