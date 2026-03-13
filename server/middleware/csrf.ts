/**
 * Custom CSRF Protection Middleware
 * Provides protection against Cross-Site Request Forgery attacks
 * 
 * Uses a singleton pattern with shared token map for proper lifecycle management
 */

import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';


// Methods that require CSRF protection
const PROTECTED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

// Paths to exclude from CSRF protection (webhooks and anonymous endpoints)
const EXCLUDED_PATHS = [
  '/api/webhooks/stripe',
  '/api/webhooks/github',
  '/api/logs/ingest',  // Anonymous telemetry - no auth required
];

// Base allowed origins for login/register endpoints
const BASE_ORIGINS = [
  process.env.APP_URL || 'http://localhost:5000',
  'https://e-code.ai',
  'http://localhost:5000',
  'http://localhost:3000',
];

/**
 * Build complete allowed origins list at runtime
 * Includes all Replit development domains dynamically
 */
function getAllowedOrigins(): string[] {
  const origins = [...BASE_ORIGINS];
  
  // Primary: REPLIT_DEV_DOMAIN is the actual domain used by Replit preview
  if (process.env.REPLIT_DEV_DOMAIN) {
    origins.push(`https://${process.env.REPLIT_DEV_DOMAIN}`);
  }
  
  // Secondary: Full development URL
  if (process.env.REPLIT_DEV_URL) {
    origins.push(process.env.REPLIT_DEV_URL);
    // Also add without port for WebView requests
    const urlWithoutPort = process.env.REPLIT_DEV_URL.replace(/:5000$/, '');
    if (urlWithoutPort !== process.env.REPLIT_DEV_URL) {
      origins.push(urlWithoutPort);
    }
  }
  
  // REPLIT_DOMAINS contains comma-separated domain list
  if (process.env.REPLIT_DOMAINS) {
    process.env.REPLIT_DOMAINS.split(',').forEach(domain => {
      const trimmed = domain.trim();
      if (trimmed) {
        origins.push(`https://${trimmed}`);
      }
    });
  }
  
  // Fallback: REPL_ID based patterns (legacy support)
  if (process.env.REPL_ID) {
    origins.push(`https://${process.env.REPL_ID}.replit.dev`);
  }
  
  // Allow any .replit.dev and .repl.co subdomain in development
  if (process.env.NODE_ENV === 'development') {
    // Add wildcards for development flexibility
  }
  
  return [...new Set(origins)]; // Deduplicate
}

// Build origins at module load
const ALLOWED_ORIGINS = getAllowedOrigins();

/**
 * Check if the provided origin is in the allowed list
 * Also allows any Replit development domain in development mode
 */
function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return false;
  
  // SECURITY FIX: Use exact URL matching to prevent subdomain bypass attacks
  // e.g., https://e-code.ai.attacker.com would bypass startsWith check
  try {
    const originUrl = new URL(origin);
    const originHostPort = `${originUrl.protocol}//${originUrl.host}`;
    
    // Exact host match only (no prefix matching)
    if (ALLOWED_ORIGINS.some(allowed => {
      try {
        const allowedUrl = new URL(allowed);
        const allowedHostPort = `${allowedUrl.protocol}//${allowedUrl.host}`;
        return originHostPort === allowedHostPort;
      } catch {
        return origin === allowed;
      }
    })) {
      return true;
    }
  } catch {
    // If origin is not a valid URL, reject it
    return false;
  }
  
  // In development, allow any Replit domain pattern
  if (process.env.NODE_ENV === 'development') {
    const replitPatterns = [
      // Fixed: Use [a-z0-9-]+ to match all alphanumeric characters, not just hex
      /^https:\/\/[a-z0-9-]+\.replit\.dev$/,
      /^https:\/\/[a-z0-9-]+-\d+-[a-z0-9]+\.riker\.replit\.dev$/,
      /^https:\/\/[a-z0-9-]+\.repl\.co$/,
      // Also allow http for local development
      /^http:\/\/127\.0\.0\.1(:\d+)?$/,
      /^http:\/\/localhost(:\d+)?$/,
    ];
    if (replitPatterns.some(pattern => pattern.test(origin))) {
      return true;
    }
  }
  
  return false;
}

/**
 * CSRF Protection Service (Singleton)
 * Manages token generation, verification, and lifecycle with a shared token map
 */
class CSRFProtectionService {
  private static instance: CSRFProtectionService;
  private tokenMap: Map<string, { token: string; createdAt: number }>;
  private readonly TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.tokenMap = new Map();
    this.startCleanup();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): CSRFProtectionService {
    if (!CSRFProtectionService.instance) {
      CSRFProtectionService.instance = new CSRFProtectionService();
    }
    return CSRFProtectionService.instance;
  }

  /**
   * Start cleanup interval to remove expired tokens
   */
  private startCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [sessionId, data] of this.tokenMap.entries()) {
        if (now - data.createdAt > this.TOKEN_EXPIRY) {
          this.tokenMap.delete(sessionId);
        }
      }
    }, 5 * 60 * 1000); // Clean up every 5 minutes
  }

  /**
   * Generate a cryptographically secure CSRF token
   */
  generate(sessionId: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    this.tokenMap.set(sessionId, {
      token,
      createdAt: Date.now()
    });
    return token;
  }

  /**
   * Verify CSRF token for a session
   */
  verify(sessionId: string, providedToken: string): boolean {
    const data = this.tokenMap.get(sessionId);
    
    if (!data) {
      return false;
    }

    // Check if token has expired
    if (Date.now() - data.createdAt > this.TOKEN_EXPIRY) {
      this.tokenMap.delete(sessionId);
      return false;
    }

    // Use timing-safe comparison to prevent timing attacks
    const providedBuffer = Buffer.from(providedToken);
    const storedBuffer = Buffer.from(data.token);
    
    if (providedBuffer.length !== storedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(providedBuffer, storedBuffer);
  }

  /**
   * Get token for a session (used for session-based storage)
   */
  getToken(sessionId: string): string | null {
    const data = this.tokenMap.get(sessionId);
    if (!data) {
      return null;
    }
    
    // Check if expired
    if (Date.now() - data.createdAt > this.TOKEN_EXPIRY) {
      this.tokenMap.delete(sessionId);
      return null;
    }
    
    return data.token;
  }

  /**
   * Delete token for a session
   */
  deleteToken(sessionId: string): void {
    this.tokenMap.delete(sessionId);
  }

  /**
   * Get statistics (for monitoring)
   */
  getStats(): { activeTokens: number; oldestToken: number | null } {
    let oldestToken: number | null = null;
    const now = Date.now();
    
    for (const data of this.tokenMap.values()) {
      const age = now - data.createdAt;
      if (oldestToken === null || age > oldestToken) {
        oldestToken = age;
      }
    }
    
    return {
      activeTokens: this.tokenMap.size,
      oldestToken
    };
  }
}

// Export singleton instance
export const csrfService = CSRFProtectionService.getInstance();

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * CSRF Protection Middleware
 * 
 * This middleware:
 * 1. Generates and stores CSRF tokens using singleton service
 * 2. Validates CSRF tokens on state-changing requests
 * 3. Provides the token to the client via a response header
 * 
 * IMPORTANT: Uses shared token map via singleton to prevent per-request state loss
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // SECURITY: Only allow CSRF bypass in explicit development mode with flag
  if (process.env.NODE_ENV === 'development' && process.env.DISABLE_CSRF === 'true') {
    console.warn('⚠️  SECURITY WARNING: CSRF protection bypassed in development mode');
    return next();
  }

  // Skip for excluded paths
  // Use req.originalUrl (full path) because this middleware is mounted at /api
  // so req.path would be stripped of the /api prefix
  const fullPath = req.originalUrl.split('?')[0];
  if (EXCLUDED_PATHS.some(excluded => fullPath === excluded || fullPath.startsWith(excluded + '/'))) {
    return next();
  }

  // Origin validation for login/register endpoints
  if (req.path === '/api/login' || req.path === '/api/register') {
    const origin = req.get('Origin');
    if (!isAllowedOrigin(origin)) {
      return res.status(403).json({ error: 'Invalid origin' });
    }
  }

  // Initialize session if not present
  if (!req.session) {
    return res.status(500).json({ error: 'Session not initialized' });
  }

  // Get session ID (use session.id or create one)
  const sessionId = req.session.id || req.sessionID;
  if (!sessionId) {
    return res.status(500).json({ error: 'No session ID available' });
  }

  // Generate token if not present for this session
  let token = csrfService.getToken(sessionId);
  if (!token) {
    token = csrfService.generate(sessionId);
  }

  // Always send the current token in response header for client to use
  res.setHeader('X-CSRF-Token', token);

  // For GET requests and other safe methods, just provide the token
  if (!PROTECTED_METHODS.includes(req.method)) {
    return next();
  }

  // For protected methods, validate the token
  const providedToken = req.headers['x-csrf-token'] as string 
    || req.body?._csrf 
    || req.query?._csrf as string;

  if (!providedToken) {
    return res.status(403).json({ 
      error: 'CSRF token missing',
      message: 'This request requires a valid CSRF token' 
    });
  }

  // Validate token using singleton service
  if (!csrfService.verify(sessionId, providedToken)) {
    return res.status(403).json({ 
      error: 'CSRF validation failed',
      message: 'Invalid or expired CSRF token' 
    });
  }

  // Token is valid, proceed to next middleware
  next();
}

/**
 * Endpoint to get a fresh CSRF token
 * Clients can call this to get a token before making state-changing requests
 */
export function csrfTokenEndpoint(req: Request, res: Response) {
  if (!req.session) {
    return res.status(500).json({ error: 'Session not initialized' });
  }

  // Get session ID
  const sessionId = req.session.id || req.sessionID;
  if (!sessionId) {
    return res.status(500).json({ error: 'No session ID available' });
  }

  // Generate new token using singleton service
  const token = csrfService.generate(sessionId);

  // Send token in both header and body
  res.setHeader('X-CSRF-Token', token);
  res.json({ csrfToken: token });
}