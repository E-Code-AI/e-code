# E‑Code Platform

The E‑Code platform delivers a secure, enterprise-ready developer workspace that pairs AI-assisted coding with fully managed build and deployment pipelines. The project combines a modern React front end, an Express/Node.js control plane, and orchestration services for running containerized sandboxes.

## Why Engineering Teams Choose E‑Code

- **AI-accelerated workflow** – Integrations with OpenAI, Anthropic, and Google GenAI power inline code generation, refactoring, and automated reviews directly inside the IDE experience.
- **Enterprise-grade collaboration** – Shared projects, presence indicators, and multi-user terminals are built on top of WebSocket infrastructure with fine-grained access controls.
- **Managed runtime fabric** – Docker, Kubernetes, and PostgreSQL integrations simplify provisioning polyglot build environments, storage, and secrets management across teams.
- **Security and compliance focus** – Centralized session management, audit logging, SSO support, and rate-limiting middleware provide the guardrails required by regulated organizations.

## Product Experience

| Area | Highlights |
|------|------------|
| **Studio Workspace** | Monaco-powered editor, terminal integration, AI pair-programmer sidebar, and diff review tools.
| **Project Operations** | Template catalog, git import/export, environment variable management, one-click redeployments.
| **Team Management** | RBAC roles, invitation flows, usage analytics, billing hooks, and enterprise SSO readiness.
| **Observability** | Structured logging, real-time activity feeds, health checks, and CDN optimization middleware.
| **Data Tooling** | Live PostgreSQL explorer surfaces real tables, schema metadata, query execution results, and backup artefacts through the MCP endpoints.

### Workspace Tooling Parity

E‑Code now mirrors the full Replit workspace layout so onboarding teams can follow familiar workflows:

- **Main editor tabs** – Dedicated drawers for Debugger, Testing, History, and Secrets complement the existing editor, terminal, and AI panels.
- **Sidebar shortcuts** – Quick-launch entries for Packager, Object Storage, Secrets, Shell, and the new Threads collaboration view.
- **Right rail panels** – Spotlight Page configuration, Extensions marketplace, coverage insights, and persistent history all live alongside Preview, Assistant, Collaborate, and other productivity widgets.

Each surface is wired to the underlying React panels introduced in this release (`ThreadsPanel`, `CoverageInsightsPanel`, `SpotlightSettingsPanel`, and related workspace components), ensuring the documentation tour aligns with what users see in-product.

👉 **Request a guided demo:** Reach the product team at [hello@e-code.ai](mailto:hello@e-code.ai) to schedule a platform walkthrough tailored to your use case.

## Architecture at a Glance

- **Client (`client/`)** – React + Vite application using Tailwind CSS, Radix UI, and TanStack Query for state synchronization.
- **Server (`server/`)** – Express entry point (`server/index.ts`) orchestrating authentication, rate limiting, telemetry, and API routing.
- **Runtime Services (`services/`, `containers/`, `sdk/`)** – Worker processes for container lifecycle, AI agent tooling, and external provider integrations.
- **Database Layer (`migrations/`, `shared/db/`)** – Drizzle ORM schemas and migrations for PostgreSQL plus seeding utilities for local environments.

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
#   OPENAI_API_KEY=your-openai-key
#   ANTHROPIC_API_KEY=your-anthropic-key
#   GOOGLE_GENAI_API_KEY=optional-google-models

# ⚠️ If none of the AI provider keys are supplied on the server process, prompts sent from
# the workspace UI will fail silently. The frontend suppresses provider errors to avoid
# leaking implementation details, so always double-check that at least one of
# `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GOOGLE_GENAI_API_KEY` is configured before
# testing agent actions.
# ❗️The application requires a reachable PostgreSQL instance available at `DATABASE_URL`.
# It is used both by Drizzle for core data and by the `connect-pg-simple` session store.
# If the database is missing or unreachable, authentication and project creation flows will fail.

# Provision the database schema
npm run db:push

# Launch the full stack in development mode
npm run dev
```

During development, the server listens on `http://localhost:5000` and proxies frontend assets through Vite for hot module reloading. A seeded account (`testuser` / `testpass123`) is created automatically when running in development mode.

### Production Deployment Snapshot

The repository includes automation scripts for container-based deployments:

1. Export production secrets (`DATABASE_URL`, `SESSION_SECRET`, provider keys, storage credentials).
2. Build distributable bundles: `npm run build`.
3. Execute `./deploy-production.sh` to provision infrastructure, apply migrations, and start the Express server.
4. Configure HTTPS termination and desired port mappings (Cloud Run, Kubernetes, or VM-based targets).

For Google Cloud reference architectures and scaling strategies, see [`docs/operations/deployment-playbook.md`](docs/operations/deployment-playbook.md).

## Testing & Quality Gates

- `npm test` – Runs integration and smoke tests from `test/`, including the security middleware and AI UX feature suites.
- `npm test -- test/security.test.ts` – Filters execution to the security hardening scenarios using the lightweight harness.
- `npm test -- test/ai-ux-features.test.ts` – Focuses on AI UX feature flag coverage and environment overrides.
- `npm run typecheck` – Validates shared TypeScript contracts.
- `npm run typecheck:full` – Performs exhaustive client + server type validation (requires ~8 GB RAM).
- `npm run build` – Bundles the client and server for production deployments.

CI pipelines can be configured to require all commands above prior to merging changes.

## Documentation Index

- [`docs/getting-started.md`](docs/getting-started.md) – Extended onboarding, environment variables, and troubleshooting.
- [`docs/product-tour.md`](docs/product-tour.md) – Feature walkthroughs with UI entry points and workflow checklists.
- [`docs/architecture/overview.md`](docs/architecture/overview.md) – System diagrams, runtime topology, and module ownership.
- [`docs/operations/deployment-playbook.md`](docs/operations/deployment-playbook.md) – Deployment patterns, observability, and rollback procedures.

We update documentation alongside each release; please open an issue or contact [docs@e-code.ai](mailto:docs@e-code.ai) for questions or requests.
