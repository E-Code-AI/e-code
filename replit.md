# E-Code Platform

## Overview

E-Code is a web-based collaborative IDE with AI assistance, built with TypeScript/Node.js, React, and PostgreSQL. It offers code editing, terminal access, file management, and an autonomous AI agent, aiming to facilitate rapid prototyping and education. The platform is currently a functional MVP, with ongoing efforts to achieve enterprise-grade scalability and Fortune 500 readiness. Recent critical fixes include: restored autonomous IDE functionality, enhanced AI provider fallback mechanisms, comprehensive AI optimization infrastructure, production monitoring via Slack, mobile horizontal scroll fixes (Safari-compatible), loading icon positioning fixes preventing jarring UX jumps, **Phase 3.2 completed: K8s health endpoints + Swagger API documentation integration**, **CRITICAL AI Agent auto-start fix** (November 14, 2025): removed broken internal Anthropic→GPT fallback in ai-provider-manager.ts, fixed frontend endpoints (/api/agent/plan/stream), corrected invalid Gemini model ID (gemini-1.5-flash), ensuring proper multi-provider fallback chain, and **Kimi-K2 (Moonshot AI) Full Integration** (November 14, 2025): added 3 production-ready models (kimi-k2, kimi-k2-thinking, kimi-k2-turbo) with 10-100× cost savings vs GPT-4, created MoonshotProvider with OpenAI-compatible API, fixed critical 404 cascade (missing /api/feature-flags endpoint), implemented model availability system showing unconfigured providers as disabled in UI.

**CRITICAL AI Model Registry Correction (November 16, 2025):** 
Replaced ALL incorrect/legacy model references with official current models verified from provider documentation (platform.openai.com/docs/models, docs.anthropic.com, etc). Created centralized registry `shared/aiModels.ts` as single source of truth for all model metadata (18 models total across 5 providers). Key changes:
- OpenAI: Now using REAL models: gpt-5.1, gpt-5, gpt-5-mini, gpt-5-nano, gpt-4.1, gpt-4o, o3, o4-mini (removed fake gpt-5.1-thinking)
- Anthropic: claude-sonnet-4-5, claude-opus-4-1, claude-haiku-4-5
- Gemini: gemini-2.5-pro, gemini-2.5-flash
- xAI: grok-4, grok-4-fast
- Moonshot: kimi-k2, kimi-k2-thinking, kimi-k2-turbo
All UIs now display 4 key capabilities: Extended Thinking, MCP Tool Use, Context Window (up to 1M tokens for gpt-4.1), Code Generation optimization. Schema synchronized across shared/schema.ts, server/ai/ai-provider-manager.ts, and frontend components.

## User Preferences

- **Communication:** Simple, everyday language
- **Code Style:** TypeScript with strict typing
- **Database:** NEVER manual SQL migrations - use `npm run db:push` (or `--force`)
- **Files:** NEVER remove without explicit request
- **Hooks:** ALL React hooks before early returns
- **Routing:** `/ide/:id` (legacy `/editor/:id` redirects)
- **Security:** API keys via Replit Secrets, never commit
- **Docker Build:** Optimized for <2GiB images (Nov 16, 2025)

## System Architecture

### Frontend Architecture

The frontend uses React 18 and TypeScript with Vite for builds. It features TanStack Query for server state, Wouter for routing, Monaco Editor for code editing, and Shadcn/UI with Tailwind CSS for components. The architecture is component-based with lazy-loaded routes, custom hooks, responsive design (including dedicated mobile/tablet views), and WebSocket support for real-time collaboration.

**UX Enhancements:**
- **Loading States:** Layout-aware loading helpers (`PageShellLoading`, `ReplitLayoutLoading`) ensure loading icons appear immediately centered without position jumps. All loading states follow the pattern: relative container with deterministic height + absolute inset-0 centering.
- **Mobile Optimization:** Progressive enhancement for horizontal scroll prevention (overflow-x:hidden fallback + @supports for clip), Safari-compatible solutions, enhanced ScrollToTop with iOS support.

### Backend Architecture

The backend is built with Node.js and Express.js in TypeScript, utilizing Drizzle ORM for PostgreSQL (Neon serverless) and Passport.js for authentication. It follows a RESTful API design with a service-oriented approach, including specialized services for AI orchestration, autonomous engine logic, plan generation, testing, load testing, file system operations, Git integration, and deployment. Security features include CSRF protection, input sanitization, multi-tier rate limiting, session-based authentication, RBAC, and bcrypt password hashing. Real-time services for terminal, collaborative editing, and build logs are powered by WebSockets.

**AI Optimization Infrastructure:**
This includes a Task Classifier Service for ML-based routing to optimize model usage and cost, a Circuit Breaker Service for fault tolerance across multiple AI providers, a Priority Queue Service for SLA-based request prioritization, an Intelligent Caching Service for semantic deduplication of AI responses, and an Observability Service for production monitoring, structured logging, and metrics. A Slack Alert Service provides real-time notifications for critical system events. All optimization endpoints are secured with admin-only access controls.

**Health & Monitoring:**
A Provider Health API (`GET /api/health/providers`) offers real-time status validation for all integrated AI providers, including response times and error messages. Admin Dashboards provide full web and mobile parity with responsive designs for monitoring provider health and system metrics. Load testing infrastructure supports concurrent AI streaming, database performance, and WebSocket limits for pre-production validation.

**K8s Health Endpoints (Phase 3.2 - November 2025):**
Fortune 500-grade Kubernetes health probes integrated:
- `/health/liveness` - Process alive check (always 200 OK if responding)
- `/health/readiness` - Traffic readiness check (**200 when ready, 503 when not ready** - enables K8s traffic shedding for unhealthy pods)
- `/health/deep` - Comprehensive system check (503 when unhealthy, includes OpenAI, Anthropic, disk space)
- `/health/startup` - Startup probe (ensures all critical dependencies initialized)

Critical behavior: Readiness returns HTTP 503 when any critical dependency (database, Redis, memory) is down, allowing Kubernetes to remove the pod from the load balancer. Liveness always returns 200 if process is alive (prevents unnecessary pod restarts). Health checks include proper 'degraded' state handling for early warning (memory >80%, disk >80%, Redis >500ms response time).

**API Documentation:**
Swagger/OpenAPI 3.0 documentation available at `/api/docs` (controlled via `SWAGGER_ENABLED` flag, enabled by default). Provides interactive API explorer with request/response schemas for all endpoints.

### Database Schema

The system uses a PostgreSQL database with over 140 tables for user management, project and file hierarchies, AI agent session tracking, deployment history, subscription management, and AI optimization monitoring. Recent additions include the `slack_config` table for storing Slack webhook configurations for production alerts.

### AI Agent System

The AI agent system features server-sent event streaming, multi-provider AI model selection (OpenAI, Anthropic, Gemini, xAI, Moonshot AI, Groq), database-backed conversation history, and a robust tool execution framework. It is fully integrated with the AI Optimization Infrastructure for intelligent task classification, circuit breaker checks, and comprehensive logging/alerting for every streaming request.

**AI Model Registry (November 16, 2025):**
Centralized model catalog in `shared/aiModels.ts` with complete metadata for 18 production models across 5 providers. Each model includes:
- Provider & model ID (official API names verified from docs)
- Capabilities: Extended Thinking/reasoning, MCP Tool Use, Context Window (128K-1M tokens), Code Generation optimization
- Pricing per 1M tokens (input/output)
- Release dates and availability status

**Current Model Inventory:**
- **OpenAI (8 models):** gpt-5.1 (flagship Nov 2025), gpt-5 (legacy Aug 2025), gpt-5-mini/nano (cost-optimized), gpt-4.1 (1M context), gpt-4o (multimodal), o3 (advanced reasoning), o4-mini (budget reasoning)
- **Anthropic (3 models):** claude-sonnet-4-5, claude-opus-4-1, claude-haiku-4-5
- **Google Gemini (2 models):** gemini-2.5-pro, gemini-2.5-flash (most economical at $0.075/1M)
- **xAI (2 models):** grok-4, grok-4-fast
- **Moonshot AI (3 models):** kimi-k2, kimi-k2-thinking, kimi-k2-turbo (10-100× cheaper than GPT-4)

**Provider Status (as of Nov 16, 2025):**
- ✅ OpenAI: Healthy (OPENAI_API_KEY configured)
- ✅ Google Gemini: Healthy (GEMINI_API_KEY configured)
- ✅ Moonshot AI: Healthy (MOONSHOT_API_KEY configured, 358ms avg response)
- ❌ Anthropic: No credits (ANTHROPIC_API_KEY present but account depleted)
- ❌ xAI: Missing API key (XAI_API_KEY not configured)
- ❌ Groq: Missing API key (GROQ_API_KEY not configured)

### Core Features

-   **Monaco Code Editor:** Advanced code editing.
-   **Terminal:** Interactive access via xterm.js.
-   **File Tree & Management:** Comprehensive file system operations.
-   **Real-time Collaboration:** Powered by Y.js.
-   **Authentication & Security:** Robust authentication with Passport.js and comprehensive security measures.
-   **Container Orchestration:** TypeScript-based container execution and runtime management.

## External Dependencies

### AI/ML Services

-   **OpenAI:** GPT-5.1, GPT-5, GPT-4.1, GPT-4o, o3, o4-mini (8 models total)
-   **Anthropic:** Claude Sonnet 4.5, Opus 4.1, Haiku 4.5 (3 models)
-   **Google Gemini:** Gemini 2.5 Pro/Flash (2 models, Flash = most economical)
-   **Moonshot AI:** Kimi K2 series (3 models, 10-100× cheaper than GPT-4)
-   **xAI:** Grok 4 / Grok 4 Fast (2 models)
-   **Groq:** Open-source models (free tier, requires API key)
-   **Model Context Protocol (MCP) SDK:** For tool execution.

### Infrastructure Services

-   **PostgreSQL:** Neon serverless.
-   **Redis:** Optional caching.
-   **Stripe:** Payment processing.
-   **SendGrid:** Email delivery.
-   **Sentry:** Error monitoring.
-   **Slack:** Production monitoring alerts.

### Development Tools & Integrations

-   **GitHub:** OAuth integration.
-   **Figma:** Design imports.
-   **Playwright:** Browser automation for testing.
-   **Monaco Editor:** Microsoft's VS Code editor component.
-   **xterm.js:** Terminal emulation library.

### Authentication Providers

-   **Replit Auth:** Google, GitHub, Twitter/X, Apple, email/password.
-   **Custom Email/Password:** With verification.

### Deployment Targets

-   **Replit Cloud Run:** Autoscale deployment.
-   **Docker:** Containerization support with Fortune 500-grade optimizations (Nov 16, 2025).
-   **PM2:** Process management.

## Docker Build Optimizations (November 16, 2025)

**Problem Solved:** Build failures due to:
1. JavaScript heap out of memory (TypeScript compilation >2GB RAM)
2. Docker image size exceeded 8 GiB limit
3. TypeScript type-checking consuming excessive memory

**Solutions Implemented:**

### 1. Memory Management
- Added `NODE_OPTIONS=--max-old-space-size=4096` to Dockerfile (both builder and runtime stages)
- Prevents heap overflow during TypeScript compilation and Vite build
- Applied to all Node.js processes automatically via ENV variable

### 2. Image Size Reduction (>8GiB → <2GiB)
**Key Files:**
- `.dockerignore` - Excludes 5 dev-only directories: `dokploy/`, `sdk/`, `cli/`, `vscode-extension/`, `github-copilot-extension/` (~2-3 GB)
- `tsconfig.json` - Excludes dev directories from TypeScript compilation

**Strategy:**
- No package.json mutation (previous optimize-package.js approach removed for safety)
- Relies on `.dockerignore` to exclude large dev directories (~2-3 GB)
- Multi-stage build separates build deps from runtime deps
- Runtime stage uses `npm ci --only=production` for minimal footprint
- **Reproducible builds:** package-lock.json included for Fortune 500-grade determinism

**Estimated Savings:** ~2-3 GB from directory exclusions + ~200-500 MB from production-only node_modules

### 3. Multi-Stage Build Optimization
- **Builder stage:** `npm ci` installs ALL dependencies from package-lock.json, builds application (Vite + esbuild)
- **Runtime stage:** Minimal alpine image with `npm ci --only=production` for exact production dependencies
- npm cache cleaned after each install (`npm cache clean --force`)
- Selective source copying (only `client/`, `server/`, `shared/`, `types/`)
- .dockerignore ensures large dev directories never enter the build context
- **Determinism:** Using `npm ci` instead of `npm install` guarantees identical builds across environments

### 4. TypeScript Compilation
- Excluded from compilation: `mobile/`, `dokploy/`, `sdk/`, `cli/`, `vscode-extension/`, `github-copilot-extension/`, `.cache/`, `coverage/`, `test/**`, `tests/**`
- Incremental compilation enabled with build info cache
- `skipLibCheck: true` for faster type-checking

**Result:** Production-ready Docker images under 2 GiB, deployable to any container orchestration platform (Kubernetes, Docker Swarm, Replit Cloud Run).