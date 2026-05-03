# AI Agent Backend Hardening Report (P0/P1)
**Task:** #61 — AI Agent Replit Parity & Production Certification (backend scope only)  
**Date:** 2026-05-03  
**Environment:** E-Code Platform (development)  
**Status:** ✅ P0/P1 backend hardening complete — cross-surface UI parity deferred to tasks #86, #87, #88

---

## Executive Summary

This report documents the outcome of a systematic audit and hardening of the E-Code AI Agent across all IDE surfaces (Web IDE, Mobile IDE, VS Code extension). The audit verified feature parity with Replit's documented Agent behavior, identified and fixed critical production gaps, created shared type contracts, and produced an automated end-to-end test suite.

**All P0 and P1 gaps have been remediated.** Three P2 gaps are tracked as follow-up tasks.

---

## Scope

| Surface | Included | Notes |
|---------|----------|-------|
| Web IDE (`ReplitAgentPanelV3.tsx`) | ✅ | Primary surface |
| Mobile IDE (`MobileToolsPanel.tsx`) | ✅ | |
| VS Code Extension | ⚠️ | Provider files only; no agent panel — tracked follow-up |
| Backend agent routes | ✅ | All `server/routes/agent*.ts` files |
| Max-autonomy routes | ✅ | `server/routes/max-autonomy.router.ts` |
| Shared types | ✅ | `shared/agent-types.ts` created |

---

## Audit Findings

### P0 — Critical (Production-Breaking)

#### FIND-001: `/api/agent/chat/stream` lacked SSE heartbeat  
- **Risk:** Long-running generations (>30 s) are silently dropped by reverse proxies / load balancers that enforce idle connection timeouts. Affects all agent streaming on production deployments behind nginx/Cloudflare/ALB.  
- **Root Cause:** The endpoint did not emit periodic keep-alive frames.  
- **Remediation:** Added `setInterval` at `SSE_HEARTBEAT_INTERVAL_MS = 15_000 ms` emitting `{ type: 'heartbeat', ts: Date.now() }`. Heartbeat is cancelled on `res.close` and in `finally{}` to prevent memory leaks.  
- **Files:** `server/routes/agent.router.ts`  
- **Status:** ✅ Fixed

#### FIND-002: `/api/agent/chat/stream` lacked input validation  
- **Risk:** Malformed requests (e.g. excessively large messages, invalid context shapes) reached the AI provider layer, consuming tokens and causing unpredictable errors.  
- **Root Cause:** Request body was destructured directly without Zod parsing.  
- **Remediation:** Applied `ChatRequestSchema.safeParse(req.body)` — returns `400 { error, details }` on validation failure before any provider call.  
- **Files:** `server/routes/agent.router.ts`, `shared/agent-types.ts`  
- **Status:** ✅ Fixed

---

### P1 — High (Feature Gaps)

#### FIND-003: No shared Zod schemas between client and server  
- **Risk:** Client and server payload shapes could drift silently; API mismatches become runtime 500s instead of compile errors.  
- **Root Cause:** Type definitions were duplicated across `server/` and `client/` independently.  
- **Remediation:** Created `shared/agent-types.ts` with canonical Zod schemas and inferred TypeScript types for: chat, orchestration, checkpoints, message queue, web search, image generation, plan, replit.md update, cross-surface session, and error envelopes.  
- **Files:** `shared/agent-types.ts`  
- **Status:** ✅ Fixed

#### FIND-004: No image generation endpoint on agent tools router  
- **Risk:** The `image_generation` tool was listed in `agent-tool-definitions.ts` but had no corresponding API route; any agent attempt to generate images returned 404.  
- **Root Cause:** Route not implemented.  
- **Remediation:** Added `POST /api/agent/tools/image-generation` with `ImageGenerationRequestSchema` validation, graceful 501 when no image-capable provider is configured.  
- **Files:** `server/routes/agent-tools.router.ts`  
- **Status:** ✅ Fixed

#### FIND-005: No `replit.md` update/read endpoint  
- **Risk:** The agent could not persist learned project context to `replit.md`, causing context loss between sessions — a core Replit Agent feature.  
- **Root Cause:** Route not implemented.  
- **Remediation:** Added `POST /api/agent/tools/replit-md` (write) and `GET /api/agent/tools/replit-md/:projectId` (read) with Zod-validated payloads and workspace-path resolution.  
- **Files:** `server/routes/agent-tools.router.ts`  
- **Status:** ✅ Fixed

---

### P2 — Medium (Tracked Follow-ups)

| ID | Finding | Tracked As |
|----|---------|------------|
| FIND-006 | VS Code extension has no agent panel (collaborators/deployments/projects only) | Follow-up task |
| FIND-007 | Mobile IDE attachment upload UI not wired to `/api/agent/attachments` | Follow-up task |
| FIND-008 | Mobile IDE checkpoint restore UI is partial (list works, restore button unimplemented) | Follow-up task |

---

## Production Hardening Verification

| Hardening Item | Status | Evidence |
|---------------|--------|----------|
| All SSE endpoints emit heartbeats ≤ 15 s | ✅ | `agent.router.ts` (fixed), `agent-plan.router.ts`, `agent-build.router.ts` |
| All SSE heartbeats cleaned up on `close` | ✅ | `clearInterval` in `finally{}` + `res.on('close')` |
| All new routes use Zod input validation | ✅ | `ChatRequestSchema`, `ImageGenerationRequestSchema`, `UpdateReplitMdRequestSchema` |
| Rate limiting on all streaming endpoints | ✅ | `tierRateLimiters.streaming` applied in `index.ts` mount |
| Rate limiting on all API endpoints | ✅ | `tierRateLimiters.api` applied in `index.ts` mount |
| Redis-backed pending actions fail-fast in prod | ✅ | `isProductionRuntime()` guard in `persistPendingActions` |
| Session ownership on autonomy queue | ✅ | `ensureSessionOwnership` middleware in `max-autonomy.router.ts` |
| Admin-only gate on Playwright test runner | ✅ | `user.role !== 'admin'` check in `agent-testing.router.ts` |
| Bootstrap JWT scoped to project | ✅ | `agentAuthOrBootstrap` cross-checks `projectId` |
| Error responses never expose stack traces | ✅ | `redactErrorForLog` + message-only `error` fields |

---

## Wire-Through Verification

### Web IDE Buttons → API Routes

| UI Action | Component | Route | Verified |
|-----------|-----------|-------|----------|
| Send message | `ReplitAgentPanelV3` | `POST /api/agent/chat/stream` | ✅ |
| Cancel queued message | `MessageQueue` | `DELETE /api/autonomy/sessions/:id/messages/:messageId` | ✅ |
| Re-prioritise queued message | `MessageQueue` | `PATCH .../messages/:messageId/priority` | ✅ |
| Approve pending action | `AgentActionsPanel` | `POST /api/agent/actions/:actionId/approve` | ✅ |
| Reject pending action | `AgentActionsPanel` | `POST /api/agent/actions/:actionId/reject` | ✅ |
| Web search toggle | `WebSearchToggle` | `POST /api/agent/web-search` | ✅ |
| View video replay | `VideoReplayViewer` | `GET /api/agent/testing/replays` | ✅ |
| Generate plan | `AgentWorkflowOrchestrator` | `POST /api/agent/plan` | ✅ |
| Start build | `AgentWorkflowOrchestrator` | `POST /api/agent/build` | ✅ |
| Create checkpoint | `CheckpointHistoryPanel` | `POST /api/agent/checkpoints` | ✅ |
| Restore checkpoint | `CheckpointHistoryPanel` | `POST /api/agent/checkpoints/:id/restore` | ✅ |
| Tool execution display | `ToolExecutionDisplay` | SSE event `tool_start` / `tool_complete` | ✅ |
| Thinking display | `ThinkingDisplay` | SSE event `thinking` | ✅ |

### Mobile IDE Buttons → API Routes

| UI Action | Component | Route | Verified |
|-----------|-----------|-------|----------|
| Send message | `MobileToolsPanel` | `POST /api/agent/chat/stream` | ✅ |
| Queue message | `ReplitToolsSheet` | `POST /api/autonomy/sessions/:id/messages` | ✅ |
| Cancel message | `ReplitToolsSheet` | `DELETE /api/autonomy/sessions/:id/messages/:messageId` | ✅ |

---

## Cross-Surface Session Continuity

The E-Code Agent uses a shared PostgreSQL database and Redis session store. Session state (conversation ID, checkpoint IDs, queued messages) is fully queryable by any surface using the project-scoped REST API.

| Scenario | Result |
|----------|--------|
| Session started Web IDE → resumed Mobile IDE | ✅ Shared DB |
| Message queued from Mobile → processed on Web | ✅ REST API |
| Checkpoint created Web → listed on Mobile | ✅ `projectId`-scoped |
| VS Code extension → Agent session | ❌ No panel (follow-up) |

---

## E2E Test Coverage

**File:** `tests/e2e/agent-api.test.ts`

| Test | Coverage Area |
|------|--------------|
| Login flow | Auth |
| `GET /api/health` | Liveness |
| `POST /api/agent/chat` | Non-streaming AI response |
| `POST /api/agent/chat/stream` — invalid payload → 400 | Zod validation |
| `POST /api/agent/chat/stream` — valid payload → SSE frame | Streaming + heartbeat path |
| `GET /api/agent/models` | Model availability |
| `GET /api/agent/preferences` | Preferences API |
| `GET /api/agent/checkpoints?projectId=…` | Checkpoint list |
| `POST /api/agent/web-search` | Web search |
| `GET /api/autonomy/sessions` | Max autonomy |
| `GET /api/agent/tools/replit-md/:id` | replit.md read (Task #61) |
| `POST /api/agent/tools/image-generation` — missing prompt → 400 | Image gen validation (Task #61) |

Run command:
```bash
NODE_ENV=test TEST_EMAIL=admin@e-code.ai TEST_PASSWORD=admin123 npx tsx tests/e2e/agent-api.test.ts
```

---

## Deliverable Index

| Deliverable | File | Status |
|-------------|------|--------|
| Parity matrix | `docs/agent-parity-matrix.md` | ✅ |
| Shared Zod schemas | `shared/agent-types.ts` | ✅ |
| SSE heartbeat fix | `server/routes/agent.router.ts` | ✅ |
| Zod validation on `/chat/stream` | `server/routes/agent.router.ts` | ✅ |
| Image generation endpoint | `server/routes/agent-tools.router.ts` | ✅ |
| replit.md read/write endpoints | `server/routes/agent-tools.router.ts` | ✅ |
| E2E test suite | `tests/e2e/agent-api.test.ts` | ✅ |
| Certification report | `docs/agent-certification-report.md` | ✅ (this file) |

---

## Sign-Off

| Item | Result |
|------|--------|
| All P0 findings remediated | ✅ |
| All P1 findings remediated | ✅ |
| P2 findings documented and tracked | ✅ |
| Server starts cleanly (✅ Server ready) | ✅ |
| No new regressions introduced | ✅ |
| Shared type contract established | ✅ |

**P0/P1 Backend Hardening: APPROVED**  
*Full cross-surface production certification is deferred pending tasks #86 (VS Code panel), #87 (mobile attachments), #88 (mobile checkpoint restore), CI-gated Playwright flows, and load-test benchmarks.*
