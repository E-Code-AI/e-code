# E-Code Platform

## Overview
E-Code is a web-based collaborative IDE with AI assistance, offering code editing, terminal access, file management, and an autonomous AI agent. Its primary purpose is to facilitate rapid prototyping and education, aiming for enterprise-grade scalability, multi-provider AI model selection, real-time collaboration, robust security, and the ambition to provide autonomous workspace creation from a natural language prompt to a live preview, streaming progress in real-time.

## Production Readiness Status (November 19, 2025)

### ✅ Completed & Verified
- **Mobile IDE:** Full feature parity with desktop, E2E tested, Apple-quality design system
- **AI Provider Robustness:** Robust streaming with try-catch, buffer validation, chunk-level parsing for OpenAI, Anthropic, Gemini, Moonshot
- **Security Basics:** CSRF protection on mutating endpoints, session-based auth, auth bypass protected by NODE_ENV guard
- **Database:** PostgreSQL with Drizzle ORM, proper foreign keys, no manual migrations
- **OpenTelemetry Fix (Task 14d):** Migrated from private `_metricReader` to stable `getMetricsRequestHandler()` API
- **Docker Optimization (Task 14f):** Already complete - Alpine base, multi-stage build, production deps only, <2GiB target

### ⚠️ Fortune 500 Gaps - IMPLEMENTATION IN PROGRESS (Require Additional Iteration)

**Status:** Initial implementations created but architect reviews identified critical regressions requiring rework.

**Priority 1 - Security:**
1. **API Rate Limiting** (Task 14a) - ⚠️ PARTIAL
   - ✅ Applied `tierRateLimiters.api` to all API routers
   - ❌ Streaming endpoints fully exempted (security risk - no abuse protection)
   - **Issue:** Blanket exemption for `/api/agent/*` SSE routes exposes to abuse
   - **Fix Needed:** Replace no-op streaming limiter with tuned limits (longer windows, per-connection caps)

**Priority 2 - AI Resilience:**
2. **Circuit Breakers/Failover** (Task 14b) - ❌ BROKEN
   - ✅ Circuit breaker class created with CLOSED/OPEN/HALF_OPEN states
   - ✅ Retry executor with exponential backoff
   - ✅ Fallback chain orchestration
   - ❌ Circuit breaker state never checked before provider calls (bypassed)
   - ❌ Retry exhaustion returns undefined generator (silent failure instead of error)
   - ❌ Fallback loop stuck on same failed provider (doesn't cycle across distinct providers)
   - **Issue:** Implementation exists but not wired into actual call path correctly
   - **Fix Needed:** Wire breaker state checks, fix retry error propagation, improve fallback provider selection

3. **Streaming Defensive Limits** (Task 14c) - ❌ NOT APPLIED
   - ✅ Stream limiter class created with max size (10MB), timeout (60s), chunk validation
   - ❌ Limiter not applied to chunks (no `limiter.consume()` calls)
   - **Issue:** Implementation exists but never invoked in streaming pipeline
   - **Fix Needed:** Apply limiter.consume() to each chunk in streamChatWithFallback

**Priority 3 - Operations:**
4. **OpenTelemetry Brittleness** (Task 14d) - ✅ COMPLETE
   - Status: Migrated to stable `getMetricsRequestHandler()` API
   - Production-ready

5. **API Versioning** (Task 14e) - ⚠️ PARTIAL
   - ✅ Infrastructure created: middleware, version detection, deprecation system
   - ✅ Fixed `req.path` → `req.originalUrl` to handle Express prefix stripping
   - ❌ `/api` root requests fall through validation
   - ❌ `/api/v9` would pass validation (unsupported versions slip through)
   - ❌ Accept-Version header ignored for non-versioned routes
   - **Issue:** Validation incomplete, edge cases not handled
   - **Fix Needed:** Harden validation for root requests, ensure Accept-Version honored

6. **Docker Optimization** (Task 14f) - ✅ COMPLETE
   - Status: Already implemented (Alpine base, multi-stage build, production deps, <2GiB)
   - Documented in DOCKER_OPTIMIZATION_AUDIT.md
   - Production-ready

### 🎯 Production Readiness Assessment
**Current Score:** ~55-60/100 (per architect review)
- **Working:** OpenTelemetry, Docker, Mobile IDE, Database, Basic Security
- **Needs Rework:** Circuit breakers, streaming limits, rate limiting balance, API versioning edge cases
- **Complexity:** Fortune 500 resilience patterns more complex than initial sprint scope
- **Recommendation:** Defer circuit breaker/streaming/versioning completion to dedicated sprint with comprehensive testing

## User Preferences
- **Communication:** Simple, everyday language
- **Code Style:** TypeScript with strict typing
- **Database:** NEVER manual SQL migrations - use `npm run db:push` (or `--force`)
- **Files:** NEVER remove without explicit request
- **Hooks:** ALL React hooks before early returns
- **Routing:** `/ide/:id` (legacy `/editor/:id` redirects)
- **Security:** API keys via Replit Secrets, never commit
- **Docker Build:** Optimized for <2GiB images
- **Rate Limiting:** Tier-based (Free: 100/min, Pro: 1000/min, Enterprise: 10000/min)

## System Architecture

### UI/UX Decisions
The frontend uses Shadcn/UI with Tailwind CSS for responsive component styling. Monaco Editor provides the core code editing. A comprehensive Apple-quality mobile design system is implemented, including iOS Dynamic Color System, San Francisco Pro Typography, 8pt Grid Spacing, Apple-quality animation springs, iOS-style shadows, continuous corners, and appropriate touch target sizes.

### Technical Implementations
The frontend is built with React 18, TypeScript, Vite, TanStack Query for server state management, and Wouter for routing. The backend is a Node.js and Express.js application in TypeScript, utilizing Drizzle ORM for PostgreSQL and Passport.js for authentication, following a RESTful API design. Real-time services for terminal, collaborative editing (Y.js), and build logs are powered by WebSockets. AI optimization infrastructure includes a Task Classifier, Circuit Breaker, Priority Queue, Intelligent Caching, and Observability. UUIDs identify projects across services, and environment variables are encrypted using AES-256-GCM.

### Feature Specifications
Key features include a Monaco Code Editor, an interactive terminal (xterm.js), file management, real-time collaboration, robust authentication, TypeScript-based container orchestration, Global Search & Replace, an Environment Variables Manager with encryption, a Logs Viewer, and a Debugger UI compatible with the VSCode Debug Adapter Protocol. The platform supports fully autonomous workspace creation: users provide a natural language prompt, and an AI agent generates the IDE, files, and a live preview, with progress streamed via WebSocket. This includes intelligent routing of AI tasks based on complexity for optimal performance and cost efficiency. The mobile IDE provides full feature parity with the desktop version.

### System Design Choices
A PostgreSQL database stores user data, project hierarchies, AI agent sessions, deployment history, subscription management, and AI optimization monitoring. Security measures include CSRF protection, input sanitization, tier-based rate limiting, and session-based authentication. The AI agent system provides server-sent event streaming, multi-provider AI model selection, and a database-backed conversation history. Health monitoring integrates Kubernetes probes and a Provider Health API, including a Prometheus metrics endpoint (`/metrics/prometheus`) compatible with Replit Cloud Run's single-port architecture. A two-tier database API architecture is used: an Admin Database API for system-wide access and a Project Data API for project-scoped, multi-tenant isolated access, with integrated security features like secret value masking and access control.

## External Dependencies

### AI/ML Services
- **OpenAI:** GPT-5.1, GPT-5, GPT-5-mini, GPT-4o, o3, o4-mini
- **Anthropic:** Claude Sonnet 4.5, Claude Opus 4.1, Claude Haiku 4.5
- **Google Gemini:** Gemini 2.5 Flash (Primary working provider), Gemini 2.5 Pro
- **Moonshot AI:** Kimi K2, Kimi K2 Thinking
- **xAI:** Grok 4, Grok 4 Fast
- **Groq:** Mixtral 8x7B, Llama 3 (Not configured)
- **Provider Fallback Chain:** `['gpt-5.1', 'kimi-k2', 'gemini-2.5-flash', 'grok-4-fast', 'claude-haiku-4-5']`

### Infrastructure Services
- **PostgreSQL:** Neon serverless
- **Redis:** Optional caching layer
- **Stripe:** Payment processing
- **SendGrid:** Email delivery
- **Sentry:** Error monitoring
- **Slack:** Production monitoring alerts

### Development Tools & Integrations
- **GitHub:** OAuth integration
- **Figma:** Design imports
- **Playwright:** Browser automation for testing
- **Monaco Editor:** Microsoft's VS Code editor component
- **xterm.js:** Terminal emulation library

### Authentication Providers
- **Replit Auth:** Google, GitHub, Twitter/X, Apple, email/password
- **Custom Email/Password**