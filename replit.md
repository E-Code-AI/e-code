# E-Code Platform

## Overview
E-Code is an AI-assisted web-based IDE designed for rapid prototyping, education, and enterprise use. It automates workspace generation, provides live previews, and offers real-time progress streaming. The platform supports multi-provider AI model selection, real-time collaboration, and robust security, aiming to be a market leader in AI-driven development tools with enterprise-grade testing, enhanced security, and a comprehensive theme system.

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
- **Agent Bootstrap Resilience:** Agent panel has 5-second timeout fallback to prevent infinite "Initializing Agent" loading state. When `POST /api/agent/conversation` fails (401 auth error or timeout), the child component calls `onBootstrapFailure` callback which chains to parent (`IDEPage`) to clear `stableBootstrapToken`. This makes `isBootstrapping` false, exiting the loading state. Users can still chat using temp conversation mode (negative projectId).
- **Database Backup:** Use `tsx scripts/backup-database.ts` for backup (creates timestamped SQL file in `backups/`), `tsx scripts/backup-database.ts --restore <file>` for restore. REQUIRES pg_dump for backup and psql for restore (production-safe, no fallback). Cloud storage upload with `--cloud` flag (requires GCS_BACKUP_BUCKET).
- **Environment Configuration:** Zod-validated environment variables via `server/utils/env-config.ts`. Required vars validated at startup, optional vars have defaults. Categories: required, security, monitoring, cache, ai, payments, email, notifications, storage, performance, rateLimit, replit. Import `envConfig` for typed access.
- **API Versioning:** Current API version is `v1` (implicit). Supports URL-based (`/api/v1/users`) and header-based (`Accept-Version: v1`). Deprecation middleware available via `deprecationWarning(version, sunsetDate)`.
- **Server Logs Streaming:** Real-time Winston log streaming via WebSocket at `/api/server/logs/ws`. Uses session-based authentication (derives userId ONLY from verified session cookie, never from query params). Registered with central upgrade dispatcher at priority 45. Frontend hook `useServerLogs` includes reconnection guards (`isMountedRef`, `isManualDisconnectRef`) and stale socket protection (`if (wsRef.current !== ws)` in onclose).
- **Runtime Logs Streaming:** Real-time stdout/stderr streaming via WebSocket at `/api/runtime/logs/ws`. Uses session-based authentication (synchronous handler with chained `.then()` promises). Per-project log isolation with executionId support. `markSocketAsHandled()` called BEFORE async auth to prevent race conditions.
- **Console Panel Responsiveness:** ReplitConsolePanel adapts to all screen sizes. Mobile: compact labels ("Latest"), icon-only buttons, bottom Sheet with all options. Tablet/Desktop: full labels, all controls visible. Horizontal scroll for overflow.
- **HTML Live Preview:** WebSocket-based hot-reload at `/ws/preview` with asset path rewriting. Root-absolute paths (`/style.css`) are rewritten to project namespace (`/api/preview/projects/:id/preview/style.css`). Supports CSS hot-swapping without full page reload. Multi-entry point support via `?file=path/to/file.html` query parameter. Cache-control headers on all assets prevent stale content.
- **Mobile Bootstrap WebSocket Stability:** The `use-autonomous-chat-integration` hook uses debounced cleanup (150ms) to protect WebSocket connections during active bootstrap from transient `enabled` toggles caused by `inlineMode` changes in the Replit-Bonsai WebView. When cleanup is triggered during active bootstrap, a timeout is scheduled; if `enabled` returns to true within 150ms (new effect runs), the cleanup is cancelled. Build completion ('complete'/'error' events) resets the protection so subsequent cleanups are immediate.
- **Security Hardening:** Fortune 500-grade security fixes applied: (1) XSS prevention in terminal console via HTML escaping before ANSI parsing, (2) Test credentials hidden in production builds via `import.meta.env.DEV` check, (3) Preview subprocess environment isolation using SAFE_ENV_WHITELIST to prevent API key exposure, (4) ai-usage endpoint returns 401 for unauthenticated users instead of mock data, (5) test-agent endpoint requires authentication and is blocked in production, (6) **Auth bypass completely removed** - all authentication now goes through Passport sessions only, no development shortcuts, (7) **Stripe webhook idempotency** - `stripeWebhookEvents` table prevents duplicate event processing, (8) **GitHub OAuth CSRF protection** - state parameter generated server-side, stored in session, validated on callback, (9) **Stripe webhook secret validation** - production mode now blocks startup if STRIPE_WEBHOOK_SECRET missing (throws error instead of warning), (10) **Zod route validation** - files.router.ts uses strict Zod schemas with path traversal protection, (11) **GitHub OAuth token encryption** - AES-256-GCM via credential-encryption.ts, (12) **GitHub token expiration enforcement** - tokens > 30 days are DENIED (not just warned), forcing re-authentication, (13) **JWT bootstrap validation** - signature verification + 24h expiration in bootstrap-auth.ts, (14) **Dynamic expression blocking** - safeEvaluateExpression/safeEvaluateCondition/safeExecuteFakerMethod block critical injection patterns (require, import, eval, constructor, process, prototype, etc.) in workflow/A-B testing/data provisioning contexts. NOTE: These are admin-controlled expressions; future iteration should migrate to JSON-structured conditions or vm2 sandbox for defense-in-depth, (15) **Redis password enforcement** - docker-compose requires REDIS_PASSWORD in production via ${REDIS_PASSWORD:?required}, (16) **Deep linking support** - .well-known/apple-app-site-association and assetlinks.json for iOS/Android app association.
- **Database Schema Design Decision:** Tables `conversationMemory`, `userSessions`, `auditLogs` use `text` for userId (not integer FK). This is intentional: these are audit/logging tables that must persist even if the referenced user is deleted. Changing column types would require destructive migrations on production data.
- **No-Bypass Authentication Policy:** All protected routes require valid Passport sessions. For development testing, use the login page at /auth with test credentials (testuser@test.com / testpass123). Session cookies are maintained by browsers/clients. For API testing, use tools like Postman with cookie jar enabled.

## System Architecture

### UI/UX Decisions
The frontend utilizes Shadcn/UI with Tailwind CSS and Monaco Editor, adhering to the Replit RUI Design System. It features a mobile-first, responsive design with light/dark modes, a unified IDE layout, spring animations, loading skeletons, and touch enhancements.

### Technical Implementations
The frontend is built with React 18, TypeScript, Vite, TanStack Query, and Wouter. The backend is a Node.js/Express.js application in TypeScript, using Drizzle ORM for PostgreSQL and Passport.js for authentication, providing RESTful APIs and WebSockets. AI optimizations include Task Classifier, Circuit Breaker, Priority Queue, Intelligent Caching, and Observability. Environment variables are AES-256-GCM encrypted, and SSE streaming is used for code generation. Anonymous bootstrap authentication provides ephemeral guest users. AI Agent enhancements include structured XML-based system prompts, a repository overview service, a context window manager, a unified AI provider system, and AI-powered inline code actions. A Checkpoints & Rollback System ensures atomic transactions, and a Background Auto-Testing System uses Playwright. Max Autonomy Mode provides extended autonomous sessions with AI task decomposition, auto-execution, ETA estimation, and cost tracking. Process-based code execution leverages native Nix-managed language runtimes. A centralized Winston-based logging system with correlation IDs and multi-transport support is implemented. An Agent Step Cache system provides database-backed intermediate step caching. Persistent chat history uses a dual-layer architecture: Zustand store with localStorage for instant local loading, plus PostgreSQL for server backup and cross-device sync. Fast Bootstrap Optimization provides intelligent fast model recommendations, parallel session+scaffold execution, and background npm install.

### System Design Choices
A PostgreSQL database stores user data, project hierarchies, AI agent sessions, deployment history, and subscription management. Security features include CSRF protection, input sanitization, tier-based rate limiting, API versioning, session-based authentication, and encrypted environment variables. The AI agent system offers server-sent event streaming, multi-provider AI model selection, database-backed conversation history, circuit breakers, and retry logic. Health monitoring integrates Kubernetes probes and a Provider Health API with Prometheus metrics. A two-tier database API architecture (Admin and Project Data APIs) is used with integrated security. Docker builds are optimized for small image sizes. Stripe payment integration supports a Replit-style hybrid pricing model. Support for 29 programming languages is provided via CodeMirror 6 for syntax highlighting and a robust runtime system with PID tracking, tree-kill for process termination, and language-specific timeouts. The platform supports `single-vm` (default) and `kubernetes` deployment modes. `DockerExecutor` provides enterprise-grade sandboxed code execution using ephemeral containers. A Memory Bank System stores AI-generated contextual markdown files. Core systems include a WebSocket Resilience System, an Intersection Observer Animation System, and a Native Motion Library. A ReplDB-Compatible Key-Value Database provides a Replit-compatible key-value store accessible from container code. Tenant isolation is implemented with `PersistenceEngine` for transactional persistence, `TenantContextMiddleware` for tenant ID extraction and verification, and `TenantScopedQueries` for secure, tenant-scoped database access. All production routes migrated to `withScopedTransaction` for Fortune 500-grade tenant isolation: `secrets.router.ts`, `files.router.ts`, and `agent.router.ts`. TenantScopedQueries enforces project ownership via tenantId=userId for personal projects. PostgreSQL RLS policies available in `scripts/rls-policies.sql` for defense-in-depth.

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