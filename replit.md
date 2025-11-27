# E-Code Platform

## Overview
E-Code is a collaborative web-based IDE with AI assistance, designed for rapid prototyping, education, and enterprise use. It aims to provide a scalable platform with multi-provider AI model selection, real-time collaboration, and robust security. A key ambition is to enable autonomous workspace generation from natural language prompts, leading to live previews with streaming progress, thereby creating a comprehensive, AI-powered development environment that streamlines coding and enhances learning. The platform seeks to be an enterprise-grade solution with significant market potential.

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

Key AI Agent Enhancements include structured XML-based system prompts, a repository overview service, a context window manager with token optimization and long-term memory, a unified AI provider system with multi-provider fallback, and AI-powered inline code actions within the Monaco Editor. A Checkpoints & Rollback System ensures atomic transactions. A Background Auto-Testing System uses Playwright. Max Autonomy Mode enables extended autonomous sessions with AI task decomposition, auto-execution, ETA estimation, and cost tracking, integrated with auto-checkpointing, auto-testing, and auto-rollback. A Templates Marketplace and a Bounties Marketplace with Stripe integration are included. Context Window Enhancements provide separate dev/prod database connections, screenshot capture, and AI memory retention. The Agent Activity Dashboard provides real-time activity components, AG Grid Enterprise components for session history and metrics, and IDE integration for inline activity and mode selection. Mobile code editing components include a joystick for navigation and a custom coding keyboard. A critical authentication flow ensures seamless user experience from homepage "BUILD" to workspace creation.

**Unified Agent System (ReplitAgentPanelV3 - Consolidated Nov 2025):**
- **Single Component:** `client/src/components/ai/ReplitAgentPanelV3.tsx` - unified agent for all platforms (web, desktop, mobile, responsive)
- **Legacy Components Removed:** ReplitAgent.tsx, ReplitAgentV2.tsx, ReplitAgentChat.tsx, editor/ReplitAgentPanel.tsx - all deleted
- **Used In:** IDEPage.tsx, Editor.tsx, MobileIDEView.tsx, MobileWorkspace.tsx, EditorWorkspace.tsx, ApplicationIDEWrapper.tsx, ReplitEditorLayout.tsx, SplitsEditorLayout.tsx, SplitsEditorLayoutV2.tsx
- **Features:** Build/Plan modes, streaming responses, tool executions inline, thinking display, context injection, Max Autonomy integration, extended thinking support
- **Props:** projectId (string|number), selectedFile, selectedCode, initialPrompt, autoStart, onBuildComplete, sessionId, conversationId, websocket, className

**Agent Tools Panel (Replit Agent 3 Parity - Updated Nov 2025):**
- **Backend Endpoints (100% Complete):** All 6 endpoints at `/api/agent/tools/*` - web-search (GET/POST), testing/replays (GET), testing/start (POST), thinking/:id (GET), status (GET)
- **useAgentTools Hook:** 5 toggles (maxAutonomy, appTesting, extendedThinking, highPowerModels, webSearch), action functions (performWebSearch, startTest), queries for preferences/models/replays/sessions/status
- **UI Features:** Collapsible panel with responsive design, loading skeletons, status indicators, data-testid coverage
- **Replit Design Requirements:**
  - Chat toolbar toggles (Extended Thinking, High Power, Web Search icons)
  - Element Selector (click-to-edit visual UI picker)
  - Progress Tab as separate dock panel with real-time activity feed
  - Video Replays viewer for test sessions
  - Usage tracking icon with credits display
  - Mobile-optimized touch targets (min 44px)

### Feature Specifications
Core features include a Monaco Code Editor with advanced enhancements, an interactive terminal (xterm.js), file management, real-time collaboration, authentication, TypeScript-based container orchestration, Global Search & Replace, an Environment Variables Manager, a Logs Viewer, and a Debugger UI. The UI is responsive across devices. Autonomous workspace creation involves a Bootstrap API call, AI plan generation, WebSocket-based real-time progress, autonomous execution, and a live preview. PWA features and Electron desktop support are included.

**Code Execution System (Verified Working - Nov 2025):**
The platform provides real, process-based code execution without Docker dependency, leveraging native Nix-managed language runtimes available on Replit.

**Available Runtimes (Confirmed on Replit VM):**
- Python 3.11.13 ✅
- Node.js v20.19.3 ✅
- Go 1.22.3 ✅
- GCC/G++ (Nix-managed) ✅
- Java, Rust, PHP (available via Nix)

**Core Execution Components:**
| Component | File | Description |
|-----------|------|-------------|
| CodeExecutor | `server/execution/executor.ts` | Multi-language execution using `spawn(shell:false)` - supports JS, Python, C++, C, Go, Java, Rust, PHP |
| VM Sandbox | `server/execution/sandbox.ts` | JavaScript sandboxed execution via Node vm module |
| Multi-Language Executor | `server/sandbox/sandbox-executor.ts` | 10 language support with isolated temp directories |
| Process Isolation | `server/isolation/process-isolation.ts` | Port pools, memory limits, DB namespaces |
| Command Execution | `server/services/agent-command-execution.service.ts` | Security validation, streaming output, command whitelist |
| Runtime Manager | `server/runtimes/runtime-manager.ts` | Fallback to direct execution, command whitelist enforcement |

**Runtime API Endpoints (Full REST API):**
| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/projects/:id/runtime/start` | POST | Start project runtime | Yes |
| `/api/projects/:id/runtime/stop` | POST | Stop project runtime | Yes |
| `/api/projects/:id/runtime/execute` | POST | Execute command in runtime | Yes |
| `/api/projects/:id/runtime` | GET | Get runtime status | Yes |
| `/api/projects/:id/runtime/logs` | GET | Get runtime logs | Yes |
| `/api/runtime/start` | POST | Start runtime (body: projectId) | Yes |
| `/api/runtime/stop` | POST | Stop runtime | Yes |
| `/api/runtime/:projectId` | GET | Get runtime status | Yes |
| `/api/runtime/:projectId/start` | POST | Start runtime | Yes |
| `/api/runtime/:projectId/stop` | POST | Stop runtime | Yes |
| `/api/runtime/:projectId/execute` | POST | Execute command | Yes |
| `/api/runtime/:projectId/logs` | GET | Get logs | Yes |
| `/api/runtime/dependencies` | GET | Get runtime dependencies | No |
| `/api/execute` | POST | Direct code execution | Yes + Feature Flag |
| `/api/projects/:id/execute-direct` | POST | Direct project execution | Yes + Feature Flag |
| `/api/execute/languages` | GET | List supported languages | No |

**Security Architecture:**
- **Feature Flag:** `ENABLE_DIRECT_EXECUTION` - disabled by default everywhere, requires explicit `true` to enable
- **Rate Limiting:** 10 executions per minute per user on `/api/execute*` endpoints
- **Audit Logging:** All executions logged with userId, language, projectId, code size
- **Shell Injection Prevention:** Uses `spawn(shell:false)` with args array instead of shell commands
- **Command Whitelist:** Runtime-manager only allows: `ls`, `pwd`, `echo`, `cat`, `head`, `tail`, `wc`, `npm`, `node`, `npx`, `python`, `python3`, `pip`, `go`, `gcc`, `g++`, `make`, `git`, `which`, `env`, `printenv`

**Deployment Configuration:**
```bash
# Environment Variables for Replit VM
ENABLE_DIRECT_EXECUTION=true  # Enable for development/testing only
NODE_ENV=production           # Feature flag respects this
```

**Frontend Integration:**
- `client/src/hooks/useRuntime.ts` - React hook for runtime management
- `client/src/components/RunButton.tsx` - Start/Stop button with status polling
- `client/src/components/editor/ReplitOutputPanel.tsx` - WebSocket-based output streaming

**Future Enhancements (Production Sandboxing):**
- OS-level sandboxing (seccomp filters, containers, or VM isolation)
- Admin role-based access control for execute endpoints
- Automated security regression tests

**Centralized Logging System (Fortune 500 Standard - Nov 2025):**
- **Backend Logger:** `server/logging/centralized-logger.ts` - Winston-based with request context via AsyncLocalStorage, correlation IDs, per-service caching, multi-transport (console + daily rotation files)
- **Request Context:** `server/logging/request-context.ts` - AsyncLocalStorage for request-scoped tracking (requestId, correlationId, userId, startTime)
- **Logging Middleware:** `server/logging/logging-middleware.ts` - Automatic request/response logging, security event logging (rate limits, suspicious IPs), performance threshold monitoring (3s warn, 5s error)
- **Logs API:** `server/routes/logs.router.ts` at `/api/logs/*`:
  - GET `/api/logs/query` - Query logs with filters (level, service, since, limit)
  - GET `/api/logs/search` - Full-text search across log messages
  - GET `/api/logs/stats` - Log level counts and service distribution
  - GET `/api/logs/request/:requestId` - Trace single request across services
  - GET `/api/logs/correlation/:correlationId` - Trace related requests
  - POST `/api/logs/ingest` - Frontend log ingestion with Zod validation
  - GET `/api/logs/export` - Export logs as JSON/CSV
- **Frontend Telemetry:** `client/src/lib/telemetry.ts` - Automatic error capture, Web Vitals (LCP, FID, CLS), network request logging, console interception, batched log shipping with beacon fallback, session management

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