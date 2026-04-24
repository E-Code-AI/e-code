# IDE Test Report

Date: 2026-04-24

## Runtime Status

- Full application startup command: `NODE_ENV=development DOTENV_CONFIG_PATH=.env node -r dotenv/config --import tsx server/index.ts`
  Result: `FAIL`

- Manual full-application browser verification: `FAIL`
  Reason: sandbox blocks local listeners entirely. The app cannot bind `0.0.0.0:3000` or Vite/HMR port `24678`, so a real browser session is not possible in this environment.

- Browser automation availability: `FAIL`
  Reason: `browser-use` is not installed in this workspace, so browser automation fallback is unavailable.

- Backend bootstrap before failure: `PARTIAL`
  Result: app initialization advanced far enough to register routes and WebSocket services, but failed on port binding and also showed database/network `EPERM` and `ENOTFOUND` failures for Postgres/Redis-backed services.

## Startup Failures Observed

- Main HTTP server bind: `FAIL`
  Error: `listen EPERM: operation not permitted 0.0.0.0:3000`

- Preview/HMR listener bind: `FAIL`
  Error: `listen EPERM: operation not permitted 0.0.0.0:24678`

- Database-backed background services: `FAIL`
  Error class: `EPERM` on Postgres connections in this sandbox.

- Redis-backed services: `FAIL`
  Error class: `ENOTFOUND` / connection closed for configured Redis host in this sandbox.

## Manual Test Matrix

- Prompt-to-app generation
  Render: `FAIL`
  Backend connection: `PARTIAL`
  User interaction: `FAIL`
  Notes: startup reaches `/api/workspace/bootstrap` registration, and scaffold generation is covered by tests, but no browser session could be opened because the app never bound a reachable port.

- Preview panel
  Render: `FAIL`
  Backend connection: `PARTIAL`
  User interaction: `FAIL`
  Notes: preview routes and `/ws/preview` registered, preview component wiring is fixed, automated iframe/autostart tests pass, but no live iframe/HMR test was possible because ports `3000` and `24678` cannot bind here.

- Terminal / shell
  Render: `FAIL`
  Backend connection: `PARTIAL`
  User interaction: `FAIL`
  Notes: `/shell` and `/api/terminal/ws` registered, PTY message handling is fixed and covered by tests, but no live terminal session could be opened without a running browser app.

- Code editor
  Render: `FAIL`
  Backend connection: `PARTIAL`
  User interaction: `FAIL`
  Notes: mounted desktop editor path now saves through real file APIs, but no manual Monaco/session validation was possible because the frontend could not start.

- File explorer
  Render: `FAIL`
  Backend connection: `PARTIAL`
  User interaction: `FAIL`
  Notes: real explorer wiring is in place and CRUD routes pass automated tests, but no manual tree rendering or drag/drop verification was possible.

- Console / output logs
  Render: `FAIL`
  Backend connection: `PARTIAL`
  User interaction: `FAIL`
  Notes: runtime/server log websocket services registered at `/api/runtime/logs/ws` and `/api/server/logs/ws`, but no manual panel validation was possible.

- Package manager panel
  Render: `FAIL`
  Backend connection: `FAIL`
  User interaction: `FAIL`
  Notes: no browser runtime; package-related backend behavior also depends on sandbox-limited process/network capabilities.

- Git integration
  Render: `FAIL`
  Backend connection: `PARTIAL`
  User interaction: `FAIL`
  Notes: no browser runtime to validate panel interactions.

- Collaboration features
  Render: `FAIL`
  Backend connection: `PARTIAL`
  User interaction: `FAIL`
  Notes: collaboration websocket endpoints registered at `/collaboration`, `/ws/collaboration`, and `/ws/yjs`, but no multi-client runtime test was possible.

- Debugger panel
  Render: `FAIL`
  Backend connection: `PARTIAL`
  User interaction: `FAIL`
  Notes: `/ws/debugger` registered, but no browser/runtime verification was possible.

- Checkpoints / history panels
  Render: `FAIL`
  Backend connection: `PARTIAL`
  User interaction: `FAIL`
  Notes: `/ws/checkpoints` registered, but browser verification was blocked.

## Automated Coverage Added

- `tests/speculative-scaffold.test.ts`
  Covers prompt-to-app scaffold generation and persistence into IDE storage.

- `tests/files-router.test.ts`
  Covers file create/list/update/delete through mounted `/api/projects/:projectId/files...` routes.

- `tests/shell-router.test.ts`
  Covers shell WebSocket message handling for PTY input, resize, and legacy raw writes.

- `tests/responsive-web-preview.test.tsx`
  Covers preview iframe rendering and preview autostart behavior.

## Automated Test Result

- Focused critical-path suite: `PASS`
  Command:
  `npx vitest run tests/speculative-scaffold.test.ts tests/files-router.test.ts tests/shell-router.test.ts tests/responsive-web-preview.test.tsx`
  Result: `4` test files passed, `7` tests passed.
