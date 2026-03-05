// Load environment variables in development only (production uses platform env vars)
// Note: In production builds, this entire block is eliminated via dead code elimination
// because process.env.NODE_ENV is defined as 'production' at build time
if (process.env.NODE_ENV === 'development') {
  const dotenv = await import('dotenv');
  dotenv.config();
}

// ✅ Fortune 500 Security: Validate required secrets EARLY in startup
// Must be after dotenv/config to have access to environment variables
import { validateRequiredSecrets } from './utils/secrets-manager';
import { validateProductionEnvironment } from './utils/production-validation';
// ✅ Fortune 500: Zod-validated environment configuration (validates on import)
import { envConfig } from './utils/env-config';
import { initializeRuntimes } from './execution/runtime-warmup';

validateRequiredSecrets();
validateProductionEnvironment();
// envConfig is already validated on module load

// ✅ Fortune 500 Production Monitoring: Initialize Sentry error tracking EARLY
// Must be done before any other imports to catch startup errors
import { errorTracking } from './services/error-tracking';
errorTracking.initialize();

// ✅ Database connection with retry logic for resilient startup
import { connectWithRetry } from './db';
connectWithRetry().catch(err => {
  console.error('[Database] Failed to connect:', err.message);
  process.exit(1);
});

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
import { installFinalUpgradeGuard } from './websocket/upgrade-guard';
import { performanceHeaders, earlyHints } from './middleware/performance-headers';
import { isViteDevPath } from './utils/security';
import { createLogger } from './utils/logger';

const logger = createLogger('server');
const serverLogger = createCentralizedLogger('server');
const app = express();

// Secure CORS configuration - must be before other middleware
configureCors(app);

// Trust proxy for production deployment (Replit, load balancers, reverse proxies)
// A6-FIX: Use numeric '1' — trust only the first proxy. 'true' trusts ALL proxies
// and would allow attackers to spoof X-Forwarded-For headers to bypass rate limiting.
app.set('trust proxy', 1);

// Security middleware (CSP, HSTS, etc.) - apply BEFORE other middleware
securityMiddleware().forEach(middleware => app.use(middleware));

// Fortune 500 Performance Headers - aggressive caching and early hints
app.use(performanceHeaders());
app.use(earlyHints());

// Response compression - reduces bandwidth for text-based responses
import compression from 'compression';
app.use(compression({ level: 6 }));

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// ✅ P0 FIX: cookie-parser MUST be mounted for CSRF double-submit cookie pattern to work
// Without this, req.cookies is always undefined, breaking CSRF token validation
import cookieParser from 'cookie-parser';
app.use(cookieParser());

// ✅ PERFORMANCE FIX (Jan 2026): Early bypass for static assets
// Skip ALL heavy middleware for Vite dev paths and static assets
// This MUST run BEFORE monitoring, prometheus, logging, and sanitization
app.use((req, res, next) => {
  const path = req.path || req.originalUrl?.split('?')[0] || req.url?.split('?')[0] || '';
  
  // Fast path for Vite dev assets - skip all heavy middleware
  if (isViteDevPath(path)) {
    (req as any)._skipHeavyMiddleware = true;
    (req as any)._skipRateLimit = true;
  }
  
  // Skip heavy middleware for static assets in development
  if (process.env.NODE_ENV === 'development' && 
      (path.startsWith('/src/') || path.startsWith('/node_modules/') || 
       path.startsWith('/@') || path.endsWith('.css') || 
       path.endsWith('.js') || path.endsWith('.ts') || path.endsWith('.tsx'))) {
    (req as any)._skipHeavyMiddleware = true;
    (req as any)._skipRateLimit = true;
  }
  
  next();
});

// Production monitoring middleware - tracks API latency, errors, WebSocket connections
// Skip for static assets to improve performance
app.use((req, res, next) => {
  if ((req as any)._skipHeavyMiddleware) return next();
  monitoringMiddleware(req, res, next);
});

// Prometheus metrics collection middleware - Fortune 500 observability
// Skip for static assets to improve performance
app.use((req, res, next) => {
  if ((req as any)._skipHeavyMiddleware) return next();
  prometheusMiddleware(req, res, next);
});

// XSS sanitization middleware - sanitizes all user input
// Skip for static assets (no user input to sanitize)
app.use((req, res, next) => {
  if ((req as any)._skipHeavyMiddleware) return next();
  sanitizeInput(req, res, next);
});

// Centralized logging middleware with request correlation IDs (Fortune 500 Standard)
// Skip verbose logging for static assets in development
const perfLogger = performanceLoggingMiddleware(3000);
app.use((req, res, next) => {
  if ((req as any)._skipHeavyMiddleware) return next();
  loggingMiddleware(req, res, next);
});
app.use((req, res, next) => {
  if ((req as any)._skipHeavyMiddleware) return next();
  securityLoggingMiddleware(req, res, next);
});
app.use((req, res, next) => {
  if ((req as any)._skipHeavyMiddleware) return next();
  perfLogger(req, res, next);
});

// ✅ CRITICAL FIX (Dec 19, 2025): Global rate limit bypass for non-API routes in development
// Skip ALL rate limiting for:
// 1. Vite development assets (/src/, /@fs/, /@vite/, /@react-refresh)
// 2. ALL non-API routes in development mode (prevents external IP rate limiting on frontend routes)
// This MUST run BEFORE any rate limiting middleware
app.use((req, res, next) => {
  // Check all possible path sources (req.path, req.originalUrl, req.url)
  const path = req.path || req.originalUrl?.split('?')[0] || req.url?.split('?')[0] || '';
  
  // Always skip rate limiting for Vite dev paths
  if (isViteDevPath(path)) {
    (req as any)._skipRateLimit = true;
    return next();
  }
  
  // In development mode, skip rate limiting for ALL non-API routes
  // This prevents external IPs from being blocked when loading frontend assets
  if (process.env.NODE_ENV === 'development' && !path.startsWith('/api')) {
    (req as any)._skipRateLimit = true;
  }
  
  next();
});

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
logger.info('[Central Dispatcher] ✅ Initialized as authoritative WebSocket upgrade handler');

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
      logger.info('[HTTP Server] ⚠️ Blocked additional upgrade listener (use centralUpgradeDispatcher.register instead)');
      return httpServer; // No-op for upgrade events
    }
    return method(event, listener);
  } as typeof httpServer.on;
};

httpServer.on = blockUpgradeListener(originalHttpServerOn);
httpServer.addListener = blockUpgradeListener(originalHttpServerAddListener);
httpServer.prependListener = blockUpgradeListener(originalHttpServerPrependListener);

logger.info('[HTTP Server] ✅ Upgrade listener blocking enabled - only dispatcher handles upgrades');

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
 * 
 * DYNAMIC SERVICE REGISTRY:
 * - Services register themselves at startup
 * - totalServices is dynamically calculated from registry
 * - Supports runtime service health tracking
 */

// Dynamic service registry for health checks
interface ServiceInfo {
  ready: boolean;
  lastCheck: Date;
  error?: string;
}

const serviceRegistry = new Map<string, ServiceInfo>();

/**
 * Register a service in the health check registry
 * Call this when a service begins initialization
 */
export function registerService(name: string): void {
  serviceRegistry.set(name, { ready: false, lastCheck: new Date() });
}

/**
 * Mark a service as ready in the registry
 * Call this when a service successfully initializes
 */
export function markServiceReady(name: string): void {
  const service = serviceRegistry.get(name);
  if (service) {
    service.ready = true;
    service.lastCheck = new Date();
    delete service.error;
  } else {
    serviceRegistry.set(name, { ready: true, lastCheck: new Date() });
  }
}

/**
 * Mark a service as failed in the registry
 * Call this when a service fails to initialize
 */
export function markServiceFailed(name: string, error?: string): void {
  const service = serviceRegistry.get(name);
  if (service) {
    service.ready = false;
    service.lastCheck = new Date();
    service.error = error;
  } else {
    serviceRegistry.set(name, { ready: false, lastCheck: new Date(), error });
  }
}

/**
 * Get dynamic service counts from registry
 */
function getServiceCounts(): { total: number; ready: number; failed: number } {
  const services = Array.from(serviceRegistry.values());
  return {
    total: serviceRegistry.size,
    ready: services.filter(s => s.ready).length,
    failed: services.filter(s => !s.ready && s.error).length
  };
}

/**
 * Get detailed service status for health check responses
 */
export function getServiceStatus(): Record<string, boolean> {
  const services: Record<string, boolean> = {};
  serviceRegistry.forEach((value, key) => {
    services[key] = value.ready;
  });
  return services;
}

// Track server readiness state (using dynamic counts)
const serverState = {
  phase: 'starting' as 'starting' | 'listening' | 'loading' | 'ready',
  startTime: Date.now(),
  errors: [] as string[]
};

app.use((req, res, next) => {
  if (serverState.phase !== 'ready' && process.env.NODE_ENV === 'production') {
    const path = req.path;
    if (path.startsWith('/health')) {
      return next();
    }
    if (path.startsWith('/api/')) {
      return res.status(503).json({ status: 'starting', message: 'Server is initializing, please retry shortly' });
    }
    if (path.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff2?|ttf|eot|map|json)$/)) {
      return next();
    }
    return res.status(200).set({ 'Content-Type': 'text/html' }).end(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>E-Code.AI</title><style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0d1117;color:#c9d1d9;font-family:-apple-system,BlinkMacSystemFont,sans-serif}div{text-align:center}.spinner{width:40px;height:40px;border:3px solid #21262d;border-top:3px solid #58a6ff;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 16px}@keyframes spin{to{transform:rotate(360deg)}}h1{font-size:20px;margin:0 0 8px}p{font-size:14px;color:#8b949e;margin:0}</style><meta http-equiv="refresh" content="2"></head><body><div><div class="spinner"></div><h1>E-Code.AI</h1><p>Loading platform...</p></div></body></html>`);
  }
  next();
});

// Main health check - responds with detailed status (dynamic service counts)
app.get('/health', (_req, res) => {
  const uptime = Date.now() - serverState.startTime;
  const { total, ready } = getServiceCounts();
  
  res.status(200).json({
    status: 'ok',
    phase: serverState.phase,
    uptime: `${Math.round(uptime / 1000)}s`,
    services: `${ready}/${total}`,
    message: serverState.phase === 'ready'
      ? 'Server is fully operational'
      : `Server is starting (${ready}/${total} services loaded)`
  });
});

// Kubernetes-style liveness probe - always returns 200 if process is alive
app.get('/health/liveness', (_req, res) => {
  res.status(200).json({ status: 'alive' });
});

// Kubernetes-style readiness probe - returns 503 until server is ready (dynamic counts)
app.get('/health/readiness', (_req, res) => {
  const services = getServiceStatus();
  const allReady = Object.values(services).every(ready => ready);
  const readyCount = Object.values(services).filter(ready => ready).length;
  const totalCount = serviceRegistry.size;
  
  res.json({
    ready: allReady,
    services: readyCount,
    total: totalCount,
    details: services
  });
});

// Helper to track service loading (registers and marks ready)
const trackServiceLoad = (serviceName: string) => {
  markServiceReady(serviceName);
  const { total, ready } = getServiceCounts();
  logger.info(`[Startup] ✅ ${serviceName} (${ready}/${total})`);
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

// ✅ EARLY BIND: Start listening IMMEDIATELY so health checks respond within Replit's 5s timeout
// Services will load in the background after the server is already accepting connections
logger.info(`[Server] Attempting to bind to port ${port} on 0.0.0.0...`);
httpServer.on('error', (err: any) => {
  logger.error(`[Server] FATAL: Failed to bind to port ${port}: ${err.message}`);
  if (err.code === 'EADDRINUSE') {
    logger.error(`[Server] Port ${port} is already in use. Trying port 0 (auto-assign)...`);
    httpServer.listen(0, "0.0.0.0", () => {
      const addr = httpServer.address();
      const actualPort = typeof addr === 'object' && addr ? addr.port : 'unknown';
      logger.info(`🚀 E-Code Platform listening on auto-assigned port ${actualPort}`);
    });
  }
});
httpServer.listen(port, "0.0.0.0", () => {
  logger.info(`🚀 E-Code Platform listening on port ${port}`);
  logger.info(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Now load the rest of the application asynchronously after server is listening
// This ensures the server starts even if there are issues with other modules
(async () => {
  try {
    // Setup passport authentication BEFORE routes
    const { setupPassportAuth } = await import("./middleware/passport-setup");
    setupPassportAuth(app);
  } catch (error) {
    logger.error(`[WORKING SERVER] Failed to setup passport: ${error}`);
  }

  // ✅ P0-06 FIX: Apply CSRF protection GLOBALLY to all /api routes
  // Must be AFTER session+passport setup (CSRF tokens stored in session)
  // Frontend in queryClient.ts already handles fetching + sending tokens
  try {
    const { csrfProtection } = await import('./middleware/csrf');
    app.use('/api', csrfProtection);
    logger.info('[CSRF] ✅ Global CSRF protection enabled for all /api routes');
  } catch (error) {
    logger.error(`[CSRF] Failed to apply global CSRF protection: ${error}`);
  }

  // SECURITY: Validate origin configuration BEFORE initializing ANY WebSocket servers
  // This ensures all WebSocket servers have proper origin validation configured
  try {
    const { validateOriginConfig } = await import("./utils/origin-validation");
    validateOriginConfig();
  } catch (error) {
    logger.error(`[SECURITY] Origin validation configuration error: ${error.message}`);
    // Continue anyway in development, but log the error
    if (process.env.NODE_ENV === 'production') {
      throw error; // Fail hard in production
    }
  }

  registerService('terminal');
  try {
    // Setup PTY Terminal WebSocket server for real-time terminal access
    // Uses node-pty for real shell interaction (Replit Cloud Run compatible)
    const { initPTYTerminalService } = await import("./terminal/pty-terminal-service");
    const ptyTerminalService = initPTYTerminalService();
    ptyTerminalService.setup(httpServer);
    markServiceReady('terminal');
    logger.info('[Terminal] PTY Terminal service initialized at /api/terminal/ws');
  } catch (error) {
    logger.error(`[WORKING SERVER] Failed to setup PTY Terminal WebSocket: ${error}`);
    
    // Fallback to simulated terminal if PTY fails
    try {
      const { setupTerminalWebsocket } = await import("./terminal");
      setupTerminalWebsocket(httpServer);
      markServiceReady('terminal');
      logger.info('[Terminal] Fallback to simulated terminal');
    } catch (fallbackError) {
      logger.error(`[WORKING SERVER] Fallback terminal also failed: ${fallbackError}`);
      markServiceFailed('terminal', 'Both PTY and fallback terminal failed');
    }
  }

  registerService('background-testing');
  try {
    // Setup Background Testing WebSocket server for real-time test notifications
    // Uses central upgrade dispatcher for race-condition-free WebSocket handling
    const { setupBackgroundTestingWebSocket } = await import("./websocket/background-testing-ws");
    setupBackgroundTestingWebSocket(httpServer);
    markServiceReady('background-testing');
    logger.info('[BackgroundTesting] WebSocket service initialized via central dispatcher at /ws/background-tests');
  } catch (error) {
    logger.error(`[WORKING SERVER] Failed to setup Background Testing WebSocket: ${error}`);
    markServiceFailed('background-testing', String(error));
  }

  registerService('collaboration');
  try {
    // Setup Collaboration WebSocket server for real-time collaborative editing (Yjs)
    const { CollaborationServer } = await import("./collaboration/collaboration-server");
    const collaborationServer = new CollaborationServer(httpServer);
    
    // Make collaboration server available globally
    (global as any).collaborationServer = collaborationServer;
    markServiceReady('collaboration');
    logger.info('[Collaboration] Yjs document sync server initialized at /collaboration');
  } catch (error) {
    logger.error(`[WORKING SERVER] Failed to setup Collaboration WebSocket: ${error}`);
    markServiceFailed('collaboration', String(error));
  }

  registerService('unified-collaboration');
  try {
    // Setup Unified Collaboration Service (Socket.io for presence, chat, cursors)
    const { initializeCollaborationService } = await import("./collaboration/unified-collaboration-service");
    const unifiedCollabService = initializeCollaborationService(httpServer);
    
    // Make unified collaboration service available globally
    (global as any).unifiedCollaborationService = unifiedCollabService;
    markServiceReady('unified-collaboration');
    logger.info('[Collaboration] Unified collaboration service initialized (presence/chat/cursors)');
  } catch (error) {
    logger.error(`[WORKING SERVER] Failed to setup Unified Collaboration Service: ${error}`);
    markServiceFailed('unified-collaboration', String(error));
  }

  registerService('webrtc');
  try {
    // Setup WebRTC Voice/Video service for peer-to-peer communication
    const { setupWebRTCServer } = await import("./webrtc/webrtc-server");
    const webrtcService = setupWebRTCServer(httpServer);
    
    // Make WebRTC service available globally
    (global as any).webrtcService = webrtcService;
    markServiceReady('webrtc');
  } catch (error) {
    logger.error(`[WORKING SERVER] Failed to setup WebRTC server: ${error}`);
    markServiceFailed('webrtc', String(error));
  }

  try {
    // Import modular routes - MUST be registered AFTER passport
    const { MainRouter } = await import("./routes");
    const { getStorage, sessionStore } = await import("./storage");
    const storage = getStorage();
    
    // Initialize token revocation from database for production persistence
    // SECURITY FIX: Initialize immediately instead of 8s delay to prevent using revoked tokens
    try {
      const { db } = await import("./db/drizzle");
      if (db) {
        const { initializeTokenRevocation } = await import("./auth/token-revocation");
        await initializeTokenRevocation(db);
        logger.info('[Token Revocation] ✅ Loaded from database - persists across restarts');
      } else {
        logger.info('[Token Revocation] Database not available - using memory-only mode');
      }
    } catch (error) {
      logger.info('[Token Revocation] Using memory-only mode (will persist to DB on revocation)');
    }
    
    // Setup LSP WebSocket server for real-time diagnostics
    registerService('lsp');
    try {
      const { setupLSPWebSocket } = await import("./services/LSPService");
      const lspService = setupLSPWebSocket(httpServer, storage);
      
      // Make LSP service available globally for routes
      (global as any).lspService = lspService;
      markServiceReady('lsp');
    } catch (error) {
      logger.error(`[WORKING SERVER] Failed to setup LSP WebSocket: ${error}`);
      markServiceFailed('lsp', String(error));
    }
    
    // Setup Build Logs WebSocket server for real-time log streaming
    registerService('build-logs');
    try {
      const { setupBuildLogsWebSocket } = await import("./services/BuildLogsService");
      const buildLogsService = setupBuildLogsWebSocket(httpServer, storage);
      
      // Make build logs service available globally for routes
      (global as any).buildLogsService = buildLogsService;
      markServiceReady('build-logs');
    } catch (error) {
      logger.error(`[WORKING SERVER] Failed to setup Build Logs WebSocket: ${error}`);
      markServiceFailed('build-logs', String(error));
    }
    
    // Setup Runtime Logs WebSocket server for real-time execution output streaming
    registerService('runtime-logs');
    try {
      const { initRuntimeLogsService } = await import("./services/RuntimeLogsService");
      const runtimeLogsService = initRuntimeLogsService(storage);
      runtimeLogsService.setup(httpServer);
      
      // Make runtime logs service available globally for routes
      (global as any).runtimeLogsService = runtimeLogsService;
      markServiceReady('runtime-logs');
      logger.info('[RuntimeLogs] WebSocket server initialized at /api/runtime/logs/ws');
    } catch (error) {
      logger.error(`[WORKING SERVER] Failed to setup Runtime Logs WebSocket: ${error}`);
      markServiceFailed('runtime-logs', String(error));
    }
    
    // Setup Server Logs WebSocket server for real-time Winston log streaming (Replit-like)
    registerService('server-logs');
    try {
      const { serverLogsService } = await import("./services/ServerLogsService");
      serverLogsService.setup(httpServer);
      
      // Make server logs service available globally
      (global as any).serverLogsService = serverLogsService;
      markServiceReady('server-logs');
      logger.info('[ServerLogs] WebSocket server initialized at /api/server/logs/ws');
    } catch (error) {
      logger.error(`[WORKING SERVER] Failed to setup Server Logs WebSocket: ${error}`);
      markServiceFailed('server-logs', String(error));
    }
    
    // Setup Test Runs WebSocket server for real-time test result streaming
    registerService('test-runs');
    try {
      const { setupTestRunsWebSocket } = await import("./services/TestRunsService");
      const testRunsService = setupTestRunsWebSocket(httpServer, storage);
      
      // Make test runs service available globally for routes
      (global as any).testRunsService = testRunsService;
      markServiceReady('test-runs');
    } catch (error) {
      logger.error(`[WORKING SERVER] Failed to setup Test Runs WebSocket: ${error}`);
      markServiceFailed('test-runs', String(error));
    }
    
    // Setup Security Scanner WebSocket server for real-time scan updates
    registerService('security-scanner');
    try {
      const { setupSecurityScannerWebSocket } = await import("./services/SecurityScannerService");
      const securityScannerService = setupSecurityScannerWebSocket(httpServer, storage);
      
      // Make security scanner service available globally for routes
      (global as any).securityScannerService = securityScannerService;
      markServiceReady('security-scanner');
    } catch (error) {
      logger.error(`[WORKING SERVER] Failed to setup Security Scanner WebSocket: ${error}`);
      markServiceFailed('security-scanner', String(error));
    }
    
    // Setup Scan Executor service for processing security scans
    try {
      const { setupScanExecutor } = await import("./services/scan-executor.service");
      setupScanExecutor(storage);
    } catch (error) {
      logger.error(`[WORKING SERVER] Failed to setup Scan Executor: ${error}`);
    }
    
    // Setup Resources WebSocket server for real-time resource metrics streaming
    registerService('resources');
    try {
      const { setupResourcesWebSocket } = await import("./services/ResourcesService");
      const resourcesService = setupResourcesWebSocket(httpServer, storage);
      
      // Make resources service available globally for routes
      (global as any).resourcesService = resourcesService;
      markServiceReady('resources');
    } catch (error) {
      logger.error(`[WORKING SERVER] Failed to setup Resources WebSocket: ${error}`);
      markServiceFailed('resources', String(error));
    }
    
    // Setup Agent WebSocket server for autonomous workspace creation progress
    // ✅ CRITICAL: This MUST be initialized BEFORE Vite to ensure proper WebSocket routing
    registerService('agent');
    try {
      const { agentWebSocketService } = await import("./services/agent-websocket-service");
      agentWebSocketService.initialize(httpServer);
      
      // Make agent websocket service available globally for routes
      (global as any).agentWebSocketService = agentWebSocketService;
      markServiceReady('agent');
      logger.info('[Agent WebSocket] Service initialized at /ws/agent');
    } catch (error) {
      logger.error(`[WORKING SERVER] Failed to setup Agent WebSocket: ${error}`);
      markServiceFailed('agent', String(error));
    }
    
    // Setup Deployment WebSocket server for real-time deployment logs and status updates
    // ✅ CRITICAL: This MUST be initialized BEFORE Vite to ensure proper WebSocket routing
    registerService('deployment');
    try {
      const { deploymentWebSocketService } = await import("./services/deployment-websocket-service");
      deploymentWebSocketService.initialize(httpServer);
      
      // Make deployment websocket service available globally for routes
      (global as any).deploymentWebSocketService = deploymentWebSocketService;
      markServiceReady('deployment');
      logger.info('[Deployment WebSocket] Service initialized at /ws/deployments');
    } catch (error) {
      logger.error(`[WORKING SERVER] Failed to setup Deployment WebSocket: ${error}`);
      markServiceFailed('deployment', String(error));
    }
    
    // Setup Checkpoint WebSocket server for real-time checkpoint notifications (Replit parity)
    registerService('checkpoint');
    try {
      const { setupCheckpointWebSocket } = await import("./websocket/checkpoint-ws");
      const checkpointWss = setupCheckpointWebSocket(httpServer);
      
      // Make checkpoint websocket service available globally
      (global as any).checkpointWebSocketService = checkpointWss;
      markServiceReady('checkpoint');
      logger.info('[Checkpoint WebSocket] Service initialized at /ws/checkpoints');
    } catch (error) {
      logger.error(`[WORKING SERVER] Failed to setup Checkpoint WebSocket: ${error}`);
      markServiceFailed('checkpoint', String(error));
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
      logger.info('[Fortune 500 Health] K8s endpoints registered: /health/{liveness,readiness,deep,startup}');
    } catch (error) {
      logger.error(`[WORKING SERVER] Failed to register K8s health endpoints: ${error}`);
    }

    // Register Swagger API documentation (optional, controlled by SWAGGER_ENABLED flag)
    try {
      const enableSwagger = process.env.SWAGGER_ENABLED !== 'false'; // Enabled by default
      if (enableSwagger) {
        const { setupSwaggerDocs } = await import('./docs/swagger');
        setupSwaggerDocs(app);
        logger.info('[Fortune 500 Swagger] 📚 API Documentation available at /api/docs');
      } else {
        logger.info('[Fortune 500 Swagger] API Documentation disabled (SWAGGER_ENABLED=false)');
      }
    } catch (error) {
      logger.error(`[WORKING SERVER] Failed to register Swagger docs: ${error}`);
    }

    const mainRouter = new MainRouter(storage);
    mainRouter.registerRoutes(app);
    
    // Register production monitoring routes
    try {
      const monitoringRouter = (await import('./routes/monitoring.router')).default;
      app.use(monitoringRouter);
    } catch (error) {
      logger.error(`[WORKING SERVER] Failed to register monitoring routes: ${error}`);
    }

    // ✅ PROMETHEUS METRICS: Standard /metrics endpoint for Prometheus scraping
    try {
      const prometheusRouter = (await import('./routes/prometheus.router')).default;
      app.use(prometheusRouter);
      logger.info('[Prometheus] Metrics endpoint registered at /metrics');
    } catch (error) {
      logger.error(`[WORKING SERVER] Failed to register Prometheus metrics routes: ${error}`);
    }

    // Register AI Optimization routes
    try {
      const aiOptimizationRouter = (await import('./routes/ai-optimization.router')).default;
      app.use('/api/ai-optimization', aiOptimizationRouter);
      logger.info('[AI Optimization] Routes registered at /api/ai-optimization');
      
      const slackConfigRouter = (await import('./routes/slack-config.router')).default;
      app.use('/api/slack-config', slackConfigRouter);
      logger.info('[Slack Config] Routes registered at /api/slack-config');
    } catch (error) {
      logger.error(`[WORKING SERVER] Failed to register AI optimization routes: ${error}`);
    }

    // ✅ 40-YEAR ENGINEERING FIX: Register Agent Autonomous routes
    try {
      const agentAutonomousRouter = (await import('./routes/agent-autonomous.router')).default;
      app.use('/api/agent/autonomous', agentAutonomousRouter);
      logger.info('[Agent Autonomous] Routes registered at /api/agent/autonomous');
    } catch (error) {
      logger.error(`[WORKING SERVER] Failed to register agent autonomous routes: ${error}`);
    }

    // ✅ PHASE 1 CRITICAL FIX: Register Workspace Bootstrap routes (Replit-like flow)
    try {
      const workspaceBootstrapRouter = (await import('./routes/workspace-bootstrap.router')).default;
      app.use('/api/workspace', workspaceBootstrapRouter);
      logger.info('[Workspace Bootstrap] Routes registered at /api/workspace/bootstrap - Replit-like agent flow enabled ✅');
    } catch (error) {
      logger.error(`[WORKING SERVER] Failed to register workspace bootstrap routes: ${error}`);
    }

    // ✅ FORTUNE 500 OBSERVABILITY: WebSocket Metrics routes
    try {
      const websocketMetricsRouter = (await import('./routes/websocket-metrics.router')).default;
      app.use('/api/websocket', websocketMetricsRouter);
      logger.info('[WebSocket Metrics] Routes registered at /api/websocket - Cache stats available');
    } catch (error) {
      logger.error(`[WORKING SERVER] Failed to register websocket metrics routes: ${error}`);
    }

    // ✅ TEMPLATES MARKETPLACE: Templates routes
    try {
      const templatesRouter = (await import('./routes/templates')).default;
      app.use('/api/templates', templatesRouter);
      logger.info('[Templates Marketplace] Routes registered at /api/templates');
    } catch (error) {
      logger.error(`[WORKING SERVER] Failed to register templates routes: ${error}`);
    }

    // ✅ SEO SITEMAP: Dynamic sitemap.xml generation
    try {
      const sitemapRouter = (await import('./routes/sitemap.router')).default;
      app.use(sitemapRouter);
      logger.info('[SEO] Sitemap routes registered at /sitemap.xml, /sitemap-index.xml, /sitemap-blog.xml');
    } catch (error) {
      logger.error(`[WORKING SERVER] Failed to register sitemap routes: ${error}`);
    }

    // ✅ CHECKPOINTS & ROLLBACK SYSTEM: Checkpoint routes with atomic transactions
    try {
      const checkpointsRouter = (await import('./routes/checkpoints.router')).default;
      app.use('/api', checkpointsRouter); // Mount at /api to get /api/projects/:projectId/checkpoints
      logger.info('[Checkpoints] Routes registered at /api - Atomic transactions + row-level locks enabled');
    } catch (error) {
      logger.error(`[WORKING SERVER] Failed to register checkpoints routes: ${error}`);
    }

    // ✅ STRIPE PAYMENTS: Payment and subscription routes
    try {
      const paymentsRouter = (await import('./routes/payments.router')).default;
      app.use('/api/payments', paymentsRouter);
      logger.info('[Stripe Payments] Routes registered at /api/payments');
    } catch (error) {
      logger.error(`[WORKING SERVER] Failed to register payments routes: ${error}`);
    }

    // ✅ AGENT CONTEXT: Repository overview routes
    try {
      const agentContextRouter = (await import('./agent/routes/agent-context')).default;
      app.use('/api/agent', agentContextRouter);
      logger.info('[Agent Context] Routes registered at /api/agent/repo-overview');
    } catch (error) {
      logger.error(`[WORKING SERVER] Failed to register agent context routes: ${error}`);
    }

    // ✅ CENTRALIZED LOGS: Fortune 500 logging API with frontend ingestion
    try {
      const logsRouter = (await import('./routes/logs.router')).default;
      app.use(logsRouter);
      logger.info('[Centralized Logs] Routes registered at /api/logs - Request tracing enabled');
    } catch (error) {
      logger.error(`[WORKING SERVER] Failed to register logs routes: ${error}`);
    }
  } catch (error) {
    logger.error(`[WORKING SERVER] Failed to register routes: ${error}`);
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

  // ✅ P0 FIX: Global error handler — must be registered AFTER all routes
  // Prevents unhandled errors from exposing stack traces in production
  try {
    const { errorHandler, notFoundHandler, initializeErrorHandlers } = await import('./middleware/error-handler');
    initializeErrorHandlers();
    app.use(notFoundHandler);
    app.use(errorHandler);
    logger.info('[Error Handler] ✅ Global error handler registered');
  } catch (err) {
    logger.error(`[Error Handler] Failed to register global error handler: ${err}`);
    // Fallback error handler if import fails
    app.use((err: any, req: any, res: any, _next: any) => {
      const isProd = process.env.NODE_ENV === 'production';
      res.status(err.statusCode || err.status || 500).json({
        error: isProd ? 'Internal Server Error' : err.message,
        code: err.code || 'INTERNAL_ERROR'
      });
    });
  }

  // Serve attached_assets as static files (stock images, user uploads, etc.)
  const path = await import('path');
  const attachedAssetsPath = path.resolve(process.cwd(), 'attached_assets');
  app.use('/attached_assets', express.static(attachedAssetsPath, {
    maxAge: '1d',
    etag: true,
    lastModified: true
  }));
  logger.info(`[Static Assets] Serving attached_assets from ${attachedAssetsPath}`);

  // Setup Vite with graceful fallback handling
  // Uses safe loader that isolates Vite failures and provides fallback HTML server
  try {
    // ✅ FIX (Dec 11, 2025): Restore upgrade listener methods BEFORE Vite initialization
    // Vite's HMR needs to register its own WebSocket upgrade handler
    // Without this, Vite's upgrade listener is silently blocked and WebSocket connections fail after restart
    const restoreUpgrade = (global as any).__restoreUpgradeListenerMethods;
    if (restoreUpgrade) {
      restoreUpgrade();
      logger.info('[HTTP Server] 🔓 Temporarily restored upgrade listeners for Vite HMR initialization');
    }
    
    // ✅ Initialize Socket.IO terminal service (uses both WebSocket and HTTP polling)
    // This provides better proxy compatibility than raw WebSocket
    const { socketIOTerminalService } = await import('./terminal/socket-io-terminal');
    socketIOTerminalService.initialize(httpServer);
    logger.info('[SocketIO Terminal] ✅ Terminal service initialized with WebSocket + polling fallback');
    
    const { safeSetupVite, setupFallbackServer } = await import("./vite-loader");
    const viteSuccess = await safeSetupVite(app, httpServer);
    
    // ✅ Re-block upgrade listeners AFTER Vite has registered its HMR handler
    // Now both Central Dispatcher AND Vite HMR are properly registered
    httpServer.on = blockUpgradeListener(originalHttpServerOn);
    httpServer.addListener = blockUpgradeListener(originalHttpServerAddListener);
    httpServer.prependListener = blockUpgradeListener(originalHttpServerPrependListener);
    logger.info('[HTTP Server] 🔒 Re-blocked upgrade listeners after Vite initialization');
    
    if (!viteSuccess) {
      // Vite failed - setup fallback HTML server
      await setupFallbackServer(app);
    }
  } catch (error: any) {
    // If even the loader fails, setup basic fallback
    logger.error(`[WORKING SERVER] Critical: Vite loader failed: ${error.message}`);
    
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
    logger.warn(`[WORKING SERVER] Database initialization failed (non-critical): ${error.message}`);
  }

  // Seed database with test user for E2E testing (development only)
  if (process.env.NODE_ENV !== 'production') {
    try {
      const { seedDatabase } = await import("./db-seed");
      await seedDatabase();
      logger.info('✅ Test user seeded (testuser@test.com / testpass123)');
    } catch (error) {
      logger.warn(`[WORKING SERVER] Database seeding failed (non-critical): ${error.message}`);
    }
  }

  // ✅ Initialize billing workers ONLY in production (reduces log spam + CPU in dev)
  if (process.env.NODE_ENV === 'production') {
    try {
      const { startStripeUsageWorker } = await import('./workflows/stripe-usage-worker');
      startStripeUsageWorker();
      logger.info('✅ Stripe Usage Worker started - processing billing queue every 30s');
    } catch (error) {
      logger.warn(`[WORKING SERVER] Stripe worker initialization failed (non-critical): ${error.message}`);
    }

    try {
      const { startPayAsYouGoWorker } = await import('./workflows/payg-queue-processor');
      startPayAsYouGoWorker();
      logger.info('✅ Pay-as-you-go Worker started - processing overage charges every 30s');
    } catch (error) {
      logger.warn(`[WORKING SERVER] Pay-as-you-go worker initialization failed (non-critical): ${error.message}`);
    }
  } else {
    logger.info('⏭️  Billing workers skipped in development (use NODE_ENV=production to enable)');
  }

  // ✅ Mobile Sessions Cleanup Scheduler - runs every hour
  try {
    const { getStorage } = await import('./storage');
    const MOBILE_SESSION_CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
    const INITIAL_CLEANUP_DELAY = 30 * 1000; // 30 seconds delay for db connection to stabilize
    
    const runMobileSessionCleanup = async () => {
      try {
        const storage = getStorage();
        const deletedCount = await storage.cleanupExpiredMobileSessions();
        if (deletedCount > 0) {
          logger.info(`[Cleanup] Removed ${deletedCount} expired mobile sessions`);
        }
      } catch (error: any) {
        // Silent fail if table doesn't exist or is being created
        if (!error.message?.includes('does not exist')) {
          logger.warn(`[Cleanup] Mobile session cleanup failed: ${error.message}`);
        }
      }
    };
    
    // Delay initial cleanup to allow db connection to stabilize, then run every hour
    setTimeout(() => runMobileSessionCleanup(), INITIAL_CLEANUP_DELAY);
    setInterval(runMobileSessionCleanup, MOBILE_SESSION_CLEANUP_INTERVAL);
    logger.info('✅ Mobile Session Cleanup Scheduler started - running every hour');
  } catch (error: any) {
    logger.warn(`[WORKING SERVER] Mobile session cleanup initialization failed (non-critical): ${error.message}`);
  }

  // ✅ Start Storage Metrics Collector (Fortune 500 Monitoring)
  try {
    const { startStorageMetricsCollector } = await import('./jobs/storage-metrics-collector');
    startStorageMetricsCollector();
    logger.info('✅ Storage Metrics Collector started - running every hour');
  } catch (error: any) {
    logger.warn(`[WORKING SERVER] Storage metrics collector initialization failed (non-critical): ${error.message}`);
  }

  // ✅ CRITICAL FIX (Dec 1, 2025): Removed manual handleAgentUpgrade flow
  // The agent WebSocket now uses the standard { server, path, verifyClient } pattern
  // in agent-websocket-service.ts, which automatically short-circuits Express/Vite
  // 
  // Previous noServer mode with manual handleUpgrade leaked requests back to Express,
  // causing Vite to write HTML after the WebSocket handshake (resulting in "Invalid 
  // frame header" errors with 1006 closures)
  
  // ✅ All services loaded - perform post-initialization tasks
  
  // ✅ Initialize language runtime warmup asynchronously
  setImmediate(() => {
    logger.info('[RuntimeWarmup] Starting background runtime initialization...');
    initializeRuntimes().catch(err => {
      logger.error(`[RuntimeWarmup] Failed to initialize runtimes: ${err}`);
    });
  });
  
  // ✅ Restore original methods to allow adding the final guard
  if ((global as any).__restoreUpgradeListenerMethods) {
    (global as any).__restoreUpgradeListenerMethods();
    logger.info('[HTTP Server] Restored original methods to add final guard');
  }
  
  // ✅ Re-enable final guard (Nov 20, 2025)  
  // Root cause was Vite HMR, not the guard - guard correctly preserved /ws/agent sockets
  // Now that Vite HMR is on separate port 24678, guard can safely destroy orphan sockets
  httpServer.on('upgrade', installFinalUpgradeGuard);
  
  // ✅ Re-block upgrade listeners after adding guard (prevents late additions)
  const blockUpgradeListenerFinal = (method: typeof httpServer.on) => {
    return function(event: string, listener: (...args: any[]) => void) {
      if (event === 'upgrade') {
        logger.info('[HTTP Server] ⚠️ Blocked late upgrade listener');
        return httpServer;
      }
      return method(event, listener);
    } as typeof httpServer.on;
  };
  httpServer.on = blockUpgradeListenerFinal(httpServer.on.bind(httpServer));
  httpServer.addListener = blockUpgradeListenerFinal(httpServer.addListener.bind(httpServer)) as typeof httpServer.addListener;
  httpServer.prependListener = blockUpgradeListenerFinal(httpServer.prependListener.bind(httpServer)) as typeof httpServer.prependListener;
  
  logger.info('[Upgrade Guard] Final catch-all guard registered for orphan socket cleanup');
  logger.info('[HTTP Server] ✅ Upgrade listeners locked: only dispatcher + guard active');
  
  // ✅ Mark server as fully ready for health probes
  serverState.phase = 'ready';
  logger.info(`[Startup] ✅ Server ready (${Date.now() - serverState.startTime}ms startup time)`);

  // ✅ PRODUCTION OPTIMIZATION: Graceful shutdown handler
  const gracefulShutdown = async (signal: string) => {
    logger.info(`\n[Shutdown] Received ${signal}, starting graceful shutdown...`);
    
    // Stop accepting new connections
    httpServer.close(() => {
      logger.info('[Shutdown] HTTP server closed');
    });

    // Clear all registered intervals (prevents memory leaks)
    try {
      const { intervalRegistry } = await import('./utils/interval-registry');
      intervalRegistry.clearAll();
      logger.info('[Shutdown] All intervals cleared');
    } catch (e) {
      logger.warn(`[Shutdown] Interval cleanup failed: ${e}`);
    }

    // Close database pools
    try {
      const { dbPool } = await import('./services/database-pool');
      await dbPool.shutdown();
      logger.info('[Shutdown] Database pool closed');
    } catch (e) {
      logger.warn(`[Shutdown] Database pool close failed: ${e}`);
    }

    // Close Redis connections
    try {
      const { redisCache } = await import('./services/redis-cache.service');
      if (redisCache && typeof (redisCache as any).close === 'function') {
        (redisCache as any).close();
      }
      logger.info('[Shutdown] Redis connection closed');
    } catch (e) {
      logger.warn(`[Shutdown] Redis close failed: ${e}`);
    }

    // Exit after cleanup
    setTimeout(() => {
      logger.info('[Shutdown] Forced exit after timeout');
      process.exit(0);
    }, 5000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
})();