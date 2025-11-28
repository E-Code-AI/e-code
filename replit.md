# E-Code Platform

## Overview
E-Code is a collaborative web-based IDE with AI assistance, designed for rapid prototyping, education, and enterprise use. It aims to provide a scalable platform with multi-provider AI model selection, real-time collaboration, and robust security. A key ambition is to enable autonomous workspace generation from natural language prompts, leading to live previews with streaming progress, thereby creating a comprehensive, AI-powered development environment that streamlines coding and enhances learning. The platform seeks to be an enterprise-grade solution with significant market potential.

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
The frontend utilizes Shadcn/UI with Tailwind CSS and Monaco Editor, adhering to iOS Dynamic Color System principles, San Francisco Pro Typography, 8pt Grid Spacing, Apple-quality animation, iOS-style shadows, continuous corners, and appropriate touch targets for a mobile-first experience. The autonomous agent interface is platform-agnostic and responsive, featuring real-time progress tracking. Responsive design covers mobile, tablet, laptop, and desktop breakpoints with SSR-safe hooks. QA instrumentation standards include minimum touch targets (min-h-[44px]), comprehensive `data-testid` coverage, and mobile-first grid implementations.

### Technical Implementations
The frontend uses React 18, TypeScript, Vite, TanStack Query, and Wouter. The backend is a Node.js/Express.js application in TypeScript, employing Drizzle ORM for PostgreSQL and Passport.js for authentication, following a RESTful API design. WebSockets power real-time features. AI optimization includes a Task Classifier, Circuit Breaker, Priority Queue, Intelligent Caching, and Observability. Environment variables are AES-256-GCM encrypted, and SSE streaming is used for code generation. Anonymous bootstrap authentication provides ephemeral guest users.

Key AI Agent Enhancements include structured XML-based system prompts, a repository overview service, a context window manager with token optimization and long-term memory, a unified AI provider system with multi-provider fallback, and AI-powered inline code actions within the Monaco Editor. A Checkpoints & Rollback System ensures atomic transactions. A Background Auto-Testing System uses Playwright. Max Autonomy Mode enables extended autonomous sessions with AI task decomposition, auto-execution, ETA estimation, and cost tracking, integrated with auto-checkpointing, auto-testing, and auto-rollback. A Templates Marketplace and a Bounties Marketplace with Stripe integration are included. Context Window Enhancements provide separate dev/prod database connections, screenshot capture, and AI memory retention. The Agent Activity Dashboard provides real-time activity components, AG Grid Enterprise components for session history and metrics, and IDE integration for inline activity and mode selection. Mobile code editing components include a joystick for navigation and a custom coding keyboard. A critical authentication flow ensures seamless user experience from homepage "BUILD" to workspace creation. The Unified Agent System is consolidated into a single component (`client/src/components/ai/ReplitAgentPanelV3.tsx`) for all platforms. The Agent Tools Panel provides backend endpoints for web search, testing, and status, with UI features like collapsible panels, loading skeletons, and status indicators.

The platform provides real, process-based code execution without Docker dependency, leveraging native Nix-managed language runtimes available on Replit. Supported runtimes include Python, Node.js, Go, GCC/G++, Java, Rust, and PHP. The execution system includes `CodeExecutor`, `VM Sandbox`, `Multi-Language Executor`, `Process Isolation`, `Command Execution`, and `Runtime Manager` components, along with a full REST API for runtime management. Security measures include feature flags (`ENABLE_DIRECT_EXECUTION`), rate limiting, audit logging, shell injection prevention using `spawn(shell:false)`, and a command whitelist.

A centralized logging system utilizes Winston-based backend logging with request context via AsyncLocalStorage, correlation IDs, and multi-transport support. Logging middleware provides automatic request/response logging, security event logging, and performance monitoring. A Logs API supports querying, searching, statistical analysis, request/correlation tracing, and export. Frontend telemetry includes automatic error capture, Web Vitals, network request logging, and batched log shipping.

An Electron desktop application is planned, providing cross-platform support with features like auto-updates, native menus, and window state persistence, built with `electron-builder`.

### Feature Specifications
Core features include a Monaco Code Editor with advanced enhancements, an interactive terminal (xterm.js), file management, real-time collaboration, authentication, TypeScript-based container orchestration, Global Search & Replace, an Environment Variables Manager, a Logs Viewer, and a Debugger UI. The UI is responsive across devices. Autonomous workspace creation involves a Bootstrap API call, AI plan generation, WebSocket-based real-time progress, autonomous execution, and a live preview. PWA features and Electron desktop support are included.

### System Design Choices
A PostgreSQL database stores user data, project hierarchies, AI agent sessions, deployment history, subscription management, and AI optimization monitoring. Security measures include CSRF protection, input sanitization, tier-based rate limiting, API versioning, session-based authentication, and encrypted environment variables. The AI agent system provides server-sent event streaming, multi-provider AI model selection, database-backed conversation history, circuit breakers, and retry logic. Health monitoring integrates Kubernetes probes and a Provider Health API with Prometheus metrics. A two-tier database API architecture (Admin and Project Data APIs) is used with integrated security. Docker builds are optimized for small image sizes. Security enhancements include authentication/authorization for repository overview and templates APIs, context route timeouts, file system scanning limits, and project path scoping. The Stripe payment integration supports a Replit-style hybrid pricing model with subscription management, metered billing, credit tracking, and bounty payouts.

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