# E-Code Platform

## Overview
E-Code is an AI-assisted web-based IDE for rapid prototyping, education, and enterprise use. It features multi-provider AI model selection, real-time collaboration, and robust security. Its core purpose is to autonomously generate workspaces from natural language prompts, offering live previews and streaming progress, creating an AI-powered development environment that streamlines coding and enhances learning. The platform aims to be an enterprise-grade solution with significant market potential.

## Performance Optimizations (Dec 2025)
Target: 40-60% reduction in time from user description to live application.

### Provider Racing (`server/ai/provider-racing.ts`)
- Races 2+ AI providers simultaneously for plan generation
- Returns first valid JSON response, cancels others
- 30-50% p95 latency reduction for plan generation
- Automatic fallback to sequential if racing fails

### Speculative Scaffolding (`server/services/speculative-scaffold.service.ts`)
- Creates basic project structure (package.json, tsconfig, etc.) in parallel with AI plan generation
- Reduces perceived latency by ~2-3 seconds
- Language/framework-aware scaffolds (TypeScript/React, Python/Flask, etc.)

### Parallel Database Operations (`server/routes/workspace-bootstrap.router.ts`)
- Project creation and user preference fetch run via `Promise.all`
- ~50ms latency reduction in bootstrap flow

### Parallel Workflow Execution (`server/services/agent-workflow-engine.service.ts`)
- `buildExecutionOrder()` groups independent steps by dependency level
- `Promise.allSettled` executes step groups in parallel
- Only steps with dependencies wait for predecessors

### Generation Metrics (`server/services/generation-metrics.service.ts`)
- Tracks per-phase timing: plan generation, workflow execution, session completion
- Enables bottleneck analysis and optimization targeting

### Frontend Bundle Analysis (Dec 2025)
Production build completes in ~52s. Key bundle sizes (gzipped):
- Monaco Editor: 230KB (index-VNtDes-g.js)
- AG Grid (ConversationHistoryGrid): 162KB
- CodeMirror languages: 134KB
- Recharts: 105KB
- Terminal components: 71KB

**Current optimizations in place:**
- 100+ routes lazy-loaded via `instrumentedLazy()` and `lazy()`
- TanStack Query with IndexedDB persistence
- Service Worker caching for static assets

**Note:** vite.config.ts is protected and cannot be modified. Further chunk optimization would require manual chunks configuration.

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
- **Documentation:** Ruthlessly remove obsolete/misleading docs - maintain technical honesty

## Frontend Caching Architecture

### TanStack Query - Single Source of Truth
**CRITICAL: TanStack Query (`@tanstack/react-query`) is the exclusive client-side caching layer for ALL API data.**

**Rules:**
1. **NO custom frontend AI cache hooks** - All AI request caching hooks (use-ai-request-cache.ts, etc.) have been removed from the codebase
2. **Use TanStack Query for ALL API caching** - It provides built-in caching, deduplication, background refetching, and cache invalidation
3. **Future AI frontend cache needs MUST use TanStack Query** - Either directly via `useQuery`/`useMutation`, or through wrapper hooks that delegate to TanStack Query internally

**Recommended pattern:**
```typescript
// GOOD: Use TanStack Query directly
const { data, isLoading } = useQuery({
  queryKey: ['/api/ai/models'],
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// GOOD: Wrapper hook that uses TanStack Query
function useAIModels() {
  return useQuery({ queryKey: ['/api/ai/models'], staleTime: 300000 });
}

// BAD: Custom caching with useState/useRef - DO NOT CREATE
```

**Backend caching:** Server-side caching is handled by `AgentStepCacheService` (database-backed, TTL, version tracking).

### Fortune 500 Offline Cache Architecture (Phase 2.5)
The platform uses a **3-layer cache architecture** for enterprise-grade offline UX:

1. **TanStack Query + IndexedDB Persistence** (`query-persister.ts`)
   - Query cache persists to IndexedDB via `@tanstack/react-query-persist-client`
   - Auto-hydrates on app bootstrap (24-hour max age, version tracking)
   - Survives browser restarts and offline periods

2. **Service Worker Cache** (`sw.js` - 616 lines)
   - `networkFirst` for API routes, `cacheFirst` for static assets
   - API responses tagged with `sw-cached-time` for TTL management
   - Graceful offline fallback with JSON error responses

3. **Cache Reconciliation Layer** (`cache-reconciliation.ts`)
   - Coordinates SW ↔ TanStack Query state
   - Debounced invalidation (2s) prevents refetch loops
   - Only triggers on background sync events (NOT foreground fetches)
   - `wasOffline` flag ensures refresh only on offline→online transitions

**CRITICAL RULES:**
- SW cache updates do NOT trigger TanStack Query invalidation (prevents loops)
- Only `OFFLINE_SYNC_COMPLETE` with `isBackgroundSync: true` triggers reconciliation
- Use `refetchType: 'none'` when invalidating to prevent auto-refetch

## Component Architecture

### Unified IDE Layout (Phase 1 Complete)
The IDE uses a **single responsive component** (`UnifiedIDELayout`) for ALL screen sizes:
- **Desktop/Tablet/Mobile**: Same component, responsive via Tailwind breakpoints
- **No device-specific branching** in IDEPage.tsx - just `<UnifiedIDELayout />`
- Desktop-only overlays (CommandPalette, GlobalSearch, CollaborationPanel, ReplitDB) are integrated in UnifiedIDELayout
- Keyboard shortcuts: `Ctrl+K` (CommandPalette), `Ctrl+Shift+F` (GlobalSearch), `Ctrl+Shift+P` (QuickFileSearch)

**3-Phase PWA Strategy**:
1. ✅ **Phase 1**: Unified responsive IDE component (COMPLETE)
2. ✅ **Phase 2**: PWA (manifest.json, Service Worker, offline, push notifications) (COMPLETE)
3. ✅ **Phase 3**: Capacitor wrapper for iOS/Android stores (COMPLETE)

**E2E Test Suites**:
- `tests/e2e/specs/ide-parity.spec.ts` - 35+ tests for desktop/tablet/mobile parity
- `tests/e2e/specs/workspace-bootstrap.spec.ts` - 23 tests for autonomous workspace provisioning

**AI Health Monitoring**:
- `GET /api/ai/health` - Health checks for all 5 providers (OpenAI, Anthropic, Gemini, xAI, Moonshot)
- `GET /api/ai/health/:provider` - Detailed health for specific provider with available models
- 60-second cache, latency metrics, model counts per provider

### Mobile Component Pattern (Enhanced Wrappers)
The mobile components use a **wrapper pattern**, NOT duplicates:
- `EnhancedMobileTerminal` imports and wraps `MobileTerminal` with additional UI chrome
- `EnhancedMobileIDEView` imports and wraps `MobileIDEView` with `IDEProvider`
- `LazyMobileCodeEditor` provides code-split loading of the editor

**DO NOT delete "Normal" components** - they are the base implementations used by Enhanced wrappers.

### State Management Layers (Intentional Architecture)
Three distinct layers serve different purposes:
1. **localStorage** (96 usages): Session persistence across browser refreshes
2. **TanStack Query** (983 usages): API response caching with automatic invalidation
3. **Zustand stores** (2 stores): Local UI state (`splits-store.ts`, `agentConversationStore.ts`)

This is standard React architecture, not duplication.

## System Architecture

### UI/UX Decisions
The frontend uses Shadcn/UI with Tailwind CSS and Monaco Editor, implementing the **Replit RUI Design System** with E-Code branding. The design follows mobile-first responsive patterns with appropriate touch targets (44px minimum) and supports light/dark modes.

**RUI Design Token System** (`theme.json`, `client/src/styles/replit-theme.css`):
- **Colors**: RUI naming convention with semantic layers
  - Foreground: `default` (#F5F9FC dark, #1A1A1A light), `dimmer`, `dimmest`
  - Background: `root`, `default`, `higher`, `highest`
  - Accent: E-Code Orange (#F26207) with `default`, `dimmer`, `dimmest`, `stronger` variants
  - Status: success (#22C55E), warning (#F59E0B), error (#EF4444), info (#3B82F6)
- **Typography**: `fontSizeSmall` (12px) to `fontSizeXLarge` (24px)
- **Spacing**: 4px grid system (`space4` to `space32`)
- **Border Radius**: `borderRadius4`, `borderRadius8`, `borderRadius12`, `borderRadiusFull`
- **Shadows**: `shadow1` to `shadow4` with theme-appropriate opacity

**Responsive Breakpoints** (Tailwind standard):
- `sm:` 640px (tablet portrait)
- `md:` 768px (tablet landscape)
- `lg:` 1024px (desktop)
- `xl:` 1280px (large desktop)

QA instrumentation includes minimum touch targets, comprehensive `data-testid` coverage, and mobile-first grid implementations. Key IDE components like the Activity Bar, Tab Bar, and Status Bar mirror Replit's design, with a Replit-identical 5-tab navigation for mobile, spring-based animations, loading skeletons, and touch enhancements.

### Technical Implementations
The frontend is built with React 18, TypeScript, Vite, TanStack Query, and Wouter. The backend is a Node.js/Express.js application in TypeScript, utilizing Drizzle ORM for PostgreSQL and Passport.js for authentication, following a RESTful API design. Real-time features are powered by WebSockets. AI optimization includes a Task Classifier, Circuit Breaker, Priority Queue, Intelligent Caching (Prompt Caching, Batch API Manager, Provider Latency Monitor), and Observability. Environment variables are AES-256-GCM encrypted, and SSE streaming is used for code generation. Anonymous bootstrap authentication provides ephemeral guest users. AI Agent enhancements include structured XML-based system prompts, a repository overview service, a context window manager with token optimization, a unified AI provider system, and AI-powered inline code actions. A Checkpoints & Rollback System ensures atomic transactions, and a Background Auto-Testing System uses Playwright. Max Autonomy Mode enables extended autonomous sessions with AI task decomposition, auto-execution, ETA estimation, and cost tracking. The platform provides process-based code execution without Docker, leveraging native Nix-managed language runtimes. A centralized Winston-based logging system with correlation IDs and multi-transport support is implemented. The Agent Step Cache system provides database-backed intermediate step caching for agent phases like SPECIFICATION, ARCHITECTURE_PLAN, FILE_LAYOUT, and INITIAL_SCAFFOLD, enabling partial regeneration and cost savings.

### Feature Specifications
Core features include a Monaco Code Editor with advanced enhancements, an interactive terminal (xterm.js), file management, real-time collaboration, authentication, TypeScript-based container orchestration, Global Search & Replace, an Environment Variables Manager, a Logs Viewer, and a Debugger UI. Autonomous workspace creation involves a Bootstrap API call, AI plan generation, WebSocket-based real-time progress, autonomous execution, and a live preview. An Agent Activity Dashboard with AG Grid provides real-time metrics and session history. Agent conversation persistence is managed via a Zustand store with localStorage and backend synchronization. An Agentic RAG system provides automatic backend RAG context retrieval for all sessions. Build modes (`design-first`, `full-app`, `continue-planning`) are supported for workspace creation.

### System Design Choices
A PostgreSQL database stores user data, project hierarchies, AI agent sessions, deployment history, and subscription management. Security measures include CSRF protection, input sanitization, tier-based rate limiting, API versioning, session-based authentication, and encrypted environment variables. The AI agent system provides server-sent event streaming, multi-provider AI model selection, database-backed conversation history, circuit breakers, and retry logic. Health monitoring integrates Kubernetes probes and a Provider Health API with Prometheus metrics. A two-tier database API architecture (Admin and Project Data APIs) is used with integrated security. Docker builds are optimized for small image sizes. The Stripe payment integration supports a Replit-style hybrid pricing model. Support for 29 languages is provided via CodeMirror 6 for syntax highlighting and a robust runtime system with PID tracking, tree-kill for process termination, and language-specific timeouts. TanStack Query is the exclusive client-side caching layer for all API data.

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

### Development Tools & Integrations
- **GitHub:** OAuth integration
- **Figma:** Design imports
- **Playwright:** Browser automation for testing
- **Monaco Editor:** Microsoft's VS Code editor component
- **xterm.js:** Terminal emulation library

### Authentication Providers
- **Replit Auth:** Google, GitHub, Twitter/X, Apple, email/password
- **Custom Email/Password**