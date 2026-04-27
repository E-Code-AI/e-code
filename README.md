# E-Code Platform

<div align="center">
  <img src="client/public/assets/logo.svg" alt="E-Code Platform" width="160">

  <h3>AI-Native Cloud IDE for Enterprise Engineering Teams</h3>

  <p>
    <a href="#platform-overview">Overview</a> •
    <a href="#key-capabilities">Capabilities</a> •
    <a href="#architecture">Architecture</a> •
    <a href="#quick-start">Quick Start</a> •
    <a href="#deployment">Deployment</a> •
    <a href="#security">Security</a> •
    <a href="docs/ARCHITECTURE.md">Architecture Doc</a>
  </p>
</div>

---

## Platform Overview

E-Code is a full-stack, AI-native development environment that combines a high-performance web IDE with autonomous AI agents. Built for teams that need to move from idea to production fast, it provides integrated code execution, real-time collaboration, database provisioning, and multi-model AI orchestration in a single platform.

The platform is designed as a commercial SaaS product with enterprise-grade security, tenant isolation, tier-based rate limiting, and Stripe-powered billing.

## Key Capabilities

### Autonomous AI Agents
- **Multi-model support**: OpenAI (GPT-4.1, o3, o4-mini), Anthropic (Claude 3.7 Sonnet, Claude 3.5 Haiku), Google (Gemini 2.5 Pro/Flash), xAI (Grok-3), Moonshot
- **Autonomous workspace bootstrap**: Creates full applications from a single prompt — plan, scaffold, build, test, and deploy
- **Contextual memory bank**: Persistent markdown-based project context for long-running tasks
- **Voice input (Vibe Coding)**: MediaRecorder → Whisper/Gemini transcription → agent prompt injection

### Enterprise-Grade IDE
- **28+ language runtimes**: TypeScript, Python, Go, Rust, Java, C/C++, Ruby, PHP, and more via Nix-managed environments
- **Monaco editor**: Full IntelliSense with syntax highlighting, multi-cursor, and custom keybindings
- **Integrated xterm.js terminal**: Multi-session PTY with persistent PID tracking
- **Real-time file system**: Database-backed with tenant isolation and path traversal protection
- **Git integration**: GitHub OAuth with encrypted token storage and expiry enforcement

### Live Preview & Execution
- **WebSocket hot-reload**: Sub-100ms CSS hot-swapping for HTML projects
- **Sandboxed execution**: DockerExecutor with resource limits and network isolation
- **Runner microservice**: Separate Node.js service handling code execution, terminal sessions, and filesystem operations
- **Database auto-provisioning**: Async PostgreSQL provisioning (Neon primary, local fallback) with per-project isolation

### Real-Time Infrastructure
- **WebSocket central dispatcher**: Single upgrade handler routing `/ws/agent`, `/ws/preview`, `/ws/terminal`, and `/ws/logs`
- **SSE streaming**: AI response streaming with circuit breakers and retry logic
- **Agent WebSocket**: Persistent bidirectional connection for autonomous build events with mobile-safe reconnect logic

### Enterprise Features
- **Multi-tenancy**: Hard database-level tenant isolation via `tenant_id` scoping on all queries
- **Tier-based rate limiting**: Free (500 req/min), Pro (1000), Teams (5000), Enterprise (10000)
- **Stripe billing**: Subscription management, webhook idempotency, and usage metering
- **SendGrid email**: Transactional email for auth flows and notifications
- **Slack integration**: Webhook-based notifications for deployment and build events
- **Marketplace**: Template and extension marketplace with fork-to-project support

## Architecture

E-Code uses a two-service architecture:

```
┌─────────────────────────────────────────────────────┐
│                  Main Platform                      │
│  React/Vite frontend + Node.js/Express backend      │
│  • Session management & auth (Passport.js)          │
│  • AI orchestration (multi-provider)                │
│  • Project/file CRUD (PostgreSQL + Drizzle ORM)     │
│  • WebSocket dispatcher (agent, preview, terminal)  │
│  • Stripe billing, SendGrid email                   │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP/WebSocket
┌──────────────────────▼──────────────────────────────┐
│                  Runner Microservice                │
│  Standalone Node.js service (port 8080)             │
│  • Code execution (Docker/Nix sandboxes)            │
│  • PTY terminal sessions                            │
│  • Filesystem operations (scoped per workspace)     │
│  • JWT-authenticated (RUNNER_JWT_SECRET)            │
└─────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology |
| :--- | :--- |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend | Node.js, Express, TypeScript, Passport.js |
| Database | PostgreSQL 16, Drizzle ORM, Redis |
| AI | OpenAI, Anthropic, Google Gemini, xAI, Moonshot |
| Editor | Monaco Editor, xterm.js |
| Real-time | WebSockets (ws), Server-Sent Events |
| Payments | Stripe |
| Email | SendGrid |
| Execution | Docker, Nix, node-pty |

## Quick Start

### Prerequisites
- Node.js 20.x LTS or higher
- PostgreSQL 16.x
- Redis (required in production for cache, sessions, idempotency, queues, collaboration, and rate limiting; optional only for local development)
- Replit Deploy for the supported production target

### Development Setup

```bash
# 1. Install dependencies
npm install

# 2. Set required environment variables (see Configuration below)
# Use Replit Secrets or a .env file

# 3. Bootstrap a local Postgres + apply Drizzle schema (idempotent).
#    Spawns docker container `e-code-postgres` on 127.0.0.1:5455 and
#    writes DATABASE_URL into .env.local (never .env, which may hold prod creds).
./scripts/setup-local-db.sh

# 4. Start development server (frontend + backend on same port).
#    Loads .env.local on top of .env so DATABASE_URL points at the local container.
source .env.local && npm run dev

# 5. Start the Runner microservice (separate terminal)
npx tsx runner/index.ts
```

> If you already have a running Postgres reachable via your existing `DATABASE_URL`,
> skip step 3 and just run `npm run db:push` directly. Re-run `./scripts/setup-local-db.sh`
> any time — it is idempotent (use `FORCE_RECREATE=1` to drop and respawn the container).

The development server runs on port 5000 with Vite serving the frontend and Express handling API routes.

### Local Validation Before Shipping

```bash
npm run typecheck
npm run lint
npm run build
```

### Configuration

Required environment variables:

```
DATABASE_URL          PostgreSQL connection string
SESSION_SECRET        Secret for session cookie encryption
ANTHROPIC_API_KEY     Claude models
OPENAI_API_KEY        GPT and Whisper models
GEMINI_API_KEY        Gemini models
XAI_API_KEY           Grok models
MOONSHOT_API_KEY      Moonshot/Kimi models
SENDGRID_API_KEY      Email delivery
STRIPE_SECRET_KEY     Payment processing
RUNNER_JWT_SECRET     Runner microservice authentication
```

### Database Schema Updates

Never write SQL migrations manually. Always use:

```bash
npm run db:push
# If drizzle prompts about enum renames, create the enum directly first:
# psql $DATABASE_URL -c "CREATE TYPE name AS ENUM ('val1', 'val2');"
# Then re-run db:push
```

## Deployment

The supported production target is `replit-deploy`.

See:

- [DEPLOYMENT.md](DEPLOYMENT.md)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/HANDOFF.md](docs/HANDOFF.md)

Build and run commands:

```bash
# Production build (prunes node_modules to native packages only)
BUILD_DEPLOY=1 REPLIT_DEPLOYMENT=1 npm run build

# Production start
node dist/index.js
```

The build prunes `node_modules` down to only native packages (`bcrypt`, `node-pty`, `sharp`) when both `BUILD_DEPLOY=1` and `REPLIT_DEPLOYMENT=1` are set — this never runs in development.

## Security

- **AES-256-GCM encryption** for stored credentials (GitHub tokens, API keys)
- **CSRF protection** on all state-mutating API endpoints (`X-CSRF-Token` header required)
- **XSS prevention** with sanitized inputs and strict CSP headers
- **Tenant isolation** enforced at query level — `tenant_id` checked on every file/project operation
- **Path traversal protection** with Zod route validation
- **GitHub token expiry enforcement** — expired tokens rejected, not silently extended
- **WebSocket origin validation** with same-host shortcut and `REPLIT_DEV_URL` auto-detection
- **Rate limiting** per tier, applied at the Express middleware layer
- **No auth bypass** — all protected routes require valid Passport sessions

## Development Notes

- **API routes**: Mounted at `/api`. Internal router routes must not include `/api/` prefix.
- **`apiRequest()`**: Returns parsed JSON directly — never check `.ok` or call `.json()`.
- **`db.execute()`**: Returns array directly with `postgres-js`. Pattern: `Array.isArray(result) ? result : (result as any).rows ?? []`
- **React hooks**: All hooks must appear before early returns.
- **Monaco disposal**: Use `d?.dispose?.()` optional chaining for all enhancement classes.
- **Lazy loading**: Use `instrumentedLazy()` instead of `lazy()` — adds 3-attempt retry for transient Vite HMR failures.
- **SPA routing**: `notFoundHandler` only catches `/api/*` routes — non-API paths pass to Vite.

## Support

- **Issues**: Use the in-app feedback panel
- **Email**: support@e-code.ai
- **Documentation**: https://docs.e-code.ai
