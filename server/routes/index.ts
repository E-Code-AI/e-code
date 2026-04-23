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
import collaborationRouter from "./collaboration";
import deploymentRouter from "./deployment";
import fileUploadRouter from "./file-upload";
import notificationsRouter from "./notifications";
import previewRouter from "./preview";
import shellRouter from "./shell";
import containersRouter from "./containers";
import scalabilityRouter from "./scalability";
import marketplaceRouter from "./marketplace";
import communityRouter from "./community.router";
import adminRouter from "./admin";
import aiRouter from "./ai.router";
import aiStreamingRouter from "../api/ai-streaming";
import voiceVideoRouter from "./voice-video.router";
import voiceTranscribeRouter from "./voice-transcribe.router";
import dataProvisioningRouter from "./data-provisioning.router";
import terminalRouter from "./terminal.router";
import terminalMetricsRouter from "./terminal-metrics.router";
import runtimeRouter from "./runtime.router";
import packagesRouter, { projectPackagesRouter } from "./packages.router";
import { createWorkspaceRoutes } from "./workspace";
import workspacesRouter from "./workspaces.router";
import { mobileRouter } from "../api/mobile";
// SECURITY FIX: Auth bypass removed - all authentication goes through Passport sessions
import { csrfTokenEndpoint } from "../middleware/csrf";
import { GitRouter } from "./git.router";
import gitProjectRouter from "./git-project.router";
import debugRouter from "./debug.router";
import databaseRouter from "./database.router";
import featureFlagsRouter from "./feature-flags.router";
import adminMonitoringRouter from "./admin-monitoring.router";
import adminSystemMetricsRouter from "./admin-system-metrics.router";
import adminBillingRouter from "./admin-billing.router";
import aiUsageRouter from "./ai-usage.router";
import { tierRateLimiters } from "../middleware/tier-rate-limiter";
import { aiUsageTracker } from "../middleware/ai-usage-tracker";
import { apiVersionMiddleware, rejectUnsupportedVersions } from "../middleware/api-versioning";
import globalSearchRouter from "./global-search.router";
import projectSearchRouter from "./project-search.router";
import logsViewerRouter from "./logs-viewer.router";
import envVarsRouter from "./env-vars.router";
import projectDataRouter from "./project-data.router";
import codeReviewRouter from "./code-review.router";
import syncRouter from "./sync";
import maxAutonomyRouter from "./max-autonomy.router";
import { bountiesRouter } from "./bounties.router";
import agentGridRouter from "./agent-grid.router";
import sshKeysRouter from "./ssh-keys.router";
import projectMonitoringRouter from "./project-monitoring.router";
import { authCompleteRouter } from "./auth-complete";
import placeholderRouter from "./placeholder.router";
import analyticsRouter from "./analytics.router";
import { prometheusRouter } from "../monitoring/prometheus";
// DEPRECATED: Use unified checkpoints router instead
// import autoCheckpointsRouter from "./auto-checkpoints.router";
import unifiedCheckpointsRouter from "./unified-checkpoints.router";
import mobileSessionsRouter from "./mobile-sessions.router";
import mobileBuildsRouter from "./mobile-builds.router";
import { expoSnackRouter } from "./expo-snack.router";
import rollbackRouter from "./rollback.router";
import { replitdbRouter } from "./replitdb.router";
import sendgridWebhooksRouter from './webhooks-sendgrid.router';
import logsRouter from './logs.router';
import effortRouter from './effort.router';
import secretsRouter from './secrets.router';
import themesRouter from './themes.router';
import globalThemesRouter from './global-themes.router';
import settingsRouter from './settings.router';
import projectShellRouter from './shell.router';
import storageRouter from './storage.router';
import kvStoreRouter from './kv-store.router';
import extensionsRouter from './extensions.router';
import workflowsRouter from './workflows.router';
import teamsRouter from './teams.router';
import polyglotRouter from '../polyglot-routes';
import twoFactorRouter from './2fa.router';
import resourcesRouter from './resources.router';
import seoRouter from './seo.router';
import runnerWorkspacesRouter from './runner-workspaces.router';
import publicFormsRouter from './public-forms.router';
import projectAuthRouter from './project-auth.router';
import statusRouter from './status.router';
import mcpServersRouter from './mcp-servers.router';
import networkingRouter from './networking.router';
import videoRouter from './video.router';
import screenshotsRouter from './screenshots.router';
import { setupPreviewRoutes } from '../preview/preview-service';

const lazyAgentRouter = async (req: any, res: any, next: any) => {
  try {
    const module = await import('./agent.router');
    return module.default(req, res, next);
  } catch (error) {
    return next(error);
  }
};

const lazyRouter = (loader: () => Promise<{ default: any }>) => async (req: any, res: any, next: any) => {
  try {
    const module = await loader();
    return module.default(req, res, next);
  } catch (error) {
    return next(error);
  }
};

const lazyTestAgentRouter = lazyRouter(() => import('./test-agent'));
const lazyAiModelsRouter = lazyRouter(() => import('./ai-models.router'));
const lazyWorkspaceBootstrapRouter = lazyRouter(() => import('./workspace-bootstrap.router'));
const lazyCodeGenerationRouter = lazyRouter(() => import('./code-generation.router'));
const lazyMemoryBankRouter = lazyRouter(() => import('./memory-bank.router'));
const lazyAgentAutonomousRouter = lazyRouter(() => import('./agent-autonomous.router'));
const lazyAgentTestingRouter = lazyRouter(() => import('./agent-testing.router'));
const lazyAgentWorkflowRouter = lazyRouter(() => import('./agent-workflow.router'));
const lazyAgentStepCacheRouter = lazyRouter(() => import('./agent-step-cache.router'));
const lazyBackgroundTestsRouter = lazyRouter(() => import('./background-tests.router'));
const lazyRagRouter = lazyRouter(() => import('./rag.router'));
const lazyAiHealthRouter = lazyRouter(() => import('./ai-health'));
const lazyGenerationMetricsRouter = lazyRouter(() => import('./generation-metrics.router'));

export class MainRouter {
  private authRouter: AuthRouter;
  private projectsRouter: ProjectsRouter;
  private filesRouter: FilesRouter;
  private usersRouter: UsersRouter;
  private healthRouter: HealthRouter;

  constructor(private storage: IStorage) {
    this.authRouter = new AuthRouter(storage);
    this.projectsRouter = new ProjectsRouter(storage);
    this.filesRouter = new FilesRouter(storage);
    this.usersRouter = new UsersRouter(storage);
    this.healthRouter = new HealthRouter(storage);
  }

  /**
   * Register all routers with the Express application
   */
  registerRoutes(app: Application): void {
    let cachedChatGPTRouter: Router | undefined;
    const lazyChatGPTRouter = async (req: any, res: any, next: any) => {
      try {
        if (!cachedChatGPTRouter) {
          const { ChatGPTRouter } = await import('./chatgpt.router');
          cachedChatGPTRouter = new ChatGPTRouter(this.storage).getRouter();
        }
        return cachedChatGPTRouter(req, res, next);
      } catch (error) {
        return next(error);
      }
    };

    let cachedLoadTestingRouter: Router | undefined;
    const lazyLoadTestingRouter = async (req: any, res: any, next: any) => {
      try {
        if (!cachedLoadTestingRouter) {
          const { LoadTestingRouter } = await import('./load-testing.router');
          cachedLoadTestingRouter = new LoadTestingRouter(this.storage).getRouter();
        }
        return cachedLoadTestingRouter(req, res, next);
      } catch (error) {
        return next(error);
      }
    };

    let cachedAgentPreferencesRouter: Router | undefined;
    const lazyAgentPreferencesRouter = async (req: any, res: any, next: any) => {
      try {
        if (!cachedAgentPreferencesRouter) {
          const module = await import('./agent-preferences.router');
          cachedAgentPreferencesRouter = module.default(this.storage);
        }
        return cachedAgentPreferencesRouter(req, res, next);
      } catch (error) {
        return next(error);
      }
    };

    let cachedAgentToolsRouter: Router | undefined;
    const lazyAgentToolsRouter = async (req: any, res: any, next: any) => {
      try {
        if (!cachedAgentToolsRouter) {
          const module = await import('./agent-tools.router');
          cachedAgentToolsRouter = module.default();
        }
        return cachedAgentToolsRouter(req, res, next);
      } catch (error) {
        return next(error);
      }
    };

    let cachedAgentPlanRouter: Router | undefined;
    const lazyAgentPlanRouter = async (req: any, res: any, next: any) => {
      try {
        if (!cachedAgentPlanRouter) {
          const module = await import('./agent-plan.router');
          cachedAgentPlanRouter = module.default(this.storage);
        }
        return cachedAgentPlanRouter(req, res, next);
      } catch (error) {
        return next(error);
      }
    };

    let cachedAgentBuildRouter: Router | undefined;
    const lazyAgentBuildRouter = async (req: any, res: any, next: any) => {
      try {
        if (!cachedAgentBuildRouter) {
          const module = await import('./agent-build.router');
          cachedAgentBuildRouter = module.default(this.storage);
        }
        return cachedAgentBuildRouter(req, res, next);
      } catch (error) {
        return next(error);
      }
    };

    // Health check routes (no auth required)
    app.use('/api', this.healthRouter.getRouter());

    // Prometheus metrics endpoint (no auth required for scraping)
    app.use('/api', prometheusRouter);

    // Placeholder image routes (no auth required - used for avatars and product images)
    app.use('/api', placeholderRouter);

    // Frontend telemetry ingestion (no auth required - anonymous telemetry)
    app.use('/api', logsRouter);

    // Load testing routes (admin only - Fortune 500 requirement)
    app.use('/api', lazyLoadTestingRouter);

    // CSRF token endpoint
    app.get('/api/csrf-token', csrfTokenEndpoint);

    // CSRF token endpoint alias (RESTful compatibility)
    app.get('/api/auth/csrf-token', csrfTokenEndpoint);

    // SECURITY FIX: Auth bypass endpoints removed - authentication via Passport sessions only

    // API Versioning (Fortune 500 requirement)
    app.use('/api', apiVersionMiddleware);
    app.use('/api', rejectUnsupportedVersions);

    // Authentication routes (already have auth-specific rate limiting)
    app.use('/api', this.authRouter.getRouter());

    // OAuth authentication routes (GitHub, Google, etc.)
    app.use('/api/auth', tierRateLimiters.auth, authCompleteRouter);

    // Two-Factor Authentication routes (TOTP, backup codes, emergency access)
    app.use('/api/2fa', tierRateLimiters.auth, twoFactorRouter);

    // Apply tier-based rate limiting to all API routes (Fortune 500 requirement)
    // Free: 100 req/min, Pro: 1000 req/min, Enterprise: 10000 req/min

    // User management routes
    app.use('/api/users', tierRateLimiters.api, this.usersRouter.getRouter());

    // Alias: /api/user/* → /api/users/* (singular form used by some frontend components)
    app.use('/api/user', tierRateLimiters.api, this.usersRouter.getRouter());

    // Project management routes  
    app.use('/api/projects', tierRateLimiters.api, this.projectsRouter.getRouter());

    // File management routes
    app.use('/api/projects', tierRateLimiters.api, this.filesRouter.getRouter());

    // ChatGPT admin routes (router uses /api/admin/chatgpt/... paths internally)
    app.use('/api', tierRateLimiters.api, lazyChatGPTRouter);

    // AI Usage Tracking (Pay-As-You-Go) - Track all AI/Agent requests for billing
    // No blocking - users pay for what they use via Stripe metered billing
    app.use('/api/agent', aiUsageTracker);
    app.use('/api/admin/agent', aiUsageTracker);

    // Agent preferences routes (authenticated users) - user-facing preferences
    app.use('/api/agent', tierRateLimiters.api, lazyAgentPreferencesRouter);

    // Agent tools routes (web search, testing, extended thinking) - authenticated users
    app.use('/api/agent', tierRateLimiters.api, lazyAgentToolsRouter);

    // Agent routes (admin only)
    // app.use('/api/admin/agent', tierRateLimiters.api, agentRouter);

    // Agent plan routes (REAL AI-powered plan generation with streaming) - authenticated users
    // ✅ FORTUNE 500 FIX: Use streaming rate limiter for SSE endpoints
    app.use('/api/agent/plan', tierRateLimiters.streaming, lazyAgentPlanRouter);

    // Agent build routes (build execution with SSE progress streaming) - authenticated users
    // ✅ FORTUNE 500 FIX: Use streaming rate limiter for SSE endpoints
    app.use('/api/agent/build', tierRateLimiters.streaming, lazyAgentBuildRouter);

    // Autonomous agent routes (authenticated users) - single mount point
    app.use('/api/agent', tierRateLimiters.streaming, lazyAgentAutonomousRouter);

    // Agent workflow routes (feature generation, build selection) - authenticated users
    app.use('/api/agent', tierRateLimiters.api, lazyAgentWorkflowRouter);

    // Agent routes (authenticated users) - schema warming, status, stream, conversation, messages
    // Mounted at /api/agent for schema/warm, schema/status, schema/stream, conversation, and messages endpoints
    app.use('/api/agent', tierRateLimiters.streaming, lazyAgentRouter);

    // Agent step cache routes (caching intermediate agent phases for cost optimization)
    app.use('/api/agent/step-cache', tierRateLimiters.api, lazyAgentStepCacheRouter);

    // Agent testing routes (browser testing, element selector, recording) - Phase 2 (ADMIN ONLY)
    app.use('/api/admin/agent', tierRateLimiters.api, lazyAgentTestingRouter);

    // Test agent routes (uses /api/test/agent internally)
    app.use('/api', tierRateLimiters.api, lazyTestAgentRouter);

    // Runner status (no auth required for health check)
    // Handled by runnerWorkspacesRouter at /api/runner/status
    // DEPRECATED inline implementation:
    /*
    app.get('/api/runner/status', async (_req, res) => {
      const runner = await import('../runnerClient');
      const health = await runner.pingRunner();
      res.json(health);
    });
    */

    // Collaboration routes
    app.use('/api/collaboration', tierRateLimiters.api, collaborationRouter);

    // Deployment routes
    app.use('/api', tierRateLimiters.api, deploymentRouter);

    // Deployment Rollback routes (uses /api/deployments/... internally)
    // No mount prefix because router uses absolute paths like /deployments
    app.use('/api', tierRateLimiters.api, rollbackRouter);

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

    // Resources routes (uses /api/resources internally)
    // No mount prefix because router uses absolute paths like /resources
    app.use('/api', tierRateLimiters.api, resourcesRouter);

    // Marketplace routes
    app.use('/api/marketplace', tierRateLimiters.api, marketplaceRouter);

    // Community routes
    app.use('/api/community', tierRateLimiters.api, communityRouter);

    // Teams routes
    app.use('/api/teams', tierRateLimiters.api, teamsRouter);

    // Polyglot Backend routes (TypeScript, Go, Python multi-language services)
    app.use('/api', tierRateLimiters.api, polyglotRouter);

    // Admin routes
    app.use('/api/admin', tierRateLimiters.api, adminRouter);

    // Admin Monitoring routes (Fortune 500 Rate Limit Dashboard)
    app.use('/api/admin/monitoring', tierRateLimiters.api, adminMonitoringRouter);

    // Admin System Metrics routes (Fortune 500 System Monitoring Dashboard)
    app.use('/api/admin/system', tierRateLimiters.api, adminSystemMetricsRouter);

    // Admin Billing routes (Stripe integration, pricing plans, invoices)
    app.use('/api/admin/billing', tierRateLimiters.api, adminBillingRouter);

    // SEO Analytics routes (admin only - SEO management dashboard)
    app.use('/api/admin/seo', tierRateLimiters.api, seoRouter);

    // Verify system status (including Runner status)
    app.get('/api/system/status', async (req, res) => {
      const runnerHealth = await import('../runnerClient').then(m => m.pingRunner()).catch(() => ({ online: false }));
      res.json({
        platform: 'online',
        runner: runnerHealth,
        timestamp: new Date().toISOString()
      });
    });

    // Generation Metrics routes (App generation performance monitoring)
    app.use('/api/metrics/generation', tierRateLimiters.api, lazyGenerationMetricsRouter);

    // AI Usage Tracking (Pay-As-You-Go) - Track AI routes for billing
    // CRITICAL: Apply BEFORE mounting routers to ensure all AI endpoints are tracked
    // NOTE: Only apply to endpoints that actually consume AI credits, not metadata endpoints
    app.use('/api/ai', aiUsageTracker);
    // Removed: /api/models - This is a metadata endpoint, doesn't consume AI credits

    // AI routes (REST endpoints for chat, completions, etc.)
    // Dual-mount: /api and /api/ai for frontend compatibility (e.g. /api/ai/features)
    app.use('/api', tierRateLimiters.api, aiRouter);
    app.use('/api/ai', tierRateLimiters.api, aiRouter);

    // AI Usage Metering routes (Pay-As-You-Go billing endpoints)
    app.use('/api/usage', tierRateLimiters.api, aiUsageRouter);
    app.use('/api/ai/usage', tierRateLimiters.api, aiUsageRouter);
    app.use('/api/admin/ai-usage', tierRateLimiters.api, aiUsageRouter);

    // AI Models Selection routes (both paths for frontend compatibility)
    app.use('/api/models', tierRateLimiters.api, lazyAiModelsRouter);
    app.use('/api/ai/models', tierRateLimiters.api, lazyAiModelsRouter);

    // RAG (Retrieval-Augmented Generation) routes
    app.use('/api/rag', tierRateLimiters.api, lazyRagRouter);

    // Memory Bank routes (Kilocode-inspired persistent project context)
    app.use('/api/memory-bank', tierRateLimiters.api, lazyMemoryBankRouter);

    // Unified Checkpoints routes (Replit-style checkpoint system)
    // DEPRECATED: Old autoCheckpointsRouter - use unifiedCheckpointsRouter instead
    // app.use('/api', tierRateLimiters.api, autoCheckpointsRouter);
    app.use('/api', tierRateLimiters.api, unifiedCheckpointsRouter);

    // AI Health Check routes (Fortune 500 - validates all 21 models with 60s cache)
    app.use('/api/ai/health', tierRateLimiters.api, lazyAiHealthRouter);

    // Code Generation routes (SSE streaming for real-time code generation)
    app.use('/api/code-generation', tierRateLimiters.streaming, lazyCodeGenerationRouter);

    // Feature Flags routes (uses /api/feature-flags internally)
    app.use('/api', tierRateLimiters.api, featureFlagsRouter);

    // AI Streaming routes (uses /api/agent/chat/stream, /api/agent/models internally)
    // ✅ FORTUNE 500 FIX: Use streaming rate limiter instead of API limiter for SSE endpoints
    app.use('/api', tierRateLimiters.streaming, aiStreamingRouter);

    // Voice/Video WebRTC routes (uses /api/voice-video/... internally)
    app.use('/api/voice-video', tierRateLimiters.api, voiceVideoRouter);

    // Voice transcription (uses /api/voice/transcribe internally)
    app.use('/api/voice', tierRateLimiters.api, voiceTranscribeRouter);

    // Data Provisioning routes (uses /api/data-provisioning/... internally)
    app.use('/api/data-provisioning', tierRateLimiters.api, dataProvisioningRouter);

    // Terminal routes (uses /api/terminal/... internally)
    app.use('/api', tierRateLimiters.api, terminalRouter);

    // Terminal metrics routes (Fortune 500 scalability monitoring)
    app.use('/api/terminal', tierRateLimiters.api, terminalMetricsRouter);

    // Runtime routes (uses /api/runtime/..., /api/projects/:id/runtime/..., /api/execute internally)
    app.use('/api', tierRateLimiters.api, runtimeRouter);

    // Packages routes (AI-driven package automation)
    app.use('/api/packages', tierRateLimiters.api, packagesRouter);

    // Project-scoped package routes (frontend-compatible)
    app.use('/api/projects', tierRateLimiters.api, projectPackagesRouter);

    // Code Review routes (AI-powered code analysis)
    app.use('/api/code-review', tierRateLimiters.api, codeReviewRouter);

    // Workspace routes (LSP, builds, tests, security, resources)
    app.use('/api/workspace', tierRateLimiters.api, createWorkspaceRoutes(this.storage));

    // Workspace Bootstrap routes (Fortune 500-grade orchestration)
    app.use('/api/workspace', tierRateLimiters.api, lazyWorkspaceBootstrapRouter);

    // Mobile app routes
    app.use('/api', tierRateLimiters.api, mobileRouter);

    // Mobile Sessions routes (session management for mobile apps)
    app.use('/api/mobile', tierRateLimiters.api, mobileSessionsRouter);

    // Mobile Builds routes (EAS Build integration for iOS/Android)
    app.use('/api/mobile', tierRateLimiters.api, mobileBuildsRouter);

    // Expo Snack integration for real mobile simulation
    app.use('/api/expo-snack', tierRateLimiters.api, expoSnackRouter);

    // Git integration routes (platform-level git) — must come BEFORE gitProjectRouter
    // to prevent /:projectId/status from swallowing /github/status etc.
    app.use('/api/git', tierRateLimiters.api, GitRouter);

    // Per-project git routes (/:projectId/status, /branches, /commits, etc.)
    app.use('/api/git', tierRateLimiters.api, gitProjectRouter);

    // Debug routes
    app.use('/api/debug', tierRateLimiters.api, debugRouter);

    // Database routes (Admin-Only - System-wide DB inspector)
    app.use('/api/admin/database', tierRateLimiters.api, databaseRouter);

    // Database routes (Per-project database provisioning - Replit-style)
    app.use('/api/database', tierRateLimiters.api, databaseRouter);

    // ReplitDB-compatible Key-Value Database API (for container code)
    app.use('/api/db', replitdbRouter);

    // KV Store UI routes (for the KV Store panel in the IDE)
    app.use('/api/kv-store', tierRateLimiters.api, kvStoreRouter);

    // Project Data routes (Project-scoped data for regular users)
    app.use('/api/projects', tierRateLimiters.api, projectDataRouter);

    // Global Search routes (Priorité 1 - Core IDE)
    app.use('/api/search', tierRateLimiters.api, globalSearchRouter);

    // Project-scoped Search routes (file content and file name search)
    app.use('/api/projects', tierRateLimiters.api, projectSearchRouter);

    // Logs Viewer routes (Priorité 1 - Core IDE)
    app.use('/api/logs', tierRateLimiters.api, logsViewerRouter);

    // Environment Variables routes (Priorité 1 - Core IDE)
    app.use('/api/env-vars', tierRateLimiters.api, envVarsRouter);

    // SSH keys routes (user-level SSH key management)
    app.use('/api/ssh-keys', tierRateLimiters.api, sshKeysRouter);

    // Project monitoring routes
    app.use('/api/projects', tierRateLimiters.api, projectMonitoringRouter);

    // Secrets routes (Per-project secrets management - Replit-style)
    app.use('/api/projects/:projectId/secrets', tierRateLimiters.api, secretsRouter);

    // Themes routes (Per-project theme persistence)
    app.use('/api/projects/:projectId/themes', tierRateLimiters.api, themesRouter);

    // Global themes routes (user-wide theme preferences and available themes)
    app.use('/api/themes', tierRateLimiters.api, globalThemesRouter);

    // Settings routes (Per-project settings persistence - editor, project, appearance)
    app.use('/api/projects/:projectId/settings', tierRateLimiters.api, settingsRouter);

    // Storage routes (Per-project object storage - Replit-style App Storage)
    app.use('/api/projects/:projectId/storage', tierRateLimiters.api, storageRouter);

    // Extensions routes (Per-project extensions management)
    app.use('/api/extensions', tierRateLimiters.api, extensionsRouter);

    // Workflows routes (mounted at /api/workflows)
    app.use('/api/workflows', tierRateLimiters.api, workflowsRouter);

    // Per-project Shell routes (Create/manage shell sessions per project)
    app.use('/api/projects', tierRateLimiters.api, projectShellRouter);

    // MCP Servers routes
    app.use('/api/projects', tierRateLimiters.api, mcpServersRouter);
    app.use('/api/projects', tierRateLimiters.api, networkingRouter);
    app.use('/api/projects', tierRateLimiters.api, videoRouter);

    // Multi-Device Sync routes (Workspace state, preferences, devices)
    app.use('/api/sync', tierRateLimiters.api, syncRouter);

    // Background Testing routes (Replit Agent 3 auto-testing)
    app.use('/api/background-tests', tierRateLimiters.api, lazyBackgroundTestsRouter);

    // Max Autonomy Mode routes (200+ minute autonomous sessions)
    app.use('/api/autonomy', tierRateLimiters.streaming, maxAutonomyRouter);

    // Bounties Marketplace routes (Stripe Connect integration)
    app.use('/api/bounties', tierRateLimiters.api, bountiesRouter);

    // Effort pricing/usage tracking routes
    app.use('/api/effort', tierRateLimiters.api, effortRouter);

    // Agent Grid routes (Phase 2 - AG Grid Dashboard)
    app.use('/api/agent-grid', tierRateLimiters.api, agentGridRouter);

    // Analytics routes (uses /api/analytics/... internally)
    app.use('/api', tierRateLimiters.api, analyticsRouter);

    // SendGrid webhooks
    app.use('/api/webhooks', sendgridWebhooksRouter);

    // Public forms — contact, newsletter (no auth required)
    app.use('/api', publicFormsRouter);

    // Status page routes — public, no auth required (/api/status/*)
    app.use('/api', statusRouter);

    // Runner Workspaces — internal CRUD (/api/runner/*)
    app.use('/api/runner', tierRateLimiters.api, runnerWorkspacesRouter);

    // Workspaces — simplified one-call IDE endpoint (/api/workspaces/*)
    app.use('/api/workspaces', tierRateLimiters.api, workspacesRouter);

    // Project Auth — authentication configuration per project (/api/project-auth/*)
    app.use('/api/project-auth', tierRateLimiters.api, projectAuthRouter);

    // Screenshots routes — capture, list, download, delete project preview screenshots
    app.use('/api/screenshots', tierRateLimiters.api, screenshotsRouter);

    // Preview proxy routes — proxies HTTP/WebSocket traffic to project preview ports
    setupPreviewRoutes(app);
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
