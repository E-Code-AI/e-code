# E-Code Platform

## Overview
E-Code is an AI-assisted web-based IDE for rapid prototyping, education, and enterprise use. It features multi-provider AI model selection, real-time collaboration, and robust security. Its core purpose is to autonomously generate workspaces from natural language prompts, offering live previews and streaming progress, creating an AI-powered development environment that streamlines coding and enhances learning. The platform aims to be an enterprise-grade solution with significant market potential.

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

## System Architecture

### UI/UX Decisions
The frontend uses Shadcn/UI with Tailwind CSS and Monaco Editor, adhering to iOS Dynamic Color System principles, San Francisco Pro Typography, 8pt Grid Spacing, Apple-quality animation, iOS-style shadows, continuous corners, and appropriate touch targets for a mobile-first experience. The autonomous agent interface is platform-agnostic and responsive, featuring real-time progress tracking. QA instrumentation includes minimum touch targets, comprehensive `data-testid` coverage, and mobile-first grid implementations. Key IDE components like the Activity Bar, Tab Bar, and Status Bar mirror Replit's design, with a Replit-identical 5-tab navigation for mobile, spring-based animations, loading skeletons, and touch enhancements.

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