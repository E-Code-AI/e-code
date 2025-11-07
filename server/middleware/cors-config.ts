// Secure CORS configuration module
import cors from 'cors';
import { Express } from 'express';

interface CorsConfiguration {
  origins: string[];
  credentials: boolean;
}

/**
 * Get allowed origins from environment variables or configuration
 * 
 * SECURITY: In production, explicitly configured origins are preferred.
 * Replit domains are auto-detected in both dev and production for deployment compatibility.
 */
function getAllowedOrigins(): string[] {
  const allowedOrigins: string[] = [];
  const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Parse comma-separated list of allowed origins from environment
  if (process.env.ALLOWED_ORIGINS) {
    const origins = process.env.ALLOWED_ORIGINS.split(',')
      .map(origin => origin.trim())
      .filter(origin => origin.length > 0);
    allowedOrigins.push(...origins);
  }
  
  // Add frontend URL if configured
  if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
  }
  
  // Add app URL if configured (common in production)
  if (process.env.APP_URL) {
    allowedOrigins.push(process.env.APP_URL);
  }
  
  // Auto-detect Replit deployment domains (PRODUCTION)
  // REPLIT_DOMAINS is available in deployed apps and contains all deployment URLs
  if (process.env.REPLIT_DOMAINS) {
    const domains = process.env.REPLIT_DOMAINS.split(',')
      .map(domain => domain.trim())
      .filter(domain => domain.length > 0)
      .map(domain => {
        // Protect against double https:// if user pre-prefixes
        if (domain.startsWith('https://') || domain.startsWith('http://')) {
          return domain;
        }
        return `https://${domain}`;
      });
    allowedOrigins.push(...domains);
  }
  
  // Auto-detect Replit workspace URLs (DEVELOPMENT)
  // REPL_SLUG and REPL_OWNER are available in development workspace
  if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    // Standard Replit workspace URL pattern
    const replitUrl = `https://${process.env.REPL_SLUG}-${process.env.REPL_OWNER}.replit.app`;
    allowedOrigins.push(replitUrl);
    
    // Also add the versioned URL pattern
    const replitVersionedUrl = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
    allowedOrigins.push(replitVersionedUrl);
  }
  
  // Add Replit dev URLs if available (DEVELOPMENT)
  // Note: REPLIT_DEV_DOMAIN is NOT available in deployments
  if (process.env.REPLIT_DEV_DOMAIN) {
    allowedOrigins.push(`https://${process.env.REPLIT_DEV_DOMAIN}`);
  }
  
  // In development, allow localhost origins
  if (isDevelopment) {
    allowedOrigins.push(
      'http://localhost:3000',
      'http://localhost:5000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5000',
      'http://127.0.0.1:5173'
    );
  }
  
  // Remove duplicates
  return [...new Set(allowedOrigins)];
}

/**
 * Validate CORS configuration for production
 * 
 * SECURITY: Production MUST have origins configured (explicit or auto-detected)
 */
function validateProductionCors(origins: string[]): void {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // SECURITY: Fail fast if no origins can be determined in production
    if (origins.length === 0) {
      console.error('');
      console.error('════════════════════════════════════════════════════════════════');
      console.error('  CRITICAL: CORS CONFIGURATION MISSING IN PRODUCTION');
      console.error('════════════════════════════════════════════════════════════════');
      console.error('');
      console.error('Production environments MUST have CORS origins configured.');
      console.error('Configure at least one of the following environment variables:');
      console.error('');
      console.error('  • ALLOWED_ORIGINS - Comma-separated list of allowed origins');
      console.error('    Example: ALLOWED_ORIGINS=https://app.example.com,https://www.example.com');
      console.error('');
      console.error('  • APP_URL - The public URL of your application');
      console.error('    Example: APP_URL=https://myapp.replit.app');
      console.error('');
      console.error('  • FRONTEND_URL - The URL of your frontend application');
      console.error('    Example: FRONTEND_URL=https://frontend.example.com');
      console.error('');
      console.error('For Replit deployments, REPLIT_DOMAINS should be auto-detected.');
      console.error('');
      console.error('SECURITY: Without explicit origins, authenticated APIs would be');
      console.error('exposed to arbitrary origins, allowing CSRF attacks.');
      console.error('');
      console.error('════════════════════════════════════════════════════════════════');
      console.error('');
      
      // Exit immediately - do not allow server to start without CORS config
      process.exit(1);
    }
    
    // Warn about insecure origins in production
    for (const origin of origins) {
      if (origin.startsWith('http://') && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
        console.warn(`[CORS WARNING] Insecure HTTP origin in production: ${origin}`);
        console.warn('[CORS WARNING] Consider using HTTPS for security');
      }
    }
    
    console.log('[CORS] ✓ Production mode - Allowed origins configured:');
    origins.forEach(origin => console.log(`[CORS]   - ${origin}`));
  } else {
    console.log('[CORS] Development mode - Allowed origins:', origins.length > 0 ? origins : ['localhost (development default)']);
  }
}

/**
 * Create CORS middleware with secure configuration
 */
export function createCorsMiddleware(): cors.CorsOptions {
  const allowedOrigins = getAllowedOrigins();
  
  // Validate configuration in production
  validateProductionCors(allowedOrigins);
  
  // CORS options with origin validation
  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      // Always allow no-origin requests (direct navigation, health checks, etc.)
      // This includes: undefined, null, empty string, and the string "null"
      // This is safe because credentials are still validated separately
      if (!origin || origin === 'null') {
        return callback(null, true);
      }
      
      // Check if origin is in the allowed list
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // Log rejected origins for security monitoring
        console.warn(`[CORS] Rejected unauthorized origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true, // Allow cookies and authorization headers
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-CSRF-Token',
      'Accept',
      'Origin'
    ],
    exposedHeaders: [
      'X-Total-Count',
      'X-Page',
      'X-Per-Page',
      'X-CSRF-Token'
    ],
    maxAge: 86400, // Cache preflight response for 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 204
  };
  
  // In development, be more permissive if no origins are configured
  if (process.env.NODE_ENV === 'development' && allowedOrigins.length === 0) {
    console.warn('[CORS] Development mode - No origins configured, allowing localhost');
    corsOptions.origin = (origin, callback) => {
      // Allow localhost and no-origin requests in development
      if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    };
  }
  
  return corsOptions;
}

/**
 * Configure CORS for Express app with security checks
 */
export function configureCors(app: Express): void {
  try {
    const corsOptions = createCorsMiddleware();
    app.use(cors(corsOptions));
    console.log('[CORS] Secure CORS configuration applied successfully');
  } catch (error) {
    console.error('[CORS] Failed to configure CORS:', error);
    if (process.env.NODE_ENV === 'production') {
      // Exit in production if CORS cannot be configured securely
      process.exit(1);
    }
  }
}

/**
 * Health check to verify CORS is properly configured
 */
export function verifyCorsConfiguration(): { isValid: boolean; message: string; origins?: string[] } {
  try {
    const allowedOrigins = getAllowedOrigins();
    
    if (process.env.NODE_ENV === 'production') {
      if (allowedOrigins.length === 0) {
        return {
          isValid: false,
          message: 'No allowed origins configured for production'
        };
      }
      
      return {
        isValid: true,
        message: 'CORS properly configured for production',
        origins: allowedOrigins
      };
    }
    
    return {
      isValid: true,
      message: 'CORS configured for development',
      origins: allowedOrigins.length > 0 ? allowedOrigins : ['Development mode - localhost allowed']
    };
  } catch (error) {
    return {
      isValid: false,
      message: `CORS configuration error: ${error.message}`
    };
  }
}

// Export for testing
export { getAllowedOrigins, validateProductionCors };