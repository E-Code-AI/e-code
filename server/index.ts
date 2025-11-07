// Load environment variables FIRST - CRITICAL for NODE_ENV
import 'dotenv/config';

// Ensure NODE_ENV is set (default to development if not specified)
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
  console.log('[ENV] NODE_ENV not set, defaulting to development');
} else {
  console.log(`[ENV] NODE_ENV is set to: ${process.env.NODE_ENV}`);
}

// Set environment variables to prevent file watcher crashes (ENOSPC)
// MUST be set before any imports to prevent crashes
process.env.CHOKIDAR_USEPOLLING = 'true';
process.env.CHOKIDAR_INTERVAL = '250';
process.env.TSX_WATCH_IGNORE = 'node_modules/**,builds/**,temp/**,logs/**,dist/**,.git/**,coverage/**';
process.env.WATCHPACK_POLLING = 'true';

// Minimal working server entry point
// This file replaces the problematic server/index.ts
import express from "express";
import { createServer } from "http";
import { configureCors } from "./middleware/cors-config";
import { securityMiddleware } from "./middleware/security";
import { legacyRateLimiters, dynamicRateLimiter, logRateLimitViolations } from './middleware/rate-limiter';
import { monitoringMiddleware } from './services/monitoring.service';
import { sanitizeInput } from './middleware/input-validation';

console.log('[WORKING SERVER] Starting server initialization...');

const app = express();

// Secure CORS configuration - must be before other middleware
configureCors(app);

// Trust proxy for production deployment (Replit, load balancers, reverse proxies)
// This enables proper IP detection for rate limiting and security
app.set('trust proxy', true);
console.log('[SECURITY] Trust proxy enabled for production deployment');

// Security middleware (CSP, HSTS, etc.) - apply BEFORE other middleware
securityMiddleware().forEach(middleware => app.use(middleware));
console.log('[SECURITY] Security middleware applied (CSP, HSTS, security headers)');

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Production monitoring middleware - tracks API latency, errors, WebSocket connections
app.use(monitoringMiddleware);
console.log('[MONITORING] Production monitoring middleware enabled');

// XSS sanitization middleware - sanitizes all user input
app.use(sanitizeInput);
console.log('[SECURITY] XSS sanitization middleware enabled');

// Apply global rate limiting for DDoS protection
// This catches ALL requests before they hit specific routes
// Log all rate limit violations for security monitoring
app.use(logRateLimitViolations);

// Global API rate limiter - 100 req/min per IP
app.use('/api', legacyRateLimiters.api);

// Dynamic rate limiting based on endpoint sensitivity
app.use(dynamicRateLimiter);

console.log('[SECURITY] Multi-tier rate limiting enabled (Global: 100/min, Auth: 10/15min, AI: 10/min)');

// Cloud Run provides PORT environment variable, fallback to 5000 for development
const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;

// Create HTTP server (but don't listen yet - wait until after all middleware is registered)
const httpServer = createServer(app);
console.log(`[WORKING SERVER] HTTP server created, initializing middleware...`);

// Health check endpoint for deployment health checks
// Note: Root '/' is handled by Vite middleware (dev) or serveStatic (prod) to serve the React app
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// CORS configuration health check endpoint
app.get('/api/cors-health', async (_req, res) => {
  try {
    const { verifyCorsConfiguration } = await import('./middleware/cors-config');
    const corsStatus = verifyCorsConfiguration();
    
    if (corsStatus.isValid) {
      res.json({
        status: 'healthy',
        message: corsStatus.message,
        origins: corsStatus.origins,
        environment: process.env.NODE_ENV
      });
    } else {
      res.status(500).json({
        status: 'unhealthy',
        message: corsStatus.message,
        environment: process.env.NODE_ENV
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to verify CORS configuration',
      error: error.message,
      environment: process.env.NODE_ENV
    });
  }
});

// Now load the rest of the application asynchronously after server is listening
// This ensures the server starts even if there are issues with other modules
(async () => {
  console.log('[WORKING SERVER] Server is listening, loading application modules...');
  
  try {
    // Setup passport authentication BEFORE routes
    const { setupPassportAuth } = await import("./middleware/passport-setup");
    setupPassportAuth(app);
    console.log('[WORKING SERVER] Passport authentication configured');
  } catch (error) {
    console.error('[WORKING SERVER] Failed to setup passport:', error);
  }

  // SECURITY: Validate origin configuration BEFORE initializing ANY WebSocket servers
  // This ensures all WebSocket servers have proper origin validation configured
  try {
    const { validateOriginConfig } = await import("./utils/origin-validation");
    validateOriginConfig();
  } catch (error) {
    console.error('[SECURITY] Origin validation configuration error:', error.message);
    // Continue anyway in development, but log the error
    if (process.env.NODE_ENV === 'production') {
      throw error; // Fail hard in production
    }
  }

  try {
    // Setup Terminal WebSocket server for real-time terminal/console streaming
    const { setupTerminalWebsocket } = await import("./terminal");
    setupTerminalWebsocket(httpServer);
    console.log('[WORKING SERVER] Terminal WebSocket server configured at /api/terminal/ws');
  } catch (error) {
    console.error('[WORKING SERVER] Failed to setup terminal WebSocket:', error);
  }

  try {
    // Setup Collaboration WebSocket server for real-time collaborative editing
    const { CollaborationServer } = await import("./collaboration/collaboration-server");
    const collaborationServer = new CollaborationServer(httpServer);
    console.log('[WORKING SERVER] Collaboration WebSocket server configured at /collaboration');
    
    // Make collaboration server available globally
    (global as any).collaborationServer = collaborationServer;
  } catch (error) {
    console.error('[WORKING SERVER] Failed to setup Collaboration WebSocket:', error);
  }

  try {
    // Setup WebRTC Voice/Video service for peer-to-peer communication
    const { setupWebRTCServer } = await import("./webrtc/webrtc-server");
    const webrtcService = setupWebRTCServer(httpServer);
    console.log('[WORKING SERVER] WebRTC Voice/Video server configured at /webrtc');
    
    // Make WebRTC service available globally
    (global as any).webrtcService = webrtcService;
  } catch (error) {
    console.error('[WORKING SERVER] Failed to setup WebRTC server:', error);
  }

  try {
    // Import modular routes - MUST be registered AFTER passport
    const { MainRouter } = await import("./routes");
    const { getStorage, sessionStore } = await import("./storage");
    const storage = getStorage();
    
    // Setup LSP WebSocket server for real-time diagnostics
    try {
      const { setupLSPWebSocket } = await import("./services/LSPService");
      const lspService = setupLSPWebSocket(httpServer, storage);
      console.log('[WORKING SERVER] LSP WebSocket server configured at /api/lsp/ws');
      
      // Make LSP service available globally for routes
      (global as any).lspService = lspService;
    } catch (error) {
      console.error('[WORKING SERVER] Failed to setup LSP WebSocket:', error);
    }
    
    // Setup Build Logs WebSocket server for real-time log streaming
    try {
      const { setupBuildLogsWebSocket } = await import("./services/BuildLogsService");
      const buildLogsService = setupBuildLogsWebSocket(httpServer, storage);
      console.log('[WORKING SERVER] Build Logs WebSocket server configured at /api/build-logs/ws');
      
      // Make build logs service available globally for routes
      (global as any).buildLogsService = buildLogsService;
    } catch (error) {
      console.error('[WORKING SERVER] Failed to setup Build Logs WebSocket:', error);
    }
    
    // Setup Test Runs WebSocket server for real-time test result streaming
    try {
      const { setupTestRunsWebSocket } = await import("./services/TestRunsService");
      const testRunsService = setupTestRunsWebSocket(httpServer, storage);
      console.log('[WORKING SERVER] Test Runs WebSocket server configured at /api/test-runs/ws');
      
      // Make test runs service available globally for routes
      (global as any).testRunsService = testRunsService;
    } catch (error) {
      console.error('[WORKING SERVER] Failed to setup Test Runs WebSocket:', error);
    }
    
    // Setup Security Scanner WebSocket server for real-time scan updates
    try {
      const { setupSecurityScannerWebSocket } = await import("./services/SecurityScannerService");
      const securityScannerService = setupSecurityScannerWebSocket(httpServer, storage);
      console.log('[WORKING SERVER] Security Scanner WebSocket server configured at /api/security-scans/ws');
      
      // Make security scanner service available globally for routes
      (global as any).securityScannerService = securityScannerService;
    } catch (error) {
      console.error('[WORKING SERVER] Failed to setup Security Scanner WebSocket:', error);
    }
    
    // Setup Resources WebSocket server for real-time resource metrics streaming
    try {
      const { setupResourcesWebSocket } = await import("./services/ResourcesService");
      const resourcesService = setupResourcesWebSocket(httpServer, storage);
      console.log('[WORKING SERVER] Resources WebSocket server configured at /api/resources/ws');
      
      // Make resources service available globally for routes
      (global as any).resourcesService = resourcesService;
    } catch (error) {
      console.error('[WORKING SERVER] Failed to setup Resources WebSocket:', error);
    }
    
    // Make session store available globally for WebSocket authentication
    (global as any).sessionStore = sessionStore;
    
    const mainRouter = new MainRouter(storage);
    mainRouter.registerRoutes(app);
    console.log('[WORKING SERVER] Modular routes registered successfully');
    
    // Register production monitoring routes
    try {
      const monitoringRouter = (await import('./routes/monitoring.router')).default;
      app.use(monitoringRouter);
      console.log('[WORKING SERVER] Production monitoring routes registered (/api/monitoring/*)');
    } catch (error) {
      console.error('[WORKING SERVER] Failed to register monitoring routes:', error);
    }
  } catch (error) {
    console.error('[WORKING SERVER] Failed to register routes:', error);
    // Server continues running even if routes fail to load
  }

  // Add logging middleware to debug routing issues
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api')) {
      console.log(`[ROUTE DEBUG] ${req.method} ${req.path} - Headers: ${JSON.stringify(req.headers.host)}`);
    }
    next();
  });

  // Setup Vite with graceful fallback handling
  // Uses safe loader that isolates Vite failures and provides fallback HTML server
  try {
    const { safeSetupVite, setupFallbackServer } = await import("./vite-loader");
    const viteSuccess = await safeSetupVite(app, httpServer);
    
    if (!viteSuccess) {
      // Vite failed - setup fallback HTML server
      await setupFallbackServer(app);
    }
  } catch (error: any) {
    // If even the loader fails, setup basic fallback
    console.error('[WORKING SERVER] Critical: Vite loader failed:', error.message);
    
    // Fallback: serve a simple response for client routes
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.status(200).send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>E-Code Platform</title>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body>
              <div id="root">
                <h1>Loading E-Code Platform...</h1>
                <p>If this message persists, please refresh the page.</p>
              </div>
              <script>
                // Try to reload if Vite server is available
                setTimeout(() => {
                  if (window.location.pathname === '/login') {
                    window.location.href = '/';
                  }
                }, 2000);
              </script>
            </body>
          </html>
        `);
      } else {
        res.status(404).json({ error: 'API endpoint not found' });
      }
    });
  }

  try {
    // Initialize database
    const { initializeDatabase } = await import("./db-init");
    await initializeDatabase();
    console.log('[WORKING SERVER] Database initialized');
  } catch (error) {
    console.warn('[WORKING SERVER] Database initialization failed (non-critical):', error.message);
  }

  // NOW start listening - ONLY after all middleware and routes are registered
  // This prevents the race condition where requests arrive before Vite middleware is ready
  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`[WORKING SERVER] Server listening on port ${port}`);
    console.log(`[WORKING SERVER] express serving on port ${port}`);
    console.log('[WORKING SERVER] All middleware registered - ready to accept connections!');
  });

  console.log('[WORKING SERVER] Application fully loaded and ready!');
})();