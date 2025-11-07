// Fixed server entry point - console.logs after ALL imports
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

// NOW the console.logs and actual code after all imports
console.log('[Server] All imports completed, starting server initialization...');

const app = express();
console.log('[Server] Express app created');

// Start the server immediately to open port 5000 ASAP for deployment
const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
console.log(`[Server] Attempting to bind to port ${port}...`);

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`express serving on port ${port}`);
  log(`express serving on port ${port}`);
  console.log(`[Server] Successfully bound to port ${port}`);
});

console.log('[Server] Server listen call made, continuing with middleware setup...');

// Basic middleware setup
app.use(cors());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

console.log('[Server] Basic middleware configured');

// Register routes and other setup asynchronously after server is listening
(async () => {
  try {
    console.log('[Server] Starting async initialization...');
    
    // Register routes
    await registerRoutes(app);
    console.log('[Server] Routes registered successfully');
    
    // Setup Vite or static serving
    if (app.get("env") === "development") {
      await setupVite(app, server);
      console.log('[Server] Vite development server configured');
    } else {
      serveStatic(app);
      console.log('[Server] Static file serving configured');
    }
    
    console.log('[Server] Server fully initialized and ready to handle requests');
    
    // Initialize database in background
    initializeDatabase().catch(error => {
      console.warn('[Server] Database initialization failed (non-critical):', error.message);
    });
    
  } catch (error) {
    console.error('[Server] Error during async initialization:', error);
    // Server is already listening, so we don't exit
  }
})();