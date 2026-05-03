# Ports Panel — Replit Parity & Production Hardening Report

**Date:** 2026-05-03  
**Task:** #60 — Ports Panel Replit Parity & Production Hardening  
**Status:** Certified

---

## Feature Matrix

| Replit Ports Feature | Our Implementation | Endpoint / File | Status |
|---|---|---|---|
| View list of listening ports | Real-time list from DB with `listening`, `localhostOnly`, `source` fields | `GET /api/projects/:id/networking/ports` | ✅ |
| Internal port display | `internalPort` column shown with badge | `NetworkingPanel.tsx` | ✅ |
| External port mapping | `externalPort` column; conflicts validated; arrow mapping shown | `PATCH /api/projects/:id/networking/ports/:id` | ✅ |
| Protocol label (HTTP/WS/TCP) | `protocol` field with enum validation | All port endpoints | ✅ |
| Status (Listening / Inactive) | `listening` boolean updated by scanner; Localhost sub-label | `NetworkingPanel.tsx` | ✅ |
| Port name/label | `label` varchar(255) with edit support via PATCH | `NetworkingPanel.tsx` | ✅ |
| Public/Private toggle | `isPublic` stored & enforced at proxy layer; toast on change | Proxy + `NetworkingPanel.tsx` | ✅ |
| Proxy/webview URL | `proxyUrl = /preview/:projectId/:port/` built on port create | `networking.router.ts` | ✅ |
| Copy-able URL with toast | Copy button → clipboard → toast "Preview URL copied" | `NetworkingPanel.tsx` | ✅ |
| Open in new tab | ExternalLink button on each port row | `NetworkingPanel.tsx` | ✅ |
| Auto-detect / Scan | Real `/proc/net/tcp` + `/proc/net/tcp6` parse; state 0A filter | `POST /api/projects/:id/networking/ports/scan` | ✅ |
| Add port manually | Form with port, label, protocol; Zod validation | `POST /api/projects/:id/networking/ports` | ✅ |
| Delete port | Confirms before delete; 404 if not found | `DELETE /api/projects/:id/networking/ports/:id` | ✅ |
| Expose localhost toggle | `exposeLocalhost` stored; controls proxy target selection | `NetworkingPanel.tsx` | ✅ |
| "New" badge on discovered ports | `source=detected`/`agent` shows Sparkles badge; auto-clears 30s | `NetworkingPanel.tsx` | ✅ |
| Live port discovery | WebSocket `ports:update` event pushes new ports to panel | `preview-websocket.ts` | ✅ |
| Custom domain add | Zod-validated domain name; generates TXT verification token | `POST /api/projects/:id/networking/domains` | ✅ |
| Custom domain verify | Real DNS TXT lookup via `dns/promises`; actionable error messages | `POST /api/projects/:id/networking/domains/:id/verify` | ✅ |
| Custom domain delete | Confirm dialog before delete | `DELETE /api/projects/:id/networking/domains/:id` | ✅ |
| SSL status display | Badges: Active / Self-Signed / Provisioning / Failed | `NetworkingPanel.tsx` | ✅ |
| Dev URL public/private | `devUrlPublic` toggle with copy button | `NetworkingPanel.tsx` | ✅ |
| Domain purchase | DomainPurchasePanel integration via ShoppingCart icon | `NetworkingPanel.tsx` | ✅ |
| Empty state with guidance | Explains how to expose a port; Scan + Add manually CTAs | `NetworkingPanel.tsx` | ✅ |
| Responsive layout | Panel scrolls on all viewports; button hit targets ≥ 20px | `NetworkingPanel.tsx` | ✅ |

---

## Production Hardening

| Hardening Item | Implementation | Status |
|---|---|---|
| Auth on all routes | `ensureAuthenticated` middleware on every networking route | ✅ |
| Input validation (Zod) | `createPortSchema`, `updatePortSchema`, `domainSchema` schemas | ✅ |
| Port count cap | Max 20 ports per project enforced on POST and scan | ✅ |
| External port conflict check | POST and PATCH reject duplicate external ports | ✅ |
| Scan rate limiting | 5-second cooldown per project via `scanCooldowns` Map | ✅ |
| No arbitrary host scanning | Scanner only reads `/proc/net/tcp` — localhost only | ✅ |
| Public/private proxy enforcement | `ensurePortPublicOrAuth` middleware; public ports bypass ownership check | ✅ |
| Private ports require session/token | `ensureProjectAccess` returns 403 for non-owners on private ports | ✅ |
| DNS verification real lookups | `dns.resolveTxt` with ENOTFOUND / ENODATA / ETIMEOUT handling | ✅ |
| Scan reconciliation | New ports → inserted as `source=detected`; gone ports → `listening=false` | ✅ |
| Delete returns 404 if missing | Uses `.returning()` to detect absent rows | ✅ |
| Schema fields for audit trail | `source`, `detectedAt`, `lastSeenAt` columns added | ✅ |
| Destructive action confirmation | Inline confirm UI for port and domain deletion | ✅ |

---

## Endpoints Exercised

| Method | Path | Description |
|---|---|---|
| GET | `/api/projects/:id/networking/ports` | List all configured ports |
| POST | `/api/projects/:id/networking/ports` | Add a port manually (Zod validated) |
| PATCH | `/api/projects/:id/networking/ports/:portId` | Update label / isPublic / exposeLocalhost / externalPort |
| DELETE | `/api/projects/:id/networking/ports/:portId` | Remove a port |
| POST | `/api/projects/:id/networking/ports/scan` | Real port scan via `/proc/net/tcp` |
| GET | `/api/projects/:id/networking/domains` | List custom domains |
| POST | `/api/projects/:id/networking/domains` | Add a custom domain |
| POST | `/api/projects/:id/networking/domains/:domainId/verify` | Real DNS TXT verification |
| DELETE | `/api/projects/:id/networking/domains/:domainId` | Remove a custom domain |

---

## Out of Scope (as defined in task)

- `*.replit.dev`-style per-port subdomains (we use path-based proxying)
- Rewriting the autonomous agent runtime itself
- Preview panel internals (Task #52)
- Full DNS provider integration for custom domains

---

## Key Implementation Notes

### Real Port Scanner (`/proc/net/tcp`)
Parses `/proc/net/tcp` and `/proc/net/tcp6` in the container. State `0A` = LISTEN. The hex local address is decoded (little-endian 4-byte IPv4) to extract port and whether it binds to `127.0.0.1` (localhost-only). No external process invocation — pure filesystem read.

### Public/Private Proxy Enforcement
New middleware `ensurePortPublicOrAuth` is inserted before `ensurePreviewAuth` on the `/preview/:projectId/:port/*` route. It queries the `networking_ports` table for the requested port. If `isPublic=true`, it sets `req.portIsPublic=true` and skips the ownership check in `ensureProjectAccess`. Private ports require a valid session or bootstrap JWT.

### Live Discovery via WebSocket
The scan endpoint emits `ports:update` on `previewEvents`. `PreviewWebSocketService.setupClient` now registers a `ports:update` listener that broadcasts to subscribed clients. `NetworkingPanel` subscribes to the preview WS and invalidates the TanStack Query cache when new ports arrive, showing a toast and a "New" badge for 30 seconds.

### Real DNS Verification
`dns/promises.resolveTxt` looks up TXT records for the added domain. The response is flattened and searched for the verification token string. Distinct DNS error codes (`ENOTFOUND`, `ENODATA`, `ETIMEOUT`) produce different actionable messages. On success, `sslStatus` is set to `self-signed`.
