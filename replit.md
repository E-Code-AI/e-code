# E-Code Platform

## Overview
E-Code is a web-based collaborative IDE with AI assistance, offering code editing, terminal access, file management, and an autonomous AI agent. Its primary purpose is to facilitate rapid prototyping and education, aiming for enterprise-grade scalability, multi-provider AI model selection, real-time collaboration, robust security, and the ambition to provide autonomous workspace creation from a natural language prompt to a live preview, streaming progress in real-time.

## Production Readiness Status (November 19, 2025)

### ✅ Completed & Verified
- **Mobile IDE:** Full feature parity with desktop, E2E tested, Apple-quality design system
- **AI Provider Robustness:** Robust streaming with try-catch, buffer validation, chunk-level parsing for OpenAI, Anthropic, Gemini, Moonshot
- **Security Basics:** CSRF protection on mutating endpoints, session-based auth, auth bypass protected by NODE_ENV guard
- **Database:** PostgreSQL with Drizzle ORM, proper foreign keys, no manual migrations

### ⚠️ Fortune 500 Gaps Identified (Defer to Future Sprint)
**Priority 1 - Security:**
1. **API Rate Limiting** - Tier-based limiters exist but not applied to all API routes. Auth routes protected. Requires router-level implementation: `app.use('/api/projects', tierRateLimiters.api, projectsRouter.getRouter())`
   - Status: Auth routes protected (100/1000/10000 req/min), API routes unprotected
   - Risk: Potential DoS on unprotected endpoints
   - Solution: Apply `tierRateLimiters.api` when mounting each router

**Priority 2 - AI Resilience:**
2. **Circuit Breakers/Failover** - No retry/back-off/provider failover for 99.9% uptime claim
   - Status: Providers throw directly on outage, no circuit breaker pattern
   - Risk: Cannot guarantee 99.9% uptime
   - Solution: Implement circuit breaker pattern, retry logic, fallback chain orchestration

3. **Streaming Defensive Limits** - No size/timeout caps on provider streaming
   - Status: Trusts provider chunk boundaries without validation
   - Risk: Potential memory exhaustion or infinite streams
   - Solution: Add max stream size (10MB), timeout (60s), chunk validation

**Priority 3 - Operations:**
4. **OpenTelemetry Brittleness** - Using private `_metricReader` property
   - Status: `/metrics/prometheus` endpoint may fail on library updates
   - Risk: Monitoring failures in production
   - Solution: Migrate to stable OpenTelemetry SDK APIs

5. **API Versioning** - All routes under `/api/*` without version prefix
   - Status: No versioning strategy for backward compatibility
   - Risk: Breaking changes disrupt existing clients
   - Solution: Implement `/api/v1/*` prefix, version negotiation header

6. **Docker Optimization** - Images likely >2GiB
   - Status: Multi-stage build without node_modules slimming
   - Risk: Slow deployments, higher costs
   - Solution: Implement production dependencies only, Alpine base image

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

### UI/UX Decisions
The frontend uses Shadcn/UI with Tailwind CSS for responsive component styling. Monaco Editor provides the core code editing. A comprehensive Apple-quality mobile design system is implemented, including iOS Dynamic Color System, San Francisco Pro Typography, 8pt Grid Spacing, Apple-quality animation springs, iOS-style shadows, continuous corners, and appropriate touch target sizes.

### Technical Implementations
The frontend is built with React 18, TypeScript, Vite, TanStack Query for server state management, and Wouter for routing. The backend is a Node.js and Express.js application in TypeScript, utilizing Drizzle ORM for PostgreSQL and Passport.js for authentication, following a RESTful API design. Real-time services for terminal, collaborative editing (Y.js), and build logs are powered by WebSockets. AI optimization infrastructure includes a Task Classifier, Circuit Breaker, Priority Queue, Intelligent Caching, and Observability. UUIDs identify projects across services, and environment variables are encrypted using AES-256-GCM.

### Feature Specifications
Key features include a Monaco Code Editor, an interactive terminal (xterm.js), file management, real-time collaboration, robust authentication, TypeScript-based container orchestration, Global Search & Replace, an Environment Variables Manager with encryption, a Logs Viewer, and a Debugger UI compatible with the VSCode Debug Adapter Protocol. The platform supports fully autonomous workspace creation: users provide a natural language prompt, and an AI agent generates the IDE, files, and a live preview, with progress streamed via WebSocket. This includes intelligent routing of AI tasks based on complexity for optimal performance and cost efficiency. The mobile IDE provides full feature parity with the desktop version.

### System Design Choices
A PostgreSQL database stores user data, project hierarchies, AI agent sessions, deployment history, subscription management, and AI optimization monitoring. Security measures include CSRF protection, input sanitization, tier-based rate limiting, and session-based authentication. The AI agent system provides server-sent event streaming, multi-provider AI model selection, and a database-backed conversation history. Health monitoring integrates Kubernetes probes and a Provider Health API, including a Prometheus metrics endpoint (`/metrics/prometheus`) compatible with Replit Cloud Run's single-port architecture. A two-tier database API architecture is used: an Admin Database API for system-wide access and a Project Data API for project-scoped, multi-tenant isolated access, with integrated security features like secret value masking and access control.

## External Dependencies

### AI/ML Services
- **OpenAI:** GPT-5.1, GPT-5, GPT-5-mini, GPT-4o, o3, o4-mini
- **Anthropic:** Claude Sonnet 4.5, Claude Opus 4.1, Claude Haiku 4.5
- **Google Gemini:** Gemini 2.5 Flash (Primary working provider), Gemini 2.5 Pro
- **Moonshot AI:** Kimi K2, Kimi K2 Thinking
- **xAI:** Grok 4, Grok 4 Fast
- **Groq:** Mixtral 8x7B, Llama 3 (Not configured)
- **Provider Fallback Chain:** `['gpt-5.1', 'kimi-k2', 'gemini-2.5-flash', 'grok-4-fast', 'claude-haiku-4-5']`

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