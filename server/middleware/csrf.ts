/**
 * Custom CSRF Protection Middleware
 * Provides protection against Cross-Site Request Forgery attacks
 * 
 * Uses a singleton pattern with shared token map for proper lifecycle management
 */

import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

// Store CSRF tokens in session
declare module 'express-session' {
  interface SessionData {
    csrfToken?: string;
  }
}

// Methods that require CSRF protection
const PROTECTED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

// Paths to exclude from CSRF protection (e.g., API endpoints for external services, or endpoints using alternative auth)
const EXCLUDED_PATHS = [
  '/api/webhooks',
  '/api/stripe/webhook',
  '/api/github/webhook',
  '/api/health',
  '/api/cors-health',
  '/api/dev-login',
  '/api/dev-auto-login',
  '/api/cli',  // CLI endpoints use API keys
  '/mobile',  // Mobile endpoints use JWT auth
  '/api/csrf-token'  // Token endpoint itself
  // NOTE: /api/register, /api/login are NOT excluded - they need CSRF protection!
];

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
  // Skip CSRF protection in development if explicitly disabled
  if (process.env.NODE_ENV === 'development' && process.env.DISABLE_CSRF === 'true') {
    return next();
  }

  // Skip for excluded paths
  if (EXCLUDED_PATHS.some(path => req.path.startsWith(path))) {
    return next();
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
    // Also store in session for compatibility
    req.session.csrfToken = token;
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
  
  // Also store in session for compatibility
  req.session.csrfToken = token;

  // Send token in both header and body
  res.setHeader('X-CSRF-Token', token);
  res.json({ csrfToken: token });
}