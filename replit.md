# E-Code Platform

## Overview
E-Code is a web-based collaborative IDE with AI assistance, offering code editing, terminal access, file management, and an autonomous AI agent. Its primary purpose is to facilitate rapid prototyping and education, aiming for enterprise-grade scalability, multi-provider AI model selection, real-time collaboration, robust security, and the ambition to provide autonomous workspace creation from a natural language prompt to a live preview, streaming progress in real-time. Key capabilities include a mobile IDE with full feature parity, VS Code parity features, robust streaming with AI providers, and comprehensive security.

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

## System Architecture

### UI/UX Decisions
The frontend uses Shadcn/UI with Tailwind CSS for responsive component styling. Monaco Editor provides the core code editing. A comprehensive Apple-quality mobile design system is implemented, including iOS Dynamic Color System, San Francisco Pro Typography, 8pt Grid Spacing, Apple-quality animation springs, iOS-style shadows, continuous corners, and appropriate touch target sizes. An autonomous agent interface is platform-agnostic with responsive layouts and real-time progress tracking.

### Technical Implementations
The frontend is built with React 18, TypeScript, Vite, TanStack Query, and Wouter. The backend is a Node.js and Express.js application in TypeScript, utilizing Drizzle ORM for PostgreSQL and Passport.js for authentication, following a RESTful API design. Real-time services for terminal, collaborative editing (Y.js), and build logs are powered by WebSockets. AI optimization infrastructure includes a Task Classifier, Circuit Breaker, Priority Queue, Intelligent Caching, and Observability. UUIDs identify projects, and environment variables are encrypted using AES-256-GCM. Backend implements SSE streaming with buffered JSON parsing for reliable code generation.

### Feature Specifications
Key features include a Monaco Code Editor with VS Code-level enhancements (Git UI components like BranchManager, GitGraph, MergeConflictResolver, VisualDiffEditor, GitBlameDecorator; multi-cursor editing, code navigation, refactoring, advanced search, IntelliSense), an interactive terminal (xterm.js), file management, real-time collaboration, robust authentication, TypeScript-based container orchestration, Global Search & Replace, an Environment Variables Manager with encryption, a Logs Viewer, and a Debugger UI compatible with the VSCode Debug Adapter Protocol. The mobile IDE provides full feature parity with the desktop version, including touch-optimized quick actions and a comprehensive More menu with 23 services organized into 7 sections: Git (Commit, Push, Pull, Branches), Debug (Start, Stop, Breakpoints, Watch), Problems (View Problems), Webview & Tools (Web Preview, Packages, Tests, Global Search), Development (Output & Logs, Resources, Security Scanner, Environment Variables), Settings (Project Settings, Theme, Secrets, Database), and Share (Copy Link, Invite Users, Export).

**Autonomous Workspace Creation (Replit-Style Flow):**
The platform provides a Replit-identical autonomous workspace creation experience. Users enter a natural language prompt on the Homepage or Dashboard (e.g., "Create a todo list app with React"). The system:
1. **POST /api/workspace/bootstrap** - Creates project, agent session, returns token IMMEDIATELY (<1s)
2. **Instant Redirect** - Client redirected to `/ide/:id?bootstrap=token` without waiting for plan
3. **Background Plan Generation** - AI plan generates asynchronously (up to 180s) with multi-provider fallback
4. **WebSocket Connection** - `AutonomousWorkspaceViewer` connects to `/ws/agent` and displays real-time progress
5. **Autonomous Execution** - `agentOrchestrator.executeAutonomousPlan()` autonomously generates all files/code
6. **Live Preview** - Preview tab opens by default, shows app building in real-time
7. **Agent Integration** - `ReplitAgent` receives `initialPrompt` and continues autonomous development

**40-Year Engineering Fix (Nov 20, 2025):** Bootstrap changed from synchronous (3+ minute HTTP timeout) to asynchronous (instant token return, background plan generation). Client never waits for HTTP response, receives all updates via WebSocket streaming. Errors propagated via WebSocket with watchdog for unhandled rejections. Preview tab opens by default, `AutonomousWorkspaceViewer` modal opens automatically when `bootstrapToken` present.

**WebSocket Agent Fix (Nov 20, 2025):** Agent WebSocket switched to `noServer: true` mode with manual upgrade handling in `server/index.ts` to prevent Vite HMR from intercepting `/ws/agent` connections. The `httpServer.on('upgrade')` handler routes `/ws/agent` upgrades directly to `agentWebSocketService.handleUpgrade()`, bypassing Vite middleware that was blocking all WebSocket connections.

### System Design Choices
A PostgreSQL database stores user data, project hierarchies, AI agent sessions, deployment history, subscription management, and AI optimization monitoring. Security measures include CSRF protection, input sanitization, tier-based rate limiting, API versioning, and session-based authentication. The AI agent system provides server-sent event streaming, multi-provider AI model selection, and a database-backed conversation history, incorporating circuit breakers and retry logic for resilience. Health monitoring integrates Kubernetes probes and a Provider Health API, including a Prometheus metrics endpoint (`/metrics/prometheus`). A two-tier database API architecture is used: an Admin Database API and a Project Data API, with integrated security features like secret value masking and access control. Docker builds are optimized for small image sizes.

## External Dependencies

### AI/ML Services
- **OpenAI:** GPT-5.1, GPT-5, GPT-5-mini, GPT-4o, o3, o4-mini
- **Anthropic:** Claude Sonnet 4.5, Claude Opus 4.1, Claude Haiku 4.5
- **Google Gemini:** Gemini 2.5 Flash, Gemini 2.5 Pro
- **Moonshot AI:** Kimi K2 (kimi-k2-0711-preview, kimi-k2-0905-preview), Kimi K2 Thinking
- **xAI:** Grok 4, Grok 4 Fast
- **Groq:** Mixtral 8x7B
- **Provider Fallback Chain:** `['kimi-k2-0711-preview', 'gemini-2.5-flash', 'grok-4-fast', 'claude-haiku-4-5-20251015', 'gpt-5.1']` (Kimi K2 primary while debugging GPT-5.1 JSON issues - Nov 20, 2025)
- **40-Year Engineering Reliability Fixes (Nov 19-20, 2025):** 
  - Stream timeout 60s (default), retries 2→4, circuit breaker 30s→20s
  - **Per-Call Timeout Override System**: AIProviderManager accepts custom `timeoutMs` parameter for complex operations
  - Plan generation: 180s timeout per provider (vs 60s default, increased from 90s for complex CRM/enterprise prompts) with preserved 10MB/100KB safety limits
  - **StreamLimiter Chunk Idle Timeout (Nov 20, 2025)**: Separated chunk idle timeout (30s) from total timeout to fix 11ms timeout errors after 90s streams - allows plan generation to complete without premature chunk timeouts
  - **Complex Prompt Support (Nov 20, 2025)**: Plan generation timeout increased to 180s (3 minutes) per provider to support complex enterprise prompts (CRM, ERP, etc.) without premature timeout - allows GPT-5.1, Kimi K2, and other models to fully generate detailed execution plans
  - Moonshot model IDs corrected to production-recommended versions (kimi-k2-0711-preview, kimi-k2-0905-preview, kimi-k2-thinking)
  - Stripe API version updated to 2025-08-27.basil across all billing services (subscription-manager, stripe-billing-service, ai-metering-service, stripe-service)
  - Badge component refactored with React.forwardRef for proper ref handling in Radix UI Slot contexts
  - **GPT-5.1 Responses API Integration (Nov 19, 2025):**
    - Migrated from legacy `/v1/chat/completions` to new `/v1/responses` endpoint for GPT-5 family (gpt-5.1, gpt-5, gpt-5-mini, gpt-5-nano)
    - Fixed autonomous workspace token overflow (4.1M→compact hierarchical summary via `generateStructureSummary()`)
    - Input format: Role-tagged messages with typed content parts `[{type: 'input_text', text}]`
    - Output parsing: Multi-part aggregation of all `output_text` blocks to prevent truncation
    - Tool calling: Full function calling support via Responses API with idempotent `tool_choice` transformation
    - Reasoning tokens: Tracked from `usage.output_tokens_details.reasoning_tokens` for accurate billing
    - Streaming: GPT-5 models gracefully blocked (Responses API doesn't support streaming yet)
    - Backward compatibility: GPT-4 models continue using Chat Completions API
    - Production-ready: Architect-validated with complete parameter forwarding (max_output_tokens, temperature, top_p, frequency_penalty, presence_penalty, seed)
  - **WebSocket Event Protocol Standardization (Nov 19, 2025):**
    - Fixed critical event naming mismatch between backend and frontend for autonomous workspace streaming
    - Backend now emits frontend-compatible events: `task_start`, `task_complete`, `complete`, `error`, `file_created`
    - Proper taskId, taskName, progress, and message fields included in all events for AutonomousWorkspaceViewer compatibility
    - Real-time progress tracking now fully functional with WebSocket streaming to `/ws/agent` endpoint

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