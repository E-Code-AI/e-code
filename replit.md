# E-Code Platform

## Overview
E-Code is an AI-assisted web-based IDE designed to boost developer productivity and accelerate project delivery. It provides automated workspace setup, real-time code execution, integrated AI capabilities, collaborative tools, enterprise-grade testing, and robust security. The platform aims to foster innovation and efficiency through a comprehensive, secure, and performant development experience, becoming a leading AI-powered software development environment.

## User Preferences
- Communication: Simple, everyday language
- Code Style: TypeScript with strict typing
- Database: NEVER manual SQL migrations - use `npm run db:push` (or `--force`)
- Files: NEVER remove without explicit request
- Hooks: ALL React hooks before early returns
- Routing: `/ide/:id` (legacy `/editor/:id` redirects)
- Security: API keys via Replit Secrets, never commit
- Docker Build: Optimized for <2GiB images
- Rate Limiting: Tier-based (Free: 500/min, Pro: 1000/min, Teams: 5000/min, Enterprise: 10000/min)
- Monaco Editor: Safe disposal pattern with optional chaining (`d?.dispose?.()`) for all enhancement classes
- Lazy Loading: Use `instrumentedLazy()` instead of `lazy()` for pages - adds retry logic (3 attempts, 1s delay) for transient Vite HMR failures
- LazyMotionButton: Must pass native button props (onClick, data-testid, etc.) to CSS fallback/Suspense fallback - otherwise clicks won't work when shouldUseCSS is true
- Documentation: Ruthlessly remove obsolete/misleading docs - maintain technical honesty
- WebSocket Upgrade: Mark sockets as handled BEFORE async auth checks in central dispatcher to prevent race conditions with upgrade guard's setImmediate cleanup
- IDE Tab Defaults: Desktop: Chat/Agent tab active by default (left dock index 3). Mobile/Tablet: Deploy tab active by default. Preview panel always visible with wireframe placeholder.
- Schema Warming: Background data structure pre-drafting while user chats. Schema often "warmed up" by deploy time. Shows "App not ready" placeholder until schema ready. CRITICAL: The preview/deploy gate `!isSchemaReady` is ONLY active during bootstrap (`!isSchemaReady && !!bootstrapToken`). Existing projects (no bootstrapToken) must always show preview/deploy immediately. When autonomous build completes ('complete' event), `useSchemaWarmingStore.getState().markReady()` is called in `use-autonomous-chat-integration.ts` to unlock the tabs.
- Mobile Font Sizes: Compact but WCAG-compliant font sizes (11px minimum) in mobile inline tab navigation. Tab labels use 11px, status badges use 11px.
- Database Auto-Provisioning: Databases provision asynchronously (fire-and-forget) on project creation to avoid API gateway timeouts. Frontend polls status via `/api/database/project/:id`. Multi-provider fallback: if Neon fails, auto-falls back to local PostgreSQL provider. Frontend auto-retries: if user opens DatabasePanel and database has status='error', triggers auto-retry; if no database exists, triggers auto-provision.
- Agent Bootstrap Always-Ready: Replit-style pattern where agent panel is NEVER blocked by bootstrap delays. Uses temp conversationId (-projectId) when real ID not yet available. Messages stored locally in Zustand, migrated when real conversationId created. Send button disabled only when input empty or AI working - never due to missing conversationId. "Initializing Agent" entirely removed.
- SPA Routing: `notFoundHandler` only catches `/api/*` routes — non-API paths pass through to Vite so the React SPA can handle them. This is critical: do NOT register notFoundHandler before Vite init, and do NOT remove the `/api` prefix check in notFoundHandler.
- Database Backup: Use `tsx scripts/backup-database.ts` for backup (creates timestamped SQL file in `backups/`), `tsx scripts/backup-database.ts --restore <file>` for restore. REQUIRES pg_dump for backup and psql for restore (production-safe, no fallback). Cloud storage upload with `--cloud` flag (requires GCS_BACKUP_BUCKET).
- Deployment Build Optimization: `BUILD_DEPLOY=1 npm run build` prunes `node_modules` to only native packages. **SAFETY**: The prune only runs when BOTH `BUILD_DEPLOY=1` AND `REPLIT_DEPLOYMENT` env var is set — never run `BUILD_DEPLOY=1 npm run build` in dev or it destroys node_modules.
- apiRequest() Returns Parsed JSON: `apiRequest(method, url, body)` from `@/lib/queryClient` returns `Promise<T>` (parsed JSON body directly), NOT a `Promise<Response>`. Never check `.ok` or call `.json()` on the result. It throws automatically for non-OK responses. Pattern: `const data = await apiRequest<MyType>('POST', '/api/endpoint', body);`
- postgres-js db.execute() returns array directly: The server uses `drizzle-orm/postgres-js`. When calling `db.execute(sql\`SELECT ...\`)`, it returns an array of rows directly (NOT `{ rows: [...] }`). Always use: `const rows = Array.isArray(result) ? (result as any) : (result as any).rows ?? [];` for compatibility. INSERT/UPDATE return an empty array. Never use `.rows` directly on `db.execute()` results.
- Raw Fetch CSRF Rule: ALL raw `fetch()` calls to `/api/*` using POST/PUT/PATCH/DELETE MUST include `X-CSRF-Token` header. Use `getCSRFToken()` exported from `@/lib/queryClient`: `const csrf = await getCSRFToken(); fetch('/api/...', { headers: { 'X-CSRF-Token': csrf } })`. SSE streaming endpoints MUST use this pattern since `apiRequest` cannot be used for streaming. File uploads also need it.
- Voice Vibe Coding: `MediaRecorder` API → `/api/voice/transcribe` → transcript injected into agent input. **Multi-provider**: OpenAI Whisper (`whisper-1`) primary, Gemini 2.0 Flash as automatic fallback. Uses `apiRequest` for automatic CSRF token handling. Vibe Mode auto-submits on transcription. `voiceInputEnabled: true` by default. FORBIDDEN: Web Speech API.
- API Route Dual-Mount Pattern: `aiModelsRouter` is mounted at BOTH `/api/models` AND `/api/ai/models` for frontend compatibility. Always mount at both paths when adding new AI-related routers that the frontend may call via either prefix.
- Router Prefix Rule: When a router is mounted at `app.use('/api', router)`, its internal routes must NOT include `/api/` prefix.
- Template Fork: `POST /api/templates/:id/fork` creates a new project from a template. MUST set `tenantId: userId` on the new project (same as ownerId) to prevent 403 on file/runtime operations. MUST normalize template language to lowercase and validate against DB `language` enum (`javascript, typescript, python, java, go, rust, c, cpp, ruby, php, html, css, nodejs`) — fallback to `javascript` for `unsupported` values like C#, Rust (uppercase), YAML, etc. All `eq(templates.id, id)` and related FK queries MUST use `parseInt(id, 10)` since `templates.id` is serial (integer).
- Marketplace author field: template.author and extension.author can be objects `{id, name, verified}`. Always render as: `typeof author === 'object' ? author?.name : author`. Never render the raw object.
- WebSocket Origin Validation: `isOriginAllowed()` now has same-host shortcut — if Origin header hostname matches Host header hostname, allow immediately. Also auto-detects `REPLIT_DEV_URL` for allowed origins.
- Tenant Isolation (Critical): Personal projects MUST have `tenantId = ownerId` (the user's ID) — NOT NULL. The persistence engine's `withScopedTransaction` checks `WHERE tenant_id = userId`, so NULL tenantId causes 403 on all file operations. If projects have NULL tenant_id in DB, run: `UPDATE projects SET tenant_id = owner_id WHERE tenant_id IS NULL`.
- Project Starter Files: When a new project is created via `POST /api/projects`, a language-appropriate starter file is auto-created in the `files` DB table.
- Notification Preferences Schema: The `notification_preferences` table uses `email` (jsonb), `push` (jsonb), and `frequency` (varchar) columns — NOT individual boolean columns.
- Animation Safety: Never use horizontal x-shift animations (`initial={{ x: -50 }}`) on public marketing pages — Always use vertical y-shift (`initial={{ y: 30 }})` for `whileInView` animations on public pages.
- Public Routes: `/marketplace`, `/templates`, `/marketplace/templates`, `/community`, `/community/post/:id`, `/search`, `/explore` are PUBLIC routes in `client/src/routes/config.ts` — do NOT move them to protectedRoutes. They must be accessible without authentication.
- Environment Configuration: Zod-validated environment variables via `server/utils/env-config.ts`.
- API Versioning: Current API version is `v1`. Supports URL-based (`/api/v1/users`) and header-based (`Accept-Version: v1`).
- Server Logs Streaming: Real-time Winston log streaming via WebSocket at `/api/server/logs/ws`. Uses session-based authentication.
- Runtime Logs Streaming: Real-time stdout/stderr streaming via WebSocket at `/api/runtime/logs/ws`. Uses session-based authentication. Per-project log isolation with executionId support.
- Console Panel Responsiveness: ReplitConsolePanel adapts to all screen sizes. Mobile: compact labels, icon-only buttons, bottom Sheet. Tablet/Desktop: full labels, all controls visible.
- HTML Live Preview: WebSocket-based hot-reload at `/ws/preview` with asset path rewriting. Supports CSS hot-swapping.
- Mobile Bootstrap WebSocket Stability: The `use-autonomous-chat-integration` hook uses debounced cleanup (150ms) to protect WebSocket connections during active bootstrap.
- Security Hardening: XSS prevention, test credential hiding in production, preview subprocess environment isolation, authenticated `ai-usage` endpoint, authenticated and blocked in production `test-agent` endpoint, removal of auth bypass, Stripe webhook idempotency, GitHub OAuth CSRF protection, Stripe webhook secret validation, Zod route validation with path traversal protection, GitHub token encryption, GitHub expiration enforcement, JWT bootstrap validation, dynamic expression blocking (with admin control), Redis password enforcement, and deep linking support.
- Database Schema Design Decision: Tables `conversationMemory`, `userSessions`, `auditLogs` use `text` for userId (not integer FK). This is intentional.
- No-Bypass Authentication Policy: All protected routes require valid Passport sessions.
- Projects API Pagination: The `/api/projects` endpoint returns a paginated response `{ projects: [...], pagination: {...}`. Frontend must use `queryFn` to extract the array.
- Bootstrap Response Format: `POST /api/workspace/bootstrap` returns `{ success, projectId, projectSlug, sessionId, bootstrapToken, workspaceUrl, ... }` — NOTE: the project ID is at top-level `response.projectId` (NOT `response.project.id`). Frontend must check `response.projectId`, use `/ide/${response.projectId}?bootstrap=${response.bootstrapToken}` for redirect. NEVER use `response.project` or `/editor/`.
- Bootstrap Timeout: `BOOTSTRAP_TIMEOUT_MS = 60000` (60s) in `autonomousBuildStore.ts`.
- Global Search Route: `globalSearchRouter` is mounted at `/api/search` → internal route MUST be `router.post('/global', ...)`.
- Bootstrap Router Mount: `workspaceBootstrapRouter` is mounted at `/api/workspace` → internal route MUST be `router.post('/bootstrap', indicative of an enterprise-grade platform.`)
- AI Model Names (CRITICAL): The platform uses REAL API model names — NEVER fake/invented names. ALL models below verified via live API test (March 2026). OpenAI (all return 429 quota = real): `gpt-4.1`, `gpt-4.1-mini`, `gpt-4.1-nano`, `gpt-4o`, `gpt-4o-mini`, `o4-mini`, `o3`, `o3-mini`, `o1`, `gpt-4-turbo`. Anthropic (all return 400 credit = real): `claude-opus-4-20250514`, `claude-sonnet-4-20250514`, `claude-3-7-sonnet-20250219`, `claude-3-5-sonnet-20241022`, `claude-3-5-haiku-20241022`, `claude-3-opus-20240229`, `claude-3-haiku-20240307`. Google: `gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-2.0-flash-lite`, `gemini-1.5-pro`, `gemini-1.5-flash`. xAI (return 403 billing = real): `grok-3`, `grok-3-mini`, `grok-3-fast`. Moonshot: `moonshot-v1-8k`, `moonshot-v1-32k`, `moonshot-v1-128k`. DEAD IDs (do NOT use): `grok-2-1212` (400 not found), `o1-mini` (404 on this key). The `model-normalizer.ts` maps all deprecated/fake names → real names. FORBIDDEN fake names: gpt-5.x, gpt-5-mini, gpt-5-nano, gemini-3-*, llama-3.x (no Groq API key).
- Stuck Session Cleanup (Autonomous Build): On server startup, `AgentOrchestratorService` constructor resets sessions stuck in `planning`/`executing` → `failed`. Idempotency check in `startAutonomousWorkspace` allows restart from `idle` OR `failed` status.

## System Architecture
E-Code utilizes a two-service architecture (Main Platform and Runner microservice). The frontend is built with React, TypeScript, and Vite, adhering to the Replit RUI Design System. The backend uses Node.js/Express.js, TypeScript, Drizzle ORM, and Passport.js.

- **AI Integration**: Incorporates XML prompts, task classification, circuit breakers, priority queues, intelligent caching, SSE streaming, multi-provider AI model selection, database-backed conversation history, retry logic, and an Agent Step Cache.
- **Real-time Communication**: Achieved through Server-Sent Events, WebSocket-driven logging, real-time HTML live preview with CSS hot-swapping, and a robust WebSocket Resilience System.
- **Security Framework**: Features AES-256-GCM encryption, XSS prevention, CSRF protection, input sanitization, tier-based rate limiting, API versioning, session-based authentication, and encrypted GitHub tokens.
- **System Reliability**: Supported by Checkpoints & Rollback and Playwright-based Background Auto-Testing.
- **Code Execution Environment**: Uses Native Nix-managed runtimes and `DockerExecutor` for sandboxed execution, supporting `single-vm`/`kubernetes` deployment with PID tracking and language-specific timeouts.
- **Data Persistence**: Employs PostgreSQL as the primary data store with a two-tier database API, strong tenant isolation, and Drizzle ORM.
- **Performance Optimization**: Implements Fast Bootstrap techniques.
- **Voice Input System**: Integrates Voice Vibe Coding via the MediaRecorder API.
- **Monitoring and Observability**: Utilizes Kubernetes probes and a Provider Health API with Prometheus metrics.
- **Docker Optimization**: Docker builds are optimized for minimal image sizes.
- **Monetization Strategy**: A hybrid pricing model managed through Stripe.
- **Contextual Memory**: A Memory Bank System stores AI-generated contextual markdown files.
- **UI/UX Enhancements**: Features an Intersection Observer Animation System, Native Motion Library, and a ReplDB-Compatible Key-Value Database.

## External Dependencies
- OpenAI
- Anthropic
- Google Gemini
- Moonshot AI (Kimi)
- xAI
- PostgreSQL
- Redis
- Stripe
- SendGrid
- Sentry
- Slack
- Object Storage (GCS-backed)
- E-Code Runner
- GitHub
- Playwright
- Monaco Editor
- xterm.js
- Tavily
- Passport.js