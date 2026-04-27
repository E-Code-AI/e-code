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

## Mobile native shipping integration

Branch: `parallel/06-mobile-shipping`

The shipping kit is implemented only in assigned paths: `apps/mobile/ios/**`, `apps/mobile/android/**`, `fastlane/**`, and `store-assets/**`. The active mobile projects in this repository appear to live in root `ios/**` and `android/**`, while React Native logic is owned by the other agent under `apps/mobile/src/**`. The mobile owner must merge:

- iOS `Info.plist`, entitlements, associated domains, launch storyboard, push/keychain/app-group capabilities into the active iOS target.
- Android manifest permissions, deep links, FCM service declaration, splash resources, and ProGuard rules into the active Android target.
- Push token registration, notification preferences, widgets, share extension, biometrics, and offline queue from the RN/native logic layer.
- Final device screenshots and preview videos generated from signed builds into `store-assets/**`; I did not fabricate store screenshots because Apple/Google require captures matching the actual native UI.
