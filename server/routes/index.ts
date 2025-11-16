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
import agentAutonomousRouter from "./agent-autonomous.router";
import agentTestingRouter from "./agent-testing.router";
import agentWorkflowRouter from "./agent-workflow.router";
import createAgentPlanRouter from "./agent-plan.router";
import createAgentBuildRouter from "./agent-build.router";
import aiModelsRouter from "./ai-models.router";
import featureFlagsRouter from "./feature-flags.router";
import workspaceBootstrapRouter from "./workspace-bootstrap.router";
import adminMonitoringRouter from "./admin-monitoring.router";
import { tierRateLimiters } from "../middleware/tier-rate-limiter";

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
    
    // Authentication routes
    app.use(this.authRouter.getRouter());
    
    // User management routes
    app.use(this.usersRouter.getRouter());
    
    // Project management routes  
    app.use(this.projectsRouter.getRouter());
    
    // File management routes
    app.use(this.filesRouter.getRouter());
    
    // ChatGPT admin routes
    app.use(this.chatgptRouter.getRouter());
    
    // Fortune 500 AI Rate Limiter - Apply to all AI/Agent routes
    // Free: 10/min, Pro: 100/min, Enterprise: 1000/min (10x in dev)
    app.use('/api/agent', tierRateLimiters.ai);
    app.use('/api/admin/agent', tierRateLimiters.ai);
    
    // Agent preferences routes (authenticated users) - user-facing preferences
    app.use('/api/agent', createAgentPreferencesRouter(this.storage));
    
    // Agent routes (admin only)
    app.use('/api/admin/agent', agentRouter);
    
    // Agent plan routes (REAL AI-powered plan generation with streaming) - authenticated users
    // Mounted at /api/agent to avoid conflicts with legacy endpoints
    app.use('/api/agent', createAgentPlanRouter(this.storage));
    
    // Agent build routes (build execution with SSE progress streaming) - authenticated users
    app.use('/api/agent/build', createAgentBuildRouter(this.storage));
    
    // Autonomous agent routes (authenticated users) - single mount point
    app.use('/api/agent', agentAutonomousRouter);
    
    // Agent workflow routes (feature generation, build selection) - authenticated users
    app.use('/api/agent', agentWorkflowRouter);
    
    // Agent testing routes (browser testing, element selector, recording) - Phase 2 (ADMIN ONLY)
    app.use('/api/admin/agent', agentTestingRouter);
    
    // Test agent routes (for testing without auth)
    app.use(testAgentRouter);
    
    // Collaboration routes
    app.use('/api/collaboration', collaborationRouter);
    
    // Deployment routes
    app.use(deploymentRouter);
    
    // File upload routes
    app.use('/api/upload', fileUploadRouter);
    
    // Notifications routes
    app.use('/api/notifications', notificationsRouter);
    
    // Preview routes
    app.use('/api/preview', previewRouter);
    
    // Shell routes
    app.use('/api/shell', shellRouter);
    
    // Containers routes
    app.use('/api/containers', containersRouter);
    
    // Scalability routes
    app.use('/api/scalability', scalabilityRouter);
    
    // Marketplace routes
    app.use('/api/marketplace', marketplaceRouter);
    
    // Admin routes
    app.use('/api/admin', adminRouter);
    
    // Admin Monitoring routes (Fortune 500 Rate Limit Dashboard)
    app.use('/api/admin/monitoring', adminMonitoringRouter);
    
    // Fortune 500 AI Rate Limiter - Apply to AI routes
    // CRITICAL: Apply BEFORE mounting routers to ensure all AI endpoints are protected
    app.use('/api/ai', tierRateLimiters.ai);
    app.use('/api/models', tierRateLimiters.ai);
    
    // AI routes (REST endpoints for chat, completions, etc.)
    app.use('/api', aiRouter);
    
    // AI Models Selection routes
    app.use('/api/models', aiModelsRouter);
    
    // Feature Flags routes (runtime toggles for experimental features)
    app.use(featureFlagsRouter);
    
    // AI Streaming routes (Agent chat with SSE)
    // NOTE: Tier limiter is applied INSIDE aiStreamingRouter to avoid affecting other routes
    app.use(aiStreamingRouter);
    
    // Voice/Video WebRTC routes
    app.use('/api', voiceVideoRouter);
    
    // Data Provisioning routes
    app.use('/api', dataProvisioningRouter);
    
    // Terminal routes (logs and console output)
    app.use(terminalRouter);
    
    // Terminal metrics routes (Fortune 500 scalability monitoring)
    app.use('/api/terminal', terminalMetricsRouter);
    
    // Runtime routes (start, stop, execute, logs)
    app.use(runtimeRouter);
    
    // Packages routes (AI-driven package automation)
    app.use('/api/packages', packagesRouter);
    
    // Workspace routes (LSP, builds, tests, security, resources)
    app.use('/api/workspace', createWorkspaceRoutes(this.storage));
    
    // Workspace Bootstrap routes (Fortune 500-grade orchestration)
    app.use('/api/workspace', workspaceBootstrapRouter);
    
    // Mobile app routes
    app.use(mobileRouter);
    
    // Git integration routes
    app.use('/api/git', GitRouter);
    
    // Debug routes
    app.use('/api/debug', debugRouter);
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