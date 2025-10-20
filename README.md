# E‑Code Platform

The E‑Code platform delivers a secure, enterprise-ready developer workspace that pairs AI-assisted coding with fully managed build and deployment pipelines. The project combines a modern React front end, an Express/Node.js control plane, and polyglot orchestration services for running containerized sandboxes.

## Why Engineering Teams Choose E‑Code

- **AI-accelerated workflow** – Integrations with Anthropic Claude, OpenAI, Together AI, Replicate, Hugging Face, Groq, and Anyscale power inline code generation, refactoring, and automated reviews directly inside the IDE experience.
- **Enterprise-grade collaboration** – Shared projects, presence indicators, and multi-user terminals are built on top of WebSocket infrastructure with fine-grained access controls.
- **Managed runtime fabric** – Docker, Kubernetes, and PostgreSQL integrations simplify provisioning polyglot build environments, storage, and secrets management across teams.
- **Security and compliance focus** – Centralized session management, audit logging, SSO support (7 OAuth providers), hardware security key support, and rate-limiting middleware provide the guardrails required by regulated organizations.
- **Fortune 500-grade UI/UX** – Mobile-responsive dashboard with professional-grade design patterns optimized for all devices from mobile phones to 4K desktop monitors.

## Product Experience

| Area | Highlights |
|------|------------|
| **Studio Workspace** | Monaco-powered editor, terminal integration, AI pair-programmer sidebar, and diff review tools.
| **Project Operations** | Template catalog, git import/export, environment variable management, one-click redeployments.
| **Team Management** | RBAC roles, invitation flows, usage analytics, billing hooks, and enterprise SSO readiness (GitHub, GitLab, Bitbucket, Discord, Slack, Azure AD).
| **Observability** | Structured logging, real-time activity feeds, health checks, and production monitoring with memory thresholds.
| **Data Tooling** | Live PostgreSQL explorer surfaces real tables, schema metadata, query execution results, and backup artefacts through the MCP endpoints.
| **Source Control** | GitHub MCP routes now call the live Octokit client with per-user tokens for repository, issue, and pull request management.
| **Knowledge Management** | Memory MCP APIs persist knowledge graph nodes, edges, and conversations in PostgreSQL for searchable workspace context.
| **Responsive Dashboard** | Fortune 500-grade mobile-first design with adaptive layouts (1/2/3/4 column grids), horizontal scrolling filters, and optimized list views.

### Workspace Tooling Parity

E‑Code now mirrors the full Replit workspace layout so onboarding teams can follow familiar workflows:

- **Main editor tabs** – Dedicated drawers for Debugger, Testing, History, and Secrets complement the existing editor, terminal, and AI panels.
- **Sidebar shortcuts** – Quick-launch entries for Packager, Object Storage, Secrets, Shell, and the new Threads collaboration view.
- **Right rail panels** – Spotlight Page configuration, Extensions marketplace, coverage insights, and persistent history all live alongside Preview, Assistant, Collaborate, and other productivity widgets.

Each surface is wired to the underlying React panels introduced in this release (`ThreadsPanel`, `CoverageInsightsPanel`, `SpotlightSettingsPanel`, and related workspace components), ensuring the documentation tour aligns with what users see in-product.

👉 **Request a guided demo:** Reach the product team at [hello@e-code.ai](mailto:hello@e-code.ai) to schedule a platform walkthrough tailored to your use case.

## Architecture at a Glance

### Polyglot Backend Services

The platform employs a distributed architecture across 4 core services:

- **TypeScript Core (Port 5000)** – Express server managing Web API, user authentication, database operations, and frontend serving.
- **MCP Server (Port 3200)** – Model Context Protocol integration for AI Agent operations and tool orchestration.
- **Go Runtime Service (Port 8080)** – Container orchestration, file operations, and WebSocket real-time services.
- **Python ML Service (Port 8081)** – AI/ML workloads and model inference.

### Frontend & Data Layer

- **Client (`client/`)** – React + Vite application using Tailwind CSS, Radix UI (shadcn/ui), wouter routing, and TanStack Query for state synchronization.
- **Server (`server/`)** – Express entry point (`server/index.ts`) orchestrating authentication, rate limiting, telemetry, and API routing.
- **Runtime Services (`services/`, `containers/`, `sdk/`)** – Worker processes for container lifecycle, AI agent tooling, and external provider integrations.
- **Database Layer (`migrations/`, `shared/db/`)** – Drizzle ORM schemas and migrations for PostgreSQL (111 tables) plus seeding utilities for local environments.

A deeper breakdown of components, data flow, and security architecture is available in [`docs/architecture/overview.md`](docs/architecture/overview.md).

## Getting Started

### Prerequisites

- Node.js 18+
- npm 10+
- PostgreSQL 15 (local instance or managed service)
- Docker Desktop (optional, required for local container orchestration features)

### Local Development Workflow

```bash
# Clone and install dependencies
git clone https://github.com/E-Code-AI/e-code.git
cd e-code
npm install

# Copy environment template and configure secrets
cp .env.production.example .env
# Populate the following minimum variables:
#   DATABASE_URL=postgresql://user:pass@localhost:5432/ecode_dev
#   SESSION_SECRET=replace-with-random-string
#   JWT_SECRET=replace-with-random-string
#   JWT_REFRESH_SECRET=replace-with-random-string
#   OPENAI_API_KEY=your-openai-key (optional)
#   ANTHROPIC_API_KEY=your-anthropic-key (optional)

# ⚠️ If none of the AI provider keys are supplied on the server process, prompts sent from
# the workspace UI will fail silently. The frontend suppresses provider errors to avoid
# leaking implementation details, so always double-check that at least one of
# `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` is configured before
# testing agent actions.
# ❗️The application requires a reachable PostgreSQL instance available at `DATABASE_URL`.
# It is used both by Drizzle for core data and by the `connect-pg-simple` session store.
# If the database is missing or unreachable, authentication and project creation flows will fail.

# Provision the database schema
npm run db:push

# Launch the full stack in development mode
npm run dev
```

During development, the server listens on `http://localhost:5000` and proxies frontend assets through Vite for hot module reloading. A seeded admin account (`admin` / `admin`) is created automatically when running in development mode.

### Production Deployment on Replit Reserved VM

The platform is **optimized exclusively for Replit Reserved VM deployment** with dedicated computing resources:

1. Configure environment secrets in Replit:
   - `DATABASE_URL` (PostgreSQL connection string)
   - `SESSION_SECRET` (session encryption key)
   - `JWT_SECRET` (JWT token signing key)
   - `JWT_REFRESH_SECRET` (JWT refresh token key)
   - `OPENAI_API_KEY` (optional, for OpenAI models)
   - `ANTHROPIC_API_KEY` (optional, for Claude models)

2. Build distributable bundles: `npm run build`

3. The `.replit` file is configured with:
   - `deploymentTarget = "cloudrun"` for Reserved VM deployment
   - 4-port configuration mapping:
     - Port 5000 → Express/TypeScript core
     - Port 3200 → MCP server
     - Port 8080 → Go runtime service
     - Port 8081 → Python ML service

4. Deployment automatically handles:
   - HTTPS/TLS termination
   - CDN optimization (via Replit's built-in CDN)
   - Redis caching
   - Multi-tier rate limiting
   - Database connection pooling
   - Performance monitoring (95% memory threshold, 5-minute intervals)

For detailed deployment configuration, see [`docs/operations/deployment-playbook.md`](docs/operations/deployment-playbook.md).

## AI Provider Support

The platform supports multiple AI providers for flexibility and redundancy:

- **Anthropic Claude** – Claude 3.5 Sonnet, Claude 3 Opus/Haiku
- **OpenAI** – GPT-4, GPT-3.5 Turbo, and newer models
- **Together AI** – Open-source model hosting
- **Replicate** – On-demand model inference
- **Hugging Face** – Inference API for custom models
- **Groq** – High-performance inference
- **Anyscale** – Scalable AI workloads

Configure provider API keys via environment variables. The platform automatically falls back to available providers if one is unavailable.

## Storage & Infrastructure

- **Database**: PostgreSQL with Drizzle ORM (111 tables)
- **Object Storage**: Replit's built-in Object Storage service
- **Caching**: Redis/ioredis for session and application caching
- **CDN**: Replit's built-in CDN for asset delivery
- **WebSockets**: Real-time collaboration and live updates
- **Containers**: Docker for isolated execution environments

## Testing & Quality Gates

- `npm test` – Runs integration and smoke tests from `test/`, including the security middleware and AI UX feature suites.
- `npm test -- test/security.test.ts` – Filters execution to the security hardening scenarios using the lightweight harness.
- `npm test -- test/ai-ux-features.test.ts` – Focuses on AI UX feature flag coverage and environment overrides.
- `npm run typecheck` – Validates shared TypeScript contracts.
- `npm run typecheck:full` – Performs exhaustive client + server type validation (requires ~8 GB RAM).
- `npm run build` – Bundles the client and server for production deployments.

CI pipelines can be configured to require all commands above prior to merging changes.

## Security Features

- **Authentication**: JWT-based auth with refresh tokens, 7 OAuth providers (GitHub, GitLab, Bitbucket, Discord, Slack, Azure AD), hardware security key support
- **Session Management**: Secure session handling with `connect-pg-simple`
- **Rate Limiting**: Multi-tier rate limiting middleware
- **Audit Logs**: Comprehensive activity tracking
- **RBAC**: Role-based access control for team management
- **Secret Management**: Environment variable encryption and secure storage
- **CSP Headers**: Content Security Policy for XSS protection
- **Input Validation**: Zod-based schema validation for all API inputs

## Documentation Index

- [`docs/getting-started.md`](docs/getting-started.md) – Extended onboarding, environment variables, and troubleshooting.
- [`docs/product-tour.md`](docs/product-tour.md) – Feature walkthroughs with UI entry points and workflow checklists.
- [`docs/architecture/overview.md`](docs/architecture/overview.md) – System diagrams, runtime topology, and module ownership.
- [`docs/operations/deployment-playbook.md`](docs/operations/deployment-playbook.md) – Deployment patterns, observability, and rollback procedures.

We update documentation alongside each release; please open an issue or contact [docs@e-code.ai](mailto:docs@e-code.ai) for questions or requests.

## Recent Updates

**October 20, 2025:**
- **Google Cloud Platform Removal**: Migrated exclusively to Replit Reserved VM deployment. Removed all GCP dependencies including Google Cloud Storage (replaced with Replit Object Storage), Gemini AI provider, Google OAuth, and Google Drive MCP integration.
- **Dashboard Responsiveness**: Upgraded to Fortune 500-grade responsive design with adaptive layouts (1/2/3/4 column grids), mobile-optimized filter controls, and comprehensive test automation attributes.
- **AI Providers**: Platform now supports Anthropic Claude, OpenAI, Together AI, Replicate, Hugging Face, Groq, and Anyscale.

## License

Proprietary software. All rights reserved. Contact [legal@e-code.ai](mailto:legal@e-code.ai) for licensing inquiries.
