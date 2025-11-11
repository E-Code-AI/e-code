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
import agentRouter from "./agent.router";
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

export class MainRouter {
  private authRouter: AuthRouter;
  private projectsRouter: ProjectsRouter;
  private filesRouter: FilesRouter;
  private usersRouter: UsersRouter;
  private healthRouter: HealthRouter;
  private chatgptRouter: ChatGPTRouter;
  
  constructor(private storage: IStorage) {
    this.authRouter = new AuthRouter(storage);
    this.projectsRouter = new ProjectsRouter(storage);
    this.filesRouter = new FilesRouter(storage);
    this.usersRouter = new UsersRouter(storage);
    this.healthRouter = new HealthRouter(storage);
    this.chatgptRouter = new ChatGPTRouter(storage);
  }

  /**
   * Register all routers with the Express application
   */
  registerRoutes(app: Application): void {
    // Health check routes (no auth required)
    app.use(this.healthRouter.getRouter());
    
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
    
    // Agent routes (admin only)
    app.use('/api/admin/agent', agentRouter);
    
    // Agent plan routes (REAL AI-powered plan generation with streaming) - authenticated users
    // Mounted at /api/agent to avoid conflicts with legacy endpoints
    app.use('/api/agent', createAgentPlanRouter(this.storage));
    
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
    
    // AI routes
    app.use('/api', aiRouter);
    
    // AI Streaming routes (Agent chat with SSE)
    app.use(aiStreamingRouter);
    
    // Voice/Video WebRTC routes
    app.use('/api', voiceVideoRouter);
    
    // Data Provisioning routes
    app.use('/api', dataProvisioningRouter);
    
    // Terminal routes (logs and console output)
    app.use(terminalRouter);
    
    // Runtime routes (start, stop, execute, logs)
    app.use(runtimeRouter);
    
    // Packages routes (AI-driven package automation)
    app.use('/api/packages', packagesRouter);
    
    // Workspace routes (LSP, builds, tests, security, resources)
    app.use('/api/workspace', createWorkspaceRoutes(this.storage));
    
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