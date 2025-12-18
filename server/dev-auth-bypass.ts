/**
 * Module pour contourner l'authentification en développement
 * NE PAS UTILISER EN PRODUCTION !
 * 
 * SECURITY: Includes rate limiting to prevent brute-force attacks on bypass token
 */

import { Request, Response, NextFunction } from "express";

// Variable pour activer/désactiver le contournement d'auth
// DÉSACTIVÉ par défaut même en développement pour assurer la stabilité
let bypassAuth = false;
let productionBypassWarningLogged = false;
const BYPASS_HEADER = 'x-dev-auth-token';

// SECURITY: Rate limiting for bypass attempts (Fortune 500 requirement)
const bypassAttempts = new Map<string, { count: number; firstAttempt: number }>();
const MAX_BYPASS_ATTEMPTS = 5;
const BYPASS_WINDOW_MS = 60000; // 1 minute

function checkBypassRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = bypassAttempts.get(ip);
  
  // Cleanup old entries
  if (bypassAttempts.size > 1000) {
    for (const [key, value] of bypassAttempts.entries()) {
      if (now - value.firstAttempt > BYPASS_WINDOW_MS) {
        bypassAttempts.delete(key);
      }
    }
  }
  
  if (!record || now - record.firstAttempt > BYPASS_WINDOW_MS) {
    bypassAttempts.set(ip, { count: 1, firstAttempt: now });
    return { allowed: true, remaining: MAX_BYPASS_ATTEMPTS - 1 };
  }
  
  if (record.count >= MAX_BYPASS_ATTEMPTS) {
    return { allowed: false, remaining: 0 };
  }
  
  record.count++;
  return { allowed: true, remaining: MAX_BYPASS_ATTEMPTS - record.count };
}

// Export getter function for auth bypass status
export const isAuthBypassEnabled = () => {
  return isBypassFeatureEnabled() && bypassAuth;
};

const isBypassFeatureEnabled = () => {
  // CRITICAL SECURITY: Never allow auth bypass in production
  if (process.env.NODE_ENV === 'production') {
    if (!productionBypassWarningLogged && process.env.ENABLE_DEV_AUTH_BYPASS === 'true') {
      productionBypassWarningLogged = true;
      console.error(
        'SECURITY ERROR: DEV auth bypass is DISABLED in production mode. ENABLE_DEV_AUTH_BYPASS is ignored for security.'
      );
    }
    return false; // Always return false in production
  }

  // Only allow in development if explicitly enabled
  const enabled = process.env.ENABLE_DEV_AUTH_BYPASS === 'true' && process.env.NODE_ENV === 'development';
  
  if (enabled) {
    console.warn(
      'Auth Bypass: ENABLED in development mode. This should NEVER be active in production.'
    );
  }

  return enabled;
};

const getBypassSecret = () => process.env.DEV_AUTH_BYPASS_TOKEN;

const hasValidBypassToken = (req: Request) => {
  const secret = getBypassSecret();
  if (!secret) {
    return false;
  }

  const tokenHeader = req.headers[BYPASS_HEADER] ?? req.headers[BYPASS_HEADER as keyof typeof req.headers];
  if (!tokenHeader) {
    return false;
  }

  if (Array.isArray(tokenHeader)) {
    return tokenHeader.includes(secret);
  }

  return tokenHeader === secret;
};

// Middleware qui peut contourner l'authentification
export const devAuthBypass = (req: Request, res: Response, next: NextFunction) => {
  // Skip auth bypass for logout requests
  if (req.path === '/api/logout' || req.path === '/api/login' || req.path === '/api/register') {
    return next();
  }

  const shouldBypassRequest =
    isBypassFeatureEnabled() && (hasValidBypassToken(req) || bypassAuth);

  // Si le contournement est activé, nous simulons un utilisateur authentifié
  if (shouldBypassRequest) {
    // Si isAuthenticated() est déjà true, continuez normalement
    if (typeof req.isAuthenticated === 'function' && req.isAuthenticated()) {
      return next();
    }
    
    // Simuler l'authentification pour le développement
    req.isAuthenticated = (() => true) as any;
    
    // Simuler un utilisateur administrateur
    req.user = {
      id: 1,
      username: 'admin',
      displayName: 'Admin User',
      email: 'admin@example.com',
      avatarUrl: null,
      bio: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      password: '***PROTECTED***'
    } as any;
  }
  
  next();
};

// Endpoint pour activer/désactiver le contournement (en développement uniquement)
export function setupAuthBypass(app: any) {
  if (!isBypassFeatureEnabled()) {
    return;
  }

  const bypassSecret = getBypassSecret();
  if (!bypassSecret) {
    console.warn('Auth Bypass: DEV_AUTH_BYPASS_TOKEN must be set to enable debug endpoints.');
    return;
  }

  // Endpoint pour activer le contournement
  // SECURITY: Rate limited to prevent brute-force attacks
  app.get('/api/debug/bypass-auth/enable', (req: Request, res: Response) => {
    const ip = req.ip || 'unknown';
    const rateCheck = checkBypassRateLimit(ip);
    
    if (!rateCheck.allowed) {
      return res.status(429).json({
        status: 'rate_limited',
        message: 'Too many attempts. Please try again later.',
        retryAfter: 60
      });
    }
    
    if (!hasValidBypassToken(req)) {
      return res.status(403).json({
        status: 'forbidden',
        message: 'Missing or invalid dev auth bypass token',
        remaining: rateCheck.remaining
      });
    }

    bypassAuth = true;
    res.json({
      status: 'enabled',
      warning: 'Le contournement d\'authentification est activé. À utiliser uniquement pour le développement.'
    });
  });
  
  // Endpoint pour désactiver le contournement
  app.get('/api/debug/bypass-auth/disable', (req: Request, res: Response) => {
    if (!hasValidBypassToken(req)) {
      return res.status(403).json({
        status: 'forbidden',
        message: 'Missing or invalid dev auth bypass token'
      });
    }

    bypassAuth = false;
    res.json({ status: 'disabled' });
  });

  // Endpoint pour vérifier l'état
  app.get('/api/debug/bypass-auth/status', (req: Request, res: Response) => {
    if (!hasValidBypassToken(req)) {
      return res.status(403).json({
        status: 'forbidden',
        message: 'Missing or invalid dev auth bypass token'
      });
    }

    res.json({
      status: bypassAuth ? 'enabled' : 'disabled',
      mode: process.env.NODE_ENV
    });
  });

  // Add POST endpoint for auth bypass
  // SECURITY: Rate limited to prevent brute-force attacks
  app.post('/api/auth/debug/bypass', (req: Request, res: Response) => {
    const ip = req.ip || 'unknown';
    const rateCheck = checkBypassRateLimit(ip);
    
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        message: 'Too many attempts. Please try again later.',
        retryAfter: 60
      });
    }
    
    if (!hasValidBypassToken(req)) {
      return res.status(403).json({
        success: false,
        message: 'Missing or invalid dev auth bypass token',
        remaining: rateCheck.remaining
      });
    }

    // Create a dev user session
    const devUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      displayName: 'Test User',
      avatarUrl: null,
      bio: 'Development test user',
      createdAt: new Date(),
      updatedAt: new Date(),
      password: '***PROTECTED***'
    };

    // Log in the dev user using passport
    req.login(devUser as any, (err) => {
      if (err) {
        console.error('Dev auth bypass error:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Auth bypass failed', 
          error: err.message 
        });
      }
      
      bypassAuth = true;
      res.json({ 
        success: true,
        message: 'Auth bypass enabled',
        user: devUser
      });
    });
  });
}
