// @ts-nocheck
/**
 * Module pour contourner l'authentification en développement
 * NE PAS UTILISER EN PRODUCTION !
 */

import { Request, Response, NextFunction } from "express";

// Variable pour activer/désactiver le contournement d'auth
// DÉSACTIVÉ par défaut même en développement pour assurer la stabilité
let bypassAuth = false;
let productionBypassWarningLogged = false;
const BYPASS_HEADER = 'x-dev-auth-token';

const isBypassFeatureEnabled = () => {
  const enabled = process.env.ENABLE_DEV_AUTH_BYPASS === 'true';

  if (
    enabled &&
    process.env.NODE_ENV === 'production' &&
    !productionBypassWarningLogged
  ) {
    productionBypassWarningLogged = true;
    console.warn(
      'Auth Bypass: ENABLE_DEV_AUTH_BYPASS est actif alors que NODE_ENV=production. À n\'utiliser que pour le débogage.'
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
    
    console.log('⚠️ Auth Bypass: Simulation d\'authentification activée pour cette demande');
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
  app.get('/api/debug/bypass-auth/enable', (req: Request, res: Response) => {
    if (!hasValidBypassToken(req)) {
      return res.status(403).json({
        status: 'forbidden',
        message: 'Missing or invalid dev auth bypass token'
      });
    }

    bypassAuth = true;
    console.log('⚠️ Auth Bypass: ACTIVÉ - Toutes les vérifications d\'authentification seront ignorées');
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
    console.log('✅ Auth Bypass: DÉSACTIVÉ - L\'authentification normale est restaurée');
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
  app.post('/api/auth/debug/bypass', (req: Request, res: Response) => {
    if (!hasValidBypassToken(req)) {
      return res.status(403).json({
        success: false,
        message: 'Missing or invalid dev auth bypass token'
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
      console.log('⚠️ Auth Bypass: User logged in via bypass');
      res.json({ 
        success: true,
        message: 'Auth bypass enabled',
        user: devUser
      });
    });
  });

  console.log('🔧 Auth Bypass: Points de terminaison de débogage initialisés pour le développement');
  
  if (bypassAuth) {
    console.log('⚠️ Auth Bypass: ACTIVÉ par défaut en développement');
  }
}
