# Architecture Overview

The E‑Code platform is organized into modular layers that balance developer productivity with enterprise security. This document summarizes the major components, data flows, and operational considerations for solution architects and platform engineers.

## High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Applications                      │
│ React/Vite (client/) • Tailwind UI • Monaco Editor • AI Sidebar │
└───────────────▲──────────────────────────┬──────────────────────┘
                │ WebSockets/HTTPS         │ REST/GraphQL (planned)
┌───────────────┴──────────────────────────▼──────────────────────┐
│                         Control Plane                           │
│ Express API (server/index.ts)                                   │
│  • Authentication & sessions                                     │
│  • Rate limiting & security middleware                          │
│  • Route registration (`server/routes/`)                         │
│  • Vite asset proxy & static serving                            │
└───────────────▲──────────────────────────┬──────────────────────┘
                │ Internal RPC & Events    │ Job Dispatch          
┌───────────────┴──────────────┐   ┌───────┴─────────────────────┐
│ Runtime Services              │   │ Data & State Layer          │
│ (`services/`, `containers/`)  │   │ PostgreSQL • Redis (opt)    │
│  • Container lifecycle (Docker/K8s) │ Migrations (`migrations/`) │
│  • AI agent tools (`sdk/`)    │   │ Shared schemas (`shared/`)  │
│  • File system sync           │   │                             │
└───────────────────────────────┘   └─────────────────────────────┘
```

## Client Layer

- **Framework:** React 18 with Vite for fast refresh and bundle splitting.
- **UI Toolkit:** Tailwind CSS, Radix primitives, and custom shadcn components defined under `client/src/components/`.
- **Collaboration:** `yjs`, `y-webrtc`, and `socket.io` power real-time presence and shared editing.
- **AI Integrations:** Calls to OpenAI, Anthropic, and Google GenAI are orchestrated via the shared SDK in `sdk/`.

## Control Plane (Server)

- **Entry Point:** `server/index.ts` boots the Express application, applies security middleware, and sets up the Vite development server or static asset handler for production.
- **Routing:** `server/routes/` defines modular routers for authentication, project management, AI workflows, and health checks.
- **Middleware:** Security, rate limiting, and CDN optimization live in `server/middleware/` and are applied globally.
- **Monitoring:** `server/services/monitoring` integrates structured logging and metrics publishing (extendable to Datadog or GCP Cloud Monitoring).

## Runtime Services

- **Container Orchestration:** Scripts and helpers under `containers/` and `services/runtime/` interface with Docker/Kubernetes to allocate isolated sandboxes.
- **Language Runtimes:** Go and Python helpers (`Dockerfile.go-runtime`, `Dockerfile.python-ml`) provide polyglot execution environments accessible via reverse proxies.
- **AI Tooling:** The `sdk/` directory contains reusable clients for AI providers, prompt templates, and tool definitions consumed by the workspace assistant.

## Data & Persistence

- **Database:** PostgreSQL schema managed by Drizzle ORM migrations in `migrations/` with TypeScript models in `shared/db/`.
- **Sessions:** `express-session` backed by PostgreSQL or Redis (configurable).
- **File Storage:** Integrations with Google Cloud Storage (`@google-cloud/storage`) and local disk options for development.
- **Operational tooling:** The MCP PostgreSQL endpoints (`server/mcp/api/postgres.ts`) now proxy the production-grade `DatabaseManagementService`, returning live table statistics, schema metadata, query execution results, and backup details instead of mock responses.
- **Source control automation:** The GitHub MCP routes (`server/mcp/api/github.ts`) invoke Octokit with the authenticated user's stored token to manage repositories, issues, and pull requests against GitHub's live API surface.
- **Context memory:** The Memory MCP routes (`server/mcp/api/memory.ts`) persist knowledge graph nodes, edges, and conversation history through the shared PostgreSQL schema for durable semantic search.

## Security Considerations

- HTTP security headers, sanitization, and request logging enforced by `server/middleware/security`.
- Rate limiting via `server/middleware/rate-limiter` separates auth, API, and static asset budgets.
- SSO readiness using `openid-client` and `samlify`; feature flags control exposure.

## Deployment Model

- **Single-Port Service:** Default deployment exposes port 5000 for both API and web assets, suitable for Replit-like hosting environments.
- **Scripts:** `deploy-production.sh`, `deploy-to-gke.sh`, and Cloud Build configurations provide reference automation paths.
- **Infrastructure Targets:** Compatible with Cloud Run, Kubernetes, or VM-based hosts—see `docs/operations/deployment-playbook.md`.

## Observability

- Application logs follow JSON structure for easy ingestion by ELK or GCP Logging.
- Health endpoints under `/api/health` report database connectivity and runtime status.
- CDN optimization service (`server/services/cdn-optimization.ts`) manages cache headers and compression.

## Ownership & Next Steps

- Assign service owners per directory (e.g., **Client Guild** owns `client/`, **Platform Guild** owns `server/` & `services/`).
- Track roadmap gaps in `PLATFORM_COMPLETION_ROADMAP.md` and align with release objectives.
- Use this overview as the baseline when creating architecture decision records (ADRs) for major changes.
