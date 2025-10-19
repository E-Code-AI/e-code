// @ts-nocheck
/**
 * Environment Configuration with Sensible Defaults
 * Ensures the app can deploy without manual environment configuration
 */

// Set default environment variables if not provided
function setDefaults() {
  // Core environment defaults
  process.env.NODE_ENV = process.env.NODE_ENV || 'production';
  
  // Database URL - Use Replit's provided DATABASE_URL or fail gracefully
  if (!process.env.DATABASE_URL) {
    console.warn('DATABASE_URL not set, database features will be disabled');
    // Set a dummy URL to prevent crashes, but operations will fail gracefully
    process.env.DATABASE_URL = 'postgresql://localhost/dummy';
  }
  
  // CORS defaults for Replit deployment
  if (!process.env.CORS_ALLOWED_ORIGINS && !process.env.FRONTEND_URL) {
    // Allow Replit domains by default
    const replitDomains = [];
    
    if (process.env.REPL_ID) {
      // We're on Replit, allow common patterns
      if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
        replitDomains.push(
          `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`,
          `https://${process.env.REPL_SLUG}-${process.env.REPL_OWNER}.repl.co`,
          `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.replit.dev`
        );
      }
      
      // Add any detected Replit domains
      if (process.env.REPLIT_DEV_DOMAIN) {
        replitDomains.push(`https://${process.env.REPLIT_DEV_DOMAIN}`);
      }
    }
    
    // Set FRONTEND_URL to allow same-origin by default
    process.env.FRONTEND_URL = replitDomains.join(',') || '*';
  }
  
  // Session secret for Express sessions
  if (!process.env.SESSION_SECRET) {
    process.env.SESSION_SECRET = process.env.REPL_ID 
      ? `replit-session-${process.env.REPL_ID}` 
      : 'default-dev-session-secret-change-in-production';
    console.warn('Using default SESSION_SECRET, please set a secure value in production');
  }
  
  // JWT secret for authentication
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = process.env.SESSION_SECRET || 'default-jwt-secret-change-me';
    console.warn('Using default JWT_SECRET, please set a secure value in production');
  }
  
  // Stripe defaults (disabled if not configured)
  if (!process.env.STRIPE_SECRET_KEY) {
    console.info('Stripe not configured, payment features disabled');
    process.env.STRIPE_DISABLED = 'true';
  }
  
  // AI Service defaults (disabled if not configured)
  if (!process.env.OPENAI_API_KEY) {
    console.info('OpenAI API key not set, OpenAI features disabled');
  }
  
  if (!process.env.ANTHROPIC_API_KEY) {
    console.info('Anthropic API key not set, Claude features disabled');
  }
  
  // Port configuration
  process.env.PORT = process.env.PORT || '5000';
  
  // Redis configuration (use in-memory if not available)
  if (!process.env.REDIS_URL) {
    console.info('Redis not configured, using in-memory session storage');
    process.env.USE_MEMORY_STORE = 'true';
  }
  
  // Development auth bypass (disabled by default)
  if (process.env.NODE_ENV === 'development' && !process.env.ENABLE_DEV_AUTH_BYPASS) {
    process.env.ENABLE_DEV_AUTH_BYPASS = 'false';
  }
  
  // Email configuration
  if (!process.env.SMTP_HOST && !process.env.SENDGRID_API_KEY) {
    console.info('Email service not configured, email features disabled');
    process.env.EMAIL_DISABLED = 'true';
  }
  
  // Google OAuth (optional)
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.info('Google OAuth not configured, Google login disabled');
  }
  
  // GitHub OAuth (optional)
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    console.info('GitHub OAuth not configured, GitHub login disabled');
  }
}

// Initialize environment defaults
export function initializeEnvironment() {
  try {
    setDefaults();
    console.log('Environment configuration initialized with defaults');
  } catch (error) {
    console.error('Failed to initialize environment:', error);
    // Don't crash, let the app continue with whatever env vars are available
  }
}

// Export configuration object for easy access
export const config = {
  get isDevelopment() {
    return process.env.NODE_ENV === 'development';
  },
  get isProduction() {
    return process.env.NODE_ENV === 'production';
  },
  get port() {
    return parseInt(process.env.PORT || '5000');
  },
  get databaseUrl() {
    return process.env.DATABASE_URL;
  },
  get corsOrigins() {
    return process.env.CORS_ALLOWED_ORIGINS || process.env.FRONTEND_URL || '*';
  },
  get sessionSecret() {
    return process.env.SESSION_SECRET || 'default-session-secret';
  },
  get jwtSecret() {
    return process.env.JWT_SECRET || process.env.SESSION_SECRET || 'default-jwt-secret';
  },
  get stripeEnabled() {
    return !process.env.STRIPE_DISABLED && !!process.env.STRIPE_SECRET_KEY;
  },
  get emailEnabled() {
    return !process.env.EMAIL_DISABLED && (!!process.env.SMTP_HOST || !!process.env.SENDGRID_API_KEY);
  },
  get redisUrl() {
    return process.env.REDIS_URL;
  },
  get useMemoryStore() {
    return process.env.USE_MEMORY_STORE === 'true';
  },
  get isReplit() {
    return !!process.env.REPL_ID;
  }
};

// Initialize on import
initializeEnvironment();