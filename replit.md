# E-Code Platform

## Overview
E-Code is a collaborative web-based IDE with AI assistance, designed for rapid prototyping, education, and enterprise use. It aims to provide a scalable platform with multi-provider AI model selection, real-time collaboration, and robust security. A key ambition is to enable autonomous workspace generation from natural language prompts, leading to live previews with streaming progress, thereby creating a comprehensive, AI-powered development environment that streamlines coding and enhances learning. The platform seeks to be an enterprise-grade solution with significant market potential.

## 👑 Admin Credentials (ALWAYS USE)
- **Email:** `admin@e-code.ai`
- **Password:** `admin123`

**Note:** The "Use Admin" button on the /auth page auto-fills these credentials.

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
The frontend utilizes Shadcn/UI with Tailwind CSS and Monaco Editor, adhering to iOS Dynamic Color System principles, San Francisco Pro Typography, 8pt Grid Spacing, Apple-quality animation, iOS-style shadows, continuous corners, and appropriate touch targets for a mobile-first experience. The autonomous agent interface is platform-agnostic and responsive, featuring real-time progress tracking. Responsive design covers mobile, tablet, laptop, and desktop breakpoints with SSR-safe hooks. QA instrumentation standards include minimum touch targets (min-h-[44px]), comprehensive `data-testid` coverage, and mobile-first grid implementations.

### Technical Implementations
The frontend uses React 18, TypeScript, Vite, TanStack Query, and Wouter. The backend is a Node.js/Express.js application in TypeScript, employing Drizzle ORM for PostgreSQL and Passport.js for authentication, following a RESTful API design. WebSockets power real-time features. AI optimization includes a Task Classifier, Circuit Breaker, Priority Queue, Intelligent Caching, and Observability. Environment variables are AES-256-GCM encrypted, and SSE streaming is used for code generation. Anonymous bootstrap authentication provides ephemeral guest users.

Key AI Agent Enhancements include structured XML-based system prompts, a repository overview service, a context window manager with token optimization and long-term memory, a unified AI provider system with multi-provider fallback, and AI-powered inline code actions within the Monaco Editor. A Checkpoints & Rollback System ensures atomic transactions. A Background Auto-Testing System uses Playwright. Max Autonomy Mode enables extended autonomous sessions with AI task decomposition, auto-execution, ETA estimation, and cost tracking, integrated with auto-checkpointing, auto-testing, and auto-rollback. A Templates Marketplace and a Bounties Marketplace with Stripe integration are included. Context Window Enhancements provide separate dev/prod database connections, screenshot capture, and AI memory retention. The Agent Activity Dashboard provides real-time activity components, AG Grid Enterprise components for session history and metrics, and IDE integration for inline activity and mode selection. Mobile code editing components include a joystick for navigation and a custom coding keyboard. A critical authentication flow ensures seamless user experience from homepage "BUILD" to workspace creation. The Unified Agent System is consolidated into a single component (`client/src/components/ai/ReplitAgentPanelV3.tsx`) for all platforms. The Agent Tools Panel provides backend endpoints for web search, testing, and status, with UI features like collapsible panels, loading skeletons, and status indicators.

The platform provides real, process-based code execution without Docker dependency, leveraging native Nix-managed language runtimes available on Replit. Supported runtimes include Python, Node.js, Go, GCC/G++, Java, Rust, and PHP. The execution system includes `CodeExecutor`, `VM Sandbox`, `Multi-Language Executor`, `Process Isolation`, `Command Execution`, and `Runtime Manager` components, along with a full REST API for runtime management. Security measures include feature flags (`ENABLE_DIRECT_EXECUTION`), rate limiting, audit logging, shell injection prevention using `spawn(shell:false)`, and a command whitelist.

A centralized logging system utilizes Winston-based backend logging with request context via AsyncLocalStorage, correlation IDs, and multi-transport support. Logging middleware provides automatic request/response logging, security event logging, and performance monitoring. A Logs API supports querying, searching, statistical analysis, request/correlation tracing, and export. Frontend telemetry includes automatic error capture, Web Vitals, network request logging, and batched log shipping.

An Electron desktop application is planned, providing cross-platform support with features like auto-updates, native menus, and window state persistence, built with `electron-builder`.

### Feature Specifications
Core features include a Monaco Code Editor with advanced enhancements, an interactive terminal (xterm.js), file management, real-time collaboration, authentication, TypeScript-based container orchestration, Global Search & Replace, an Environment Variables Manager, a Logs Viewer, and a Debugger UI. The UI is responsive across devices. Autonomous workspace creation involves a Bootstrap API call, AI plan generation, WebSocket-based real-time progress, autonomous execution, and a live preview. PWA features and Electron desktop support are included.

### System Design Choices
A PostgreSQL database stores user data, project hierarchies, AI agent sessions, deployment history, subscription management, and AI optimization monitoring. Security measures include CSRF protection, input sanitization, tier-based rate limiting, API versioning, session-based authentication, and encrypted environment variables. The AI agent system provides server-sent event streaming, multi-provider AI model selection, database-backed conversation history, circuit breakers, and retry logic. Health monitoring integrates Kubernetes probes and a Provider Health API with Prometheus metrics. A two-tier database API architecture (Admin and Project Data APIs) is used with integrated security. Docker builds are optimized for small image sizes. Security enhancements include authentication/authorization for repository overview and templates APIs, context route timeouts, file system scanning limits, and project path scoping. The Stripe payment integration supports a Replit-style hybrid pricing model with subscription management, metered billing, credit tracking, and bounty payouts.

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

## Recent Changes

### Dec 1, 2025 - Agent WebSocket Dual Authentication (CRITICAL)
**Enhancement:** Extended Agent WebSocket to support both bootstrap token authentication (for autonomous workspace creation) and session cookie authentication (for normal IDE usage).

**Authentication Modes:**
1. **Bootstrap Token Mode**: Query param `bootstrap=<jwt_token>` for autonomous workspace creation
2. **Session Cookie Mode**: Uses `ecode.sid` cookie with post-connection validation for normal IDE usage

**Key Implementation Details:**
- Session cookie name is `ecode.sid` (configured in `server/middleware/passport-setup.ts`)
- Session validation uses `global.sessionStore.get()` (consistent with LSPService pattern)
- **Critical Pattern**: Accept WebSocket connection FIRST (synchronously), then validate session asynchronously. Close with code 4001 if validation fails. This avoids async timing issues with `handleUpgrade`.

**Files Modified:**
- `server/services/agent-websocket-service.ts` - Added `parseCookies()`, `validateSessionCookie()`, dual auth logic

**Status:** Verified working via automated Playwright test - WebSocket connection succeeds with session cookie auth.

### Dec 1, 2025 - Agent WebSocket 400 Error Fix (CRITICAL)
**Problem:** Agent WebSocket connections returned HTTP 400 "Bad Request" despite successful JWT token validation. Investigation showed 13+ upgrade listeners from multiple WebSocket services (Terminal, LSP, RuntimeLogs, TestRuns, SecurityScanner, Resources, Agent, BuildLogs) caused race conditions. The ws library's `{ server, path }` mode registered its handler LAST (after server starts listening), allowing other handlers to interfere with the handshake.

**Root Cause:** The ws library's internal `completeUpgrade` was silently failing when other upgrade listeners were also processing the same event, even though they returned early for non-matching paths.

**Solution:** Switched from `{ server, path }` mode to `noServer` + `prependListener` pattern:
1. Use `WebSocketServer({ noServer: true })` for manual upgrade control
2. Register upgrade handler via `server.prependListener('upgrade', ...)` to run FIRST (before all 13+ other handlers)
3. Call `markSocketAsHandled(request, socket)` immediately to prevent interference from other handlers
4. Manually call `wss.handleUpgrade()` with full control over the process

**Files Modified:**
- `server/services/agent-websocket-service.ts` - Complete rewrite of initialize() method
- `server/websocket/upgrade-guard.ts` - Removed `/ws/agent` from WS_MANAGED_PATHS (now uses socket marking)

**Architecture Pattern (for future WebSocket services):**
```typescript
// For services needing priority in upgrade handling:
server.prependListener('upgrade', (request, socket, head) => {
  if (pathname !== '/my/path') return;
  markSocketAsHandled(request, socket);  // Immediately claim the socket
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});
```

**Status:** Verified working via automated test - WebSocket handshake completes successfully with proper 101 response.

### Dec 1, 2025 - IDE-Database File Sync Fix
**Problem:** Agent workflow was creating files in `./projects/{id}/` directories but they weren't visible in the IDE. Root cause: the file operations service only wrote to the filesystem, not the `files` database table that the IDE reads from.

**Solution:** 
1. Updated `server/services/agent-file-operations.service.ts` to insert file records into the `files` database table when creating files
2. Added `projectId` to session context in `server/services/agent-orchestrator.service.ts`
3. Implemented path normalization to handle format inconsistencies (leading `./` or `/`)
4. Added parent directory creation for nested file structures

**Files Modified:**
- `server/services/agent-file-operations.service.ts`
- `server/services/agent-orchestrator.service.ts`

**Status:** Verified working via e2e test - files now appear in IDE file tree after autonomous workspace creation.