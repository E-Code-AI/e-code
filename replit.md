# E-Code Platform

## Overview
E-Code is an AI-assisted web-based IDE designed for rapid prototyping, education, and enterprise use. Its core purpose is to streamline coding and enhance learning by enabling autonomous workspace generation from natural language prompts, offering live previews, and streaming progress. The platform supports multi-provider AI model selection, real-time collaboration, and robust security, aiming to be an enterprise-grade solution. Key ambitions include market leadership in AI-driven development tools and fostering a new era of accessible and efficient coding.

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

## System Architecture

### UI/UX Decisions
The frontend uses Shadcn/UI with Tailwind CSS and Monaco Editor, adhering to the Replit RUI Design System with E-Code branding. It features a mobile-first, responsive design supporting light/dark modes, touch targets, and a unified IDE layout mirroring Replit's Activity Bar, Tab Bar, and Status Bar. It includes spring-based animations, loading skeletons, and touch enhancements.

### Technical Implementations
The frontend is built with React 18, TypeScript, Vite, TanStack Query, and Wouter. The backend is a Node.js/Express.js application in TypeScript, using Drizzle ORM for PostgreSQL and Passport.js for authentication, with a RESTful API and WebSockets for real-time features. AI optimizations include a Task Classifier, Circuit Breaker, Priority Queue, Intelligent Caching, and Observability. Environment variables are AES-256-GCM encrypted, and SSE streaming is used for code generation. Anonymous bootstrap authentication provides ephemeral guest users. AI Agent enhancements include structured XML-based system prompts, a repository overview service, a context window manager, a unified AI provider system, and AI-powered inline code actions. A Checkpoints & Rollback System ensures atomic transactions, and a Background Auto-Testing System uses Playwright. Max Autonomy Mode provides extended autonomous sessions with AI task decomposition, auto-execution, ETA estimation, and cost tracking. Process-based code execution leverages native Nix-managed language runtimes without Docker. A centralized Winston-based logging system with correlation IDs and multi-transport support is implemented. An Agent Step Cache system provides database-backed intermediate step caching. **Persistent Chat History** uses a dual-layer architecture: Zustand store with localStorage (`agentConversationStore.ts`) for instant local loading, plus PostgreSQL (`agentMessages` table) for server backup and cross-device sync. Messages auto-rehydrate on editor reopen, matching Replit's pattern.

### System Design Choices
A PostgreSQL database stores user data, project hierarchies, AI agent sessions, deployment history, and subscription management. Security includes CSRF protection, input sanitization, tier-based rate limiting, API versioning, session-based authentication, and encrypted environment variables. The AI agent system provides server-sent event streaming, multi-provider AI model selection, database-backed conversation history, circuit breakers, and retry logic. Health monitoring integrates Kubernetes probes and a Provider Health API with Prometheus metrics. A two-tier database API architecture (Admin and Project Data APIs) is used with integrated security. Docker builds are optimized for small image sizes. Stripe payment integration supports a Replit-style hybrid pricing model. Support for 29 languages is provided via CodeMirror 6 for syntax highlighting and a robust runtime system with PID tracking, tree-kill for process termination, and language-specific timeouts. TanStack Query is the exclusive client-side caching layer for all API data, implementing a 3-layer cache architecture with IndexedDB persistence, a Service Worker cache, and a cache reconciliation layer for enterprise-grade offline UX. Performance optimizations include provider racing, speculative scaffolding, and parallel workflow execution.

The platform supports two deployment modes: `single-vm` (default, typically for Replit) and `kubernetes` (for enterprise). `DockerExecutor` provides enterprise-grade sandboxed code execution for user-submitted code, utilizing ephemeral containers with strong security measures. A Memory Bank System automatically stores AI-generated contextual markdown files in `.ecode/memory-bank/` for context persistence. Core systems include a WebSocket Resilience System for robust connections, an Intersection Observer Animation System for scroll-triggered animations, and a Native Motion Library for GPU-accelerated animations. A ReplDB-Compatible Key-Value Database provides a Replit-compatible key-value store accessible from container code with environment injection and a file-based fallback.

## External Dependencies

### AI/ML Services
- **OpenAI:** GPT-5.1, GPT-5.1-thinking, GPT-5, GPT-5-mini, GPT-5-nano, GPT-4o, o3, o4-mini
- **Anthropic:** Claude Opus 4.5-20251124, Claude Sonnet 4.5-20250929, Claude Haiku 4.5-20251015
- **Google Gemini:** Gemini 2.5 Pro, Gemini 2.5 Flash, Gemini 2.0 Flash
- **Moonshot AI:** kimi-k2-0711-preview, kimi-k2-thinking, moonshot-v1-32k, moonshot-v1-128k
- **xAI:** Grok 4, Grok 4 Fast

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
- **Mobile Application (React Native + Expo SDK 54):** Cross-platform with platform-specific haptics, swipe-to-action, font rendering, expo-secure-store for token encryption with AsyncStorage migration fallback.

## Known Limitations & Future Work

### Database Schema
- **userId field types:** Some legacy tables use `text('user_id')` instead of `integer` with foreign key references. This is intentional for compatibility with OAuth providers that may return non-numeric user IDs. New tables should use proper references.
- **PostgreSQL HA:** Kubernetes deployment uses `replicas: 1` for PostgreSQL. For production HA, use CloudNativePG Operator or managed services (Cloud SQL, RDS).
- **Prepared Statements:** `prepare: false` in db.ts is required for Neon serverless (PgBouncer transaction mode). This does NOT affect SQL injection protection - Drizzle ORM uses parameterized queries.

### Frontend Mock Data
- `AuditLogs.tsx` contains `mockAuditLogs` as fallback when API unavailable
- `CollaborativePresence.tsx` and `ReplitMultiplayers.tsx` contain `mockCollaborators` for offline/demo mode
- These are intentional fallbacks, not production data sources

### Mobile Platform
- **Real Mobile Simulator:** `real-mobile-compiler.ts` returns mock simulator data. Production integration requires Appetize.io or Expo Snack API.
- **Deep Linking:** Configured via `associatedDomains` (iOS) and `intentFilters` (Android) in app.config.js

### Security Notes
- **CSP:** nginx.conf uses `'unsafe-inline'` for styles pending nonce/hash implementation in build pipeline
- **Docker Socket:** Disabled in kubernetes/production-infrastructure.yaml - use docker-socket-proxy for container orchestration
- **Auto-Update (Desktop):** Intentionally disabled for security - requires user confirmation
- **Shell.tsx:** Uses textContent/DOM APIs instead of innerHTML to prevent XSS attacks
- **Mobile Tokens:** Stored via expo-secure-store (encrypted keychain/keystore) with AsyncStorage migration fallback
- **Database CLI Execution:** All database migrations use `spawn` with `shell: false` to prevent command injection. PostgreSQL uses PGPASSWORD env var, MySQL/MongoDB pass credentials as arguments. Input validation rejects dangerous characters including shell metacharacters and newlines.
- **Electron Path Traversal:** Uses async `fs.promises.realpath()` to resolve symlinks before path validation, preventing symlink attacks
- **WebSocket Message Size:** 1MB limit enforced in agent-websocket-service.ts to prevent memory exhaustion attacks
- **Docker Entrypoint:** Fails fast on migration errors (exit 1) instead of continuing with invalid schema
- **Android Haptics:** Uses Vibration API fallback when expo-haptics unavailable (iOS uses expo-haptics)