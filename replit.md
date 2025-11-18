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
The frontend utilizes Shadcn/UI with Tailwind CSS for component styling, ensuring a responsive design. Monaco Editor provides the core code editing experience. The system implements a two-tier database API architecture: an Admin Database API for system-wide access and a Project Data API for project-scoped, multi-tenant isolated access. Security features like secret value masking and access control are integrated into database panels. A comprehensive Apple-quality mobile design system has been implemented, including iOS Dynamic Color System, San Francisco Pro Typography, 8pt Grid Spacing System, Apple-quality animation springs, iOS-style shadows, border radius with continuous corners, and touch target sizes.

### Technical Implementations
The frontend is built with React 18, TypeScript, and Vite, using TanStack Query for server state management and Wouter for routing. Real-time collaboration is achieved via WebSockets. The backend is a Node.js and Express.js application written in TypeScript, using Drizzle ORM for PostgreSQL and Passport.js for authentication, following a RESTful API design. Real-time services for terminal, collaborative editing, and build logs are powered by WebSockets. AI optimization infrastructure includes a Task Classifier, Circuit Breaker, Priority Queue, Intelligent Caching, and Observability. UUIDs are used for project identification across all services. Environment variables are encrypted using AES-256-GCM.

### Feature Specifications
Key features include a Monaco Code Editor, an interactive terminal (xterm.js), comprehensive file management, real-time collaboration (Y.js), robust authentication, TypeScript-based container orchestration, Global Search & Replace, an Environment Variables Manager with encryption, a Logs Viewer, and a Debugger UI compatible with the VSCode Debug Adapter Protocol. The platform supports fully autonomous workspace creation: users provide a natural language prompt, and an AI agent generates the IDE, files, and a live preview, with progress streamed via WebSocket. This includes intelligent routing of AI tasks based on complexity for optimal performance and cost efficiency.

### System Design Choices
A PostgreSQL database stores user data, project hierarchies, AI agent sessions, deployment history, subscription management, and AI optimization monitoring. Security measures include CSRF protection, input sanitization, tier-based rate limiting, and session-based authentication. The AI agent system provides server-sent event streaming, multi-provider AI model selection, and a database-backed conversation history. Health monitoring integrates Kubernetes probes and a Provider Health API.

## External Dependencies

### AI/ML Services

#### Configured Models
| Provider | Model | Context Window | Status |
|----------|-------|----------------|--------|
| **OpenAI** | GPT-5.1, GPT-5, GPT-5-mini, GPT-4o, o3, o4-mini | 128k-400k tokens | Quota exceeded |
| **Anthropic** | Claude Sonnet 4.5, Claude Opus 4.1, Claude Haiku 4.5 | 200k tokens | Low credit |
| **Google Gemini** | Gemini 2.5 Flash | **1M tokens** | **WORKING** |
| | Gemini 2.5 Pro | 1M tokens | Available |
| **Moonshot AI** | Kimi K2, Kimi K2 Thinking | 256k tokens | Available |
| **xAI** | Grok 4, Grok 4 Fast | 256k-2M tokens | Unknown |
| **Groq** | Mixtral 8x7B, Llama 3 | 8-32k tokens | Not configured |

#### Provider Fallback Chain
```typescript
['gpt-5.1', 'kimi-k2', 'gemini-2.5-flash', 'grok-4-fast', 'claude-haiku-4-5']
```
Currently **Gemini 2.5 Flash** is the primary working provider.

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