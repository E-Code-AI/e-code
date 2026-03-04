# E-Code Platform

## Overview
E-Code is an AI-assisted web-based IDE designed to enhance software development efficiency and accelerate the software delivery lifecycle. It offers automated workspace generation, real-time code execution and previews, multi-provider AI model integration, collaborative tools, enterprise-grade testing, and robust security. The platform aims to be a leading AI-powered development environment for rapid prototyping, educational use, and complex enterprise application development.

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
- **Schema Warming:** Background data structure pre-drafting while user chats. Schema often "warmed up" by deploy time. Shows "App not ready" placeholder until schema ready.
- **Mobile Font Sizes:** Compact but WCAG-compliant font sizes (11px minimum) in mobile inline tab navigation. Tab labels use 11px, status badges use 11px.
- **Database Auto-Provisioning:** Databases provision asynchronously (fire-and-forget) on project creation to avoid API gateway timeouts. Frontend polls status via `/api/database/project/:id`. Multi-provider fallback: if Neon fails, auto-falls back to local PostgreSQL provider. Frontend auto-retries: if user opens DatabasePanel and database has status='error', triggers auto-retry; if no database exists, triggers auto-provision.
- **Agent Bootstrap Always-Ready:** Replit-style pattern where agent panel is NEVER blocked by bootstrap delays. Uses temp conversationId (-projectId) when real ID not yet available. Messages stored locally in Zustand, migrated when real conversationId created. Send button disabled only when input empty or AI working - never due to missing conversationId. "Initializing Agent" removed entirely.
- **SPA Routing:** `notFoundHandler` only catches `/api/*` routes — non-API paths pass through to Vite so the React SPA can handle them. This is critical: do NOT register notFoundHandler before Vite init, and do NOT remove the `/api` prefix check in notFoundHandler.
- **Database Backup:** Use `tsx scripts/backup-database.ts` for backup (creates timestamped SQL file in `backups/`), `tsx scripts/backup-database.ts --restore <file>` for restore. REQUIRES pg_dump for backup and psql for restore (production-safe, no fallback). Cloud storage upload with `--cloud` flag (requires GCS_BACKUP_BUCKET).
- **Deployment Build Optimization:** `scripts/build-server.mjs` bundles ALL pure-JS production packages into `dist/index.js` (~18MB). Only native addons (bcrypt, node-pty, sharp) remain external. Deployment build command uses `BUILD_DEPLOY=1 npm run build` which additionally prunes `node_modules` to only those 3 native packages (~200 files vs 40,000+) so the security scanner finishes in seconds. Dev builds (without BUILD_DEPLOY=1) skip the pruning to preserve dev tools. **SAFETY**: The prune only runs when BOTH `BUILD_DEPLOY=1` AND `REPLIT_DEPLOYMENT` env var is set — never run `BUILD_DEPLOY=1 npm run build` in dev or it destroys node_modules.
- **apiRequest() Returns Parsed JSON:** `apiRequest(method, url, body)` from `@/lib/queryClient` returns `Promise<T>` (parsed JSON body directly), NOT a `Promise<Response>`. Never check `.ok` or call `.json()` on the result. It throws automatically for non-OK responses. Pattern: `const data = await apiRequest<MyType>('POST', '/api/endpoint', body);`
- **Voice Vibe Coding:** `MediaRecorder` API → `/api/voice/transcribe` → transcript injected into agent input. **Multi-provider**: OpenAI Whisper (`whisper-1`) primary (best accuracy for code), Gemini 2.0 Flash as automatic fallback if OpenAI fails or key missing. Anthropic, xAI, Moonshot have NO audio transcription APIs. Uses `apiRequest` (not raw `fetch`) for automatic CSRF token handling. Vibe Mode (Zap button, `data-testid="button-vibe-mode"`) auto-submits on transcription. `voiceInputEnabled: true` by default (env `FEATURE_VOICE_INPUT`). FORBIDDEN: Web Speech API. Response includes `provider` field indicating which service was used.
- **API Route Dual-Mount Pattern:** `aiModelsRouter` is mounted at BOTH `/api/models` AND `/api/ai/models` for frontend compatibility. Always mount at both paths when adding new AI-related routers that the frontend may call via either prefix.
- **Tenant Isolation (Critical):** Personal projects MUST have `tenantId = ownerId` (the user's ID) — NOT NULL. The `createProject` route in `projects.router.ts` sets `tenantId: validatedData.tenantId ?? userId`. The persistence engine's `withScopedTransaction` checks `WHERE tenant_id = userId`, so NULL tenantId causes 403 on all file operations. If projects have NULL tenant_id in DB, run: `UPDATE projects SET tenant_id = owner_id WHERE tenant_id IS NULL`.
- **Project Starter Files:** When a new project is created via `POST /api/projects`, a language-appropriate starter file (e.g. `main.js`, `main.py`) is auto-created in the `files` DB table so the IDE has something to show immediately. This is done synchronously in the project creation route before returning the response. Never skip this — empty file tree on new project creation is a poor UX.
- **Notification Preferences Schema:** The `notification_preferences` table uses `email` (jsonb), `push` (jsonb), and `frequency` (varchar) columns — NOT individual boolean columns.
- **Animation Safety:** Never use horizontal x-shift animations (`initial={{ x: -50 }}`) on public marketing pages — if `whileInView` fires late or not at all, content appears shifted 50px to the left creating perceived layout misalignment. Always use vertical y-shift (`initial={{ y: 30 }})` for `whileInView` animations on public pages.
- **Environment Configuration:** Zod-validated environment variables via `server/utils/env-config.ts`. Required vars validated at startup, optional vars have defaults. Categories: required, security, monitoring, cache, ai, payments, email, notifications, storage, performance, rateLimit, replit. Import `envConfig` for typed access.
- **API Versioning:** Current API version is `v1` (implicit`). Supports URL-based (`/api/v1/users`) and header-based (`Accept-Version: v1`). Deprecation middleware available via `deprecationWarning(version, sunsetDate)`.
- **Server Logs Streaming:** Real-time Winston log streaming via WebSocket at `/api/server/logs/ws`. Uses session-based authentication (derives userId ONLY from verified session cookie, never from query params). Registered with central upgrade dispatcher at priority 45. Frontend hook `useServerLogs` includes reconnection guards (`isMountedRef`, `isManualDisconnectRef`) and stale socket protection (`if (wsRef.current !== ws)` in onclose).
- **Runtime Logs Streaming:** Real-time stdout/stderr streaming via WebSocket at `/api/runtime/logs/ws`. Uses session-based authentication. Per-project log isolation with executionId support. `markSocketAsHandled()` called BEFORE async auth to prevent race conditions.
- **Console Panel Responsiveness:** ReplitConsolePanel adapts to all screen sizes. Mobile: compact labels ("Latest"), icon-only buttons, bottom Sheet with all options. Tablet/Desktop: full labels, all controls visible. Horizontal scroll for overflow.
- **HTML Live Preview:** WebSocket-based hot-reload at `/ws/preview` with asset path rewriting. Root-absolute paths (`/style.css`) are rewritten to project namespace (`/api/preview/projects/:id/preview/style.css`). Supports CSS hot-swapping without full page reload. Multi-entry point support via `?file=path/to/file.html` query parameter. Cache-control headers on all assets prevents stale content.
- **Mobile Bootstrap WebSocket Stability:** The `use-autonomous-chat-integration` hook uses debounced cleanup (150ms) to protect WebSocket connections during active bootstrap from transient `enabled` toggles caused by `inlineMode` changes in the Replit-Bonsai WebView. When cleanup is triggered during active bootstrap, a timeout is scheduled; if `enabled` returns to true within 150ms (new effect runs), the cleanup is cancelled. Build completion ('complete'/'error' events) resets the protection so subsequent cleanups are immediate.
- **Security Hardening:** XSS prevention, test credential hiding in production, preview subprocess environment isolation, authenticated `ai-usage` endpoint, authenticated and blocked in production `test-agent` endpoint, removal of auth bypass, Stripe webhook idempotency, GitHub OAuth CSRF protection, Stripe webhook secret validation, Zod route validation with path traversal protection, GitHub token encryption, GitHub token expiration enforcement, JWT bootstrap validation, dynamic expression blocking (with admin control), Redis password enforcement, and deep linking support.
- **Database Schema Design Decision:** Tables `conversationMemory`, `userSessions`, `auditLogs` use `text` for userId (not integer FK). This is intentional: these are audit/logging tables that must persist even if the referenced user is deleted.
- **No-Bypass Authentication Policy:** All protected routes require valid Passport sessions. For development testing, use the login page at /auth with test credentials (testuser@test.com / testpass123). Session cookies are maintained by browsers/clients. For API testing, use tools like Postman with cookie jar enabled.
- **Projects API Pagination:** The `/api/projects` endpoint returns a paginated response `{ projects: [...], pagination: {...}`. All frontend components must use `queryFn` to extract the array: `(res.projects && Array.isArray(res.projects)) ? res.projects : (Array.isArray(res) ? res : [])`. This prevents "filter is not a function" errors.

## System Architecture

### UI/UX Decisions
The frontend uses Shadcn/UI, Tailwind CSS, and the Monaco Editor, following the Replit RUI Design System. It emphasizes responsiveness, mobile-first design, light/dark modes, a unified IDE layout, spring animations, loading skeletons, and touch-optimized interactions.

### Technical Implementations
The platform uses a two-service architecture: a Main Platform (React 18, TypeScript, Vite, TanStack Query, Wouter; Node.js/Express.js, TypeScript, Drizzle ORM, Passport.js) and an independent Runner microservice for isolated workspace execution. AI optimizations include Task Classifier, Circuit Breaker, Priority Queue, Intelligent Caching, and Observability. Environment variables are AES-256-GCM encrypted. Server-Sent Events enable real-time code generation. The AI Agent system features structured XML prompts, a context window manager, a unified AI provider, and inline code actions. Reliability is supported by Checkpoints & Rollback and Background Auto-Testing (Playwright). Max Autonomy Mode allows advanced AI task decomposition. Code execution uses native Nix-managed runtimes, with Winston for logging and correlation IDs. An Agent Step Cache and persistent chat history are implemented, alongside Fast Bootstrap Optimization for quick model recommendations and parallel execution.

### System Design Choices
PostgreSQL is the primary data store. Security features include CSRF protection, input sanitization, tier-based rate limiting, API versioning, session-based authentication, and encrypted environment variables. The AI agent system provides SSE streaming, multi-provider AI model selection, database-backed conversation history, circuit breakers, and retry logic. Health monitoring integrates Kubernetes probes and a Provider Health API with Prometheus metrics. A two-tier database API architecture (Admin and Project Data APIs) is employed. Docker builds are optimized for small image sizes. Stripe integration supports a hybrid pricing model. The platform supports 29 programming languages via CodeMirror 6 and a robust runtime system with PID tracking and language-specific timeouts, supporting `single-vm` and `kubernetes` deployment modes. `DockerExecutor` offers enterprise-grade sandboxed code execution. A Memory Bank System stores AI-generated contextual markdown files. Core systems include a WebSocket Resilience System, an Intersection Observer Animation System, a Native Motion Library, and a ReplDB-Compatible Key-Value Database. Tenant isolation is implemented using `PersistenceEngine`, `TenantContextMiddleware`, `TenantScopedQueries`, and PostgreSQL RLS policies.

## External Dependencies

### AI/ML Services
- OpenAI
- Anthropic
- Google Gemini
- Moonshot AI (Kimi)
- xAI

### Infrastructure Services
- PostgreSQL (Neon serverless)
- Redis
- Stripe
- SendGrid
- Sentry
- Slack
- Object Storage (GCS-backed for production)
- E-Code Runner

### Development Tools & Integrations
- GitHub
- Playwright
- Monaco Editor
- xterm.js
- Tavily

### Authentication Providers
- Replit Auth
- Custom Email/Password

### Applications
- Electron (Desktop)
- React Native + Expo SDK 54 (Mobile)