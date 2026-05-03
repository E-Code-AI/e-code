# Console Panel – Replit Parity Checklist

**Reference:** https://docs.replit.com/core-concepts/project-editor/editor-and-tools/console  
**Last updated:** May 2026

**Status Key:**  
✅ Implemented & tested | ⚠️ Partial / not yet tested | ❌ Not implemented | 🔜 Follow-up task

---

## Output Tab

| Feature | Status | Notes |
|---|---|---|
| Live stdout/stderr streaming via WebSocket | ✅ | Via `useRuntimeLogs` + `/api/runtime/logs/ws` |
| Filter by log type (All, Errors) | ✅ | Filter buttons in toolbar; `console-filter-*` testIds |
| Clear logs | ✅ | Toolbar button; clears state + WS accumulated buffer |
| Copy logs to clipboard | ✅ | Copies formatted log lines |
| Download logs as .txt | ✅ | ISO timestamp + type + message per line |
| Exit code display (green ✓ / red ✗) | ✅ | Shown when `isComplete && exitCode !== null` |
| Live indicator while running | ✅ | Animated pulse dot (green=connected, yellow=connecting) |
| Auto-scroll to latest output | ✅ | `autoScrollRef` tracks user scroll; restores on new output |

---

## Shell Tab — Core

| Feature | Status | Notes |
|---|---|---|
| xterm.js full TUI rendering | ✅ | `xterm@5.3` + `xterm-addon-fit` + `xterm-addon-web-links` |
| Interactive programs (vim, htop, nano, top, less) | ✅ | Native PTY passthrough via node-pty |
| ANSI color / bold / dim / underline support | ✅ | Built-in to xterm.js |
| Cursor positioning & movement (VT100/VT220) | ✅ | xterm.js handles all escape sequences |
| PTY resize on panel resize (SIGWINCH) | ✅ | `ResizeObserver` → `fitAddon.fit()` → `term.onResize` → `{type:'resize',cols,rows}` |
| PTY resize when switching sessions | ✅ | `useEffect([activeShellId])` calls `fitAddon.fit()` + `term.focus()` |
| Link detection — clickable URLs | ✅ | `xterm-addon-web-links` |
| Paste (Ctrl+V / right-click) | ✅ | xterm.js built-in paste handling |
| Ctrl+C passthrough | ✅ | xterm sends raw key codes to PTY |
| Ctrl+D / Ctrl+Z / Ctrl+L passthroughs | ✅ | All special keys forwarded to PTY |
| Standard keyboard shortcuts | ✅ | Handled natively by xterm.js + bash PTY |

---

## Shell Tab — Session Management

| Feature | Status | Notes |
|---|---|---|
| Multi-session tabs | ✅ | `+` button creates additional sessions |
| New shell (`+` button) | ✅ | `POST /api/shell/:projectId/shell/create` |
| Kill / close session (`×` on tab) | ✅ | Disposes xterm, destroys WS, removes from state |
| Switch between sessions (retain output) | ✅ | All containers rendered; inactive `display:none` |
| Session name display | ✅ | "Shell 1", "Shell 2", etc. |
| Per-session connection status indicator | ✅ | Colored dot (green/yellow/red) on each tab |

---

## Shell Tab — Connection Resilience

| Feature | Status | Notes |
|---|---|---|
| WebSocket auto-reconnect on transient disconnects | ✅ | `ResilientWebSocket` with exponential backoff + jitter |
| Connection status pill (connected/reconnecting/disconnected) | ✅ | `ConnectionPill` component in shell toolbar |
| Reconnect CTA banner when session is dead | ✅ | Floating bar with Reconnect + New Shell buttons |
| Reconnect toolbar button | ✅ | Calls `ws.forceReconnect()` |
| Circuit breaker (stops retrying after N failures) | ✅ | Built into `ResilientWebSocket` |
| Network offline detection + auto-retry when online | ✅ | `window.online/offline` events in `ResilientWebSocket` |

---

## Shell Tab — Search

| Feature | Status | Notes |
|---|---|---|
| In-terminal text search (find bar) | ✅ | `xterm-addon-search` + search bar UI |
| Open search with toolbar button | ✅ | `shell-search-toggle` button |
| Open search with Ctrl+F | ✅ | `attachCustomKeyEventHandler` intercepts Ctrl+F |
| Navigate results (prev / next) | ✅ | `ChevronUp` / `ChevronDown` buttons; Enter / Shift+Enter |
| Close search with Escape or × | ✅ | Escape key handler; close button |
| Search highlights matches in viewport | ✅ | `SearchAddon.findNext()` highlights in terminal |

---

## Shell Tab — AI Generate Command

| Feature | Status | Notes |
|---|---|---|
| AI generate command bar | ✅ | Triggered by "AI" toolbar button |
| Prompt input | ✅ | `shell-generate-input` |
| Generated command pasted into terminal | ✅ | `term.paste(data.command)` — no auto-execute |
| Recent command history sent as context | ✅ | Last 20 commands from localStorage sent to API |
| Cancel / dismiss generate bar | ✅ | Cancel button + Escape key |

---

## Shell Tab — Command History Persistence

| Feature | Status | Notes |
|---|---|---|
| Client-side command tracking via `onData` | ✅ | Input buffer tracks chars; saves on Enter |
| Duplicate suppression | ✅ | Consecutive duplicates not re-added |
| Max history cap | ✅ | 500 entries per project (`HISTORY_STORAGE_KEY`) |
| Persistence across page reloads | ✅ | Stored in `localStorage` keyed by project ID |
| Ctrl+C / Ctrl+U clears input buffer | ✅ | `0x03` / `0x15` detected in `onData` |
| History used as AI generation context | ✅ | Last 20 commands sent in generate request body |

---

## Shell Tab — Theming

| Feature | Status | Notes |
|---|---|---|
| Dark/light theme support at init | ✅ | `getTerminalTheme()` reads CSS custom properties |
| Live theme switching without refresh | 🔜 | Follow-up task #79 |

---

## Architecture / Canonicalization

| Component | Status | Notes |
|---|---|---|
| `ConsolePanel.tsx` shell tab — xterm.js | ✅ | Canonical for project console bottom panel |
| `ReplitTerminalPanel` — xterm.js | ✅ | Canonical IDE terminal tool pane (unchanged) |
| `AdvancedTerminal` — removed | ✅ | Deleted |
| `ResponsiveTerminal` — removed | ✅ | Deleted |
| `LazyAdvancedTerminal` export — removed | ✅ | Removed from `LazyTerminal.tsx` |
| `MobileTerminal` | ✅ | Kept — mobile keyboard toolbar (real use case) |
| `ShellPanel` (socket.io) | ⚠️ | Still used in `SplitsEditorLayout` shell tool — migration: task #78 |
| `ReplitTerminal` | ⚠️ | Still used in `SplitsEditorLayout` terminal tab — migration: task #78 |

---

## Manual QA Results (May 2026)

| Test | Result |
|---|---|
| Open shell tab → xterm renders | ✅ PASS |
| `echo hello` → output appears in terminal | ✅ PASS |
| `ls -la` → colored directory listing | ✅ PASS |
| `node -v` → Node version printed | ✅ PASS |
| `vim` → full screen TUI opens | ✅ PASS |
| Resize panel → PTY SIGWINCH sent, reflow correct | ✅ PASS |
| `+` button → second shell tab opens | ✅ PASS |
| Switch sessions → each retains its output | ✅ PASS |
| Close session × → tab removed, other session active | ✅ PASS |
| Force disconnect → reconnecting pill shown | ✅ PASS |
| Ctrl+F → search bar opens | ✅ PASS |
| Search `echo` → highlighted matches | ✅ PASS |
| AI generate → command pasted, not auto-executed | ✅ PASS |
| Type `echo test` + Enter → localStorage history updated | ✅ PASS |
| Reload page → localStorage history preserved | ✅ PASS |
| Output tab: filter by Errors | ✅ PASS |
| Output tab: Clear / Copy / Download | ✅ PASS |

---

## Known Gaps (Follow-up Tasks)

| Gap | Task |
|---|---|
| Live terminal theme switching | #79 |
| Migrate SplitsEditorLayout to canonical xterm stack | #78 |
| Download terminal buffer as file | — |
