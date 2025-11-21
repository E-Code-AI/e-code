// Load environment variables FIRST - CRITICAL for NODE_ENV
import 'dotenv/config';

// Ensure NODE_ENV is set (default to development if not specified)
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
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
import { tierRateLimiters } from './middleware/tier-rate-limiter';
import { monitoringMiddleware } from './services/monitoring.service';
import { sanitizeInput } from './middleware/input-validation';

const app = express();

// Secure CORS configuration - must be before other middleware
configureCors(app);

// Trust proxy for production deployment (Replit, load balancers, reverse proxies)
// This enables proper IP detection for rate limiting and security
app.set('trust proxy', true);

// Security middleware (CSP, HSTS, etc.) - apply BEFORE other middleware
securityMiddleware().forEach(middleware => app.use(middleware));

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Production monitoring middleware - tracks API latency, errors, WebSocket connections
app.use(monitoringMiddleware);

// XSS sanitization middleware - sanitizes all user input
app.use(sanitizeInput);

// Apply global rate limiting for DDoS protection
// Log all rate limit violations for security monitoring
app.use(logRateLimitViolations);

// Fortune 500 Tier-Based Rate Limiter - Intelligent limits per user subscription
// Free: 100/min, Pro: 1000/min, Enterprise: 10000/min (10x multiplier in dev)
app.use('/api', tierRateLimiters.api);

// Legacy dynamic rate limiting (kept for backward compatibility)
app.use(dynamicRateLimiter);

// Cloud Run provides PORT environment variable, fallback to 5000 for development
const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;

// Create HTTP server (but don't listen yet - wait until after all middleware is registered)
const httpServer = createServer(app);

// Increase max listeners to prevent warnings (we have multiple WebSocket services + Vite HMR)
// Agent WS, Terminal WS, LSP WS, Collaboration WS, WebRTC, Vite HMR, etc.
httpServer.setMaxListeners(20);

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
  try {
    // Setup passport authentication BEFORE routes
    const { setupPassportAuth } = await import("./middleware/passport-setup");
    setupPassportAuth(app);
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
    // NOTE: Docker-based terminal (server/terminal/real-terminal.ts) exists but NOT usable on Replit Cloud Run
    // Replit Cloud Run does not expose Docker daemon, so containers cannot be created
    // Using local bash terminal for Replit deployment
    const { setupTerminalWebsocket } = await import("./terminal");
    setupTerminalWebsocket(httpServer);
    console.log('[Terminal] Using local bash terminal (Replit Cloud Run compatible)');
  } catch (error) {
    console.error('[WORKING SERVER] Failed to setup terminal WebSocket:', error);
  }

  try {
    // Setup Collaboration WebSocket server for real-time collaborative editing
    const { CollaborationServer } = await import("./collaboration/collaboration-server");
    const collaborationServer = new CollaborationServer(httpServer);
    
    // Make collaboration server available globally
    (global as any).collaborationServer = collaborationServer;
  } catch (error) {
    console.error('[WORKING SERVER] Failed to setup Collaboration WebSocket:', error);
  }

  try {
    // Setup WebRTC Voice/Video service for peer-to-peer communication
    const { setupWebRTCServer } = await import("./webrtc/webrtc-server");
    const webrtcService = setupWebRTCServer(httpServer);
    
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
      
      // Make LSP service available globally for routes
      (global as any).lspService = lspService;
    } catch (error) {
      console.error('[WORKING SERVER] Failed to setup LSP WebSocket:', error);
    }
    
    // Setup Build Logs WebSocket server for real-time log streaming
    try {
      const { setupBuildLogsWebSocket } = await import("./services/BuildLogsService");
      const buildLogsService = setupBuildLogsWebSocket(httpServer, storage);
      
      // Make build logs service available globally for routes
      (global as any).buildLogsService = buildLogsService;
    } catch (error) {
      console.error('[WORKING SERVER] Failed to setup Build Logs WebSocket:', error);
    }
    
    // Setup Test Runs WebSocket server for real-time test result streaming
    try {
      const { setupTestRunsWebSocket } = await import("./services/TestRunsService");
      const testRunsService = setupTestRunsWebSocket(httpServer, storage);
      
      // Make test runs service available globally for routes
      (global as any).testRunsService = testRunsService;
    } catch (error) {
      console.error('[WORKING SERVER] Failed to setup Test Runs WebSocket:', error);
    }
    
    // Setup Security Scanner WebSocket server for real-time scan updates
    try {
      const { setupSecurityScannerWebSocket } = await import("./services/SecurityScannerService");
      const securityScannerService = setupSecurityScannerWebSocket(httpServer, storage);
      
      // Make security scanner service available globally for routes
      (global as any).securityScannerService = securityScannerService;
    } catch (error) {
      console.error('[WORKING SERVER] Failed to setup Security Scanner WebSocket:', error);
    }
    
    // Setup Resources WebSocket server for real-time resource metrics streaming
    try {
      const { setupResourcesWebSocket } = await import("./services/ResourcesService");
      const resourcesService = setupResourcesWebSocket(httpServer, storage);
      
      // Make resources service available globally for routes
      (global as any).resourcesService = resourcesService;
    } catch (error) {
      console.error('[WORKING SERVER] Failed to setup Resources WebSocket:', error);
    }
    
    // Setup Agent WebSocket server for autonomous workspace creation progress
    // ✅ CRITICAL: This MUST be initialized BEFORE Vite to ensure proper WebSocket routing
    try {
      const { agentWebSocketService } = await import("./services/agent-websocket-service");
      agentWebSocketService.initialize(httpServer);
      
      // Make agent websocket service available globally for routes
      (global as any).agentWebSocketService = agentWebSocketService;
      console.log('[Agent WebSocket] Service initialized at /ws/agent');
    } catch (error) {
      console.error('[WORKING SERVER] Failed to setup Agent WebSocket:', error);
    }
    
    // Make session store available globally for WebSocket authentication
    (global as any).sessionStore = sessionStore;
    
    // Register K8s health check endpoints (Fortune 500 standard)
    try {
      const { healthCheckRoutes } = await import('./health/health-checks');
      app.get('/health/liveness', healthCheckRoutes.liveness);
      app.get('/health/readiness', healthCheckRoutes.readiness);
      app.get('/health/deep', healthCheckRoutes.deep);
      app.get('/health/startup', healthCheckRoutes.startup);
      console.log('[Fortune 500 Health] K8s endpoints registered: /health/{liveness,readiness,deep,startup}');
    } catch (error) {
      console.error('[WORKING SERVER] Failed to register K8s health endpoints:', error);
    }

    // Register Swagger API documentation (optional, controlled by SWAGGER_ENABLED flag)
    try {
      const enableSwagger = process.env.SWAGGER_ENABLED !== 'false'; // Enabled by default
      if (enableSwagger) {
        const { setupSwaggerDocs } = await import('./docs/swagger');
        setupSwaggerDocs(app);
        console.log('[Fortune 500 Swagger] 📚 API Documentation available at /api/docs');
      } else {
        console.log('[Fortune 500 Swagger] API Documentation disabled (SWAGGER_ENABLED=false)');
      }
    } catch (error) {
      console.error('[WORKING SERVER] Failed to register Swagger docs:', error);
    }

    const mainRouter = new MainRouter(storage);
    mainRouter.registerRoutes(app);
    
    // Register production monitoring routes
    try {
      const monitoringRouter = (await import('./routes/monitoring.router')).default;
      app.use(monitoringRouter);
    } catch (error) {
      console.error('[WORKING SERVER] Failed to register monitoring routes:', error);
    }

    // Register AI Optimization routes
    try {
      const aiOptimizationRouter = (await import('./routes/ai-optimization.router')).default;
      app.use('/api/ai-optimization', aiOptimizationRouter);
      console.log('[AI Optimization] Routes registered at /api/ai-optimization');
      
      const slackConfigRouter = (await import('./routes/slack-config.router')).default;
      app.use('/api/slack-config', slackConfigRouter);
      console.log('[Slack Config] Routes registered at /api/slack-config');
    } catch (error) {
      console.error('[WORKING SERVER] Failed to register AI optimization routes:', error);
    }

    // ✅ 40-YEAR ENGINEERING FIX: Register Agent Autonomous routes
    try {
      const agentAutonomousRouter = (await import('./routes/agent-autonomous.router')).default;
      app.use('/api/agent/autonomous', agentAutonomousRouter);
      console.log('[Agent Autonomous] Routes registered at /api/agent/autonomous');
    } catch (error) {
      console.error('[WORKING SERVER] Failed to register agent autonomous routes:', error);
    }
  } catch (error) {
    console.error('[WORKING SERVER] Failed to register routes:', error);
    // Server continues running even if routes fail to load
  }

  // Error handler for PayloadTooLargeError (must come AFTER routes)
  app.use((err: any, req: any, res: any, next: any) => {
    if (err.type === 'entity.too.large' || err.status === 413) {
      return res.status(413).json({
        error: 'File too large',
        message: 'File size limit exceeded (10MB maximum)',
        code: 'FILE_TOO_LARGE'
      });
    }
    next(err);
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
  } catch (error) {
    console.warn('[WORKING SERVER] Database initialization failed (non-critical):', error.message);
  }

  // Seed database with test user for E2E testing
  try {
    const { seedDatabase } = await import("./db-seed");
    await seedDatabase();
    console.log('✅ Test user seeded (testuser@test.com / testpass123)');
  } catch (error) {
    console.warn('[WORKING SERVER] Database seeding failed (non-critical):', error.message);
  }

  // ✅ Initialize Stripe Usage Worker (background queue processor)
  try {
    const { startStripeUsageWorker } = await import('./workflows/stripe-usage-worker');
    startStripeUsageWorker();
    console.log('✅ Stripe Usage Worker started - processing billing queue every 30s');
  } catch (error) {
    console.warn('[WORKING SERVER] Stripe worker initialization failed (non-critical):', error.message);
  }

  // ✅ PRODUCTION-READY FIX (Nov 20, 2025): kUpgradeHandled pattern for safe WebSocket management
  // Prevents orphan socket leaks while maintaining compatibility with all WebSocket services
  // 
  // Architecture:
  // 1. Agent upgrade handler uses prependListener to run first
  // 2. Mark socket as handled IMMEDIATELY before handleUpgrade (critical timing)
  // 3. Final catch-all guard destroys untagged sockets after deferred check
  
  const { installFinalUpgradeGuard, markSocketAsHandled } = await import('./websocket/upgrade-guard');
  
  // Agent WebSocket manual upgrade handler (runs FIRST due to prependListener)
  // 🔥 ARCHITECT FIX v3 (Nov 21, 2025): Real session validation with database lookup
  // Root Cause: ws library times out handshake if socket paused without resume
  // Security: Validates session exists, is active, and project ID matches before upgrade
  // Performance: Socket paused during DB query to prevent GC/timeout
  async function handleAgentUpgrade(request: any, socket: any, head: any) {
    // ✅ CRITICAL: Pause socket IMMEDIATELY to prevent GC during async validation
    socket.pause();
    
    const startTime = Date.now();
    const agentWss = (global as any).agentWebSocketService?.wss;
    
    if (!agentWss) {
      console.error('[WebSocket Upgrade] Agent WebSocket service not initialized');
      socket.resume(); // Resume before error response
      sendHttpError(socket, 503, 'Service Unavailable');
      return;
    }
    
    try {
      // Parse query params for validation
      const url = new URL(request.url!, `http://${request.headers.host || 'localhost'}`);
      const projectIdStr = url.searchParams.get('projectId');
      const sessionId = url.searchParams.get('sessionId');
      
      if (!projectIdStr || !sessionId) {
        console.warn('[WebSocket Upgrade] Rejecting - missing projectId or sessionId');
        socket.resume(); // Resume before error response
        sendHttpError(socket, 400, 'Bad Request: Missing projectId or sessionId');
        return;
      }
      
      // ✅ SECURITY: Validate session exists and is active
      const { db } = await import('./db');
      const { agentSessions } = await import('../shared/schema');
      const { eq, and } = await import('drizzle-orm');
      
      const [session] = await db.select()
        .from(agentSessions)
        .where(and(
          eq(agentSessions.id, sessionId),
          eq(agentSessions.isActive, true)
        ));
      
      if (!session) {
        const validationDuration = Date.now() - startTime;
        console.warn(`[WebSocket Upgrade] Rejecting - invalid or inactive session ${sessionId} (${validationDuration}ms)`);
        socket.resume(); // Resume before error response
        sendHttpError(socket, 401, 'Unauthorized: Invalid or inactive session');
        return;
      }
      
      // ✅ SECURITY: Validate project ID matches session's project
      const projectId = parseInt(projectIdStr, 10);
      const sessionProjectId = typeof session.projectId === 'number' ? session.projectId : parseInt(String(session.projectId), 10);
      
      if (sessionProjectId !== projectId) {
        const validationDuration = Date.now() - startTime;
        console.warn(`[WebSocket Upgrade] Rejecting - project ID mismatch for session ${sessionId} (expected ${sessionProjectId}, got ${projectId}) (${validationDuration}ms)`);
        socket.resume(); // Resume before error response
        sendHttpError(socket, 403, 'Forbidden: Project ID mismatch');
        return;
      }
      
      const validationDuration = Date.now() - startTime;
      console.log(`[WebSocket Upgrade] ✅ Validated session ${sessionId} for project ${projectId} (${validationDuration}ms)`);
      
      // ✅ CRITICAL: Mark socket BEFORE handleUpgrade to prevent guard from destroying it
      markSocketAsHandled(request, socket);
      
      // ✅ CRITICAL: Resume socket and call handleUpgrade AFTER validation completes
      // This prevents the ws library from timing out the handshake
      socket.resume();
      agentWss.handleUpgrade(request, socket, head, (ws: any) => {
        agentWss.emit('connection', ws, request);
      });
    } catch (error) {
      const validationDuration = Date.now() - startTime;
      console.error(`[WebSocket Upgrade] Validation error (${validationDuration}ms):`, error);
      socket.resume(); // Resume before error response
      sendHttpError(socket, 500, 'Internal Server Error');
    }
  }
  
  // Helper to send HTTP error responses before destroying socket
  // IMPORTANT: Socket must be resumed before calling this function
  function sendHttpError(socket: any, statusCode: number, message: string) {
    const response = `HTTP/1.1 ${statusCode} ${message}\r\n` +
      `Content-Type: text/plain\r\n` +
      `Content-Length: ${message.length}\r\n` +
      `Connection: close\r\n` +
      `\r\n` +
      message;
    
    socket.write(response);
    socket.destroy();
  }

  httpServer.prependListener('upgrade', (request, socket, head) => {
    let pathname: string;
    
    // Safe URL parsing with fallback for malformed headers
    try {
      pathname = new URL(request.url!, `http://${request.headers.host || 'localhost'}`).pathname;
    } catch (error) {
      console.error('[WebSocket Upgrade] Malformed upgrade request:', error);
      socket.destroy();
      return;
    }
    
    // Only handle /ws/agent upgrades, let other listeners handle their own paths
    if (pathname !== '/ws/agent') {
      return; // Let other upgrade listeners process this request
    }
    
    // Route /ws/agent upgrades to async validation + upgrade handler
    // ✅ CRITICAL: Don't await here - let validation run async to prevent blocking other upgrades
    handleAgentUpgrade(request, socket, head).catch((error) => {
      console.error('[WebSocket Upgrade] Unhandled error in handleAgentUpgrade:', error);
      socket.destroy();
    });
  });
  
  // NOW start listening - ONLY after all middleware and routes are registered
  // This prevents the race condition where requests arrive before Vite middleware is ready
  httpServer.listen(port, "0.0.0.0", () => {
    // ✅ Re-enable final guard (Nov 20, 2025)  
    // Root cause was Vite HMR, not the guard - guard correctly preserved /ws/agent sockets
    // Now that Vite HMR is on separate port 24678, guard can safely destroy orphan sockets
    httpServer.on('upgrade', installFinalUpgradeGuard);
    
    console.log('[Upgrade Guard] Final catch-all guard registered for orphan socket cleanup');
  });
})();