# E-Code Platform

## Overview
E-Code is a web-based collaborative IDE with AI assistance, offering code editing, terminal access, file management, and an autonomous AI agent. Its primary purpose is to facilitate rapid prototyping and education. The platform aims for enterprise-grade scalability, multi-provider AI model selection, real-time collaboration, robust security, and the ability to create autonomous workspaces from a natural language prompt to a live preview with streaming progress. The business vision is to provide a comprehensive, AI-powered development environment that streamlines the coding process and enhances learning.

## User Preferences
- **Communication:** Simple, everyday language
- **Code Style:** TypeScript with strict typing
- **Database:** NEVER manual SQL migrations - use `npm run db:push` (or `--force`)
- **Files:** NEVER remove without explicit request
- **Hooks:** ALL React hooks before early returns
- **Routing:** `/ide/:id` (legacy `/editor/:id` redirects)
- **Security:** API keys via Replit Secrets, never commit
- **Docker Build:** Optimized for <2GiB images
- **Rate Limiting:** Tier-based (Free: 100/min, Pro: 1000/min, Enterprise: 10000/min)
- **Monaco Editor:** Safe disposal pattern with optional chaining (`d?.dispose?.()`) for all enhancement classes
- **Documentation:** Ruthlessly remove obsolete/misleading docs - maintain technical honesty

## System Architecture

### UI/UX Decisions
The frontend uses Shadcn/UI with Tailwind CSS for responsive component styling and Monaco Editor for code editing. A comprehensive Apple-quality mobile design system is implemented, including iOS Dynamic Color System, San Francisco Pro Typography, 8pt Grid Spacing, Apple-quality animation springs, iOS-style shadows, continuous corners, and appropriate touch target sizes. The autonomous agent interface is platform-agnostic with responsive layouts and real-time progress tracking.

### Technical Implementations
The frontend is built with React 18, TypeScript, Vite, TanStack Query, and Wouter. The backend is a Node.js and Express.js application in TypeScript, utilizing Drizzle ORM for PostgreSQL and Passport.js for authentication, following a RESTful API design. Real-time services for terminal, collaborative editing (Y.js), and build logs are powered by WebSockets. AI optimization infrastructure includes a Task Classifier, Circuit Breaker, Priority Queue, Intelligent Caching, and Observability. UUIDs identify projects, and environment variables are encrypted using AES-256-GCM. Backend implements SSE streaming with buffered JSON parsing for reliable code generation. Anonymous bootstrap authentication creates ephemeral guest users with project-specific JWT tokens, ensuring isolated sessions and security through JWT validation.

### Feature Specifications
Key features include a Monaco Code Editor with enhancements (Git UI components with demo data, multi-cursor editing, code navigation, refactoring, advanced search, IntelliSense with partial provider support), an interactive terminal (xterm.js), file management, real-time collaboration, robust authentication, TypeScript-based container orchestration, Global Search & Replace, an Environment Variables Manager with encryption, a Logs Viewer, and a Debugger UI. The responsive UI adapts to desktop, tablet, and mobile devices. Autonomous workspace creation from natural language prompts involves a Bootstrap API call, client redirection to the IDE, background AI plan generation with multi-provider fallback, a WebSocket connection for real-time progress, autonomous execution of the plan to generate files and code, a live preview tab, and continuous autonomous development by an integrated agent.

### System Design Choices
A PostgreSQL database stores user data, project hierarchies, AI agent sessions, deployment history, subscription management, and AI optimization monitoring. Security measures include CSRF protection, input sanitization, tier-based rate limiting, API versioning, and session-based authentication. The AI agent system provides server-sent event streaming, multi-provider AI model selection, and a database-backed conversation history, incorporating circuit breakers and retry logic. Health monitoring integrates Kubernetes probes and a Provider Health API, including a Prometheus metrics endpoint. A two-tier database API architecture is used: an Admin Database API and a Project Data API, with integrated security features like secret value masking and access control. Docker builds are optimized for small image sizes.

**✅ Autonomous Workspace Creation (PRODUCTION READY - November 24, 2025):**
The autonomous workspace creation pipeline is fully operational with production-grade reliability. Core implementation includes: (1) **agentOrchestrator.startAutonomousWorkspace()** orchestration service with idempotency checks, multi-provider AI plan generation (Gemini→GPT→Claude→Grok→Kimi fallback), plan storage to database, task-to-workflow conversion using existing `buildStepConfig()` and `mapTaskTypeToWorkflowType()` methods, and comprehensive error handling. (2) **Bootstrap API Integration** using fire-and-forget pattern that returns tokens <1s and triggers autonomous workflow asynchronously. (3) **Real-time Event Streaming** via WebSocket with proper event listener lifecycle management - subscriptions to `workflow:event` channel, event forwarding to WebSocket clients, and guaranteed cleanup via try/finally blocks to prevent memory leaks. (4) **Terminal Status Broadcasting** in all exit paths (success, failure, errors) to keep UI in sync with backend state. Status transitions: 'planning' → 'executing' → 'completed'/'failed'. All critical architect-identified issues resolved including event listener cleanup, terminal status broadcasts, and proper task-to-step schema conversion.

**✅ Multi-Platform Support (INTEGRATED - November 24, 2025):**
Complete cross-platform implementation merged into main (PR #231-234). Features include: (1) **Progressive Web App (PWA)** with InstallPrompt component (`client/src/components/pwa/InstallPrompt.tsx`), offline-first architecture, service worker integration, and cross-device sync. (2) **Desktop Application** with Electron setup (`desktop/` directory including main.js, preload.js, package.json), native window management, system tray integration, and auto-update support. (3) **Mobile Optimization** with responsive components (`mobile/src/components/CodeEditor.tsx`), touch-optimized UI, mobile-specific navigation, and React Native compatibility configuration. (4) **WebSocket Enhancements** including noServer mode for Vite compatibility, multi-device connection tracking with device roster, heartbeat mechanism for connection health monitoring, and presence updates across devices. All features production-tested and ready for deployment across web, desktop (Windows/Mac/Linux), and mobile (iOS/Android) platforms.

**✅ Monitoring & Observability (November 24, 2025):**
Comprehensive monitoring infrastructure with multiple endpoints: (1) `/health` - System health check with database connectivity, AI provider status, CORS configuration, and uptime tracking. (2) `/api/metrics` - Application metrics including memory usage, CPU stats, active connections, and request rates. (3) `/api/websocket-metrics` - Real-time WebSocket connection metrics via streaming. (4) `/api/terminal-metrics` - Terminal session monitoring and performance tracking. (5) `/api/monitoring` - Centralized monitoring dashboard aggregating all system metrics. Future enhancement: Prometheus-compatible `/metrics/prometheus` endpoint available in temp-platform-audit branch for Grafana integration (optional, non-critical).

**🧹 Git Repository Status (November 24, 2025):**
All recent feature branches (6 derniers jours) have been successfully merged into main. Current branch state: (1) **Merged branches**: Mobile implementation (PR #234), PWA/Offline/Desktop (PR #232), WebSocket fixes (PR #231), Diagnostic tools (PR #233). (2) **Obsolete remote branches**: 10+ Claude agent branches from Nov 23-24 ready for cleanup (see GIT_CLEANUP_BRANCHES.sh). (3) **Current main** (commit 31f0caa4) represents authoritative production-ready state with all features integrated. (4) **LSP Status**: 0 errors, all TypeScript types aligned. Execute `bash GIT_CLEANUP_BRANCHES.sh` for cleanup instructions or run commands directly via Shell to remove obsolete remote and local branches.

## External Dependencies

### AI/ML Services
- **OpenAI:** GPT-5.1, GPT-5, GPT-5-mini, GPT-4o, o3, o4-mini
- **Anthropic:** Claude Sonnet 4.5, Claude Opus 4.1, Claude Haiku 4.5
- **Google Gemini:** Gemini 2.5 Flash, Gemini 2.5 Pro
- **Moonshot AI:** Kimi K2 (kimi-k2-0711-preview, kimi-k2-0905-preview), Kimi K2 Thinking
- **xAI:** Grok 4, Grok 4 Fast
- **Groq:** Mixtral 8x7B

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