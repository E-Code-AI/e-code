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
- **Documentation:** Ruthlessly remove obsolete/misleading docs - maintain technical honesty

## System Architecture

### UI/UX Decisions
The frontend uses Shadcn/UI with Tailwind CSS and Monaco Editor, adhering to the Replit RUI Design System with E-Code branding. It features a mobile-first, responsive design supporting light/dark modes and touch targets (44px minimum). The RUI Design Token System defines visual elements. The IDE layout is unified across all screen sizes, mirroring Replit's Activity Bar, Tab Bar, and Status Bar, with a 5-tab mobile navigation, spring-based animations, loading skeletons, and touch enhancements.

### Technical Implementations
The frontend is built with React 18, TypeScript, Vite, TanStack Query, and Wouter. The backend is a Node.js/Express.js application in TypeScript, using Drizzle ORM for PostgreSQL and Passport.js for authentication, with a RESTful API and WebSockets for real-time features. AI optimizations include a Task Classifier, Circuit Breaker, Priority Queue, Intelligent Caching, and Observability. Environment variables are AES-256-GCM encrypted, and SSE streaming is used for code generation. Anonymous bootstrap authentication provides ephemeral guest users. AI Agent enhancements include structured XML-based system prompts, a repository overview service, a context window manager, a unified AI provider system, and AI-powered inline code actions. A Checkpoints & Rollback System ensures atomic transactions, and a Background Auto-Testing System uses Playwright. Max Autonomy Mode provides extended autonomous sessions with AI task decomposition, auto-execution, ETA estimation, and cost tracking. Process-based code execution leverages native Nix-managed language runtimes without Docker. A centralized Winston-based logging system with correlation IDs and multi-transport support is implemented. An Agent Step Cache system provides database-backed intermediate step caching.

### System Design Choices
A PostgreSQL database stores user data, project hierarchies, AI agent sessions, deployment history, and subscription management. Security includes CSRF protection, input sanitization, tier-based rate limiting, API versioning, session-based authentication, and encrypted environment variables. The AI agent system provides server-sent event streaming, multi-provider AI model selection, database-backed conversation history, circuit breakers, and retry logic. Health monitoring integrates Kubernetes probes and a Provider Health API with Prometheus metrics. A two-tier database API architecture (Admin and Project Data APIs) is used with integrated security. Docker builds are optimized for small image sizes. Stripe payment integration supports a Replit-style hybrid pricing model. Support for 29 languages is provided via CodeMirror 6 for syntax highlighting and a robust runtime system with PID tracking, tree-kill for process termination, and language-specific timeouts. TanStack Query is the exclusive client-side caching layer for all API data, implementing a 3-layer cache architecture with IndexedDB persistence, a Service Worker cache, and a cache reconciliation layer for enterprise-grade offline UX. Performance optimizations include provider racing, speculative scaffolding, and parallel workflow execution.

### Deployment Architecture
The platform supports two deployment modes: `single-vm` (default, typically for Replit) and `kubernetes` (for enterprise). The `single-vm` mode uses `docker-compose.prod.yml` orchestrating Node.js app, PostgreSQL, Redis, and Docker-in-Docker (sandbox). The `kubernetes` mode, enabled via environment variables, allows full K8s orchestration via `@kubernetes/client-node` for multi-region failover and auto-scaling.

### Secure Code Execution
Enterprise-grade sandboxed code execution for user-submitted code is provided by `DockerExecutor`. This system uses ephemeral containers with non-root users, read-only root filesystems, network isolation, resource limits (e.g., 256MB memory, 0.5 CPU, 30s timeout), and capability dropping to ensure security. Supported languages include Node.js and Python.

### Memory Bank System
An auto-initializing context storage system in `.ecode/memory-bank/` stores AI-generated contextual markdown files (`projectbrief.md`, `productContext.md`, `systemPatterns.md`, `techContext.md`, `activeContext.md`) based on user prompts. This content is automatically injected into AI prompts for context persistence and has template-based fallbacks.

### Core Systems
- **WebSocket Resilience System:** Enterprise-grade WebSocket connection management (`ResilientWebSocket` class, `useResilientWebSocket` hook) with exponential backoff, circuit breaker, and protocol-aware heartbeats, optimized for mobile network reliability.
- **Intersection Observer Animation System:** Scroll-triggered animations using native Intersection Observer (`useInView` hook, `CSSInViewFade`, `CSSInViewSlide`, `CSSInViewScale` components) for zero main-thread blocking, with hybrid fallbacks and basic stagger support.
- **Native Motion Library:** A zero-dependency animation system (`useNativeMotionValue`, `useSpringValue`, `usePanGesture`, `useAnimationControls`) replacing framer-motion hooks for 60fps GPU-accelerated animations with proper memory cleanup.
- **Fortune 500 Homepage Performance:** Hero-first architecture in `LandingOptimized.tsx` with 9 deferred sections lazy-loaded via `DeferredSections.tsx` using IntersectionObserver (200px rootMargin). Uses `instrumentedLazy()` with 3-retry logic for network resilience. CSS animations (animate-fade-in) for smooth entrances without JS overhead.

### ReplDB-Compatible Key-Value Database
A Replit-compatible key-value database accessible from container code via `REPLIT_DB_URL` (also `ECODE_DB_URL`). The system provides:
- **Environment Injection:** `REPLIT_DB_URL` and `ECODE_DB_URL` are automatically injected into every container at startup
- **File-based Fallback:** `/tmp/replitdb` file created in container for published app compatibility
- **HTTP API:** RESTful API at `/api/db/:projectId` supporting GET (list/get), POST (set), DELETE operations
- **Client Compatibility:** Works with official Replit Python (`replit`) and Node.js (`@replit/database`) client libraries
- **Direct HTTP:** Can also be accessed via direct HTTP requests (text/plain for single values, JSON for bulk operations)
- **Limits:** 50 MiB per store, 5,000 keys per store, 1,000 bytes per key, 5 MiB per value (matching Replit limits)

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

### Authentication Providers
- **Replit Auth:** Google, GitHub, Twitter/X, Apple, email/password
- **Custom Email/Password**

### Desktop Application (Electron)
A cross-platform desktop application featuring multi-window support (`WindowManager`), deep linking (`ecode://` protocol), auto-update with retry logic, dynamic recent files menu, and comprehensive cleanup on quit. It uses a secure IPC bridge via a preload API for file system operations, dialogs, and update management.

### Mobile Application (React Native + Expo)
A cross-platform mobile application providing platform-specific haptic feedback (`expo-haptics`), reusable swipe-to-action components (`react-native-gesture-handler`), and platform-specific font rendering. It implements an AsyncStorage-backed offline cache with TTL and stale-while-revalidate strategy.

## Security Audit (December 2025) - 142 Issues Resolved

### Audit Issue Status Summary
| # | Issue | Status | Resolution |
|---|-------|--------|------------|
| 9 | PostgreSQL HA | ✅ DOCUMENTED | `docs/postgresql-ha-setup.md` with CloudNativePG/Zalando operators, PodDisruptionBudget, backup/recovery |
| 10 | userId TEXT vs INTEGER | ✅ INTENTIONAL | TEXT for external system compatibility (OAuth, SSO) |
| 11 | Drizzle Relations | ✅ FIXED | 10 critical relations consolidated at end of `shared/schema.ts` |
| 12 | Missing Indexes | ✅ FIXED | 40+ indexes on all critical foreign keys (see table definitions) |
| 13 | Mobile Simulator Mocks | ✅ FIXED | Expo Snack SDK integration at `server/services/expo-snack.service.ts` with real device preview |
| 14 | Web Search Stub | ✅ FIXED | Tavily integration at `server/services/tavily-search.ts` (requires TAVILY_API_KEY) |
| 15 | SSL Renewal | ⚠️ EXTERNAL | Requires certbot or cloud provider auto-renewal |

### Critical Security Fixes
- **Auth Bypass Prevention:** Triple `NODE_ENV` production guards in dev-auth-bypass.ts
- **Webhook Security:** ECDSA signature validation for SendGrid webhooks
- **CSRF Protection:** Safe methods only (`GET`, `HEAD`, `OPTIONS`) bypassed in production
- **Container Security:** 8 `verifyProjectOwnership()` checks on all container operations

### Payment & Billing Security
- **Stripe API Migration:** All 4 files migrated to `billing.meterEvents.create()` (deprecated `subscriptionItems.createUsageRecord` removed)
- **Webhook Error Handling:** Returns 400/500 on errors (not 200)
- **Race Condition Prevention:** `withTransaction` + `FOR UPDATE` locks on credit operations
- **Dynamic Plan Lookup:** Uses `lookup_key` instead of hardcoded 'starter'

### Database Security
- **SQL Injection Prevention:** `isAllowedTable()` whitelist + `escapeIdentifier()` + parameterized queries
- **Performance Indexes:** 40+ indexes on `user_id`/`author_id`/`project_id` columns
- **N+1 Query Prevention:** `GROUP BY` aggregation in community queries
- **Drizzle Relations:** 10 core relations (users, projects, files, deployments, checkpoints, aiConversations, agentMessages, teamMembers, teams, codeReviews)

### Infrastructure Security
- **Non-Root Containers:** `user: "1001:1001"` in docker-compose.yml
- **Docker Socket Isolation:** Socket access commented out
- **Redis Authentication:** `REDIS_PASSWORD` mandatory (fails if not set)
- **PostgreSQL HA:** Comprehensive documentation at `docs/postgresql-ha-setup.md`

### Encryption & Hashing
- **GitHub Tokens:** AES-256-GCM encryption (`encryptToken`/`decryptToken`)
- **Hashing:** SHA-256 throughout (MD5 removed)
- **Session Fingerprinting:** IP hash with SHA-256

### Real-time Security
- **WebSocket Heartbeat:** 30s interval, 35s timeout dead connection detection
- **Rate Limiting:** Tier-based (Free: 500/min, Pro: 1000/min, Teams: 5000/min, Enterprise: 10000/min)
- **Development Mode Rate Limiting (Dec 19, 2025):**
  - 1000x multiplier for all rate limits in development mode (allows comprehensive testing)
  - `_skipRateLimit` flag bypass checked by ALL rate limit middleware
  - Non-API routes (`/src/*`, `/@vite/*`, etc.) bypass rate limiting in development
  - `aiUsageTracker` harmonized with `tier-rate-limiter` (both use 1000x DEV_MULTIPLIER)
- **Retryable Errors:** Proper classification (429, 502, 503, 504)
- **Rate Limit UX:** Non-blocking modal via `RateLimitExperience` component with dismiss capability

### Type Safety
- **Strict Typing:** 1073 constraints, 125 insert schemas, 215 inferred types
- **No `as any`:** Removed from stripe-billing-service.ts
- **Decimal Precision:** `remainingCredits` uses `decimal(10,2)`

### Web Search Integration
- **Tavily API:** Full integration at `server/services/tavily-search.ts`
- **Features:** Retry logic (3 attempts, exponential backoff), graceful fallback when unconfigured
- **Configuration:** Set `TAVILY_API_KEY` environment variable to enable