# IDE Panel Router Inventory

Date: 2026-04-26
Scope: mounted IDE panels in `client/src/components/splits/SplitsEditorLayoutV2.tsx` plus primary router contracts used by the active IDE shell.

Validation command:

```bash
BASE_URL=http://127.0.0.1:5063 npx playwright test --config=playwright.local.config.ts test/e2e/api/panel-router-contracts.spec.ts --reporter=line
```

Latest result: PASS, 1/1.

## Inventory

| Panel | Frontend component | Router endpoints verified | Backend mount | State |
| --- | --- | --- | --- | --- |
| Files | `ReplitFileExplorer` | `GET /api/projects/:id/files`, `POST /api/projects/:id/files`, `PATCH /api/projects/:id/files/by-id/:fileId`, `DELETE /api/projects/:id/files/:path` | `server/routes/files.router.ts` on `/api/projects` | PASS |
| Editor autosave | `ProjectEditorPane` | `PATCH /api/projects/:id/files/by-id/:fileId` | `server/routes/files.router.ts` on `/api/projects` | PASS |
| Search | `ReplitSearchPanel` | `POST /api/search/global` | `server/routes/global-search.router.ts` on `/api/search` | PASS |
| Git | `ReplitGitPanel` | `GET /api/git/:id/status`, `/branches`, `/commits`, `/remotes`, `GET /api/git/github/status` | `server/routes/git-project.router.ts`, `server/routes/git.router.ts` on `/api/git` | PASS |
| Agent | `ReplitAgentPanelV3` | `POST /api/agent/conversation`, `GET /api/agent/conversation/:id/messages`, `POST /api/agent/chat/stream`, `GET /api/agent/tools/status` | `server/routes/agent.router.ts`, `server/api/ai-streaming.ts`, `server/routes/agent-tools.router.ts` | PASS for router contract; AI generation still depends on provider keys |
| Debugger | `ReplitDebuggerPanel` | `GET /api/debug/session/:id`, `POST /api/debug/start/:id`, pause/continue/step/breakpoint routes | `server/routes/debug.router.ts` on `/api/debug` | PASS |
| Testing | `ReplitTestingPanel` | `GET /api/workspace/projects/:id/tests/detect`, `/test-runs` | `server/routes/workspace.ts` on `/api/workspace` | PASS |
| Database | `ReplitDatabasePanel` | `GET /api/database/project/:id`, credentials/provision routes | `server/routes/database.router.ts` on `/api/database` | PASS for info route; credentials returns 404 until provisioned by design |
| Packages | `ReplitPackagesPanel` | `GET /api/packages/installed?projectId=:id`, `/:id/audit`, `/:id/outdated`, `/:id/dependencies` | `server/routes/packages.router.ts` on `/api/packages` | PASS |
| History | `ReplitHistoryPanel` | `GET /api/projects/:id/checkpoints`, `/files-with-history`, `/files/:fileId/history` | `server/routes/unified-checkpoints.router.ts`, `server/routes/files.router.ts` | PASS |
| Secrets | `ReplitSecretsPanel` | `GET /api/env-vars/:id`, create/update/delete/reveal/import/export routes | `server/routes/env-vars.router.ts` on `/api/env-vars` | PASS |
| Settings | `ReplitSettingsPanel` | `GET /api/projects/:id/settings`, `GET /api/notifications/settings`, PUT routes | `server/routes/settings.router.ts`, `server/routes/notifications.ts` | PASS |
| Terminal | `ReplitTerminalPanel` | `POST /api/shell/:id/shell/create`, WebSocket `/shell` | `server/routes/shell.router.ts` mounted on `/api/shell` and `/api/projects`; central WS dispatcher | PASS |
| Output | `ReplitOutputPanel` | `GET /api/workspace/projects/:id/build-logs`, `DELETE /api/workspace/projects/:id/build-logs`, WebSocket `/api/build-logs/ws` | `server/routes/workspace.ts`, log WS service | PASS for HTTP router |
| Problems | `ReplitProblemsPanel` | `GET /api/workspace/projects/:id/diagnostics` | `server/routes/workspace.ts` on `/api/workspace` | PASS |
| Preview | `ResponsiveWebPreview` | `GET /api/preview/url?projectId=:id`, `GET /api/preview/projects/:id/preview/status`, `POST /api/preview/projects/:id/preview/start`, WebSocket `/ws/preview` | `server/routes/preview.ts`, preview WS dispatcher | PASS |

## Root Causes Fixed

| Broken surface | Cause | Fix |
| --- | --- | --- |
| History file versions | `GET /api/projects/:projectId/files/*` captured `GET /files/:fileId/history` before the history route. | Wildcard file GET now delegates `:fileId/history` to the dedicated history route. |
| Search panel | `/api/search/global` required `projectId` as string only and ignored the panel's `searchType` field. Zod validation escaped as 500. | Search schema coerces `projectId`, accepts `searchType`, and returns 400 for invalid payloads instead of 500. |
| Terminal panel | Mounted terminal clients called `/api/shell/:projectId/shell/create`, but only `/api/projects/:projectId/shell/create` was registered. | Project shell router is mounted under both `/api/projects` and `/api/shell` for compatibility. |
| Files by-id delete | `DELETE /api/projects/:projectId/files/*` captured `/files/by-id/:fileId`. | Wildcard delete delegates `by-id/*` to the dedicated by-id route. |
| Template static routes | `GET /api/templates/:id` captured `/categories`, `/collections`, `/suggestions`. | Reserved static segments delegate to their dedicated routes. |
| Project public slug route | `GET /api/projects/:projectId` captured `/u/:username/:slug`. | Reserved `u` segment delegates to the slug route. |
| Agent tools status | Router read `req.app.locals.storage`, but `MainRouter` did not publish storage. | `MainRouter.registerRoutes` now assigns `app.locals.storage`. |

## Remaining Production Notes

- This inventory verifies router availability and HTTP contracts for the mounted IDE panels.
- It does not certify AI generation quality, external provider credentials, or production deployment secrets.
- `npm run lint` still exits 0 with existing warnings; strict zero-warning certification remains blocked separately.
