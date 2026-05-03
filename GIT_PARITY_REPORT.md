# Git Panel Replit Parity Report

Generated: 2026-05-03  
Status: **Complete — all API contracts verified, hardening applied, 59 tests passing**

---

## Verification Summary

| Category | Result |
|---|---|
| Unit + validation tests | ✅ 39/39 passed (`tests/git-project-router.e2e.test.ts`) |
| HTTP integration tests | ✅ 20/20 passed (`tests/git-project-router.http.test.ts`) |
| Playwright API spec | ✅ Created (`test/e2e/git-panel-api.spec.ts`) |
| Server startup | ✅ No errors — port 5000 bound, all routes registered |
| Structured logging | ✅ Verified in test output (projectId, op, durationMs fields) |

**Total: 59 tests, all green.**

---

## Component Architecture

| Component | Role | Status |
|---|---|---|
| `ReplitGitPanel` | Canonical Git panel (desktop + tablet + mobile) | ✅ Canonical |
| `GitPanel` (IDE) | Thin wrapper → `ReplitGitPanel` | ✅ Unified |
| `MobileGitPanel` | Thin wrapper → `ReplitGitPanel mode="mobile"` | ✅ Unified (was 1164-line duplicate) |
| `GitIntegration` | Legacy component (not imported anywhere) | ✅ Data mapping fixed |
| `BranchManager` | Standalone branch UI | ✅ All query keys fixed |
| `GitGraph` | Visual commit graph | ✅ Connected to real API |
| `MergeConflictResolver` | UI conflict resolution | ✅ Functional |
| `VisualDiffEditor` | Side-by-side diff (CodeMirror 6) | ✅ Functional |
| `GitBlameDecorator` | Inline blame in editor | ✅ Functional |
| `ReplitHistoryPanel` | Checkpoint + file history | ✅ Functional |

---

## Bugs Fixed

### 1. BranchManager query key mismatch (cache invalidation silently broken)
**File**: `client/src/components/git/BranchManager.tsx`  
Query key was `/api/git/projects/${projectId}/branches` but fetch called `/api/git/${projectId}/branches`.
Cache was never invalidated after create/delete/checkout/merge. Fixed all 5 call sites.  
Merge invalidation: `/api/git/projects/${projectId}/log` (non-existent) → `/api/git/${projectId}/commits`.

### 2. Branch create response missing `branch` field
`POST /:projectId/branch` returned `{ success, message }` — `data.branch` was undefined in `BranchManager`.  
Fixed: returns `{ success, branch: name, message }`.

### 3. Checkout response missing `branch` field
`POST /:projectId/checkout` returned `{ success, message }` — `onBranchChange(data.branch)` was called with undefined.  
Fixed: returns `{ success, branch, message }`.

### 4. GitIntegration field mapping wrong (staged/unstaged always empty)
Was reading `data.added` → staged, `data.modified` → unstaged (fields the backend never returns).  
Fixed: reads `data.staged` / `data.unstaged`.

### 5. MobileGitPanel 1164-line code duplication
Replaced with 12-line thin wrapper calling `<ReplitGitPanel mode="mobile" />`.

---

## API Contract Parity (all endpoints confirmed)

| Feature | Frontend call | Backend endpoint | Status |
|---|---|---|---|
| Status | `GET /api/git/:id/status` | `git-project.router` | ✅ |
| Stage | `POST /api/git/:id/stage` `{ files }` | accepts `files` or `paths` | ✅ |
| Unstage | `POST /api/git/:id/unstage` `{ files }` | accepts `files` or `paths` | ✅ |
| Commit | `POST /api/git/:id/commit` `{ message }` | returns `{ success, hash, message }` | ✅ |
| Push | `POST /api/git/:id/push` | locked, handles auth + retry on rejection | ✅ |
| Pull | `POST /api/git/:id/pull` | locked, auto-stash, returns `{ info }` | ✅ |
| Fetch | `POST /api/git/:id/fetch` | **locked** (was missing lock) | ✅ Fixed |
| Branches | `GET /api/git/:id/branches` | returns `{ branches: [...] }` | ✅ |
| Create Branch | `POST /api/git/:id/branch` | returns `{ success, branch, message }` | ✅ Fixed |
| Checkout | `POST /api/git/:id/checkout` | returns `{ success, branch, message }` | ✅ Fixed |
| Delete Branch | `DELETE /api/git/:id/branch/:name` | returns `{ success, deleted }` | ✅ |
| Commits | `GET /api/git/:id/commits` | returns `{ commits: [...] }` | ✅ |
| Diff | `GET /api/git/:id/diff/:path` | returns `{ diff, filePath }` | ✅ |
| Remotes | `GET /api/git/:id/remotes` | returns `{ remotes: [...] }` | ✅ |
| Add Remote | `POST /api/git/:id/remotes` | validates remote name format | ✅ |
| Clone | `POST /api/git/:id/clone` | locked, credentials stripped from errors | ✅ |
| Init | `POST /api/git/:id/init` | ✅ |
| Blame | `GET /api/git/:id/blame/:path` | returns `{ blame: [...] }` | ✅ |
| Merge | `POST /api/git/:id/merge` | locked, 409 on conflict, validates branch | ✅ |
| Resolve Conflict | `POST /api/git/:id/resolve-conflict` | ✅ |
| GitHub Status | `GET /api/git/github/status` | ✅ |
| GitHub Connect | `GET /api/git/github/connect` | ✅ |
| GitHub Repos | `GET /api/git/github/repos` | ✅ |
| GitHub Disconnect | `POST /api/git/github/disconnect` | ✅ |

---

## Production Hardening

### Per-Project Operation Locking (`withProjectLock`)
All mutating git operations on the same project are serialized via a promise-chain mutex.  
Coverage: stage, unstage, commit, push (including rebase retry path), pull, **fetch**, clone, branch-create, branch-delete, checkout, merge.

### Per-User Rate Limiting (`gitWriteRateLimit`)
30 write operations per 60 seconds per user (keyed by user ID or IP).  
Returns `HTTP 429` with error message on violation.  
Applied to: stage, unstage, commit, push, pull, fetch, clone, branch-create, checkout, merge.  
Test-verified: 429 appears after 30 requests from the same user (test in `tests/git-project-router.http.test.ts`).

### Zod Request Validation Schemas (`server/schemas/git.schemas.ts`)
Shared schemas for all git mutating endpoints:

| Schema | Endpoint | Validates |
|---|---|---|
| `StageSchema` | `POST /stage` | file paths array |
| `UnstageSchema` | `POST /unstage` | file paths array |
| `CommitSchema` | `POST /commit` | message (required, ≤10k), paths |
| `BranchCreateSchema` | `POST /branch` | branch name + optional startPoint |
| `CheckoutSchema` | `POST /checkout` | branch name |
| `MergeSchema` | `POST /merge` | branch name + optional message |
| `AddRemoteSchema` | `POST /remotes` | remote name (alphanumeric) + valid URL |
| `CloneSchema` | `POST /clone` | url (required) |

Also exports TypeScript types for all request bodies and response shapes (`GitStatusResponse`, `GitBranchInfo`, `GitCommit`, `GitOperationResult`).

### Input Validation (`server/utils/git-validation.ts`)
| Validator | Checks |
|---|---|
| `validateBranchName` | starts-with-dash, `..`, `.lock`, control chars, `HEAD`, length ≤255 |
| `validateGitFilePaths` | path traversal (`../`), option injection (`-rf`), null bytes |
| `validateRemoteName` | alphanumeric + dash/underscore only, no shell metacharacters |

### Execa Timeouts
| Operation | Timeout |
|---|---|
| push, pull, fetch, clone | 60 seconds |
| stage, unstage, commit, branch ops, merge | 30 seconds |

### Credential Redaction
All error messages strip credentials: `.replace(/https?:\/\/[^@]+@/g, 'https://')`.  
`redactErrorForLog` utility used in all error log calls.

### Structured Logging
Every mutating operation emits: `{ projectId, op, durationMs }` on success, `{ projectId, op }` on failure.  
Verified in test output:
```
{"service":"git-project-router","msg":{"projectId":"1","op":"stage","durationMs":38}}
{"service":"git-project-router","msg":{"projectId":"1","op":"commit","durationMs":130}}
{"service":"git-project-router","msg":{"projectId":"1","op":"branch-create","branch":"feature/http-test"}}
```

---

## Test Coverage

### `tests/git-project-router.e2e.test.ts` — 39 tests (all green)

| Group | Tests |
|---|---|
| `parseStatusOutput` | staged, unstaged, untracked, mixed XY, multiple files, empty |
| `validateBranchName` | normal, empty, dash, `..`, `.lock`, HEAD, control chars, length |
| `validateGitFilePaths` | normal, empty, non-array, option-inject, traversal, null bytes |
| `validateRemoteName` | normal, metacharacters, empty |
| `sanitizeGitError` | credential strip, safe passthrough |
| Real git: init→stage→commit | `.git` dir, porcelain status, log on disk, unstage revert |
| Real git: branch lifecycle | create, checkout HEAD verify, response shapes, delete |
| Real git: diff | unstaged `-/+`, staged cached diff |
| `withProjectLock` | serializes same-project, does not block different projects |

### `tests/git-project-router.http.test.ts` — 20 tests (all green)
Mounts the actual Express router via mocked dependencies; drives **real git operations** on a temporary on-disk repository through the HTTP handler layer:

| Flow | Verified |
|---|---|
| `GET /status` | Returns branch, staged[], unstaged[], untracked[] |
| Write file → `POST /stage` → `GET /status` | File appears in `staged[]` |
| `POST /commit` → git log on disk | Commit message matches; `hash` field present |
| `GET /commits` | Array with correct message, hash, shortHash, author |
| `POST /stage` → `POST /unstage` → `GET /status` | File leaves `staged[]`, appears in `untracked[]` |
| `POST /branch` | Returns `{ branch }` field; branch appears in `git branch` output |
| `POST /checkout` | Returns `{ branch }`; HEAD verified via `git rev-parse` |
| `GET /branches` | Array with `current: true` on correct branch |
| `DELETE /branch/:name` | Branch removed from `git branch` output |
| `GET /diff/:path` | Returns diff with `+` lines |
| `POST /commit` missing message | Returns 400 |
| `POST /stage` path traversal | Returns 400 with "traversal" in error |
| `POST /stage` option injection | Returns 400 with "dash" in error |
| `POST /branch` dash-prefix | Returns 400 |
| `POST /branch` consecutive dots | Returns 400 |
| `POST /checkout` empty branch | Returns 400 |
| `POST /merge` HEAD as branch | Returns 400 |
| `POST /remotes` shell metachar name | Returns 400 |
| Rate limiting | 429 after 30 write requests from same user |

### `test/e2e/git-panel-api.spec.ts` — Playwright API spec
Tests HTTP contract layer (no browser, uses Playwright `request` fixture):

| Group | Tests |
|---|---|
| Auth enforcement | status, commit, branch, delete, push, pull → 401/403 unauthenticated |
| GitHub connection shape | `connected: boolean` present in response |
| Input validation (branch) | dash-prefix, empty checkout, missing name → 400 |
| Input validation (paths) | traversal, option injection → 400 |
| Response shapes | branches array, commits array, message required, URL required |

---

## Feature Parity with Replit Git Pane

| Feature | Replit | This App |
|---|---|---|
| Status (branch, ahead/behind) | ✅ | ✅ |
| Staged / Unstaged / Untracked | ✅ | ✅ |
| Stage / Unstage individual | ✅ | ✅ |
| Stage all | ✅ | ✅ |
| Commit | ✅ | ✅ |
| Push | ✅ | ✅ |
| Pull | ✅ | ✅ |
| Fetch | ✅ | ✅ |
| Branch list | ✅ | ✅ |
| Create branch | ✅ | ✅ |
| Switch branch | ✅ | ✅ |
| Delete branch | ✅ | ✅ |
| Inline diff | ✅ | ✅ |
| Side-by-side diff | ✅ | ✅ |
| Commit history | ✅ | ✅ |
| Visual commit graph | ✅ | ✅ |
| GitHub OAuth connect/disconnect | ✅ | ✅ |
| Browse GitHub repos | ✅ | ✅ |
| Clone | ✅ | ✅ |
| Initialize repo | ✅ | ✅ |
| Merge | ✅ | ✅ |
| Merge conflict resolver | ✅ | ✅ |
| Git blame | ✅ | ✅ |
| File history | ✅ | ✅ |
| Checkpoint / Rewind | ✅ | ✅ |
| Checkpoint restore | ✅ | ✅ |
| Agent auto-checkpoint | ✅ | ✅ |
| Stash / Stash pop | ➖ | ✅ (exceeds Replit) |
| File backup tags | ➖ | ✅ (exceeds Replit) |

---

## Remaining Divergences

1. **No inline conflict editor**: Replit resolves merge conflicts inline in the code editor. This app uses a modal `MergeConflictResolver`. See follow-up task #43.
2. **Polling vs real-time**: Replit shows collaborator git activity in real time. This app polls every 30 seconds.
3. **GitLab / Bitbucket**: Not supported (GitHub only).
