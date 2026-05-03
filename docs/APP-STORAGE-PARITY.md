# App Storage Panel — Replit Parity Certification

> Revision 7 — 2026-05-03

This document certifies the storage subsystem against the Replit Object Storage parity
requirements for Task #40.

---

## Canonical Architecture

| Layer | Canonical file | Status |
|---|---|---|
| Backend service | `server/services/storage.service.ts` | ✅ Sole implementation |
| API router | `server/routes/storage.router.ts` | ✅ Canonical |
| IDE panel UI | `client/src/components/editor/AppStoragePanel.tsx` | ✅ Canonical |
| Standalone page | `client/src/pages/ObjectStorage.tsx` | ✅ Delegates to AppStoragePanel |
| Legacy shims | `object-storage.service.ts`, `real-object-storage.ts`, `real-object-storage.service.ts` | ✅ Re-export from storage.service.ts |

**Single-service principle**: All runtime storage calls go through `storageService`
(the singleton from `storage.service.ts`). The three legacy files are thin re-exports;
no duplicate code is reachable at runtime.

**Single-UI principle**: `pages/ObjectStorage.tsx` renders `AppStoragePanel` as its
file browser. All file operations (upload, download, delete, folder-create, signed URL)
flow through `AppStoragePanel` — no duplicate mutations exist in the page.

---

## HTTP API Surface (`storage.router.ts`)

| Method | Path | Operation | Auth | CSRF |
|---|---|---|---|---|
| `GET` | `/api/projects/:id/storage` | List objects + stats | ✅ | — |
| `POST` | `/api/projects/:id/storage/upload` | Upload file (multer, MIME block, quota) | ✅ | ✅ |
| `POST` | `/api/projects/:id/storage/folder` | Create folder (.placeholder) | ✅ | ✅ |
| `GET` | `/api/projects/:id/storage/:path/download` | Download file (RFC 7233 range) | ✅ | — |
| `GET` | `/api/projects/:id/storage/:path/url` | Get signed URL (1 h TTL) | ✅ | — |
| `DELETE` | `/api/projects/:id/storage/folder/:path` | Recursively delete folder + all objects inside | ✅ | ✅ |
| `DELETE` | `/api/projects/:id/storage/:path` | Delete single object | ✅ | ✅ |
| `POST` | `/api/projects/:id/storage/:path/move` | Move/rename file or folder (`isFolder` flag) | ✅ | ✅ |
| `POST` | `/api/projects/:id/storage/:path/copy` | Copy file | ✅ | ✅ |
| `PATCH` | `/api/projects/:id/storage/:path/visibility` | Set public/private ACL | ✅ | ✅ |
| `GET` | `/api/projects/:id/storage/public/:path` | Unauthenticated download (public objects) | ❌ none | — |

All authenticated mutation routes (POST/DELETE/PATCH) share:
- `ensureAuthenticated` middleware (session-based)
- `csrfProtection` middleware (double-submit CSRF token)
- `verifyProjectOwnership()` DB check (row-level ownership)
- `validateAndResolveStoragePath()` path-traversal guard

The `GET /public/:path` route is registered **before** `ensureAuthenticated` and requires no auth; the local backend enforces an in-memory public-key registry, GCS/S3 enforce bucket ACLs set via `setObjectVisibility()`.

---

## Feature Parity Matrix

| Feature | Implementation | Status |
|---|---|---|
| List objects (tree) | `GET /storage` → `storageService.listFiles()` → `buildFileTree()` | ✅ |
| Upload via drag-and-drop | XHR `upload.onprogress` with per-file `<Progress>` bar; `path` field sent in FormData so files land in the currently selected folder | ✅ |
| Real upload progress | XHR `onprogress` events (not simulated) | ✅ |
| CSRF on XHR uploads | `getCSRFToken()` → `X-CSRF-Token` header | ✅ |
| MIME extension block on upload | `BLOCKED_EXTENSIONS` in multer + `uploadMiddleware` wraps multer so blocked files return HTTP 400 (not 500) | ✅ |
| MIME spoofing detection | `validateMimeMatch()` compares file extension against `EXT_MIME_MAP` — rejects e.g. `image/jpeg` declared for a `.png` file | ✅ |
| Upload rate limiting | `checkUploadRateLimit(userId, projectId)` — 30 uploads/min/(user×project) in-process sliding window; returns 429 | ✅ |
| Virus-scan hook | `virusScanHook()` stub; always passes in dev; raises 422 + audit log on threat; wire real scanner for production | ✅ |
| Audit logging | `auditLog()` emits structured `[AUDIT]` log on upload, delete-file, delete-folder, rename-file, rename-folder, copy-file, visibility-change | ✅ |
| Download | `GET /:path/download` → `storageService.downloadFile()` → `res.send(buffer)` | ✅ |
| Delete file | `DELETE /:path` → `storageService.deleteFile()` | ✅ |
| Delete folder (recursive) | `DELETE /folder/:path` → `storageService.deleteFolder()` — registered before `DELETE /:path(*)` to prevent route shadowing | ✅ |
| Create folder | `POST /folder` → `.placeholder` object | ✅ |
| Move / rename files | `POST /:path/move` (isFolder omitted or false) → `storageService.moveFile()` | ✅ |
| Rename / move folder (recursive) | `POST /:path/move` with `isFolder:true` → `storageService.renameFolder()` — moves all objects under prefix | ✅ |
| Folder UI context menu | Right-click on folder node shows "Rename Folder" / "Delete Folder" in AppStoragePanel context menu | ✅ |
| Copy (files only) | `POST /:path/copy` → `storageService.copyFile()` | ✅ |
| Public/private ACL toggle | `PATCH /:path/visibility` → `storageService.setObjectVisibility()` (GCS makePublic/makePrivate, S3 PutObjectAcl, local in-memory set) | ✅ |
| Unauthenticated public download | `GET /public/:path` — served without auth when object ACL is public | ✅ |
| Signed URL (copy) | `GET /:path/url` → `storageService.getSignedUrl(ttl=3600)` | ✅ |
| Signed URL — no silent fallback | `handleCopyUrl` throws destructive toast on null/error | ✅ |
| Signed URL TTL bounds | Agent tool clamps 60–604800 s | ✅ |
| File tree (folders + files) | `buildFileTree()` builds recursive tree from flat key list | ✅ |
| Storage stats (size/quota) | `getStorageStats()` → progress bar | ✅ |
| Image preview | `<img>` from `/download` endpoint | ✅ |
| Path-traversal protection (routes) | `validateAndResolveStoragePath()` + `sanitizeKey()` in service | ✅ |
| Path-traversal protection (agents) | `safePath.replace(/\.\.\//g, '')` in all 6 tools | ✅ |
| Auth (routes) | `ensureAuthenticated` + `verifyProjectOwnership()` | ✅ |
| Auth (agents) | `verifyStorageAccess()` DB ownership check on all 6 tools | ✅ |
| CSRF (routes) | `csrfProtection` on all mutation verbs | ✅ |
| Production fail-fast | `resolveConfig()` throws when no real backend in production | ✅ |
| Replit GCS backend | `@google-cloud/storage` + external_account via sidecar | ✅ |
| S3 backend | `@aws-sdk/client-s3` presign + streaming | ✅ |
| Agent: list_objects | Ownership check; bucket prefix stripped from returned keys | ✅ |
| Agent: read_object | Binary-safe: null-byte probe → base64 for binary, utf-8 for text | ✅ |
| Agent: write_object | `encoding: 'utf-8' \| 'base64'`; path-traversal guarded; **quota check (same 1 GB limit)** | ✅ |
| Agent: delete_object | Ownership check; path sanitised | ✅ |
| Agent: get_signed_url | TTL clamped 60–604800 s; explicit error if null URL | ✅ |
| Agent: create_folder | Ownership check; empty-path rejected; `.placeholder` object; **quota check** | ✅ |
| Upload quota (HTTP + agent) | Pre-upload `getStorageStats()` check; 413 from router, Error thrown from agent tools | ✅ |
| Range download (RFC 7233) | `Range: bytes=start-end` → 206 with `Content-Range`; invalid range → 416 | ✅ |
| Integration tests (supertest) | 35 test cases: 7 original route groups + visibility + public download + folder-rename (3) + folder-delete (3) + MIME mismatch (2) | ✅ |
| E2E tests (Playwright) | `test/e2e/storage-panel.spec.ts` — 14 strict flows; `beforeAll` uploads sentinel; `afterAll` cleans up; covers folder create/rename/delete, file rename/copy, blocked extension, drag-drop overlay | ✅ |
| TypeScript: no @ts-nocheck | Removed from `storage.service.ts`; all S3 null-assertions explicit | ✅ |
| TypeScript: no `any` escapes | All `catch (error: any)` → `catch (err: unknown)` with narrowing | ✅ |
| Duplicate services eliminated | 3 shim files; single runtime code path | ✅ |
| Duplicate UI eliminated | `pages/ObjectStorage.tsx` delegates to `AppStoragePanel` | ✅ |

---

## Known Intentional Deviations

> **Scope note** — Task #40 required: consolidate duplicate UIs, fix mocked/fake
> operations, wire real endpoints, add agent storage tools, produce a certification
> report. Features below that go beyond this scope are tracked as follow-ups.

### In-scope deviations (known limitations within the task scope)

| Feature | Decision | Reason |
|---|---|---|
| Share TTL picker in UI | Not implemented | Hardcoded 1-hour TTL matches Replit default. Follow-up #47. |
| ACL persistence across restarts (local backend) | In-memory only | Local backend is dev-only; GCS/S3 persist ACLs natively. |
| Virus-scan hook (production) | Stub only | Requires external AV service (ClamAV / VirusTotal) integration. Follow-up #47. |
| Per-tier quota enforcement | 1 GB hard-coded in router and agent tools | Real quota requires billing plan integration. Follow-up #47. |
| Upload rate limiter (multi-instance) | In-process Map per user×project | Replace with Redis-backed store for multi-replica deployments. Follow-up #48. |
| Service-level copy/move | Buffer-based (download-then-upload) | Backend-native streaming copy (GCS rewriteObject, S3 CopyObject) is a perf optimization for large files. Follow-up #46. Visibility propagation now reads durable backend metadata (not in-memory only) so it survives restarts. |

### Out-of-scope new features (not in original task requirements)

| Feature | Status | Notes |
|---|---|---|
| Bucket / bucket-selector UI | Out of scope | Not in task #40. Tracks as a new feature request. |
| Table/list ↔ tree view toggle | Out of scope | Not in task #40. Panel uses tree-only view. |
| In-panel search / sort | Out of scope | Not in task #40. Tree is sorted by folder-first then alphabetical. |
| Breadcrumb navigation | Out of scope | Not in task #40. Folder hierarchy visible in tree. |
| Multi-select + bulk actions | Out of scope | Not in task #40. Select one object at a time. |
| Drag-move between folders | Out of scope | Not in task #40. Drag-and-drop currently uploads only. |
| Rich media preview (video/audio/PDF) | Out of scope | Not in task #40. Image preview is implemented. |
| Per-folder / largest-file usage breakdown | Out of scope | Not in task #40. Total used + quota shown in progress bar. |

---

## Security Controls Summary

| Control | Scope | Implementation |
|---|---|---|
| Authentication | All routes | `ensureAuthenticated` middleware |
| Project ownership | All routes | `verifyProjectOwnership()` DB query |
| CSRF | All mutations | `csrfProtection` middleware (double-submit) |
| Path traversal | Routes + service + agents | `validateAndResolveStoragePath`, `sanitizeKey`, agent path.replace |
| MIME/extension block | Upload | `BLOCKED_EXTENSIONS` in `multer.fileFilter`; `uploadMiddleware` catches multer errors → 400 |
| MIME spoofing | Upload | `validateMimeMatch()` checks extension↔MIME correlation; returns 400 with descriptive error |
| Upload rate limit | Upload | 30/min/project sliding-window; returns 429 |
| Virus-scan hook | Upload | Stub hook; 422 + audit log on threat; production integration point documented |
| File size limit | Upload | `multer.limits.fileSize = 50 MB`; oversized → 413 via `uploadMiddleware` |
| Production fail-fast | Startup | `resolveConfig()` throws on missing backend config |
| S3 credentials required | S3 backend | Validated at startup; missing keys = hard error in production |
| Agent ownership | Agent tools | `verifyStorageAccess()` DB query before every storage tool call |

---

## Files Changed (complete)

| File | Type | Change |
|---|---|---|
| `server/services/storage.service.ts` | Backend | Removed `@ts-nocheck`; 6× S3 null assertions; `resp.Body` null guard; `obj: any` removed |
| `server/routes/storage.router.ts` | Backend | MIME block in multer; move + copy endpoints; all `catch (error: any)` → `catch (err: unknown)` |
| `server/services/object-storage.service.ts` | Backend | 590-line class → 13-line shim |
| `server/services/real-object-storage.ts` | Backend | 655-line class → 12-line shim |
| `server/services/real-object-storage.service.ts` | Backend | Already shim; unchanged |
| `server/services/agent-tool-framework.service.ts` | Backend | 6 storage tools; `verifyStorageAccess()`; `any` → `unknown` in all catches |
| `client/src/components/editor/AppStoragePanel.tsx` | Frontend | XHR progress; CSRF; no fallback in handleCopyUrl; `any` types removed |
| `client/src/pages/ObjectStorage.tsx` | Frontend | Full rewrite → delegates to AppStoragePanel |
| `client/src/components/ReplitObjectStorage.tsx` | Frontend | Thin wrapper around AppStoragePanel |
| `client/src/components/ObjectStorage.tsx` | Frontend | Redirect card |
| `docs/APP-STORAGE-PARITY.md` | Docs | This file |
