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

## Template endpoints in main API

The templates catalog branch provides `templates/catalog-server` with real `GET /templates` filtering. The required `POST /projects/from-template` must write Cloud SQL project rows, copy files into `ecode-projects-files`, create Secret Manager entries, and spawn a Cloud Run preview. Those integrations live in backend/API and runner zones owned by the other agent, so the endpoint is marked `COORDINATION_REQUIRED` in the standalone catalog server until the API owner exposes the project creation contract.

## Create-flow router integration

Branch: `parallel/03-create-flow`

The project creation experience is implemented under the owned `apps/web/src/create`, `apps/web/src/templates`, and `apps/web/src/onboarding` paths. The active web shell in this repository is currently under `client/src/**`, which is outside my ownership. The frontend/workbench owner must wire:

- `/new` to `NewProjectPage`.
- `/new/ai` to the AI generator handoff from chantier 4.
- Header `+ New`, command palette `project.new`, and Cmd+N to `createProjectCommands`.
- Backend endpoints `/api/templates`, `/api/templates/:id`, `/api/projects/imports/git/detect`, `/api/projects/from-template`, `/api/projects/boot/:id/events`, and `/api/projects/:id/fork` to the API owner if they are not already mounted in the Fastify service.
