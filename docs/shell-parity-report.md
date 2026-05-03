# Shell Panel – Replit Parity Report

Reference: https://docs.replit.com/core-concepts/project-editor/editor-and-tools/shell

## Architecture

**Single source of truth**: `server/routes/shell.ts` exports `shellSessions` (Map\<string, ShellSession\>) and `destroySession()`. Both the raw WebSocket transport and the per-project REST API (`shell.router.ts`) operate on this shared Map. No Socket.IO session store, no separate PTY manager.

**Frontend**: `ReplitTerminalPanel` is the sole shell component; `ShellPanel` is a one-line re-export shim for backward compatibility.

---

## Parity Checklist

| # | Feature | Status | Implementation notes |
|---|---------|--------|----------------------|
| 1 | Real PTY shell (bash / sh) | ✅ PASS | `node-pty` spawns an interactive shell per session |
| 2 | Multi-tab sessions | ✅ PASS | `ShellTab[]` array; each tab has independent xterm, FitAddon, WebLinksAddon, and WebSocket |
| 3 | New tab / session | ✅ PASS | `+` button → `POST /api/shell/:projectId/shell/create` → server-issued ID |
| 4 | Close tab / session | ✅ PASS | ✕ button → `DELETE /api/shell/:projectId/shell/:id` → `destroySession()` |
| 5 | Session persistence across reload | ✅ PASS | Session IDs in `localStorage[ecode-shell-sessions-{projectId}]`. On reload: (a) fetch live session list from server, (b) reattach only valid IDs, (c) show toast + create new tab for each expired ID |
| 6 | Explicit reattach-or-fallback on reload | ✅ PASS | `initShell()` calls `GET /api/shell/:projectId/shell/sessions`, diffs against persisted IDs. Expired sessions get an explicit toast ("Shell session expired") and a new tab is created for each |
| 7 | Scrollback replay on reconnect | ✅ PASS | 5,000-chunk circular `ScrollbackBuffer`; entire buffer sent as first WS frame. Reconnect path does **not** add a new `onData` listener — single session-creation broadcaster handles all clients |
| 8 | Copy selection | ✅ PASS | `Copy` toolbar button → `term.getSelection()` to clipboard |
| 9 | Paste | ✅ PASS | `Paste` toolbar button → `navigator.clipboard.readText()` → PTY input |
| 10 | Clear terminal | ✅ PASS | `Clear` toolbar button → `term.clear()` (same as Ctrl+L) |
| 11 | Stop / interrupt (Ctrl+C) | ✅ PASS | `Stop` (■) toolbar button → `\x03` to PTY; keyboard Ctrl+C forwarded natively |
| 12 | EOF (Ctrl+D) | ✅ PASS | Forwarded via xterm raw input |
| 13 | Arrow-up/down command history | ✅ PASS | Forwarded via xterm; readline handles natively |
| 14 | Fullscreen | ✅ PASS | Toggle `fixed inset-0 z-50` CSS |
| 15 | PTY resize on panel resize | ✅ PASS | `ResizeObserver` + `window resize` → `fitAddon.fit()` → `{ type: 'resize' }` message → `pty.resize()` |
| 16 | Clickable URLs | ✅ PASS | `WebLinksAddon` on every xterm instance |
| 17 | Search in scrollback | ✅ PASS | `xterm-addon-search` wired to every `TerminalInstance`; `SearchAddon.findNext/findPrevious` with highlight decorations. Search bar has Prev (Shift+Enter) and Next (Enter / button) navigation. Escape clears decorations. |
| 18 | AI "Generate command" | ✅ PASS | Sparkles → prompt bar → `POST /api/shell/generate-command` (GPT-4.1-nano) → inserted into PTY input **without** `\r` (user presses Enter) |
| 19 | Download log | ✅ PASS | Button exports ANSI-stripped `outputBuffer` as `.log` file |
| 20 | Connection status badge | ✅ PASS | `connecting`/`reconnecting` → yellow; `connected` → green; `disconnected`/`failed`/`circuit_open` → grey ("Disconnected" — all represent "cannot receive data") |
| 21 | Auto-reconnect with backoff | ✅ PASS | `ResilientWebSocket` exponential backoff + jitter + circuit-breaker |
| 22 | Idle session cleanup | ✅ PASS | 10-minute idle timeout; 24-hour hard cap |
| 23 | Max sessions per user | ✅ PASS | `MAX_SESSIONS_PER_USER = 5` enforced before PTY spawn |
| 24 | Output rate limiting | ✅ PASS | 500 KB/s per session; excess frames dropped and counted |
| 25 | CPU scheduling priority | ✅ PASS | `process.setPriority(pid, 10)` applied after PTY spawn (lower scheduling priority) |
| 26 | Memory cap per session | ✅ PASS | 512 MB RSS limit; `/proc/{pid}/status` polled every 10 s; session destroyed + client notified if exceeded |
| 27 | Unified session store | ✅ PASS | `shellSessions` Map exported from `shell.ts`; `shell.router.ts` imports it — one Map, two consumers |
| 28 | Server-issued session IDs | ✅ PASS | Frontend `createSessionId()` returns null (explicit error) on failure — never generates a local ID |
| 29 | Session lifecycle metrics | ✅ PASS | `GET /api/shell/metrics`: activeSessions, totalCreated, totalDestroyed, totalBytesOut, totalReconnects, droppedFrames, peakRssBytes |
| 30 | Safe working directory | ✅ PASS | `safePath()` prevents path traversal; `getProjectWorkspacePath` resolves project dir |
| 31 | Theme-aware colors | ✅ PASS | `getTerminalTheme()` reads CSS custom properties; updates on theme change |
| 32 | Keyboard shortcuts | ✅ PASS | `attachCustomKeyEventHandler` intercepts: Ctrl+Shift+C (copy selection), Ctrl+Shift+V (paste), Ctrl+L (FF clear), Ctrl+D (EOF). Arrow keys, Tab, Ctrl+C forwarded natively via xterm → PTY. |
| 33 | Reset session | ✅ PASS | Distinct from Clear: tears down WS, **deletes old server session** (project-scoped DELETE before creating new one — prevents orphan PTY accumulation toward MAX_SESSIONS_PER_USER), creates fresh server session, calls `term.reset()` |

---

## Security Summary

| Control | Status |
|---------|--------|
| WS auth requires `SESSION_SECRET` env var | ✅ Returns null if unset — no weak default |
| Session ownership enforced on reconnect | ✅ `existingSession.userId !== userId` → close(1008) |
| Project access checked before WS upgrade | ✅ `storage.isProjectCollaborator` |
| Path traversal prevention | ✅ `safePath()` on all user-derived paths |
| Per-user session cap | ✅ Max 5 before PTY spawn |
| Rate limiting | ✅ 500 KB/s output, connection-level |

---

## E2E Test Coverage

Test script: `tests/shell/shell-e2e.ts`  
Run: `npx tsx tests/shell/shell-e2e.ts`

| Scenario | Test |
|----------|------|
| REST session create (server-issued ID) | T1 |
| WebSocket connect + initial output | T2 |
| Run command, receive output | T3 |
| Ctrl+C interrupt | T4 |
| Resize message accepted | T5 |
| List sessions from unified store | T6 |
| Reconnect with scrollback, no duplicate output | T7 |
| DELETE session removes from store | T8 |
| Metrics endpoint reflects state | T9 |

---

## Future Work

| Feature | Reason |
|---------|--------|
| Migrate to `@xterm/addon-search` | Current `xterm-addon-search` is deprecated; functionality is complete, migration is a package swap |
| Container / namespace isolation per session | Firecracker / Linux namespaces (infrastructure change) |
| Active session badge in IDE sidebar | Planned follow-up task #76 |
| cgroups-based CPU cap | Requires elevated privileges; current solution uses `nice` priority |
