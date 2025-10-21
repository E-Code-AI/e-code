// @ts-nocheck
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeDatabase } from "./db-init";
import cors from "cors";
import compressionMiddleware from "./middleware/compression";
import { securityMiddleware, sanitizeInput, securityMonitoring, ipSecurity } from "./middleware/security";
import { rateLimiters, logRateLimitViolations, dynamicRateLimiter } from "./middleware/rate-limiter";
import { cdnOptimization } from "./services/cdn-optimization";
import { dbPool } from "./services/database-pool";
// Initialize environment configuration with defaults
import { config } from "./config/environment";
import * as Sentry from "@sentry/node";
import { logAggregator } from "./monitoring/log-aggregator";
import { uptimeMonitor } from "./services/uptime-monitor";
import { databaseQueryOptimizer } from "./services/database-query-optimizer";
// Monitoring imports are handled in routes.ts

const app = express();

if (config.monitoring.sentryDsn) {
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

const handleShutdown = async () => {
  try {
    await poolManager.shutdown();
  } catch (error) {
    console.error('Failed to shut down database pool cleanly', error);
  } finally {
    process.exit(0);
  }
};

process.on('SIGTERM', handleShutdown);
process.on('SIGINT', handleShutdown);

// Production Security Middleware - Apply first
app.use(...securityMiddleware());
app.use(securityMonitoring);
app.use(ipSecurity.middleware);

// Rate limiting - Apply early
app.use(logRateLimitViolations);
app.use('/api/auth', rateLimiters.auth);
app.use('/api', rateLimiters.api);
app.use('/api', dynamicRateLimiter);
app.use('/static', rateLimiters.static);

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

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
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
  });

  next();
});

// Start the server immediately to open port 5000 ASAP for deployment
(async () => {
  // Register routes first
  const server = await registerRoutes(app);

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
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Cloud Run provides PORT environment variable, fallback to 5000 for development
  // This serves both the API and the client - the only port that is not firewalled
  const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
  
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });

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
})();