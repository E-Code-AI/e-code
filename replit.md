# E-Code Platform

## Overview
E-Code is an AI-assisted web-based IDE for rapid prototyping, education, and enterprise use. It offers multi-provider AI model selection, real-time collaboration, and robust security. The platform aims to provide autonomous workspace generation from natural language prompts, delivering live previews and streaming progress, thereby creating a comprehensive AI-powered development environment that streamlines coding and enhances learning. It is envisioned as an enterprise-grade solution with significant market potential.

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
The frontend utilizes Shadcn/UI with Tailwind CSS and Monaco Editor, adhering to iOS Dynamic Color System principles, San Francisco Pro Typography, 8pt Grid Spacing, Apple-quality animation, iOS-style shadows, continuous corners, and appropriate touch targets for a mobile-first experience. The autonomous agent interface is platform-agnostic and responsive, featuring real-time progress tracking. QA instrumentation includes minimum touch targets, comprehensive `data-testid` coverage, and mobile-first grid implementations. Key IDE components like the Activity Bar, Tab Bar, and Status Bar mirror Replit's design. Mobile UX includes a Replit-identical 5-tab navigation, spring-based animations, loading skeletons, and touch enhancements.

### Technical Implementations
The frontend is built with React 18, TypeScript, Vite, TanStack Query, and Wouter. The backend is a Node.js/Express.js application in TypeScript, using Drizzle ORM for PostgreSQL and Passport.js for authentication, following a RESTful API design. Real-time features are powered by WebSockets. AI optimization includes a Task Classifier, Circuit Breaker, Priority Queue, Intelligent Caching, and Observability. Environment variables are AES-256-GCM encrypted, and SSE streaming is used for code generation. Anonymous bootstrap authentication provides ephemeral guest users. AI Agent enhancements include structured XML-based system prompts, a repository overview service, a context window manager with token optimization, a unified AI provider system, and AI-powered inline code actions. A Checkpoints & Rollback System ensures atomic transactions, and a Background Auto-Testing System uses Playwright. Max Autonomy Mode enables extended autonomous sessions with AI task decomposition, auto-execution, ETA estimation, and cost tracking. The platform provides process-based code execution without Docker, leveraging native Nix-managed language runtimes (Python, Node.js, Go, GCC/G++, Java, Rust, PHP). A centralized Winston-based logging system with correlation IDs and multi-transport support is implemented.

### Agent Workflow State Machine (Updated Dec 7, 2025)
The agent orchestrator (`agent-orchestrator.service.ts`) manages workflow state transitions:
- **State machine:** `idle → planning → executing → completed/failed`
- **Retry helper:** `retryDbStatusUpdate()` with exponential backoff + jitter (1s/2s/4s delays, 3 retries)
- **DB consistency:** All status transitions use retry helper for eventual consistency under DB failures
- **WebSocket sync:** Broadcasts only occur AFTER confirmed DB writes (or explicit fallback on retry exhaustion)
- **Critical fix (Dec 7):** `executeAutonomousPlan()` now properly transitions workflowStatus through all states

### Memory Optimization Patterns (Dec 7, 2025)
Replit-style generators and lazy evaluation for handling millions of users:
- **PostgreSQL Native Streaming:** `server/utils/db-streaming.ts` provides true cursor-based streaming
  - `streamPgQuery<T>()` - Native PostgreSQL cursors (DECLARE CURSOR / FETCH) for streaming millions of rows
  - `collectPgStream<T>()` - Simple API for collecting streamed results with limits
  - `countPgStream()` - Count rows without loading all data (progress indicators)
  - `processPgStreamParallel<T>()` - Parallel batch processing for maximum throughput
- **File Streaming:** Same module provides directory and archive streaming
  - `streamDirectoryFiles()` - Async generator for directory traversal
  - `pipeStreamToArchive()` - Memory-efficient file archiving with backpressure
- **SQL-Level Filtering:** Always move filters to SQL WHERE clauses instead of in-memory `.filter()`
  - Example: `logs-viewer.router.ts` refactored from loading 1000+ records to SQL WHERE
- **Security Pattern:** Always validate inputs at schema level before SQL queries
  - Prevent multi-tenant data leaks with strict Zod validation (e.g., numeric projectId)
  - Return 400 error instead of running unscoped queries
- **Stream Limits:** AI streaming capped at 10MB with circuit breakers (`server/ai/stream-limiter.ts`)

### Fortune 500 Production Hardening (Dec 7, 2025)
- **Centralized Secret Management:** `server/utils/secrets-manager.ts` with startup validation
  - Enforces JWT_SECRET and SESSION_SECRET in production
  - Development fallbacks with clear warnings (NOT FOR PRODUCTION)
  - 9 files updated to use centralized getters
- **Durable Recovery Queue:** 30-second recovery worker for failed DB updates
  - Max 10 retries per session, emits events on success/failure
  - Prevents "zombie" sessions during DB outages
- **Circuit Breaker Enforcement:** WebSocket notifications on provider failures
  - Fallback chain: `gpt-5.1 → kimi → gemini → grok → claude-haiku`
  - Broadcasts `degraded_mode` messages with recovery estimates
- **Health Endpoint:** `GET /api/health/detailed` returns comprehensive status
  - Circuit breaker status for all 5 AI providers
  - Recovery queue pending items
  - Database latency and connectivity
  - System metrics (memory, CPU, uptime)

### Runtime System Fortune 500 Hardening (Dec 7, 2025)
- **29 Supported Languages:** Full Replit parity with nodejs, python, java, go, ruby, rust, php, c, cpp, csharp, swift, kotlin, dart, typescript, bash, html-css-js, nix, deno, lua, perl, r, haskell, scala, clojure, elixir, julia, ocaml, fortran, zig
- **Process Management:** 
  - PID tracking in activeRuntimes map
  - tree-kill for proper process tree termination
  - Process stored for cleanup on stop/timeout
- **Language-Specific Timeouts:** RUNTIME_TIMEOUTS map with per-language configuration
  - Scripting languages: 30s (Python, Node.js, TypeScript, Ruby, Bash, Lua, Perl)
  - Compiled languages: 60-120s (C/C++, Java, Kotlin, Rust, Go, C#, Swift, Haskell, Scala)
  - Web servers: 5 minutes (PHP, HTML/CSS/JS, Deno, Nix)
- **User-Friendly Error Messages:** ERROR_MESSAGES map + getUserFriendlyError() for translating technical errors
- **Complete cmdMap:** 50+ commands covering all supported languages with proper PATH resolution
- **TypeScript Detection Fix:** Prioritizes .ts/.tsx files over package.json for correct language detection

### Feature Specifications
Core features include a Monaco Code Editor with advanced enhancements, an interactive terminal (xterm.js), file management, real-time collaboration, authentication, TypeScript-based container orchestration, Global Search & Replace, an Environment Variables Manager, a Logs Viewer, and a Debugger UI. Autonomous workspace creation involves a Bootstrap API call, AI plan generation, WebSocket-based real-time progress, autonomous execution, and a live preview. PWA features and Electron desktop support are planned. An Agent Activity Dashboard with AG Grid provides real-time metrics and session history. Agent conversation persistence is managed via a Zustand store with localStorage and backend synchronization. An Agentic RAG system provides automatic backend RAG context retrieval for all sessions.

### System Design Choices
A PostgreSQL database stores user data, project hierarchies, AI agent sessions, deployment history, and subscription management. Security measures include CSRF protection, input sanitization, tier-based rate limiting, API versioning, session-based authentication, and encrypted environment variables. The AI agent system provides server-sent event streaming, multi-provider AI model selection, database-backed conversation history, circuit breakers, and retry logic. Health monitoring integrates Kubernetes probes and a Provider Health API with Prometheus metrics. A two-tier database API architecture (Admin and Project Data APIs) is used with integrated security. Docker builds are optimized for small image sizes. The Stripe payment integration supports a Replit-style hybrid pricing model.

## External Dependencies

### AI/ML Services (20 Models - E2E Verified December 5, 2025)
- **OpenAI (8):** GPT-5.1, GPT-5.1-thinking, GPT-5, GPT-5-mini, GPT-5-nano, GPT-4o, o3, o4-mini
- **Anthropic (3):** Claude Opus 4.5-20251124, Claude Sonnet 4.5-20250929, Claude Haiku 4.5-20251015
- **Google Gemini (3):** Gemini 2.5 Pro, Gemini 2.5 Flash, Gemini 2.0 Flash
- **Moonshot AI (4):** kimi-k2-0711-preview, kimi-k2-thinking, moonshot-v1-32k, moonshot-v1-128k
- **xAI (2):** Grok 4, Grok 4 Fast

### Model Catalog Verification
- **API:** `GET /api/models` returns 20 verified models
- **REMOVED (Dec 5):** `kimi-k2-0904-preview` - model does NOT exist on Moonshot API
- **Legacy Alias:** `kimi-k2-0904-preview` → `kimi-k2-0711-preview` for backward compatibility
- **Test Report:** `docs/E2E-MODEL-TEST-REPORT.md`

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