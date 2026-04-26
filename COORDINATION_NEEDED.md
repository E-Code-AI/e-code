# Coordination Needed

Date: 2026-04-27
Branch: `parallel/01-design-system`

## Root workspace integration

The repository root is outside my assigned ownership matrix. To make `packages/ui` and `packages/storage` first-class workspace packages, the backend/platform owner must update root-level files:

- `package.json`: add workspace scripts for `packages/ui` and `packages/storage`, and decide whether root uses `npm` or `pnpm` as the canonical command runner.
- `pnpm-workspace.yaml` or equivalent workspace config: include `packages/*`, `apps/*`, and `services/*`.
- Root lint/typecheck/build config: include owned packages without including generated `dist/` artifacts.

## TanStack Table dependency

`packages/ui` is expected to expose a TanStack-powered table. The root repository does not currently install `@tanstack/react-table`, and root dependency files are outside my ownership. I implemented a typed sortable table primitive that builds without changing root dependencies; the frontend/workspace owner should approve adding `@tanstack/react-table` to the canonical workspace dependency set before replacing it with the TanStack implementation.

## Existing app migration to `@ecode/ui`

The requirement "Toutes les apps consomment packages/ui exclusivement, zero duplication" requires editing current app UI imports under paths outside my ownership, including `client/src/**` and likely future `apps/web/src/panels/**` / `apps/web/src/workbench/**`. This must be coordinated with the frontend/workbench owner.

## Storybook Cloud Run deployment

`packages/ui/Dockerfile.storybook` is present, but production deployment to `storybook.ecode.app` requires shared Cloud Run, DNS, CDN and Cloud Build wiring. If this must be centralized, the deployer/infra owner should expose the standard Cloud Run service module interface before I add the Storybook service instance.

## AI generator backend integration

Branch: `parallel/04-ai-generator`

The greenfield AI generator UI is implemented under the owned `apps/web/src/ai-generator/**` path. The real orchestration endpoints must be mounted by the backend/agent owner because `services/api/**`, `services/agent/**`, and model proxy code are outside my ownership:

- `POST /api/ai-generator/attachments/resumable-url`: create GCS resumable upload URL for `ecode-uploads`.
- `POST /api/ai-generator/generations`: start Claude Opus default generation with GPT-4o fallback and return a draft structured spec.
- `GET /api/ai-generator/generations/:id/events`: SSE stream for spec, stack, architecture, file deltas, Cloud Build logs, correction attempts, boot, ready, failed.
- `POST /api/ai-generator/generations/:id/approve`: approve edited spec/stack/architecture and start template-based code generation.
- `POST /api/ai-generator/generations/:id/iterations`: create a separate commit for an iterative prompt.
- `POST /api/ai-generator/generations/:id/undo`: revert the last AI-generated commit.

The page route `/new/ai` and command palette registration must also be wired by the frontend shell owner because the active router lives under `client/src/**`.
