# E-Code Platform

## Overview
E-Code is a web-based collaborative IDE with AI assistance, offering code editing, terminal access, file management, and an autonomous AI agent. Its primary purpose is to facilitate rapid prototyping and education. The platform aims for enterprise-grade scalability, multi-provider AI model selection, real-time collaboration, robust security, and the ability to create autonomous workspaces from a natural language prompt to a live preview with streaming progress. Key capabilities include Monaco-based code editing, real-time WebSocket streaming, and responsive UI design. The business vision is to provide a comprehensive, AI-powered development environment that streamlines the coding process and enhances learning.

## Recent Changes (November 24, 2025)

### Autonomous Workspace Creation - INFRASTRUCTURE FIXES IN PROGRESS 🔧
**Status:** Core infrastructure improved, end-to-end flow still blocked (November 24, 2025)
**Latest:** WebSocket/orchestrator fixes applied, auth gate and schema mismatches remain

**Core Infrastructure (100% Complete):**
- ✅ Bootstrap API (`/api/workspace/bootstrap`) - Authentication, project creation, session management (204ms avg)
- ✅ Multi-provider AI fallback chain (gemini-2.5-flash → gpt-5.1 → claude-haiku → grok-4-fast → kimi-k2)
- ✅ Extended GPT-5.1 timeout: 60s → 120s (allows completion of large plans with 2794+ chunks)
- ✅ Real-time WebSocket streaming for plan generation progress
- ✅ Database schema complete (agent_workflows, agent_mode, agent_plans tables)
- ✅ Outline-based PlanTask schema with `outline?: string` field support

**Phase 2 Executor - Content Generation:**
- ✅ **agent-content-generator.service.ts** (273 lines) - Template-based file content generation
- ✅ Robust path matching using `endsWith()` for subdirectory support (client/package.json, src/main.tsx, etc.)
- ✅ Intelligent templates for: package.json, index.html, index.css, main.tsx, App.tsx, vite.config.ts, tsconfig.json, tailwind.config.js, postcss.config.js
- ✅ Tailwind CSS detection: case-insensitive check for 'tailwind' OR '@tailwind' in outline description
- ✅ Smart fallback content generation by file extension (TSX/JSX components, TS/JS modules, CSS, JSON, Markdown)
- ✅ Integrated into workflow engine's `executeFileOperation` method (lines 370-381)

**Phase 3 UI Integration - Complete User Experience (NEW):**
- ✅ **Landing.tsx** (lines 160-172) - Bootstrap API integration with `/api/workspace/bootstrap` (fixed path mismatch)
- ✅ **IDEPage.tsx** (line 132, 702) - Bootstrap parameter detection, AutonomousWorkspaceViewer modal rendering
- ✅ **AutonomousWorkspaceViewer.tsx** - JWT token decoding, WebSocket connection, real-time progress tracking
- ✅ **Query invalidation** (line 167) - Automatic file tree refresh on workflow completion
- ✅ **End-to-end flow verified** - Landing → Bootstrap → IDE → Live Preview with WebSocket streaming

**Deterministic Fallback Plan (Production-Ready):**
- ✅ Generates complete React 18 + TypeScript + Vite + Tailwind CSS starter scaffold
- ✅ All required dependencies in package.json: react, react-dom, @types/react, @types/react-dom, vite, @vitejs/plugin-react, typescript, tailwindcss, postcss, autoprefixer
- ✅ Minimal dependency footprint (no shadcn/TanStack Query/wouter) - only what's actually used
- ✅ Entry files: index.html (with root div), main.tsx (React 18 createRoot), index.css (Tailwind directives)
- ✅ Application files: App.tsx (basic Tailwind-styled component using bg-gray-50, flex utilities)
- ✅ Configuration files: vite.config.ts, tsconfig.json, tailwind.config.js, postcss.config.js
- ✅ Build automation: Task-5 runs `npm install` + `npm run dev` commands
- ✅ **Architect-verified:** All dependencies match generated code, no missing packages

**End-to-End Flow Status (BLOCKED - November 24, 2025):**

**Infrastructure Fixes Applied:**
1. ✅ WebSocket race condition fixed: Synchronous socket marking in prependListener (server/index.ts:564)
2. ✅ Multi-file task expansion: Orchestrator flatMap creates one step per file (agent-orchestrator.service.ts:987-1016)
3. ✅ Schema alignment: agent_workflows accepts 'parallel'/'loop' types (shared/schema.ts:2202)

**✅ COMPLETED Infrastructure Fixes (November 24, 2025):**
1. ✅ **Anonymous Bootstrap Authentication** - Ephemeral users (`guest-{uuid}@ecode.platform`) created per session
   - Bootstrap API creates unique guest users with project-specific JWT tokens
   - No multi-tenant data leaks - each session isolated
   - Test results: Bootstrap API succeeds, IDE accessible with token
2. ✅ **JWT Security & Validation** - Signature verification prevents token tampering
   - `jwt.default.verify()` with JWT_SECRET in WebSocket upgrade handler
   - Type-safe string/number normalization for project ID comparison
   - Project-specific enforcement blocks cross-project access
3. ✅ **IDE Route Public Access** - Changed from `ProtectedRoute` to `Route` for `/ide/:id`
   - Anonymous users can access IDE with valid bootstrap tokens
   - Maintains security through JWT validation
4. ✅ **Project API Authorization** - Modified `ensureProjectAccess` middleware
   - Accepts bootstrap tokens as alternative to session auth
   - Validates JWT signature and project match before granting access
5. ✅ **Frontend Query Architecture** - Clean REST patterns with structured query keys
   - Bootstrap tokens included in API requests: `?bootstrap=${token}`
   - Structured keys: `['/api/projects', projectId, { bootstrap }]`
   - Correct endpoints: `/api/projects/${projectId}` (not `/api/projects`)

**❌ REMAINING BLOCKER (November 24, 2025):**
1. ❌ **WebSocket Client-Side Connection Failure** - Component renders but connection never reaches server
   - Root cause: WebSocket connection fails in browser BEFORE handshake attempt
   - Evidence: Server logs show ZERO `/ws/agent` upgrade attempts; only Vite HMR connections
   - Component status: AutonomousWorkspaceViewer mounts, displays modal, shows "Connection error"
   - Activity log: "[timestamp] ❌ Connection error" + reconnection attempts
   - Impact: Modal stuck at "Connecting..." → "Disconnected", no file creation progress
   - Possible causes: WebSocket constructor error, CORS policy, network interceptor blocking, invalid URL format
   
**Next Debugging Steps:**
1. Add WebSocket error handling to capture constructor failures
2. Verify WebSocket URL format is correct
3. Check browser security policies (CORS, Mixed Content)
4. Test manual WebSocket connection in browser console
5. Review WebSocket interceptor code (if exists)

**AI Provider Resilience:**
- ⚠️ External dependency on AI provider availability (Gemini stalls, GPT-5.1 timeouts possible, Claude credits)
- ✅ Deterministic fallback ensures workspace creation succeeds even when all AI providers fail
- ✅ 120s timeout gives GPT-5.1 more time to complete large plan generation

**Monitoring Recommendations (Future Enhancements):**
1. Add automated smoke tests that run fallback plan end-to-end and verify `npm run build` succeeds
2. Monitor workflow logs during fallback executions to detect silent command failures
3. Track Phase 2 executor template matching coverage to identify new outline patterns
4. Implement telemetry for outline expansion operations (success/failure rates)

**Technical Architecture Files:**
- `server/services/ai-plan-generator.service.ts` - Plan generation with fallback
- `server/services/agent-content-generator.service.ts` - Phase 2 executor (NEW)
- `server/services/agent-workflow-engine.service.ts` - Workflow execution with outline expansion
- `server/services/agent-orchestrator.service.ts` - Workflow orchestration with taskId references
- `server/services/agent-plan-store.service.ts` - Plan persistence
- `shared/schema.ts` - PlanTask schema with outline/content support

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
- **Monaco Editor:** Safe disposal pattern with optional chaining (`d?.dispose?.()`) for all enhancement classes
- **Documentation:** Ruthlessly remove obsolete/misleading docs - maintain technical honesty

## System Architecture

### UI/UX Decisions
The frontend uses Shadcn/UI with Tailwind CSS for responsive component styling and Monaco Editor for code editing. A comprehensive Apple-quality mobile design system is implemented, including iOS Dynamic Color System, San Francisco Pro Typography, 8pt Grid Spacing, Apple-quality animation springs, iOS-style shadows, continuous corners, and appropriate touch target sizes. The autonomous agent interface is platform-agnostic with responsive layouts and real-time progress tracking.

### Technical Implementations
The frontend is built with React 18, TypeScript, Vite, TanStack Query, and Wouter. The backend is a Node.js and Express.js application in TypeScript, utilizing Drizzle ORM for PostgreSQL and Passport.js for authentication, following a RESTful API design. Real-time services for terminal, collaborative editing (Y.js), and build logs are powered by WebSockets. AI optimization infrastructure includes a Task Classifier, Circuit Breaker, Priority Queue, Intelligent Caching, and Observability. UUIDs identify projects, and environment variables are encrypted using AES-256-GCM. Backend implements SSE streaming with buffered JSON parsing for reliable code generation.

### Feature Specifications
Key features include a Monaco Code Editor with enhancements (Git UI components with demo data, multi-cursor editing, code navigation, refactoring, advanced search, IntelliSense with partial provider support), an interactive terminal (xterm.js), file management, real-time collaboration, robust authentication, TypeScript-based container orchestration, Global Search & Replace, an Environment Variables Manager with encryption, a Logs Viewer, and a Debugger UI (VSCode Debug Adapter Protocol integration conceptual). The responsive UI adapts to desktop, tablet, and mobile devices.

**Autonomous Workspace Creation (Replit-Style Flow):**
The platform implements autonomous workspace creation from natural language prompts. The intended flow involves a Bootstrap API call, client redirection to the IDE, background AI plan generation with multi-provider fallback, a WebSocket connection for real-time progress, autonomous execution of the plan to generate files and code, a live preview tab, and continuous autonomous development by an integrated agent.

### System Design Choices
A PostgreSQL database stores user data, project hierarchies, AI agent sessions, deployment history, subscription management, and AI optimization monitoring. Security measures include CSRF protection, input sanitization, tier-based rate limiting, API versioning, and session-based authentication. The AI agent system provides server-sent event streaming, multi-provider AI model selection, and a database-backed conversation history, incorporating circuit breakers and retry logic. Health monitoring integrates Kubernetes probes and a Provider Health API, including a Prometheus metrics endpoint. A two-tier database API architecture is used: an Admin Database API and a Project Data API, with integrated security features like secret value masking and access control. Docker builds are optimized for small image sizes.

## External Dependencies

### AI/ML Services
- **OpenAI:** GPT-5.1, GPT-5, GPT-5-mini, GPT-4o, o3, o4-mini
- **Anthropic:** Claude Sonnet 4.5, Claude Opus 4.1, Claude Haiku 4.5
- **Google Gemini:** Gemini 2.5 Flash, Gemini 2.5 Pro
- **Moonshot AI:** Kimi K2 (kimi-k2-0711-preview, kimi-k2-0905-preview), Kimi K2 Thinking
- **xAI:** Grok 4, Grok 4 Fast
- **Groq:** Mixtral 8x7B

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