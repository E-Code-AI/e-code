# E-code Production Certification

Date: 2026-04-26
Branch: `main`
Certification source: `docs/SURFACE-MAP.md`
Panel router inventory: `docs/PANEL-ROUTER-INVENTORY.md`

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
