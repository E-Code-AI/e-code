# E-Code Platform

## Overview
E-Code is an AI-assisted web-based IDE for rapid prototyping, education, and enterprise use. It enables autonomous workspace generation from natural language prompts, offering live previews and streaming progress. The platform supports multi-provider AI model selection, real-time collaboration, and robust security, aiming to streamline coding and enhance learning as an enterprise-grade solution.

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
The frontend utilizes Shadcn/UI with Tailwind CSS and Monaco Editor, adhering to the Replit RUI Design System with E-Code branding. It features a mobile-first responsive design, supporting light/dark modes, and appropriate touch targets (44px minimum). The RUI Design Token System defines colors, typography, spacing, border radius, and shadows. The IDE layout is unified and responsive across all screen sizes, mirroring Replit's Activity Bar, Tab Bar, and Status Bar, with a 5-tab mobile navigation, spring-based animations, loading skeletons, and touch enhancements.

### Technical Implementations
The frontend is built with React 18, TypeScript, Vite, TanStack Query, and Wouter. The backend is a Node.js/Express.js application in TypeScript, using Drizzle ORM for PostgreSQL and Passport.js for authentication, with a RESTful API and WebSockets for real-time features. Key AI optimizations include a Task Classifier, Circuit Breaker, Priority Queue, Intelligent Caching, and Observability. Environment variables are AES-256-GCM encrypted, and SSE streaming is used for code generation. Anonymous bootstrap authentication provides ephemeral guest users. AI Agent enhancements include structured XML-based system prompts, a repository overview service, a context window manager, a unified AI provider system, and AI-powered inline code actions. A Checkpoints & Rollback System ensures atomic transactions, and a Background Auto-Testing System uses Playwright. Max Autonomy Mode provides extended autonomous sessions with AI task decomposition, auto-execution, ETA estimation, and cost tracking. Process-based code execution leverages native Nix-managed language runtimes without Docker. A centralized Winston-based logging system with correlation IDs and multi-transport support is implemented. An Agent Step Cache system provides database-backed intermediate step caching.

### WebSocket Resilience System (Fortune 500-Grade)
Enterprise-grade WebSocket connection management for mobile network reliability:
- **ResilientWebSocket class** (`client/src/lib/websocket-resilience.ts`): Core connection manager with exponential backoff (jitter factor 0.25-0.3), circuit breaker pattern (5-7 failure threshold), and optional JSON heartbeat
- **React hook** (`client/src/hooks/use-resilient-websocket.ts`): `useResilientWebSocket` hook with state management and retry countdown
- **UI Components** (`client/src/components/terminal/ConnectionStatusBanner.tsx`): `ConnectionStatusBanner` and `ConnectionIndicator` for reconnection feedback
- **Protocol-aware heartbeat**: Heartbeat DISABLED for terminal (raw PTY data), ENABLED for agent (JSON protocol) - prevents stream corruption
- **Mobile resilience**: Auto-reconnect on network online/offline events, visibility change detection for backgrounded apps
- **Factory functions**: `createTerminalWebSocket()` (15 attempts, 500ms-30s backoff) and `createAgentWebSocket()` (20 attempts, 1s-60s backoff)

### Intersection Observer Animation System (Fortune 500-Grade)
Scroll-triggered animations using native Intersection Observer for zero main-thread blocking:
- **useInView hook** (`client/src/lib/motion/useInView.ts`): Returns `{ ref, isInView }`, respects `prefers-reduced-motion`, supports `once` option, proper cleanup on unmount
- **CSS Animation Components** (`client/src/lib/motion/CSSAnimations.tsx`): `CSSInViewFade`, `CSSInViewSlide`, `CSSInViewScale` - GPU-accelerated animations on compositor thread
- **Hybrid Fallback** (`client/src/lib/motion/LazyMotionComponents.tsx`): Auto-detects `whileInView` props and routes to CSS fallback when performance drops
- **Variant Resolution**: Supports both object `whileInView={{ opacity: 1, y: 0 }}` and string `whileInView="animate"` with variants
- **Variable Slide Distance**: Extracts actual distance from variant values (e.g., `y: 40` → 40px slide)
- **Stagger Support**: Basic child staggering via CSS animation-delay when `transition.staggerChildren` is present

### Native Motion Library (Fortune 500-Grade)
Zero-dependency animation system replacing framer-motion hooks for 60fps GPU-accelerated animations:
- **useNativeMotionValue** (`client/src/lib/native-motion/useNativeMotionValue.ts`): RAF-based motion values with `{ get, set, subscribe, destroy }` API
- **useDerivedMotionValue**: Derived values from sources with automatic cleanup on unmount
- **useSpringValue** (`client/src/lib/native-motion/useSpringValue.ts`): Spring physics using Web Animations API with configurable stiffness/damping
- **usePanGesture** (`client/src/lib/native-motion/usePanGesture.ts`): Pointer Events-based pan gestures with velocity in px/ms (framer-motion compatible)
- **useAnimationControls** (`client/src/lib/native-motion/useAnimationControls.ts`): Imperative WAAPI controls with composite transform stacking
- **PanInfo type**: Compatible with framer-motion's `{ point, delta, offset, velocity }` structure
- **Memory safety**: All hooks properly clean up RAF subscriptions and WAAPI animations on unmount
- **Import pattern**: `import { useNativeMotionValue, useSpringValue, usePanGesture, createPanHandlers } from '@/lib/native-motion'`

### Memory Bank System (Replit-Identical)
Auto-initializing context storage in `.ecode/memory-bank/` for each project:
- **AI-Generated Content**: When a workspace is created, Claude generates 5 contextual markdown files based on the user's prompt
- **Files**: `projectbrief.md`, `productContext.md`, `systemPatterns.md`, `techContext.md`, `activeContext.md`
- **Auto-Injection**: Memory Bank content is automatically injected into AI prompts for context persistence
- **Fallback**: Template-based content when AI generation fails
- **Service**: `server/services/memory-bank.service.ts` with `initializeWithAI()` method
- **API**: `/api/memory-bank/:projectId` endpoints for CRUD operations

### Feature Specifications
Core features include a Monaco Code Editor with enhancements, an interactive xterm.js terminal, file management, real-time collaboration, authentication, TypeScript-based container orchestration, Global Search & Replace, Environment Variables Manager, Logs Viewer, and Debugger UI. Autonomous workspace creation involves a Bootstrap API call, AI plan generation, WebSocket-based real-time progress, autonomous execution, and a live preview. An Agent Activity Dashboard with AG Grid provides real-time metrics and session history. Agent conversation persistence is managed via Zustand and backend synchronization. An Agentic RAG system provides automatic backend RAG context retrieval. Build modes (`design-first`, `full-app`, `continue-planning`) are supported for workspace creation.

### System Design Choices
A PostgreSQL database stores user data, project hierarchies, AI agent sessions, deployment history, and subscription management. Security measures include CSRF protection, input sanitization, tier-based rate limiting, API versioning, session-based authentication, and encrypted environment variables. The AI agent system provides server-sent event streaming, multi-provider AI model selection, database-backed conversation history, circuit breakers, and retry logic. Health monitoring integrates Kubernetes probes and a Provider Health API with Prometheus metrics. A two-tier database API architecture (Admin and Project Data APIs) is used with integrated security. Docker builds are optimized for small image sizes. The Stripe payment integration supports a Replit-style hybrid pricing model. Support for 29 languages is provided via CodeMirror 6 for syntax highlighting and a robust runtime system with PID tracking, tree-kill for process termination, and language-specific timeouts. TanStack Query is the exclusive client-side caching layer for all API data. The platform implements a 3-layer cache architecture for enterprise-grade offline UX using TanStack Query with IndexedDB persistence, a Service Worker cache, and a cache reconciliation layer. Performance optimizations include provider racing, speculative scaffolding, and parallel workflow execution.

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