# E-code Production Certification

Date: 2026-04-26
Branch: `main`
Certification source: `docs/SURFACE-MAP.md`
Panel router inventory: `docs/PANEL-ROUTER-INVENTORY.md`
Infrastructure contract: `docs/INFRASTRUCTURE-GCP.md`

## Current Verdict

STATUS: BLOCKED — internal validation in progress; production certification not yet complete.

The repository already contains a previous `READY` note, but the current certification standard requires exhaustive static and dynamic verification for every mapped backend route, frontend route, IDE panel, supported generation format, external integration, hardening check, robustness check, and deployment smoke.

## Phase Status

| Phase | Status | Notes |
| --- | --- | --- |
| A — Discovery & Mapping | DONE | `docs/SURFACE-MAP.md` generated from repository wiring. |
| B — Static Audit | PASS | Typecheck, lint zero-warning, build, and audit high pass. |
| C — Dynamic Verification | DONE FOR CORE IDE PANELS | Local DB bootstrap, migrations, boot, `/health`, `/health/readiness`, workspace-core smoke, router contracts, and systematic panel-suite runner are present. Full systematic panel matrix passes 92/92 across 23 panels and 4 viewports. |
| D — Generation Pipeline E2E | PENDING | Requires AI-provider key check; non-AI checks continue if keys are missing. |
| E — Backend Hardening | PENDING | Session restart, headers, logs, rate limits, idempotent migrations, seed. |
| F — Frontend Robustness | PENDING | Error boundary, loading states, persistence, conflicts, dark mode, shortcuts. |
| G — Deployment Smoke | PENDING | Build artifact, cold start, external health. |
| H — Certification | PENDING | Final matrix and verdict after all gates. |

## Surface Counts

| Surface | Count |
| --- | ---: |
| Backend routes | 1285 |
| Frontend routes/pages | 192 |
| IDE panels/workspace components | 95 |
| Template/format source files | 293 |
| External integration source files | 691 |

## Blockers

### Internal blockers

- Generation E2E specs are not yet implemented for every supported app format in `docs/SURFACE-MAP.md`.
- Exhaustive Playwright coverage is now green for core IDE panels in `test/e2e/panels/systematic-panels.spec.ts`: 23 panels × 4 viewports = 92/92 passing.
- Backend hardening, frontend robustness, and production deployment smoke are not yet fully green.

### External / environment blockers

- Production artifact boot requires real production configuration: HTTPS `APP_URL`, 32+ character secrets, durable storage backend (`STORAGE_BACKEND=replit` or S3 credentials), and production database credentials.
- Infrastructure target is GCP-only: GCS via `@google-cloud/storage`, Cloud Run services, Cloud Run Jobs, Cloud SQL Postgres, Secret Manager, Terraform under `infra/terraform/`, and Cloud Build. Existing S3/Replit-storage production paths are blockers until removed or hard-disabled for production.
- AI generation certification requires available provider keys for the formats/models under test. Current local boot only initialized the providers present in the local environment; missing provider keys must be supplied before claiming multi-provider production readiness.

## Next Gate

Phase B global gates:

- `npm run typecheck` — PASS
- `npm run lint` — PASS: 0 warnings
- `npm run build` — PASS
- `npm audit --audit-level=high` — PASS

Phase C current verified gates:

- `./scripts/setup-local-db.sh` — PASS; idempotent local Postgres bootstrap and Drizzle schema push.
- Dev boot — PASS on isolated port with Vite HMR fallback port selection.
- `/health` — PASS 200.
- `/health/readiness` — PASS 200 after startup readiness.
- `BASE_URL=http://127.0.0.1:5063 npx playwright test --config=playwright.local.config.ts test/e2e/panels/workspace-core.spec.ts --reporter=line` — PASS (1/1).
- `npm run test:e2e:panels -- --project=desktop-xl-1600 --reporter=line` — PASS (23/23).
- `npm run test:e2e:panels -- --grep "Preview panel|Deployment panel|Deploy Left Panel" --reporter=line` — PASS (12/12) after fixing deployment latest empty state, preview seed assets, and sandboxed iframe storage guards.
- `npm run test:e2e:panels -- --reporter=line` — PASS (92/92, 19.0m); boots an isolated dev server, waits for JSON readiness, disables Sentry for deterministic local runs, seeds one fresh project and one project with representative files, then runs systematic panel coverage over 4 viewport projects.
- Targeted systematic panel validations — PASS for Files, Terminal/Shell, Testing, Git, Agent, Actions, Preview, Output, Console, and Deployment after selector hardening and safe-button filtering.

Fixes made during Phase C:

- Aligned PostgreSQL session store with the Drizzle `sessions` table used by `express-session`.
- Added Vite HMR port fallback to avoid startup failure when `24678` is already occupied.
- Fixed `DELETE /api/projects/:projectId/files/by-id/:fileId` routing by allowing the specialized by-id route to bypass the wildcard file-path delete route.
- Fixed `GET /api/templates/categories`, `/collections`, and `/suggestions`: root cause was `GET /api/templates/:id` declared before static template routes.
- Fixed `GET /api/projects/u/:username/:slug`: root cause was `GET /api/projects/:projectId` declared before the public username/slug route.
- Fixed `GET /api/agent/tools/status`: root cause was routers reading `req.app.locals.storage` without `MainRouter` publishing the shared storage instance.
- Fixed mounted IDE panel router contracts: file history wildcard capture, search payload mismatch, and terminal shell mount mismatch.
- Added a local Playwright config and a workspace-core panel smoke spec.
- Added `test/e2e/api/router-contracts.spec.ts` to lock the router contracts above.
- Added `test/e2e/api/panel-router-contracts.spec.ts` and `docs/PANEL-ROUTER-INVENTORY.md`.
- Added `playwright.panels.config.ts`, `scripts/run-panel-playwright-systematic.sh`, `scripts/playwright-seed-panels.mjs`, and shared IDE test helpers for repeatable panel × viewport coverage.
- Fixed agent route mount ordering so `/api/agent/actions/:projectId` reaches the project actions router before autonomous session routes.
- Added stable test ids for split panes, split tabs, pane menus, and tool dock entries needed by deterministic panel coverage.
- Downgraded expected local WebSocket connection noise from `console.error` to `console.warn` so panel tests still fail on real UI errors without failing on optional socket unavailability.
- Fixed ShellPanel DOM nesting by replacing the tab close child `<button>` inside `TabsTrigger` with a non-nested accessible control.
- Added a localhost-only `PLAYWRIGHT_PANEL_E2E=true` rate-limit bypass and disabled Sentry in the panel runner so the panel matrix validates IDE behavior instead of external telemetry quota.
- Fixed `GET /api/projects/:projectId/deployment/latest` for new projects: no deployment is now a successful empty state instead of a console-noisy 404.
- Hardened proxied static preview asset serving so assets requested under `/preview/:projectId/:port/*` resolve to real files or 404 instead of falling back to HTML.
- Made the panel preview seed self-contained with inline CSS/JS so the systematic Preview panel validates frame loading without brittle starter-template asset references.
- Guarded IDE `sessionStorage` init in Playwright helpers so sandboxed preview frames cannot raise access-denied page errors.

Router validation:

- `BASE_URL=http://127.0.0.1:5063 npx playwright test --config=playwright.local.config.ts test/e2e/api/router-contracts.spec.ts test/e2e/panels/workspace-core.spec.ts --reporter=line` — PASS (4/4).
- `BASE_URL=http://127.0.0.1:5063 npx playwright test --config=playwright.local.config.ts test/e2e/api/panel-router-contracts.spec.ts --reporter=line` — PASS (1/1).
- Controlled dev boot on `127.0.0.1:5063` plus `router-contracts.spec.ts`, `panel-router-contracts.spec.ts`, and `workspace-core.spec.ts` — PASS (5/5).

## Multi-Model Proxy And Agent Orchestration Gate — 2026-04-27

Status: PARTIAL PRODUCTION GATE PASS for the multi-model proxy and local agent orchestration surfaces. This does not change the global platform verdict, which remains blocked until the remaining generation, hardening, robustness, and deployment gates above are complete.

Implemented:

- Unified model proxy at `/api/ai/proxy/models`, `/api/ai/proxy/chat`, and `/api/ai/proxy/chat/stream`.
- Normalized model registry for Claude Sonnet 4, Claude Opus 4.7, GPT-4o, Gemini 2.5 Flash/Pro, and Moonshot Kimi-compatible models.
- Normalized request schema for messages, tools/function declarations, vision-capable content parts, BYOK provider keys, fallback model chain, usage, token estimates, and request cost.
- Agent tool executor now resolves real project workspaces via `/tmp/projects/<projectId>` instead of the repository root.
- Agent tool aliases added for `write_file`, `edit`, `run_bash`, `search_codebase`, `grep`, `list_dir`, `web_fetch`, `run_tests`, `git_ops`, `package_install`, and `screenshot_preview`.
- Agent orchestration runner added with plan/act/observe/reflect steps, file-backed resume state, optional DB persistence into `agent_sessions` when `DATABASE_URL` is configured, pause/resume/stop/fork endpoints, and SSE state streaming.
- Acceptance smoke added: `pnpm run test:smoke:agent`.

Verified commands:

- `pnpm run test:smoke:agent` — PASS, agent added `/health`, wrote a test, ran `npm test`, and committed in an isolated generated project.
- `pnpm run test:smoke:agent && pnpm run test:smoke:agent` — PASS, repeated twice after unique workspace IDs were hardened.
- `pnpm test` — PASS (3 suites, 4 tests).
- `pnpm run build` — PASS (client, server bundle, runner bundle).
- `pnpm run typecheck` — PASS after final edits.
- `pnpm run lint` — PASS after final edits.
- `pnpm run test:smoke:backend` — PASS for critical health/auth/system endpoints.

Known limitations for this gate:

- Live provider calls still require real provider keys and quotas; the proxy is wired for BYOK/platform keys but was not certified against every third-party provider in this pass.
- `screenshot_preview` is exposed as an agent tool contract but delegates to the existing browser-testing API instead of taking screenshots directly inside `ToolExecutor`.
- The local deterministic runner currently certifies the `/health` route task path; arbitrary long-horizon LLM planning remains covered by existing agent planners and requires provider-key E2E.

## Front Web React Gate — 2026-04-27

Status: PARTIAL PRODUCTION GATE PASS for targeted workbench and IDE panel interaction hardening. This does not change the global platform verdict, which remains blocked until the remaining generation, hardening, robustness, Lighthouse, and deployment gates above are complete.

Implemented:

- `Split Right` now opens a real second editor group for the current or selected file and persists the split state per project/user layout.
- `Reveal in File Tree` now dispatches a real file-tree reveal event, expands parent folders, selects the file, and scrolls it into view.
- Security dependency auto-update no longer throws a placeholder error; it starts a real AI-agent workflow with package/version context and required validation instructions.
- Blocking `alert()` calls in front surfaces were replaced with non-blocking toast notifications.
- IDE/workbench source scan has no remaining `Coming soon`, `Not implemented`, or `alert()` hits in panel/workspace components; the only remaining `coming soon` text is in the marketing compare page demo-video copy.

Verified commands:

- `pnpm run typecheck` — PASS.
- `pnpm run lint` — PASS.
- `pnpm run test:e2e:panels --project=desktop-xl-1600 --reporter=line` — PASS (23/23).
- `pnpm run build` — PASS.

Known limitations for this gate:

- Full 4-viewport systematic panel matrix was not rerun in this pass; the previous certification run remains documented above as PASS 92/92.
- Lighthouse >90 for the main shell was not certified in this pass.

## Desktop Electron Gate — 2026-04-27

Status: PARTIAL PRODUCTION GATE PASS for the Electron desktop shell. This confirms the repository uses Electron, not Tauri. The global platform verdict remains blocked until signed/notarized release artifacts are produced with real certificates and installation/update E2E is run on macOS, Windows, and Linux.

Implemented:

- Electron main process now loads the shared local React bundle from `dist/public/index.html` when available, with an offline fallback page for local projects.
- Secure preload bridge added with explicit IPC surface and no renderer Node integration.
- Native local folder workflow added: open local folder, persist recent local projects, read/write files, read directories, and expose offline-first project metadata.
- Docker local runtime detection added through the native shell bridge.
- OS keychain-backed secret storage added via Electron `safeStorage`.
- Native menus completed for File, Edit, View, Run, Window, and Help, wired to React workbench commands.
- Tray icon added with quick actions for show, new project, open local folder, settings, and quit.
- Native notifications exposed to the React bundle.
- `ecode://open/<projectId>` deep link handling added with single-instance forwarding and CLI folder argument forwarding.
- `electron-updater` integrated, with update status/error streaming to the renderer.
- Electron Builder config now includes protocol registration, macOS DMG/ZIP, Windows NSIS, Linux AppImage/deb, publish metadata, macOS hardened runtime entitlements, and notarization hook.
- GitHub Actions desktop workflow now builds from the actual root Electron app on tag pushes across macOS, Windows, and Linux.

Verified commands:

- `node --check electron/main.js` — PASS.
- `node --check electron/preload.js` — PASS.
- `npm run desktop:smoke` — PASS.
- `npm run typecheck` — PASS.
- `npm run lint` — PASS.
- `npm run desktop:pack` — PASS on local macOS arm64 directory build; React/server bundles built and Electron app assembled. macOS notarization was skipped because Apple credentials are not configured locally.

Known limitations for this gate:

- Production macOS signing/notarization requires `MACOS_CERTIFICATE`, `MACOS_CERTIFICATE_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID` in GitHub secrets.
- Production Windows signing requires `WINDOWS_CERTIFICATE` and `WINDOWS_CERTIFICATE_PASSWORD` in GitHub secrets.
- Real installer E2E for `.dmg`, `.exe`, AppImage, and `.deb`, auto-update bump validation, cold start <2s measurement, and 1-hour leak test were not executed locally in this pass.

## Mobile iOS/Android Gate — 2026-04-27

Status: PARTIAL PRODUCTION GATE PASS for the existing Capacitor mobile client. The repository does not contain a React Native or Expo native client; the implemented mobile app is a Capacitor iOS/Android shell around the shared React app with native plugins. This does not satisfy a strict "no WebView" React Native requirement, so the global platform verdict remains blocked for that specific architecture request.

Implemented:

- Phone portrait navigation now exposes the requested primary tabs: Projects, Editor, AI, Terminal, and Settings.
- Phone landscape uses a split editor + secondary panel layout.
- Tablet uses a desktop-like multi-pane layout with activity bar, project browser, editor, and side panel.
- Device/orientation detection switches layouts at runtime on resize/orientation changes.
- Mobile Projects panel added with API-backed project listing, search, local favorites, and project creation.
- CodeMirror 6 mobile editor enhanced with a larger coding keybar, selection wrappers, `=>`, punctuation tokens, external keyboard shortcuts, long-press menu behavior, and pinch zoom.
- Mobile save path queues file updates offline through the existing IndexedDB offline sync queue.
- Native mobile runtime bridge initializes Capacitor Network, App deep links, and Push Notifications.
- iOS Info.plist and Android manifest expanded for camera, microphone, media/files, push notifications, deep links, orientation, and tablet resizing.

Verified commands:

- `npm run mobile:smoke` — PASS.
- `npm run typecheck` — PASS.
- `npm run lint` — PASS.
- `npm run mobile:build` — PASS; Vite build completed and `npx cap sync` updated iOS/Android with 10 Capacitor plugins.

Known limitations for this gate:

- This pass does not create a pure React Native app; converting away from Capacitor/WebView is a separate architecture migration.
- Physical device validation on iPhone, iPad, Android phone, and Android tablet was not executed locally.
- App Store / Play Store signing, provisioning profiles, TestFlight/Internal App Sharing, and push provider credentials remain environment-dependent.

## Hardening Gate — 2026-04-27 (afternoon)

Status: PARTIAL PRODUCTION GATE PASS for the code-generation surface, the
load-test contract, observability dashboard-as-code, and a mobile E2E
skeleton. This does not change the global platform verdict, which remains
blocked until staging+prod rollback drill, signing certs, prod readiness
green, a pure RN client (or accepted Capacitor coverage), and a third-party
pentest are completed.

Implemented (9 commits on `main`, `381f5058..86cdc425` after rebase onto
`d23e43e9`):

| commit       | scope                                             |
|--------------|---------------------------------------------------|
| `38385abf`   | dist/ rebuild — clean working tree                |
| `089c6c3a`   | k6 100-session release load test                  |
| `c105b49e`   | structured error codes + log redaction (gen)      |
| `47a22da1`   | Grafana production overview dashboard             |
| `1c20d113`   | Detox skeleton over Capacitor                     |
| `381f5058`   | streaming output guards (size + path safety)      |
| `ebdf1b87`   | retry-with-backoff for transient provider failures |
| `a13e17ca`   | route-level integration tests                     |
| `86cdc425`   | hoist redactErrorForLog to utils, sweep ProjectAI + auth |

Code-generation router (`/api/code-generation/*`) is now hardened on four
independent axes:

- **Structured errors.** All catch paths classify the error
  (`VALIDATION_FAILED | PROVIDER_TIMEOUT | PROVIDER_RATE_LIMIT |
  PROVIDER_UNAVAILABLE | PROVIDER_AUTH | GENERATION_FAILED`), set the right
  HTTP status, surface a user-safe message, and emit a `retryable` hint.
- **Output guards.** Streaming validators reject runaway output (>5 MB) and
  unsafe file paths (absolute, parent-traversal, control chars) mid-stream
  before the whole token budget is burned.
- **Retry-with-backoff.** Transient `429/503/timeout` responses retry up to
  3× with exponential backoff (1s base, factor 2, ±25% jitter). The
  invariant tested in unit *and* integration: retries only fire **before**
  the first chunk has been forwarded — once the client has consumed any
  output, retries are off and mid-stream errors propagate.
- **Log redaction.** `redactErrorForLog` hoisted to `server/utils/`, hard
  caps message at 200 chars, drops stack/cause/payload. Applied to the
  six `[ProjectAI]` catch handlers and the auth router's `sanitizeError`.

Test coverage added in this gate:

- `test/unit/code-generation-error-classifier.test.ts` — 11/11 PASS.
- `test/unit/code-generation-output-guards.test.ts` — 18/18 PASS.
- `test/unit/code-generation-retry.test.ts` — 9/9 PASS.
- `test/integration/code-generation.router.test.ts` — 8/8 PASS (mounts the
  real router with mocked AI provider + rate limiter, validates the full
  contract end-to-end through supertest).

Release artifacts added (not yet executed against prod):

- `test/load/sessions-100.k6.js` — 100-session load test, `npm run
  test:load:sessions`. Auth-optional via `USERS_FILE`. Thresholds enforce:
  `errors<1%`, `login p95<1.5s`, `projects p95<800ms`, `readiness
  p95<200ms`, `session p95<6s`. Documented in `test/load/README.md`.
- `observability/grafana/e-code-overview.json` — dashboard-as-code targeting
  the exact metric names emitted by `server/monitoring/prometheus.ts`. Five
  sections: traffic & errors, latency, process & runtime, AI/generation.
- `e2e-mobile/.detoxrc.js` + skeleton — Capacitor-aware Detox config.
  README explicitly documents that the pure-RN gate stays open by design.

Verified commands:

- `npm run test:file -- test/unit/code-generation-error-classifier.test.ts` — PASS (11/11).
- `npm run test:file -- test/unit/code-generation-output-guards.test.ts` — PASS (18/18).
- `npm run test:file -- test/unit/code-generation-retry.test.ts` — PASS (9/9).
- `npm run test:file -- test/integration/code-generation.router.test.ts` — PASS (8/8).
- `npx eslint` over all touched files — PASS, zero warnings.
- `node --check` over all new JS configs — PASS.

Known limitations for this gate:

- ~350 raw-error log sites elsewhere in `server/routes/` still pass full
  error objects to the logger. Tracked as a follow-up sweep.
- The k6 script is wired and runnable but has not yet been executed
  against a production-equivalent target.
- The Grafana dashboard JSON is shipped; no live Grafana instance has
  loaded it yet against the prod Prometheus datasource.
- The Detox skeleton runs `launch + WebView host probe` only. Real flow
  coverage requires `data-testid` hooks to land in the React shell first.

## Final Release Consolidation — 2026-04-27

Status: BLOCKED - NOT RELEASE-READY. Full release evidence is captured in `RELEASE_READY.md`.

Verified in the final pass:

- `npm run typecheck` — PASS.
- `npm run lint` — PASS.
- `npm run build` — PASS.
- `npm run test:unit -- --runInBand` — PASS.
- `npm run test:integration -- --runInBand` — PASS after correcting the diagnostics integration root and targeted TypeScript diagnostics behavior.
- `npm run test:smoke:backend` — PASS script exit, but local `/health/readiness` returned 503 while Redis/email/runner dependencies were not production-configured.
- `npm run test:smoke:agent` — PASS.
- `npm run desktop:smoke` — PASS.
- `npm run mobile:smoke` — PASS.
- `npm audit --audit-level=high` — PASS, 0 vulnerabilities.

Release blockers:

- Exact 20-scenario Playwright release suite was not fully re-run in this pass.
- Detox mobile suite is missing.
- Existing mobile architecture is Capacitor, not pure React Native.
- k6 100-session run was not executed locally against a production-equivalent target.
- Grafana/dashboard and external uptime monitoring were not validated.
- Full SSRF/RCE/SQLi/XSS/path-traversal/secret-leak pen test was not completed.
- Signed desktop/mobile artifacts, staging deployment, production deployment, and rollback were not observed.
