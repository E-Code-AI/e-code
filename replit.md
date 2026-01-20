# E-Code Platform

## Overview
E-Code is an AI-assisted web-based IDE for rapid prototyping, education, and enterprise application development. It focuses on AI-driven development, offering automated workspace generation, live previews, real-time progress streaming, multi-provider AI model selection, and collaborative tools. The platform aims to innovate application development and deployment with a strong emphasis on user experience, enterprise-grade testing, and robust security. Key capabilities include AI task decomposition, auto-execution, and cost tracking.

## User Preferences
- **Communication:** Simple, everyday language
- **Code Style:** TypeScript with strict typing
- **Database:** NEVER manual SQL migrations - use `npm run db:push` (or `--force`)
- **Files:** NEVER remove without explicit request
- **Hooks:** ALL React hooks before early returns
- **Routing:** `/ide/:id` (legacy `/editor/:id` redirects)
- **Security:** API keys via Replit Secrets, never commit
- **Docker Build:** Optimized for <2GiB images
- **Rate Limiting:** Tier-based (Free: 500/min, Pro: 1000/min, Teams: 5000/min, Enterprise: 10000/min)
- **Monaco Editor:** Safe disposal pattern with optional chaining (`d?.dispose?.()`) for all enhancement classes
- **Lazy Loading:** Use `instrumentedLazy()` instead of `lazy()` for pages - adds retry logic (3 attempts, 1s delay) for transient Vite HMR failures
- **LazyMotionButton:** Must pass native button props (onClick, data-testid, etc.) to CSS fallback/Suspense fallback - otherwise clicks won't work when shouldUseCSS is true
- **Documentation:** Ruthlessly remove obsolete/misleading docs - maintain technical honesty
- **WebSocket Upgrade:** Mark sockets as handled BEFORE async auth checks in central dispatcher to prevent race conditions with upgrade guard's setImmediate cleanup
- **IDE Tab Defaults:** Desktop: Chat/Agent tab active by default (left dock index 3). Mobile/Tablet: Deploy tab active by default. Preview panel always visible with wireframe placeholder.
- **Schema Warming:** Background data structure pre-drafting while user chats. Schema often "warmed up" by deploy time. Shows "App not ready" placeholder until schema is ready.
- **Mobile Font Sizes:** Compact but WCAG-compliant font sizes (11px minimum) in mobile inline tab navigation. Tab labels use 11px, status badges use 11px.
- **Database Auto-Provisioning:** Databases provision asynchronously (fire-and-forget) on project creation to avoid API gateway timeouts. Frontend polls status via `/api/database/project/:id`. Multi-provider fallback: if Neon fails, auto-falls back to local PostgreSQL provider. Frontend auto-retries: if user opens DatabasePanel and database has status='error', triggers auto-retry; if no database exists, triggers auto-provision.
- **Agent Bootstrap Always-Ready:** Replit-style pattern where agent panel is NEVER blocked by bootstrap delays. Uses temp conversationId (-projectId) when real ID not yet available. Messages stored locally in Zustand, migrated when real conversationId created. Send button disabled only when input empty or AI working - never due to missing conversationId. "Initializing Agent" blocking screen removed entirely.
- **Database Backup:** Use `tsx scripts/backup-database.ts` for backup (creates timestamped SQL file in `backups/`), `tsx scripts/backup-database.ts --restore <file>` for restore. REQUIRES pg_dump for backup and psql for restore (production-safe, no fallback). Cloud storage upload with `--cloud` flag (requires GCS_BACKUP_BUCKET).
- **Environment Configuration:** Zod-validated environment variables via `server/utils/env-config.ts`. Required vars validated at startup, optional vars have defaults. Categories: required, security, monitoring, cache, ai, payments, email, notifications, storage, performance, rateLimit, replit. Import `envConfig` for typed access.
- **API Versioning:** Current API version is `v1` (implicit). Supports URL-based (`/api/v1/users`) and header-based (`Accept-Version: v1`). Deprecation middleware available via `deprecationWarning(version, sunsetDate)`.
- **Server Logs Streaming:** Real-time Winston log streaming via WebSocket at `/api/server/logs/ws`. Uses session-based authentication (derives userId ONLY from verified session cookie, never from query params). Registered with central upgrade dispatcher at priority 45. Frontend hook `useServerLogs` includes reconnection guards (`isMountedRef`, `isManualDisconnectRef`) and stale socket protection (`if (wsRef.current !== ws)` in onclose).
- **Runtime Logs Streaming:** Real-time stdout/stderr streaming via WebSocket at `/api/runtime/logs/ws`. Uses session-based authentication (synchronous handler with chained `.then()` promises). Per-project log isolation with executionId support. `markSocketAsHandled()` called BEFORE async auth to prevent race conditions.
- **Console Panel Responsiveness:** ReplitConsolePanel adapts to all screen sizes. Mobile: compact labels ("Latest"), icon-only buttons, bottom Sheet with all options. Tablet/Desktop: full labels, all controls visible. Horizontal scroll for overflow.
- **HTML Live Preview:** WebSocket-based hot-reload at `/ws/preview` with asset path rewriting. Root-absolute paths (`/style.css`) are rewritten to project namespace (`/api/preview/projects/:id/preview/style.css`). Supports CSS hot-swapping without full page reload. Multi-entry point support via `?file=path/to/file.html` query parameter. Cache-control headers on all assets prevent stale content.
- **Mobile Bootstrap WebSocket Stability:** The `use-autonomous-chat-integration` hook uses debounced cleanup (150ms) to protect WebSocket connections during active bootstrap from transient `enabled` toggles caused by `inlineMode` changes in the Replit-Bonsai WebView. When cleanup is triggered during active bootstrap, a timeout is scheduled; if `enabled` returns to true within 150ms (new effect runs), the cleanup is cancelled. Build completion ('complete'/'error' events) resets the protection so subsequent cleanups are immediate.
- **Security Hardening:** Fortune 500-grade security fixes applied: XSS prevention, test credential hiding in production, preview subprocess environment isolation, authenticated `ai-usage` endpoint, authenticated and blocked in production `test-agent` endpoint, removal of auth bypass, Stripe webhook idempotency, GitHub OAuth CSRF protection, Stripe webhook secret validation, Zod route validation with path traversal protection, GitHub OAuth token encryption, GitHub token expiration enforcement, JWT bootstrap validation, dynamic expression blocking (with admin control), Redis password enforcement, and deep linking support.
- **Database Schema Design Decision:** Tables `conversationMemory`, `userSessions`, `auditLogs` use `text` for userId (not integer FK). This is intentional: these are audit/logging tables that must persist even if the referenced user is deleted. Changing column types would require destructive migrations on production data.
- **No-Bypass Authentication Policy:** All protected routes require valid Passport sessions. For development testing, use the login page at /auth with test credentials (testuser@test.com / testpass123). Session cookies are maintained by browsers/clients. For API testing, use tools like Postman with cookie jar enabled.
- **Projects API Pagination:** The `/api/projects` endpoint returns a paginated response `{ projects: [...], pagination: {...} }`. All frontend components must use `queryFn` to extract the array: `(res.projects && Array.isArray(res.projects)) ? res.projects : (Array.isArray(res) ? res : [])`. This prevents "filter is not a function" errors.

## System Architecture

### UI/UX Decisions
The frontend uses Shadcn/UI with Tailwind CSS and Monaco Editor, adhering to the Replit RUI Design System. It features responsive, mobile-first design, light/dark modes, a unified IDE layout, spring animations, loading skeletons, and touch enhancements.

### Technical Implementations
The frontend is built with React 18, TypeScript, Vite, TanStack Query, and Wouter. The backend is a Node.js/Express.js application in TypeScript, using Drizzle ORM for PostgreSQL and Passport.js for authentication. It provides RESTful APIs and WebSockets. AI optimizations include Task Classifier, Circuit Breaker, Priority Queue, Intelligent Caching, and Observability. Environment variables are AES-256-GCM encrypted, and SSE streaming is used for code generation. Anonymous bootstrap authentication supports ephemeral guest users. AI Agent enhancements include structured XML-based system prompts, a repository overview service, a context window manager, a unified AI provider system, and AI-powered inline code actions. A Checkpoints & Rollback System ensures atomic transactions, and a Background Auto-Testing System uses Playwright. Max Autonomy Mode provides extended autonomous sessions with AI task decomposition, auto-execution, ETA estimation, and cost tracking. Process-based code execution uses native Nix-managed language runtimes. A centralized Winston-based logging system with correlation IDs and multi-transport support is implemented. An Agent Step Cache system provides database-backed intermediate step caching. Persistent chat history uses a dual-layer architecture: Zustand store with localStorage for instant local loading, plus PostgreSQL for server backup and cross-device sync. Fast Bootstrap Optimization provides intelligent fast model recommendations, parallel session+scaffold execution, and background npm install.

### System Design Choices
A PostgreSQL database stores user data, project hierarchies, AI agent sessions, deployment history, and subscription management. Security features include CSRF protection, input sanitization, tier-based rate limiting, API versioning, session-based authentication, and encrypted environment variables. The AI agent system offers server-sent event streaming, multi-provider AI model selection, database-backed conversation history, circuit breakers, and retry logic. Health monitoring integrates Kubernetes probes and a Provider Health API with Prometheus metrics. A two-tier database API architecture (Admin and Project Data APIs) is used with integrated security. Docker builds are optimized for small image sizes. Stripe payment integration supports a Replit-style hybrid pricing model. Support for 29 programming languages is provided via CodeMirror 6 for syntax highlighting and a robust runtime system with PID tracking, tree-kill for process termination, and language-specific timeouts. The platform supports `single-vm` (default) and `kubernetes` deployment modes. `DockerExecutor` provides enterprise-grade sandboxed code execution using ephemeral containers. A Memory Bank System stores AI-generated contextual markdown files. Core systems include a WebSocket Resilience System, an Intersection Observer Animation System, and a Native Motion Library. A ReplDB-Compatible Key-Value Database provides a Replit-compatible key-value store accessible from container code. Tenant isolation is implemented with `PersistenceEngine`, `TenantContextMiddleware`, and `TenantScopedQueries` for secure, transactional, and tenant-scoped database access. All production routes use `withScopedTransaction` for tenant isolation. PostgreSQL RLS policies are available for defense-in-depth.

## External Dependencies

### AI/ML Services
- **OpenAI:** GPT-5.2, GPT-5.2-Codex, GPT-5.1, GPT-5, GPT-5-mini, GPT-5-nano, GPT-4.1, GPT-4.1-mini, GPT-4.1-nano, GPT-4o, GPT-4o-mini, o3, o4-mini
- **Anthropic:** Claude Opus 4.5-20251101, Claude Opus 4.1-20250805, Claude Sonnet 4.5-20250929, Claude Sonnet 4-20250514, Claude Haiku 4.5
- **Google Gemini:** Gemini 3 Flash, Gemini 3 Pro, Gemini 2.5 Pro, Gemini 2.5 Flash, Gemini 2.0 Flash
- **Moonshot AI (Kimi):** kimi-k2-thinking, kimi-k2-thinking-turbo, kimi-k2-turbo-preview, kimi-k2-0905-preview
- **xAI:** Grok 4.1 Fast (Reasoning), Grok 4.1 Fast (Non-Reasoning), Grok 4, Grok 3

### Infrastructure Services
- **PostgreSQL:** Neon serverless
- **Redis:** Optional caching layer
- **Stripe:** Payment processing
- **SendGrid:** Email delivery
- **Sentry:** Error monitoring
- **Slack:** Production monitoring alerts
- **Object Storage:** Replit built-in GCS-backed storage (production) / Local filesystem (development)

### Development Tools & Integrations
- **GitHub:** OAuth integration
- **Figma:** Design imports
- **Playwright:** Browser automation for testing
- **Monaco Editor:** Microsoft's VS Code editor component
- **xterm.js:** Terminal emulation library
- **Tavily:** Web search integration

### Authentication Providers
- **Replit Auth:** Google, GitHub, Twitter/X, Apple, email/password
- **Custom Email/Password**

### Applications
- **Desktop Application (Electron):** Cross-platform with multi-window, deep linking, auto-update, and secure IPC.
- **Mobile Application (React Native + Expo SDK 54):** Cross-platform with platform-specific features, expo-secure-store for token encryption with AsyncStorage migration fallback.