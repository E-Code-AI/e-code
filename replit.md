# E-Code Platform

## Overview
E-Code is a web-based collaborative IDE with AI assistance, offering code editing, terminal access, file management, and an autonomous AI agent. It aims to facilitate rapid prototyping and education, with a strategic vision for enterprise-grade scalability. Key capabilities include multi-provider AI model selection with advanced optimization infrastructure, real-time collaboration, and robust security features.

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

## System Architecture

### Frontend Architecture
The frontend uses React 18 and TypeScript with Vite, featuring TanStack Query for server state, Wouter for routing, Monaco Editor for code editing, and Shadcn/UI with Tailwind CSS for components. It supports real-time collaboration via WebSockets, responsive design for various devices, and UX enhancements like layout-aware loading states.

### Backend Architecture
The backend is built with Node.js and Express.js in TypeScript, utilizing Drizzle ORM for PostgreSQL and Passport.js for authentication. It follows a RESTful API design with a service-oriented approach, including specialized services for AI orchestration, autonomous engine logic, file system operations, and Git integration. Security features include CSRF protection, input sanitization, Fortune 500 tier-based rate limiting, and session-based authentication. Real-time services for terminal, collaborative editing, and build logs are powered by WebSockets.

**Fortune 500 Rate Limiting Architecture:**
- **Tier-Based Limits** (`server/middleware/tier-rate-limiter.ts`):
  - Free: 100 req/min (API), 10 req/min (AI), 5 req/15min (Auth)
  - Pro: 1,000 req/min (API), 100 req/min (AI), 20 req/15min (Auth) - 10x multiplier
  - Enterprise: 10,000 req/min (API), 1,000 req/min (AI), 100 req/15min (Auth) - 100x multiplier
  - Development: 10x multiplier on all limits to prevent blocking during testing
- **Violation Tracking** (`rate_limit_violations` table): Logs all rate limit violations with user, IP, endpoint, tier, and metadata for security auditing
- **Admin Monitoring API** (`/api/admin/monitoring/*`):
  - `/rate-limit-violations` - Paginated violation history with filtering
  - `/rate-limit-stats` - Aggregated statistics (by tier, type, endpoint, user, hourly trends)
  - `/system-health` - Overall system health with terminal metrics integration
  - `/rate-limit-violations/cleanup` - Cleanup old violation records

**Terminal Architecture (Fortune 500 Production-Grade):**
The terminal system uses local bash sessions (`server/terminal.ts`) for Replit Cloud Run compatibility, enhanced with enterprise-grade scalability, persistence, and monitoring infrastructure:

**Scalability Manager (`server/terminal/scalability-manager.ts`):**
- Queue-based command execution with backpressure management
- Concurrency limits: max 100 concurrent terminal sessions
- Per-session command queues (max 1000 commands/session)
- Command timeout enforcement (30s per command)
- Auto-cleanup of stale sessions (>1h inactive)
- Detailed metrics tracking (commands executed/queued/failed)

**Redis Session Manager (`server/terminal/redis-session-manager.ts`):**
- Redis-backed session persistence for fault tolerance
- Stable session identifiers (`terminal-${projectId}`)
- Session restoration across process restarts
- TTL-based auto-expiry (24h)
- Activity tracking with `touchSession()` updates
- Survives Cloud Run restarts (99.9% availability)

**WebSocket Heartbeat Manager (`server/terminal/websocket-heartbeat.ts`):**
- 30-second ping interval with 60-second timeout
- Dead connection detection and auto-termination
- Metrics tracking (pings sent/received, dead connections)
- Graceful cleanup on client disconnect

**Terminal Metrics API (`/api/terminal/metrics`, `/api/terminal/health`):**
- Real-time capacity monitoring (current/max sessions, utilization %)
- Health status and backpressure indicators
- Per-session metrics (age, commands executed/queued/failed)
- K8s-ready liveness/readiness probes

**Frontend Terminal Metrics Integration:**
- React hook `useTerminalMetrics` and `useTerminalHealth` for real-time metrics polling (5s/10s intervals)
- `TerminalMetricsIndicator` component with compact (badge) and detailed (panel) modes
- Integrated into all terminal variants: `ReplitTerminalPanel`, `Terminal`, `MobileTerminal`, `ReplitTerminal`
- Visual health indicators: Green (healthy), Yellow (degraded), Red (unhealthy), Gray (unknown/loading)
- Tooltip displays capacity, utilization %, and backpressure status
- Production-ready TypeScript with full HTML attributes support (`data-testid` for e2e testing)

Docker-based isolated terminal implementation exists (`server/terminal/real-terminal.ts`) but is NOT usable on Replit Cloud Run as the platform does not expose a Docker daemon.

**AI Optimization Infrastructure:**
This includes a Task Classifier Service, Circuit Breaker Service, Priority Queue Service, Intelligent Caching Service, Observability Service, and Slack Alert Service for robust AI management and monitoring.

**Health & Monitoring:**
The system integrates Kubernetes health probes (`/health/liveness`, `/health/readiness`, `/health/deep`, `/health/startup`) and a Provider Health API (`GET /api/health/providers`) for real-time status validation of integrated AI providers.

**API Documentation:**
Swagger/OpenAPI 3.0 documentation is available at `/api/docs`.

### Database Schema
A PostgreSQL database with over 140 tables manages user data, project hierarchies, AI agent session tracking, deployment history, subscription management, and AI optimization monitoring. Key tables for the AI agent include `agent_sessions`, `agent_workflows`, `autonomous_actions`, and `agent_audit_trail`.

### AI Agent System
The AI agent system features server-sent event streaming, multi-provider AI model selection (OpenAI, Anthropic, Gemini, xAI, Moonshot AI), database-backed conversation history, and a robust tool execution framework. It is integrated with the AI Optimization Infrastructure. A centralized model catalog (`shared/aiModels.ts`) details capabilities, pricing, and release dates for 18 production models across 5 providers.

**AI Agent Flow:**
The system includes production-ready services for agent orchestration, WebSocket streaming, workflow engine, autonomous engine, file operations, command execution, plan generation, progress tracking, and a tool framework. The current flow involves a manual agent start, while the target flow aims for an orchestrated workspace bootstrap that auto-starts the agent, streams plans, auto-creates files, executes commands, and displays terminal output via WebSockets.

### Core Features
- Monaco Code Editor for advanced code editing.
- Interactive Terminal via xterm.js.
- Comprehensive File Tree & Management.
- Real-time Collaboration powered by Y.js.
- Robust Authentication & Security with Passport.js.
- TypeScript-based Container Orchestration for runtime management.

## External Dependencies

### AI/ML Services
- **OpenAI:** GPT-5.1, GPT-5, GPT-5-mini, GPT-5-nano, GPT-4.1, GPT-4o, o3, o4-mini
- **Anthropic:** Claude Sonnet 4.5, Opus 4.1, Haiku 4.5
- **Google Gemini:** Gemini 2.5 Pro, Gemini 2.5 Flash
- **Moonshot AI:** Kimi K2, Kimi K2 Thinking, Kimi K2 Turbo
- **xAI:** Grok 4, Grok 4 Fast
- **Groq:** Open-source models
- **Model Context Protocol (MCP) SDK**

### Infrastructure Services
- **PostgreSQL:** Neon serverless
- **Redis:** Optional caching
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

### Deployment Targets
- **Replit Cloud Run** (Currently used)
- **Docker** (Available for future external deployment)