/**
 * Main router aggregator for E-Code Platform
 * Combines all modular routers into a single application router
 */

import { Application, Router } from "express";
import { type IStorage } from "../storage";
import { AuthRouter } from "./auth.router";
import { ProjectsRouter } from "./projects.router";
import { FilesRouter } from "./files.router";
import { UsersRouter } from "./users.router";
import { HealthRouter } from "./health.router";
import { ChatGPTRouter } from "./chatgpt.router";
import { LoadTestingRouter } from "./load-testing.router";
import agentRouter from "./agent.router";
import createAgentPreferencesRouter from "./agent-preferences.router";
import testAgentRouter from "./test-agent";
import collaborationRouter from "./collaboration";
import deploymentRouter from "./deployment";
import fileUploadRouter from "./file-upload";
import notificationsRouter from "./notifications";
import previewRouter from "./preview";
import shellRouter from "./shell";
import containersRouter from "./containers";
import scalabilityRouter from "./scalability";
import marketplaceRouter from "./marketplace";
import adminRouter from "./admin";
import aiRouter from "./ai.router";
import aiStreamingRouter from "../api/ai-streaming";
import voiceVideoRouter from "./voice-video.router";
import dataProvisioningRouter from "./data-provisioning.router";
import terminalRouter from "./terminal.router";
import terminalMetricsRouter from "./terminal-metrics.router";
import runtimeRouter from "./runtime.router";
import packagesRouter from "./packages.router";
import { createWorkspaceRoutes } from "./workspace";
import { mobileRouter } from "../api/mobile";
import { setupAuthBypass } from "../dev-auth-bypass";
import { csrfTokenEndpoint } from "../middleware/csrf";
import { GitRouter } from "./git.router";
import debugRouter from "./debug.router";
import databaseRouter from "./database.router";
import agentAutonomousRouter from "./agent-autonomous.router";
import agentTestingRouter from "./agent-testing.router";
import agentWorkflowRouter from "./agent-workflow.router";
import createAgentPlanRouter from "./agent-plan.router";
import createAgentBuildRouter from "./agent-build.router";
import aiModelsRouter from "./ai-models.router";
import featureFlagsRouter from "./feature-flags.router";
import workspaceBootstrapRouter from "./workspace-bootstrap.router";
import adminMonitoringRouter from "./admin-monitoring.router";
import aiUsageRouter from "./ai-usage.router";
import { tierRateLimiters } from "../middleware/tier-rate-limiter";
import { aiUsageTracker } from "../middleware/ai-usage-tracker";
import { apiVersionMiddleware, rejectUnsupportedVersions } from "../middleware/api-versioning";
import globalSearchRouter from "./global-search.router";
import logsViewerRouter from "./logs-viewer.router";
import envVarsRouter from "./env-vars.router";
import projectDataRouter from "./project-data.router";
import codeGenerationRouter from "./code-generation.router";
import syncRouter from "./sync";
import backgroundTestsRouter from "./background-tests.router";
import maxAutonomyRouter from "./max-autonomy.router";
import { bountiesRouter } from "./bounties.router";
import agentGridRouter from "./agent-grid.router";
import createAgentToolsRouter from "./agent-tools.router";

export class MainRouter {
  private authRouter: AuthRouter;
  private projectsRouter: ProjectsRouter;
  private filesRouter: FilesRouter;
  private usersRouter: UsersRouter;
  private healthRouter: HealthRouter;
  private chatgptRouter: ChatGPTRouter;
  private loadTestingRouter: LoadTestingRouter;
  
  constructor(private storage: IStorage) {
    this.authRouter = new AuthRouter(storage);
    this.projectsRouter = new ProjectsRouter(storage);
    this.filesRouter = new FilesRouter(storage);
    this.usersRouter = new UsersRouter(storage);
    this.healthRouter = new HealthRouter(storage);
    this.chatgptRouter = new ChatGPTRouter(storage);
    this.loadTestingRouter = new LoadTestingRouter(storage);
  }

  /**
   * Register all routers with the Express application
   */
  registerRoutes(app: Application): void {
    // Health check routes (no auth required)
    app.use(this.healthRouter.getRouter());
    
    // Load testing routes (admin only - Fortune 500 requirement)
    app.use(this.loadTestingRouter.getRouter());
    
    // CSRF token endpoint
    app.get('/api/csrf-token', csrfTokenEndpoint);
    
    // CSRF token endpoint alias (RESTful compatibility)
    app.get('/api/auth/csrf-token', csrfTokenEndpoint);
    
    // Setup auth bypass for development
    setupAuthBypass(app);
    
    // API Versioning (Fortune 500 requirement)
    app.use('/api', apiVersionMiddleware);
    app.use('/api', rejectUnsupportedVersions);
    
    // Authentication routes (already have auth-specific rate limiting)
    app.use(this.authRouter.getRouter());
    
    // Apply tier-based rate limiting to all API routes (Fortune 500 requirement)
    // Free: 100 req/min, Pro: 1000 req/min, Enterprise: 10000 req/min
    
    // User management routes
    app.use(tierRateLimiters.api, this.usersRouter.getRouter());
    
    // Project management routes  
    app.use(tierRateLimiters.api, this.projectsRouter.getRouter());
    
    // File management routes
    app.use(tierRateLimiters.api, this.filesRouter.getRouter());
    
    // ChatGPT admin routes
    app.use(tierRateLimiters.api, this.chatgptRouter.getRouter());
    
    // AI Usage Tracking (Pay-As-You-Go) - Track all AI/Agent requests for billing
    // No blocking - users pay for what they use via Stripe metered billing
    app.use('/api/agent', aiUsageTracker);
    app.use('/api/admin/agent', aiUsageTracker);
    
    // Agent preferences routes (authenticated users) - user-facing preferences
    app.use('/api/agent', tierRateLimiters.api, createAgentPreferencesRouter(this.storage));
    
    // Agent tools routes (web search, testing, extended thinking) - authenticated users
    app.use('/api/agent', tierRateLimiters.api, createAgentToolsRouter());
    
    // Agent routes (admin only)
    app.use('/api/admin/agent', tierRateLimiters.api, agentRouter);
    
    // Agent plan routes (REAL AI-powered plan generation with streaming) - authenticated users
    // ✅ FORTUNE 500 FIX: Use streaming rate limiter for SSE endpoints
    app.use('/api/agent/plan', tierRateLimiters.streaming, createAgentPlanRouter(this.storage));
    
    // Agent build routes (build execution with SSE progress streaming) - authenticated users
    // ✅ FORTUNE 500 FIX: Use streaming rate limiter for SSE endpoints
    app.use('/api/agent/build', tierRateLimiters.streaming, createAgentBuildRouter(this.storage));
    
    // Autonomous agent routes (authenticated users) - single mount point
    app.use('/api/agent', tierRateLimiters.streaming, agentAutonomousRouter);
    
    // Agent workflow routes (feature generation, build selection) - authenticated users
    app.use('/api/agent', tierRateLimiters.api, agentWorkflowRouter);
    
    // Agent testing routes (browser testing, element selector, recording) - Phase 2 (ADMIN ONLY)
    app.use('/api/admin/agent', tierRateLimiters.api, agentTestingRouter);
    
    // Test agent routes (for testing without auth)
    app.use(tierRateLimiters.api, testAgentRouter);
    
    // Collaboration routes
    app.use('/api/collaboration', tierRateLimiters.api, collaborationRouter);
    
    // Deployment routes
    app.use(tierRateLimiters.api, deploymentRouter);
    
    // File upload routes
    app.use('/api/upload', tierRateLimiters.api, fileUploadRouter);
    
    // Notifications routes
    app.use('/api/notifications', tierRateLimiters.api, notificationsRouter);
    
    // Preview routes
    app.use('/api/preview', tierRateLimiters.api, previewRouter);
    
    // Shell routes
    app.use('/api/shell', tierRateLimiters.api, shellRouter);
    
    // Containers routes
    app.use('/api/containers', tierRateLimiters.api, containersRouter);
    
    // Scalability routes
    app.use('/api/scalability', tierRateLimiters.api, scalabilityRouter);
    
    // Marketplace routes
    app.use('/api/marketplace', tierRateLimiters.api, marketplaceRouter);
    
    // Admin routes
    app.use('/api/admin', tierRateLimiters.api, adminRouter);
    
    // Admin Monitoring routes (Fortune 500 Rate Limit Dashboard)
    app.use('/api/admin/monitoring', tierRateLimiters.api, adminMonitoringRouter);
    
    // AI Usage Tracking (Pay-As-You-Go) - Track AI routes for billing
    // CRITICAL: Apply BEFORE mounting routers to ensure all AI endpoints are tracked
    app.use('/api/ai', aiUsageTracker);
    app.use('/api/models', aiUsageTracker);
    
    // AI routes (REST endpoints for chat, completions, etc.)
    app.use('/api', tierRateLimiters.api, aiRouter);
    
    // AI Usage Metering routes (Pay-As-You-Go billing endpoints)
    app.use('/api/ai/usage', tierRateLimiters.api, aiUsageRouter);
    app.use('/api/admin/ai-usage', tierRateLimiters.api, aiUsageRouter);
    
    // AI Models Selection routes
    app.use('/api/models', tierRateLimiters.api, aiModelsRouter);
    
    // Code Generation routes (SSE streaming for real-time code generation)
    app.use('/api/code-generation', tierRateLimiters.streaming, codeGenerationRouter);
    
    // Feature Flags routes (runtime toggles for experimental features)
    app.use(tierRateLimiters.api, featureFlagsRouter);
    
    // AI Streaming routes (Agent chat with SSE)
    // ✅ FORTUNE 500 FIX: Use streaming rate limiter instead of API limiter for SSE endpoints
    app.use(tierRateLimiters.streaming, aiStreamingRouter);
    
    // Voice/Video WebRTC routes
    app.use('/api', tierRateLimiters.api, voiceVideoRouter);
    
    // Data Provisioning routes
    app.use('/api', tierRateLimiters.api, dataProvisioningRouter);
    
    // Terminal routes (logs and console output)
    app.use(tierRateLimiters.api, terminalRouter);
    
    // Terminal metrics routes (Fortune 500 scalability monitoring)
    app.use('/api/terminal', tierRateLimiters.api, terminalMetricsRouter);
    
    // Runtime routes (start, stop, execute, logs)
    app.use(tierRateLimiters.api, runtimeRouter);
    
    // Packages routes (AI-driven package automation)
    app.use('/api/packages', tierRateLimiters.api, packagesRouter);
    
    // Workspace routes (LSP, builds, tests, security, resources)
    app.use('/api/workspace', tierRateLimiters.api, createWorkspaceRoutes(this.storage));
    
    // Workspace Bootstrap routes (Fortune 500-grade orchestration)
    app.use('/api/workspace', tierRateLimiters.api, workspaceBootstrapRouter);
    
    // Mobile app routes
    app.use(tierRateLimiters.api, mobileRouter);
    
    // Git integration routes
    app.use('/api/git', tierRateLimiters.api, GitRouter);
    
    // Debug routes
    app.use('/api/debug', tierRateLimiters.api, debugRouter);
    
    // Database routes (Admin-Only - System-wide DB inspector)
    app.use('/api/admin/database', tierRateLimiters.api, databaseRouter);
    
    // Project Data routes (Project-scoped data for regular users)
    app.use('/api/projects', tierRateLimiters.api, projectDataRouter);
    
    // Global Search routes (Priorité 1 - Core IDE)
    app.use('/api/search', tierRateLimiters.api, globalSearchRouter);
    
    // Logs Viewer routes (Priorité 1 - Core IDE)
    app.use('/api/logs', tierRateLimiters.api, logsViewerRouter);
    
    // Environment Variables routes (Priorité 1 - Core IDE)
    app.use('/api/env-vars', tierRateLimiters.api, envVarsRouter);

    // Multi-Device Sync routes (Workspace state, preferences, devices)
    app.use('/api/sync', tierRateLimiters.api, syncRouter);
    
    // Background Testing routes (Replit Agent 3 auto-testing)
    app.use('/api/background-tests', tierRateLimiters.api, backgroundTestsRouter);
    
    // Max Autonomy Mode routes (200+ minute autonomous sessions)
    app.use('/api/autonomy', tierRateLimiters.streaming, maxAutonomyRouter);
    
    // Bounties Marketplace routes (Stripe Connect integration)
    app.use('/api/bounties', tierRateLimiters.api, bountiesRouter);
    
    // Agent Grid routes (Phase 2 - AG Grid Dashboard)
    app.use('/api/agent-grid', tierRateLimiters.api, agentGridRouter);
  }
  
  /**
   * Get all routers for testing purposes
   */
  getRouters() {
    return {
      auth: this.authRouter.getRouter(),
      projects: this.projectsRouter.getRouter(),
      files: this.filesRouter.getRouter(),
      users: this.usersRouter.getRouter(),
      health: this.healthRouter.getRouter()
    };
  }
}