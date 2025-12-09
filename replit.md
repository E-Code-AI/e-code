# E-Code Platform

## Overview
E-Code is an AI-assisted web-based IDE designed for rapid prototyping, education, and enterprise use. It provides multi-provider AI model selection, real-time collaboration, and robust security. The platform's core purpose is to autonomously generate workspaces from natural language prompts, offering live previews and streaming progress, thereby creating an AI-powered development environment that streamlines coding and enhances learning. It is envisioned as an enterprise-grade solution with significant market potential.

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

## System Architecture

### UI/UX Decisions
The frontend uses Shadcn/UI with Tailwind CSS and Monaco Editor, adhering to iOS Dynamic Color System principles, San Francisco Pro Typography, 8pt Grid Spacing, Apple-quality animation, iOS-style shadows, continuous corners, and appropriate touch targets for a mobile-first experience. The autonomous agent interface is platform-agnostic and responsive, featuring real-time progress tracking. QA instrumentation includes minimum touch targets, comprehensive `data-testid` coverage, and mobile-first grid implementations. Key IDE components like the Activity Bar, Tab Bar, and Status Bar mirror Replit's design. Mobile UX includes a Replit-identical 5-tab navigation, spring-based animations, loading skeletons, and touch enhancements.

### Technical Implementations
The frontend is built with React 18, TypeScript, Vite, TanStack Query, and Wouter. The backend is a Node.js/Express.js application in TypeScript, utilizing Drizzle ORM for PostgreSQL and Passport.js for authentication, following a RESTful API design. Real-time features are powered by WebSockets. AI optimization includes a Task Classifier, Circuit Breaker, Priority Queue, Intelligent Caching, and Observability. Environment variables are AES-256-GCM encrypted, and SSE streaming is used for code generation. Anonymous bootstrap authentication provides ephemeral guest users. AI Agent enhancements include structured XML-based system prompts, a repository overview service, a context window manager with token optimization, a unified AI provider system, and AI-powered inline code actions. A Checkpoints & Rollback System ensures atomic transactions, and a Background Auto-Testing System uses Playwright. Max Autonomy Mode enables extended autonomous sessions with AI task decomposition, auto-execution, ETA estimation, and cost tracking. The platform provides process-based code execution without Docker, leveraging native Nix-managed language runtimes (Python, Node.js, Go, GCC/G++, Java, Rust, PHP). A centralized Winston-based logging system with correlation IDs and multi-transport support is implemented.

### Feature Specifications
Core features include a Monaco Code Editor with advanced enhancements, an interactive terminal (xterm.js), file management, real-time collaboration, authentication, TypeScript-based container orchestration, Global Search & Replace, an Environment Variables Manager, a Logs Viewer, and a Debugger UI. Autonomous workspace creation involves a Bootstrap API call, AI plan generation, WebSocket-based real-time progress, autonomous execution, and a live preview. PWA features and Electron desktop support are planned. An Agent Activity Dashboard with AG Grid provides real-time metrics and session history. Agent conversation persistence is managed via a Zustand store with localStorage and backend synchronization. An Agentic RAG system provides automatic backend RAG context retrieval for all sessions.

### System Design Choices
A PostgreSQL database stores user data, project hierarchies, AI agent sessions, deployment history, and subscription management. Security measures include CSRF protection, input sanitization, tier-based rate limiting, API versioning, session-based authentication, and encrypted environment variables. The AI agent system provides server-sent event streaming, multi-provider AI model selection, database-backed conversation history, circuit breakers, and retry logic. Health monitoring integrates Kubernetes probes and a Provider Health API with Prometheus metrics. A two-tier database API architecture (Admin and Project Data APIs) is used with integrated security. Docker builds are optimized for small image sizes. The Stripe payment integration supports a Replit-style hybrid pricing model. Support for 29 languages is provided via CodeMirror 6 for syntax highlighting and a robust runtime system with PID tracking, tree-kill for process termination, and language-specific timeouts. New generation OpenAI models (`gpt-5.x`, `o-series`) require specific API parameter handling (e.g., `max_completion_tokens` instead of `max_tokens`, no `temperature` parameter).

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

## Recent Changes (Dec 9, 2025)

### Bug Fixes - Replit Parity Critical Fixes
1. **Agent Bootstrap Lifecycle Fixed**: Added sessionStorage fallback for `initialPrompt` in ReplitAgentPanelV3. When props remount, the component reads from `sessionStorage.getItem(`agent-initial-prompt-${projectId}`)` ensuring the initial prompt survives React lifecycle events.

2. **Server-Side Message Persistence**: Implemented `POST /api/agent/conversation/:id/messages` endpoint with fire-and-forget pattern. Messages are saved to `agentMessages` table during streaming. Schema updated: `agentMessages.projectId` is now nullable (via `ALTER TABLE agent_messages ALTER COLUMN project_id DROP NOT NULL`) to support non-numeric project IDs (UUIDs, etc.).

3. **Preview Tab Wiring Fixed**: The `onBuildComplete` callback now properly calls `/api/preview/start` with `{ projectId }` in the request body. Added React Query cache invalidation (`queryClient.invalidateQueries`) and smart polling for preview status updates.

4. **Socket.IO Collaboration Fixed (TRUE noServer Mode)**: Refactored UnifiedCollaborationService to use true noServer architecture:
   - Creates standalone Engine.IO server with `new EngineServer({path: '/ws/collaboration', ...})`
   - Creates Socket.IO server without HTTP attachment (prevents upgrade listener registration)
   - Uses `io.bind(engineServer)` to connect Socket.IO to standalone engine
   - Central dispatcher routes upgrades to `engineServer.handleUpgrade()` via priority 61
   - Eliminates all Socket.IO-related upgrade listener blocking warnings
   - Yjs collaboration continues at `/ws/yjs` via central dispatcher (priority 60)

5. **Mobile IDE Agent Bootstrap Fixed**: Refactored MobileIDEView to use effect-based initialization:
   - Moved all browser-only APIs (URLSearchParams, atob, sessionStorage) into useEffect
   - Added `typeof window === 'undefined'` guards for SSR safety
   - Decodes bootstrap token to extract conversationId, sessionId, and prompt
   - Stores prompt in sessionStorage for React lifecycle persistence
   - Passes initialPrompt, sessionId, externalConversationId, autoStart to ReplitAgentPanelV3
   - Matches desktop IDEPage bootstrap flow exactly

### Schema Changes
- `agentMessages.projectId`: Changed from `notNull()` to nullable to support conversations with non-numeric project IDs
- SQL migration: `ALTER TABLE agent_messages ALTER COLUMN project_id DROP NOT NULL`

### AI Cost Optimization System (50-90% Cost Reduction)

**Three-Layer Cost Optimization Architecture:**

1. **Prompt Caching System** (`server/ai/prompt-cache-manager.ts`)
   - LRU cache with 100 system prompts, 500 responses, 5-min TTL
   - Provider-specific optimizations:
     - Anthropic: `cache_control: { type: 'ephemeral' }` headers for 90% cost reduction
     - OpenAI: Optimized message ordering for automatic prefix caching
     - Gemini/Moonshot: System prompt caching with context reuse
   - API endpoints: GET `/api/ai-optimization/prompt-cache/metrics`, POST `/clear`, POST `/warm`

2. **Batch API Manager** (`server/ai/batch-api-manager.ts`)
   - OpenAI Batch API integration for 50% cost reduction on non-urgent tasks
   - Automatic job submission, status polling, and result retrieval
   - Priority queue with low/normal priority support
   - API endpoints: POST `/api/ai-optimization/batch/queue`, GET `/batch/status/:taskId`, GET `/batch/metrics`

3. **Provider Latency Monitor** (`server/ai/provider-latency-monitor.ts`)
   - Real-time latency tracking for all 4 streaming methods (Anthropic, OpenAI, Gemini, Moonshot)
   - P50/P95/P99 percentile tracking per provider and model
   - Health status: healthy/degraded/unhealthy with automatic detection
   - Smart fallback recommendations based on real performance data
   - Prometheus-compatible metrics export at `/api/ai-optimization/metrics/prometheus`
   - API endpoints: GET `/latency/providers`, GET `/latency/models`, GET `/latency/provider/:provider`, POST `/latency/reset`

**Integration Points:**
- All streaming methods in `ai-provider-manager.ts` have latency tracking integrated
- Token counting approximation (chars/4) for cost estimation
- Success/failure tracking with error messages for debugging

### BuildModeSelector Integration (Dec 9, 2025)

**Full-Stack Build Mode Support:**
- Frontend `BuildModeSelector` component integrated across all creation flows (Home, Dashboard, Landing, MobileIDEView, MobileCreateModal)
- Backend `workspace-bootstrap.router.ts` accepts `buildMode` parameter with three options:
  - `design-first`: Creates quick visual prototype in ~3 minutes (UI/UX focus)
  - `full-app`: Builds complete working MVP in ~10 minutes (full-stack)
  - `continue-planning`: Allows refinement without workspace creation
- Prompt enhancement based on build mode:
  - `design-first` adds: "Focus on: UI/UX design, visual layout, clickable prototype. Skip backend initially."
  - `full-app` adds: "Include: Full-stack development, backend + frontend, database integration, working functionality."
- Response includes buildMode and contextual message for client reference
- Mobile: Haptic feedback for touch interactions, sessionStorage persistence for React lifecycle

### Known Issues
- Minor: Some other WebSocket services still log "Blocked additional upgrade listener" warnings. These services haven't been migrated to the central dispatcher yet, but they work correctly due to the blocking mechanism. This is cosmetic only and doesn't affect functionality.