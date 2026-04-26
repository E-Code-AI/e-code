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

## Deployment API integration

Branch: `parallel/05-deploy`

The GCP deployer service, deploy UI module, and Terraform module are implemented in owned paths. The active API router is outside my ownership, so the backend owner must proxy or mount:

- `GET /api/deploy/projects/:projectId`
- `POST /api/deploy/releases`
- `GET /api/deploy/releases/:releaseId/logs`
- `POST /api/deploy/projects/:projectId/releases/:releaseId/promote`
- `POST /api/deploy/projects/:projectId/releases/:releaseId/rollback`
- `POST /api/deploy/projects/:projectId/domains/verify`

The frontend shell owner must wire the persistent Deploy button/header entry to `apps/web/src/deploy/DeployPanel` because the active header/workbench routes live outside assigned ownership.
