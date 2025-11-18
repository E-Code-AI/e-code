# E-Code Platform

## Overview
E-Code is a web-based collaborative IDE with AI assistance, offering code editing, terminal access, file management, and an autonomous AI agent. Its primary purpose is to facilitate rapid prototyping and education. The platform aims for enterprise-grade scalability, multi-provider AI model selection, real-time collaboration, robust security, and the ambition to provide autonomous workspace creation from a natural language prompt to a live preview, streaming progress in real-time.

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
The frontend utilizes Shadcn/UI with Tailwind CSS for component styling, ensuring a responsive design. Monaco Editor provides the core code editing experience.

### Technical Implementations
The frontend is built with React 18, TypeScript, and Vite, using TanStack Query for server state management and Wouter for routing. Real-time collaboration is achieved via WebSockets.
The backend is a Node.js and Express.js application written in TypeScript. It uses Drizzle ORM for PostgreSQL and Passport.js for authentication, following a RESTful API design. Real-time services for terminal, collaborative editing, and build logs are powered by WebSockets. AI optimization infrastructure includes a Task Classifier, Circuit Breaker, Priority Queue, Intelligent Caching, and Observability. API documentation is available via Swagger/OpenAPI 3.0 at `/api/docs`.

### Feature Specifications
Key features include a Monaco Code Editor, an interactive terminal (xterm.js), comprehensive file management, real-time collaboration (Y.js), robust authentication, TypeScript-based container orchestration, Global Search & Replace, an Environment Variables Manager with encryption, a Logs Viewer, and a Debugger UI compatible with the VSCode Debug Adapter Protocol. The platform supports fully autonomous workspace creation: users provide a natural language prompt, and an AI agent generates the IDE, files, and a live preview, with progress streamed via WebSocket. This includes intelligent routing of AI tasks based on complexity using `reasoning_effort` for optimal performance and cost efficiency with models like GPT-5.1.

### System Design Choices
A PostgreSQL database stores user data, project hierarchies, AI agent sessions, deployment history, subscription management, and AI optimization monitoring. Environment variables are encrypted using AES-256-GCM. Security measures include CSRF protection, input sanitization, tier-based rate limiting, and session-based authentication. The AI agent system provides server-sent event streaming, multi-provider AI model selection, and a database-backed conversation history. Health monitoring integrates Kubernetes probes and a Provider Health API.

## External Dependencies

### AI/ML Services

#### Configured Models (November 2025)
| Provider | Model | Context Window | Free Tier | Status |
|----------|-------|----------------|-----------|--------|
| **OpenAI** | GPT-5.1 | 400k tokens | ❌ Paid | ❌ Quota exceeded |
| | GPT-5 | 400k tokens | ❌ Paid | ❌ Quota exceeded |
| | GPT-5-mini | 400k tokens | ❌ Paid | ❌ Quota exceeded |
| | GPT-4o, o3, o4-mini | 128k tokens | ❌ Paid | ❌ Quota exceeded |
| **Anthropic** | Claude Sonnet 4.5 | 200k tokens | ❌ Paid | ❌ Low credit |
| | Claude Opus 4.1 | 200k tokens | ❌ Paid | ❌ Low credit |
| | Claude Haiku 4.5 | 200k tokens | ❌ Paid | ❌ Low credit |
| **Google Gemini** | Gemini 2.5 Flash | **1M tokens** | ✅ 250/day | ✅ **WORKING** |
| | Gemini 2.5 Pro | 1M tokens | ✅ 50/day | ✅ Available |
| **Moonshot AI** | Kimi K2 | 256k tokens | ❌ Paid | ✅ Available |
| | Kimi K2 Thinking | 256k tokens | ❌ Paid | ✅ Available |
| **xAI** | Grok 4 | 256k tokens | ❌ Paid | Unknown |
| | Grok 4 Fast | **2M tokens** | ❌ Paid | Unknown |
| **Groq** | Mixtral 8x7B, Llama 3 | 8-32k tokens | ✅ Free | Not configured |

#### AI Context Budget Limits (Updated Nov 18, 2025)

**Critical Fix Applied:** All context limits updated from obsolete 2023 values to real 2025 API capacities.

Context budgets in `server/agent/context-manager.ts`:
- **OpenAI:** 280k tokens (70% of 400k GPT-5.1 limit) - was 30k ❌ **9× too low**
- **Anthropic:** 140k tokens (70% of 200k Claude limit) - was 50k ❌ **2.8× too low**
- **Gemini:** 200k tokens (20% of 1M limit, 80% of 250k free tier) - was 7k ❌ **28× too low**
- **xAI:** 180k tokens (70% of 256k Grok 4 limit) - was 30k ❌ **6× too low**
- **Moonshot:** 180k tokens (70% of 256k Kimi K2 limit) - **NEW** (was missing)
- **Groq:** 7k tokens (conservative for 32k actual)

**Safety Margin:** 70% rule accounts for 4-char-per-token estimation errors with CJK text, Base64, emojis.

#### Provider Fallback Chain
```typescript
['gpt-5.1', 'kimi-k2', 'gemini-2.5-flash', 'grok-4-fast', 'claude-haiku-4-5']
```
Currently **Gemini 2.5 Flash** is the primary working provider (free tier, 250 req/day).

#### Model Context Protocol (MCP) SDK
MCP support enabled for all AI providers.

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