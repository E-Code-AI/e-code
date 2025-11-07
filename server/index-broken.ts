// All imports must be at the top without any code between them for ES modules
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeDatabase } from "./db-init";
import cors from "cors";
import compressionMiddleware from "./middleware/compression";
import cookieParser from "cookie-parser";
import { securityMiddleware, sanitizeInput, securityMonitoring, ipSecurity, csrfProtection } from "./middleware/security";
import { rateLimiters, legacyRateLimiters, logRateLimitViolations, dynamicRateLimiter, createRateLimitMiddleware } from "./middleware/rate-limiter";
import { helmetConfig, additionalSecurityHeaders, applySecurityHeaders } from "./middleware/helmet-config";
import { sessionManager } from "./auth/session-manager";
import { auditLogger } from "./services/audit-logger";
import { apiKeyManager } from "./auth/api-key-manager";
import { secretManager } from "./utils/secrets";
import { validators } from "./utils/validators";
import { cdnOptimization } from "./services/cdn-optimization";
import { dbPool } from "./services/database-pool";
import { config } from "./config/environment";
import * as Sentry from "@sentry/node";
import { logAggregator } from "./monitoring/log-aggregator";
import { uptimeMonitor } from "./services/uptime-monitor";
import { databaseQueryOptimizer } from "./services/database-query-optimizer";

// Now all executable code after all imports
console.log('[Server Module] Starting server initialization...');
const app = express();
console.log('[Server Module] Express app created successfully');

// Memory optimization: Only initialize Sentry in production
const isProduction = process.env.NODE_ENV === 'production';
const disableMonitoring = process.env.DISABLE_MONITORING === '1';
const disablePolyglot = process.env.DISABLE_POLYGLOT === '1';
const disablePreview = process.env.DISABLE_PREVIEW === '1';

if (config.monitoring.sentryDsn && isProduction && !disableMonitoring) {
  Sentry.init({
    dsn: config.monitoring.sentryDsn,
    environment: config.environment,
    release: config.release,
    tracesSampleRate: config.monitoring.sentrySampleRate,
  });

  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

const poolManager = dbPool;
app.locals.dbPoolManager = poolManager;
app.locals.monitoring = { uptimeMonitor, logAggregator, databaseQueryOptimizer };
app.locals.assetBaseUrl = config.cdn.assetBaseUrl;

if (config.monitoring.sentryDsn) {
  databaseQueryOptimizer.on('slow-query', (record) => {
    Sentry.captureMessage(`Slow query exceeded threshold (${record.duration}ms)`, {
      level: 'warning',
      extra: record,
    });
  });

  uptimeMonitor.on('incident', (incident) => {
    Sentry.captureMessage('Runtime incident detected', {
      level: 'error',
      extra: incident,
    });
  });
}

// Graceful shutdown handling
let appServer: any = null;

const gracefulShutdown = async (signal: string) => {
  console.log(`[${new Date().toISOString()}] Received ${signal}, starting graceful shutdown...`);
  
  try {
    // Stop accepting new requests
    if (appServer) {
      await new Promise((resolve) => {
        appServer.close(resolve);
      });
      console.log('[Graceful Shutdown] Server closed to new connections');
    }
    
    // Close database connections
    if (poolManager) {
      await poolManager.shutdown();
      console.log('[Graceful Shutdown] Database pool closed');
    }
    
    // Flush Sentry if configured
    if (config.monitoring.sentryDsn && isProduction) {
      await Sentry.flush(2000);
      console.log('[Graceful Shutdown] Sentry events flushed');
    }
    
    // Wait for ongoing requests to complete (max 10 seconds)
    await new Promise(resolve => setTimeout(resolve, Math.min(10000, parseInt(process.env.SHUTDOWN_TIMEOUT || '10000'))));
    
    console.log('[Graceful Shutdown] Shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('[Graceful Shutdown] Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('[Fatal] Uncaught Exception:', error);
  if (config.monitoring.sentryDsn) {
    Sentry.captureException(error);
  }
  gracefulShutdown('uncaughtException');
});

// Handle unhandled rejections  
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Fatal] Unhandled Rejection at:', promise, 'reason:', reason);
  if (config.monitoring.sentryDsn) {
    Sentry.captureException(new Error(`Unhandled Rejection: ${reason}`));
  }
});

// Cookie parser for CSRF support
console.log('[Server Init] Setting up cookie parser...');
app.use(cookieParser());

// Production Security Middleware - Apply first
console.log('[Server Init] Setting up security middleware...');
try {
  const middlewares = securityMiddleware();
  console.log('[Server Init] Got security middlewares:', middlewares.length);
  app.use(...middlewares);
} catch (error) {
  console.error('[Server Init] Failed to setup security middleware:', error);
  process.exit(1);
}
console.log('[Server Init] Setting up security monitoring...');
app.use(securityMonitoring);
app.use(ipSecurity.middleware);
app.use(csrfProtection);
console.log('[Server Init] Security middleware applied successfully');

// Apply enhanced security headers
if (process.env.NODE_ENV === 'production') {
  app.use(helmetConfig);
  app.use(additionalSecurityHeaders);
} else {
  app.use(...applySecurityHeaders());
}

// Audit logger IP blocking middleware - disabled to prevent startup issues
// app.use(auditLogger.blockMiddleware());

// Rate limiting - Apply early
app.use(logRateLimitViolations);

// Use legacy rate limiting (Redis not available in development)
app.use('/api/auth', legacyRateLimiters.auth);
app.use('/api', legacyRateLimiters.api);
app.use('/api', dynamicRateLimiter);
app.use('/static', legacyRateLimiters.static);

// CDN Optimization
app.use(cdnOptimization.staticAssetsMiddleware());
app.use(cdnOptimization.dynamicContentMiddleware());

if (config.cdn.enabled && config.cdn.assetBaseUrl) {
  app.use((_req, res, next) => {
    res.setHeader('X-Asset-CDN', config.cdn.assetBaseUrl);
    next();
  });
}

// Automatic CORS configuration for Replit deployment
const configuredOrigins = (process.env.CORS_ALLOWED_ORIGINS || process.env.FRONTEND_URL || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

// Add Replit domain if available
if (process.env.REPL_ID || process.env.REPLIT_DOMAINS) {
  // Parse Replit domains
  const replitDomains = process.env.REPLIT_DOMAINS?.split(',') || [];
  replitDomains.forEach(domain => {
    if (domain) {
      configuredOrigins.push(`https://${domain.trim()}`);
      configuredOrigins.push(`http://${domain.trim()}`);
    }
  });
  
  // Add common Replit preview patterns
  if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    const slug = process.env.REPL_SLUG;
    const owner = process.env.REPL_OWNER;
    configuredOrigins.push(`https://${slug}.${owner}.repl.co`);
    configuredOrigins.push(`https://${slug}-${owner}.repl.co`);
  }
}

// Add localhost for development
if (process.env.NODE_ENV === 'development' || configuredOrigins.length === 0) {
  configuredOrigins.push('http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5000', 'http://127.0.0.1:5000');
}

// Ensure we always have some allowed origins for production
if (process.env.NODE_ENV === 'production' && configuredOrigins.length === 0) {
  // Use a default that allows the same origin
  configuredOrigins.push('*'); // Will be handled specially in CORS options
}

const allowedOrigins = new Set(configuredOrigins);

// Don't throw in production, just warn
if (allowedOrigins.size === 0 || (allowedOrigins.size === 1 && allowedOrigins.has('*'))) {
  console.warn('CORS: Using permissive configuration for deployment. Configure CORS_ALLOWED_ORIGINS for production security.');
} else {
  console.log('CORS: Configured origins', Array.from(allowedOrigins));
}

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // If no origin (same-origin requests), allow
    if (!origin) {
      return callback(null, true);
    }

    // If wildcard is in allowed origins (permissive mode for deployment)
    if (allowedOrigins.has('*')) {
      return callback(null, true);
    }

    // Allow all Replit preview domains
    if (origin.includes('.replit.dev') || origin.includes('.repl.co') || origin.includes('.replit.app')) {
      return callback(null, true);
    }

    // Check explicit allowed origins
    if (allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    // In production, be more permissive if no explicit origins configured
    if (process.env.NODE_ENV === 'production' && allowedOrigins.size <= 3) {
      console.warn(`CORS: Allowing origin ${origin} in production mode`);
      return callback(null, true);
    }

    const error = new Error(`CORS origin ${origin} is not permitted`);
    return callback(error, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// Enable compression for better performance
app.use(compressionMiddleware);

// Input sanitization
app.use(sanitizeInput);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Security event logging
app.use(async (req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", async () => {
    const duration = Date.now() - start;
    
    // Log to console for development
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
    
    // Log security events
    if (path.startsWith('/api/') && !path.includes('/health')) {
      try {
        await auditLogger.logSecurityEvent({
          ip: req.ip || 'unknown',
          action: `${req.method} ${path}`,
          result: res.statusCode < 400 ? 'success' : 'failure',
          userId: req.user?.id,
          metadata: {
            statusCode: res.statusCode,
            duration,
            userAgent: req.headers['user-agent'],
            sessionId: req.sessionID,
            referer: req.headers.referer,
            origin: req.headers.origin
          },
        });
      } catch (error) {
        // Don't break the app if logging fails
        console.error('Failed to log security event:', error);
      }
    }
  });

  next();
});

// Start the server immediately to open port 5000 ASAP for deployment
console.log('[Server Startup] Starting server initialization...');

// Cloud Run provides PORT environment variable, fallback to 5000 for development
// This serves both the API and the client - the only port that is not firewalled
const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;

// Create HTTP server and start listening immediately
const httpServer = require('http').createServer(app);
console.log(`[Server Startup] Attempting to bind to port ${port}...`);
httpServer.listen(port, "0.0.0.0", () => {
  console.log(`express serving on port ${port}`);
  log(`express serving on port ${port}`);
  console.log(`[Server Startup] Successfully bound to port ${port}`);
});

// Now initialize everything else asynchronously after the server is listening
(async () => {
  try {
    console.log('[Server Startup] Server is listening, now initializing routes and middleware...');
    
    // Register routes 
    console.log('[Server Startup] Registering routes...');
    try {
      await registerRoutes(app);
      console.log('[Server Startup] Routes registered successfully');
    } catch (error) {
      console.error('[Server Startup] Failed to register routes:', error);
      // Don't exit - server is already listening
    }

    if (config.monitoring.sentryDsn) {
      app.use(Sentry.Handlers.errorHandler());
    }

    // Error handling middleware
    app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      if (status >= 500) {
        uptimeMonitor.recordIncident('server_error', message, {
          status,
          path: req.path,
          method: req.method,
        });
      }

      res.status(status).json({ message });
    });

    // Setup Vite or static serving
    console.log('[Server Startup] Setting up Vite/static serving...');
    if (app.get("env") === "development") {
      await setupVite(app, httpServer);
    } else {
      serveStatic(app);
    }
    console.log('[Server Startup] Vite/static serving configured');

  // Initialize services asynchronously after the server is running and port is open
  // This prevents blocking the port opening which was causing deployment failures
  (async () => {
    try {
      // Initialize the database with timeout to prevent blocking
      const dbInitPromise = initializeDatabase();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database initialization timeout')), 10000)
      );
      
      try {
        await Promise.race([dbInitPromise, timeoutPromise]);
        console.log("Database setup complete");
      } catch (dbError) {
        console.warn("Database initialization delayed or failed, continuing server startup:", dbError.message);
        // Continue running - database will retry connection in background
      }
      
      // Seed database with test user in development
      if (process.env.NODE_ENV === 'development') {
        console.log("Seeding database with test user...");
        const { seedDatabase } = await import("./db-seed");
        await seedDatabase();
      }
      
      // Start optional services in background without blocking port opening
      // Removed Nix package manager initialization that was causing ENOENT errors
      
      // Initialize Polyglot Services - Replit's multi-language backend architecture
      // Only run mock services in development to save memory
      if (process.env.NODE_ENV === 'development') {
        setTimeout(async () => {
          try {
            const { initializePolyglotServices, setupPolyglotProxyRoutes } = await import("./polyglot-services");
            // Start the actual services on their internal ports
            initializePolyglotServices();
            // Setup proxy routes so they can be accessed through main port
            setupPolyglotProxyRoutes(app);
          } catch (polyglotError) {
            console.warn("Warning: Polyglot services failed to start:", polyglotError);
          }
        }, 500); // Start polyglot services quickly
      }
      
      // Setup preview routes on main server (instead of separate server)
      setTimeout(async () => {
        try {
          const { setupPreviewRoutes } = await import("./preview/preview-service");
          setupPreviewRoutes(app);
          console.log("Preview routes registered on main server");
        } catch (previewError) {
          console.warn("Warning: Preview routes failed to register:", previewError);
        }
      }, 1000); // 1 second delay to ensure main server is fully ready
      
    } catch (error) {
      console.error("Failed to initialize background services:", error);
    }
  })();
  } catch (mainError) {
    console.error('[Server Startup] Fatal error in main async function:', mainError);
    process.exit(1);
  }
})();