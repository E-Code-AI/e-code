// Load environment variables FIRST - CRITICAL for NODE_ENV
import 'dotenv/config';

// Ensure NODE_ENV is set (default to development if not specified)
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

// ✅ Fortune 500 Security: Validate required secrets EARLY in startup
// Must be after dotenv/config to have access to environment variables
import { validateRequiredSecrets } from './utils/secrets-manager';
validateRequiredSecrets();

// ✅ Fortune 500 Production Monitoring: Initialize Sentry error tracking EARLY
// Must be done before any other imports to catch startup errors
import { errorTracking } from './services/error-tracking';
errorTracking.initialize();

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
import { prometheusMiddleware } from './monitoring/prometheus';
import { sanitizeInput } from './middleware/input-validation';
import { loggingMiddleware, securityLoggingMiddleware, performanceLoggingMiddleware } from './logging/logging-middleware';
import { createCentralizedLogger } from './logging/centralized-logger';
import { centralUpgradeDispatcher } from './websocket/central-upgrade-dispatcher';
import { performanceHeaders, earlyHints } from './middleware/performance-headers';

const serverLogger = createCentralizedLogger('server');
const app = express();

// Secure CORS configuration - must be before other middleware
configureCors(app);

// Trust proxy for production deployment (Replit, load balancers, reverse proxies)
// This enables proper IP detection for rate limiting and security
app.set('trust proxy', true);

// Security middleware (CSP, HSTS, etc.) - apply BEFORE other middleware
securityMiddleware().forEach(middleware => app.use(middleware));

// Fortune 500 Performance Headers - aggressive caching and early hints
app.use(performanceHeaders());
app.use(earlyHints());

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Production monitoring middleware - tracks API latency, errors, WebSocket connections
app.use(monitoringMiddleware);

// Prometheus metrics collection middleware - Fortune 500 observability
app.use(prometheusMiddleware);

// XSS sanitization middleware - sanitizes all user input
app.use(sanitizeInput);

// Centralized logging middleware with request correlation IDs (Fortune 500 Standard)
app.use(loggingMiddleware);
app.use(securityLoggingMiddleware);
app.use(performanceLoggingMiddleware(3000)); // Log requests > 3s

// Apply global rate limiting for DDoS protection
// Log all rate limit violations for security monitoring
app.use(logRateLimitViolations);

// Fortune 500 Tier-Based Rate Limiter - Intelligent limits per user subscription
// Free: 100/min, Pro: 1000/min, Enterprise: 10000/min (10x multiplier in dev)
app.use('/api', tierRateLimiters.api);

// Legacy dynamic rate limiting (kept for backward compatibility)
app.use(dynamicRateLimiter);

// PORT is set by Docker (3000) or Cloud Run, fallback to 5000 for local development
const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;

// ✅ 40-YEAR SENIOR ENGINEER FIX (Dec 6, 2025): Standard HTTP server
// The Central Upgrade Dispatcher handles ALL WebSocket upgrades through a single handler,
// eliminating race conditions that caused "Invalid frame header" errors.
// No need for request-level bypassing - the dispatcher marks sockets immediately.
const httpServer = createServer(app);

// Increase max listeners to prevent warnings (we have multiple WebSocket services + Vite HMR)
// Agent WS, Terminal WS, LSP WS, Collaboration WS, WebRTC, Vite HMR, etc.
httpServer.setMaxListeners(20);

// ✅ 40-YEAR SENIOR ENGINEER FIX (Dec 6, 2025): Initialize Central Upgrade Dispatcher FIRST
// This MUST be done before any other WebSocket services are initialized
// The dispatcher intercepts ALL upgrade events and routes them to the correct handler
centralUpgradeDispatcher.initialize(httpServer);
console.log('[Central Dispatcher] ✅ Initialized as authoritative WebSocket upgrade handler');

// ✅ FIX (Dec 6, 2025): Block additional upgrade listeners after dispatcher init
// This prevents Vite, Express, Socket.IO, and other libraries from adding competing listeners
// Only the central dispatcher should handle upgrades - it routes to registered handlers
const originalHttpServerOn = httpServer.on.bind(httpServer);
const originalHttpServerAddListener = httpServer.addListener.bind(httpServer);
const originalHttpServerPrependListener = httpServer.prependListener.bind(httpServer);

// Block 'upgrade' event registration (except for our final guard which we'll add later)
const blockUpgradeListener = (method: typeof httpServer.on) => {
  return function(event: string, listener: (...args: any[]) => void) {
    if (event === 'upgrade') {
      console.log('[HTTP Server] ⚠️ Blocked additional upgrade listener (use centralUpgradeDispatcher.register instead)');
      return httpServer; // No-op for upgrade events
    }
    return method(event, listener);
  } as typeof httpServer.on;
};

httpServer.on = blockUpgradeListener(originalHttpServerOn);
httpServer.addListener = blockUpgradeListener(originalHttpServerAddListener);
httpServer.prependListener = blockUpgradeListener(originalHttpServerPrependListener);

console.log('[HTTP Server] ✅ Upgrade listener blocking enabled - only dispatcher handles upgrades');

// Export restore function for use when adding the final guard
(global as any).__restoreUpgradeListenerMethods = () => {
  httpServer.on = originalHttpServerOn;
  httpServer.addListener = originalHttpServerAddListener;
  httpServer.prependListener = originalHttpServerPrependListener;
};

/**
 * Fortune 500 Performance-Optimized Health Endpoints
 * 
 * Kubernetes-style liveness and readiness probes for:
 * - Replit preview reliability
 * - Load balancer health checks
 * - Container orchestration
 */

// Track server readiness state
const serverState = {
  phase: 'starting' as 'starting' | 'listening' | 'loading' | 'ready',
  servicesLoaded: 0,
  totalServices: 12,
  startTime: Date.now(),
  errors: [] as string[]
};

// Main health check - responds with detailed status
app.get('/health', (_req, res) => {
  const uptime = Date.now() - serverState.startTime;
  res.json({
    status: serverState.phase === 'ready' ? 'ok' : 'starting',
    phase: serverState.phase,
    uptime: `${Math.round(uptime / 1000)}s`,
    services: `${serverState.servicesLoaded}/${serverState.totalServices}`,
    message: serverState.phase === 'ready'
      ? 'Server is fully operational'
      : `Server is starting (${serverState.servicesLoaded}/${serverState.totalServices} services loaded)`
  });
});

// Kubernetes-style liveness probe - always returns 200 if process is alive
app.get('/health/liveness', (_req, res) => {
  res.status(200).json({ status: 'alive' });
});

// Kubernetes-style readiness probe - returns 503 until server is ready
app.get('/health/readiness', (_req, res) => {
  if (serverState.phase === 'ready') {
    res.status(200).json({ status: 'ready' });
  } else {
    res.status(503).json({
      status: 'not ready',
      phase: serverState.phase,
      services: `${serverState.servicesLoaded}/${serverState.totalServices}`
    });
  }
});

// Helper to track service loading
const trackServiceLoad = (serviceName: string) => {
  serverState.servicesLoaded++;
  console.log(`[Startup] ✅ ${serviceName} (${serverState.servicesLoaded}/${serverState.totalServices})`);
};

// Mark server as listening immediately
serverState.phase = 'listening';

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
    // Setup PTY Terminal WebSocket server for real-time terminal access
    // Uses node-pty for real shell interaction (Replit Cloud Run compatible)
    const { initPTYTerminalService } = await import("./terminal/pty-terminal-service");
    const ptyTerminalService = initPTYTerminalService();
    ptyTerminalService.setup(httpServer);
    console.log('[Terminal] PTY Terminal service initialized at /api/terminal/ws');
  } catch (error) {
    console.error('[WORKING SERVER] Failed to setup PTY Terminal WebSocket:', error);
    
    // Fallback to simulated terminal if PTY fails
    try {
      const { setupTerminalWebsocket } = await import("./terminal");
      setupTerminalWebsocket(httpServer);
      console.log('[Terminal] Fallback to simulated terminal');
    } catch (fallbackError) {
      console.error('[WORKING SERVER] Fallback terminal also failed:', fallbackError);
    }
  }

  try {
    // Setup Background Testing WebSocket server for real-time test notifications
    // Uses central upgrade dispatcher for race-condition-free WebSocket handling
    const { setupBackgroundTestingWebSocket } = await import("./websocket/background-testing-ws");
    setupBackgroundTestingWebSocket(httpServer);
    console.log('[BackgroundTesting] WebSocket service initialized via central dispatcher at /ws/background-tests');
  } catch (error) {
    console.error('[WORKING SERVER] Failed to setup Background Testing WebSocket:', error);
  }

  try {
    // Setup Collaboration WebSocket server for real-time collaborative editing (Yjs)
    const { CollaborationServer } = await import("./collaboration/collaboration-server");
    const collaborationServer = new CollaborationServer(httpServer);
    
    // Make collaboration server available globally
    (global as any).collaborationServer = collaborationServer;
    console.log('[Collaboration] Yjs document sync server initialized at /collaboration');
  } catch (error) {
    console.error('[WORKING SERVER] Failed to setup Collaboration WebSocket:', error);
  }

  try {
    // Setup Unified Collaboration Service (Socket.io for presence, chat, cursors)
    const { initializeCollaborationService } = await import("./collaboration/unified-collaboration-service");
    const unifiedCollabService = initializeCollaborationService(httpServer);
    
    // Make unified collaboration service available globally
    (global as any).unifiedCollaborationService = unifiedCollabService;
    console.log('[Collaboration] Unified collaboration service initialized (presence/chat/cursors)');
  } catch (error) {
    console.error('[WORKING SERVER] Failed to setup Unified Collaboration Service:', error);
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
    
    // Initialize token revocation from database for production persistence
    // Use storage's db directly since it's already initialized
    setTimeout(async () => {
      try {
        const { db } = await import("./db/drizzle");
        if (db) {
          const { initializeTokenRevocation } = await import("./auth/token-revocation");
          await initializeTokenRevocation(db);
          console.log('[Token Revocation] ✅ Loaded from database - persists across restarts');
        } else {
          console.log('[Token Revocation] Database not available - using memory-only mode');
        }
      } catch (error) {
        console.log('[Token Revocation] Using memory-only mode (will persist to DB on revocation)');
      }
    }, 8000);
    
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
    
    // Setup Runtime Logs WebSocket server for real-time execution output streaming
    try {
      const { initRuntimeLogsService } = await import("./services/RuntimeLogsService");
      const runtimeLogsService = initRuntimeLogsService(storage);
      runtimeLogsService.setup(httpServer);
      
      // Make runtime logs service available globally for routes
      (global as any).runtimeLogsService = runtimeLogsService;
      console.log('[RuntimeLogs] WebSocket server initialized at /api/runtime/logs/ws');
    } catch (error) {
      console.error('[WORKING SERVER] Failed to setup Runtime Logs WebSocket:', error);
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
    
    // Setup Scan Executor service for processing security scans
    try {
      const { setupScanExecutor } = await import("./services/scan-executor.service");
      setupScanExecutor(storage);
    } catch (error) {
      console.error('[WORKING SERVER] Failed to setup Scan Executor:', error);
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
    
    // Setup Deployment WebSocket server for real-time deployment logs and status updates
    // ✅ CRITICAL: This MUST be initialized BEFORE Vite to ensure proper WebSocket routing
    try {
      const { deploymentWebSocketService } = await import("./services/deployment-websocket-service");
      deploymentWebSocketService.initialize(httpServer);
      
      // Make deployment websocket service available globally for routes
      (global as any).deploymentWebSocketService = deploymentWebSocketService;
      console.log('[Deployment WebSocket] Service initialized at /ws/deployments');
    } catch (error) {
      console.error('[WORKING SERVER] Failed to setup Deployment WebSocket:', error);
    }
    
    // Setup Checkpoint WebSocket server for real-time checkpoint notifications (Replit parity)
    try {
      const { setupCheckpointWebSocket } = await import("./websocket/checkpoint-ws");
      const checkpointWss = setupCheckpointWebSocket(httpServer);
      
      // Make checkpoint websocket service available globally
      (global as any).checkpointWebSocketService = checkpointWss;
      console.log('[Checkpoint WebSocket] Service initialized at /ws/checkpoints');
    } catch (error) {
      console.error('[WORKING SERVER] Failed to setup Checkpoint WebSocket:', error);
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

    // ✅ PROMETHEUS METRICS: Standard /metrics endpoint for Prometheus scraping
    try {
      const prometheusRouter = (await import('./routes/prometheus.router')).default;
      app.use(prometheusRouter);
      console.log('[Prometheus] Metrics endpoint registered at /metrics');
    } catch (error) {
      console.error('[WORKING SERVER] Failed to register Prometheus metrics routes:', error);
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

    // ✅ PHASE 1 CRITICAL FIX: Register Workspace Bootstrap routes (Replit-like flow)
    try {
      const workspaceBootstrapRouter = (await import('./routes/workspace-bootstrap.router')).default;
      app.use('/api/workspace', workspaceBootstrapRouter);
      console.log('[Workspace Bootstrap] Routes registered at /api/workspace/bootstrap - Replit-like agent flow enabled ✅');
    } catch (error) {
      console.error('[WORKING SERVER] Failed to register workspace bootstrap routes:', error);
    }

    // ✅ FORTUNE 500 OBSERVABILITY: WebSocket Metrics routes
    try {
      const websocketMetricsRouter = (await import('./routes/websocket-metrics.router')).default;
      app.use('/api/websocket', websocketMetricsRouter);
      console.log('[WebSocket Metrics] Routes registered at /api/websocket - Cache stats available');
    } catch (error) {
      console.error('[WORKING SERVER] Failed to register websocket metrics routes:', error);
    }

    // ✅ AUTONOMOUS WORKSPACE CREATION: Bootstrap routes
    try {
      const workspaceBootstrapRouter = (await import('./routes/workspace-bootstrap.router')).default;
      app.use('/api/workspace', workspaceBootstrapRouter);
      console.log('[Workspace Bootstrap] Routes registered at /api/workspace');
    } catch (error) {
      console.error('[WORKING SERVER] Failed to register workspace bootstrap routes:', error);
    }

    // ✅ TEMPLATES MARKETPLACE: Templates routes
    try {
      const templatesRouter = (await import('./routes/templates')).default;
      app.use(templatesRouter);
      console.log('[Templates Marketplace] Routes registered at /api/templates');
    } catch (error) {
      console.error('[WORKING SERVER] Failed to register templates routes:', error);
    }

    // ✅ SEO SITEMAP: Dynamic sitemap.xml generation
    try {
      const sitemapRouter = (await import('./routes/sitemap.router')).default;
      app.use(sitemapRouter);
      console.log('[SEO] Sitemap routes registered at /sitemap.xml, /sitemap-index.xml, /sitemap-blog.xml');
    } catch (error) {
      console.error('[WORKING SERVER] Failed to register sitemap routes:', error);
    }

    // ✅ CHECKPOINTS & ROLLBACK SYSTEM: Checkpoint routes with atomic transactions
    try {
      const checkpointsRouter = (await import('./routes/checkpoints.router')).default;
      app.use('/api', checkpointsRouter); // Mount at /api to get /api/projects/:projectId/checkpoints
      console.log('[Checkpoints] Routes registered at /api - Atomic transactions + row-level locks enabled');
    } catch (error) {
      console.error('[WORKING SERVER] Failed to register checkpoints routes:', error);
    }

    // ✅ STRIPE PAYMENTS: Payment and subscription routes
    try {
      const paymentsRouter = (await import('./routes/payments.router')).default;
      app.use('/api/payments', paymentsRouter);
      console.log('[Stripe Payments] Routes registered at /api/payments');
    } catch (error) {
      console.error('[WORKING SERVER] Failed to register payments routes:', error);
    }

    // ✅ AGENT CONTEXT: Repository overview routes
    try {
      const agentContextRouter = (await import('./agent/routes/agent-context')).default;
      app.use(agentContextRouter);
      console.log('[Agent Context] Routes registered at /api/agent/repo-overview');
    } catch (error) {
      console.error('[WORKING SERVER] Failed to register agent context routes:', error);
    }

    // ✅ CENTRALIZED LOGS: Fortune 500 logging API with frontend ingestion
    try {
      const logsRouter = (await import('./routes/logs.router')).default;
      app.use(logsRouter);
      console.log('[Centralized Logs] Routes registered at /api/logs - Request tracing enabled');
    } catch (error) {
      console.error('[WORKING SERVER] Failed to register logs routes:', error);
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
    // ✅ FIX (Dec 11, 2025): Restore upgrade listener methods BEFORE Vite initialization
    // Vite's HMR needs to register its own WebSocket upgrade handler
    // Without this, Vite's upgrade listener is silently blocked and WebSocket connections fail after restart
    const restoreUpgrade = (global as any).__restoreUpgradeListenerMethods;
    if (restoreUpgrade) {
      restoreUpgrade();
      console.log('[HTTP Server] 🔓 Temporarily restored upgrade listeners for Vite HMR initialization');
    }
    
    const { safeSetupVite, setupFallbackServer } = await import("./vite-loader");
    const viteSuccess = await safeSetupVite(app, httpServer);
    
    // ✅ Re-block upgrade listeners AFTER Vite has registered its HMR handler
    // Now both Central Dispatcher AND Vite HMR are properly registered
    httpServer.on = blockUpgradeListener(originalHttpServerOn);
    httpServer.addListener = blockUpgradeListener(originalHttpServerAddListener);
    httpServer.prependListener = blockUpgradeListener(originalHttpServerPrependListener);
    console.log('[HTTP Server] 🔒 Re-blocked upgrade listeners after Vite initialization');
    
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

  // ✅ Initialize billing workers ONLY in production (reduces log spam + CPU in dev)
  if (process.env.NODE_ENV === 'production') {
    try {
      const { startStripeUsageWorker } = await import('./workflows/stripe-usage-worker');
      startStripeUsageWorker();
      console.log('✅ Stripe Usage Worker started - processing billing queue every 30s');
    } catch (error) {
      console.warn('[WORKING SERVER] Stripe worker initialization failed (non-critical):', error.message);
    }

    try {
      const { startPayAsYouGoWorker } = await import('./workflows/payg-queue-processor');
      startPayAsYouGoWorker();
      console.log('✅ Pay-as-you-go Worker started - processing overage charges every 30s');
    } catch (error) {
      console.warn('[WORKING SERVER] Pay-as-you-go worker initialization failed (non-critical):', error.message);
    }
  } else {
    console.log('⏭️  Billing workers skipped in development (use NODE_ENV=production to enable)');
  }

  // ✅ Mobile Sessions Cleanup Scheduler - runs every hour
  try {
    const { getStorage } = await import('./storage');
    const MOBILE_SESSION_CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
    
    const runMobileSessionCleanup = async () => {
      try {
        const storage = getStorage();
        const deletedCount = await storage.cleanupExpiredMobileSessions();
        if (deletedCount > 0) {
          console.log(`[Cleanup] Removed ${deletedCount} expired mobile sessions`);
        }
      } catch (error) {
        console.warn('[Cleanup] Mobile session cleanup failed:', error.message);
      }
    };
    
    // Run immediately on startup then every hour
    runMobileSessionCleanup();
    setInterval(runMobileSessionCleanup, MOBILE_SESSION_CLEANUP_INTERVAL);
    console.log('✅ Mobile Session Cleanup Scheduler started - running every hour');
  } catch (error) {
    console.warn('[WORKING SERVER] Mobile session cleanup initialization failed (non-critical):', error.message);
  }

  // ✅ CRITICAL FIX (Dec 1, 2025): Removed manual handleAgentUpgrade flow
  // The agent WebSocket now uses the standard { server, path, verifyClient } pattern
  // in agent-websocket-service.ts, which automatically short-circuits Express/Vite
  // 
  // Previous noServer mode with manual handleUpgrade leaked requests back to Express,
  // causing Vite to write HTML after the WebSocket handshake (resulting in "Invalid 
  // frame header" errors with 1006 closures)
  
  const { installFinalUpgradeGuard } = await import('./websocket/upgrade-guard');
  
  // NOW start listening - ONLY after all middleware and routes are registered
  // This prevents the race condition where requests arrive before Vite middleware is ready
  
  httpServer.listen(port, "0.0.0.0", () => {
    // ✅ CRITICAL: Log that server is listening - this is what Replit workflow monitors for
    console.log(`🚀 E-Code Platform listening on port ${port}`);
    console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // ✅ Restore original methods to allow adding the final guard
    if ((global as any).__restoreUpgradeListenerMethods) {
      (global as any).__restoreUpgradeListenerMethods();
      console.log('[HTTP Server] Restored original methods to add final guard');
    }
    
    // ✅ Re-enable final guard (Nov 20, 2025)  
    // Root cause was Vite HMR, not the guard - guard correctly preserved /ws/agent sockets
    // Now that Vite HMR is on separate port 24678, guard can safely destroy orphan sockets
    httpServer.on('upgrade', installFinalUpgradeGuard);
    
    // ✅ Re-block upgrade listeners after adding guard (prevents late additions)
    const blockUpgradeListener = (method: typeof httpServer.on) => {
      return function(event: string, listener: (...args: any[]) => void) {
        if (event === 'upgrade') {
          console.log('[HTTP Server] ⚠️ Blocked late upgrade listener');
          return httpServer;
        }
        return method(event, listener);
      } as typeof httpServer.on;
    };
    httpServer.on = blockUpgradeListener(httpServer.on.bind(httpServer));
    httpServer.addListener = blockUpgradeListener(httpServer.addListener.bind(httpServer)) as typeof httpServer.addListener;
    httpServer.prependListener = blockUpgradeListener(httpServer.prependListener.bind(httpServer)) as typeof httpServer.prependListener;
    
    console.log('[Upgrade Guard] Final catch-all guard registered for orphan socket cleanup');
    console.log('[HTTP Server] ✅ Upgrade listeners locked: only dispatcher + guard active');
    
    // ✅ Mark server as fully ready for health probes
    serverState.phase = 'ready';
    console.log(`[Startup] ✅ Server ready (${Date.now() - serverState.startTime}ms startup time)`);
  });

  // ✅ PRODUCTION OPTIMIZATION: Graceful shutdown handler
  const gracefulShutdown = async (signal: string) => {
    console.log(`\n[Shutdown] Received ${signal}, starting graceful shutdown...`);
    
    // Stop accepting new connections
    httpServer.close(() => {
      console.log('[Shutdown] HTTP server closed');
    });

    // Clear all registered intervals (prevents memory leaks)
    try {
      const { intervalRegistry } = await import('./utils/interval-registry');
      intervalRegistry.clearAll();
      console.log('[Shutdown] All intervals cleared');
    } catch (e) {
      console.warn('[Shutdown] Interval cleanup failed:', e);
    }

    // Close database pools
    try {
      const { dbPool } = await import('./services/database-pool');
      await dbPool.shutdown();
      console.log('[Shutdown] Database pool closed');
    } catch (e) {
      console.warn('[Shutdown] Database pool close failed:', e);
    }

    // Close Redis connections
    try {
      const { redisCache } = await import('./services/redis-cache.service');
      if (redisCache && typeof (redisCache as any).close === 'function') {
        (redisCache as any).close();
      }
      console.log('[Shutdown] Redis connection closed');
    } catch (e) {
      console.warn('[Shutdown] Redis close failed:', e);
    }

    // Exit after cleanup
    setTimeout(() => {
      console.log('[Shutdown] Forced exit after timeout');
      process.exit(0);
    }, 5000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
})();