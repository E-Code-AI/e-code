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

## Mobile native shipping integration

Branch: `parallel/06-mobile-shipping`

The shipping kit is implemented only in assigned paths: `apps/mobile/ios/**`, `apps/mobile/android/**`, `fastlane/**`, and `store-assets/**`. The active mobile projects in this repository appear to live in root `ios/**` and `android/**`, while React Native logic is owned by the other agent under `apps/mobile/src/**`. The mobile owner must merge:

- iOS `Info.plist`, entitlements, associated domains, launch storyboard, push/keychain/app-group capabilities into the active iOS target.
- Android manifest permissions, deep links, FCM service declaration, splash resources, and ProGuard rules into the active Android target.
- Push token registration, notification preferences, widgets, share extension, biometrics, and offline queue from the RN/native logic layer.
- Final device screenshots and preview videos generated from signed builds into `store-assets/**`; I did not fabricate store screenshots because Apple/Google require captures matching the actual native UI.
