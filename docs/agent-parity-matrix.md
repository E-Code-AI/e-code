# AI Agent Parity Matrix — E-Code vs Replit Agent Reference Spec
**Audit Date:** 2026-05-03  
**Auditor:** Task #61 — AI Agent Replit Parity & Production Certification  
**Status:** CERTIFIED with exceptions noted

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Fully implemented & verified |
| ⚠️ | Partial — functional but gaps noted |
| ❌ | Missing / not implemented |
| 🔒 | Admin-only (correct posture) |
| N/A | Not applicable to this surface |

---

## 1. Core Agent Capabilities

| Feature | Replit Spec | Web IDE | Mobile IDE | VS Code Ext | Notes |
|---------|------------|---------|------------|-------------|-------|
| Streaming chat (SSE) | Required | ✅ | ✅ | ❌ | VSCode has no agent panel |
| SSE heartbeat (15 s) | Required | ✅ | ✅ | N/A | Fixed in Task #61 — added to `/chat/stream` |
| Zod-validated payloads | Required | ✅ | ✅ | N/A | Fixed in Task #61 — `ChatRequestSchema` applied |
| Rate limiting on chat/stream | Required | ✅ | ✅ | N/A | Covered by `tierRateLimiters.streaming` at mount |
| Non-streaming chat fallback | Required | ✅ | ✅ | N/A | `POST /api/agent/chat` |
| File attachments (text/image/binary) | Required | ✅ | ⚠️ | N/A | Mobile: no attachment UI wired |
| System prompt customization | Required | ✅ | ✅ | N/A | `extraSystemPrompt` param |
| Conversation history (last 20) | Required | ✅ | ✅ | N/A | |
| Bootstrap JWT (workspace embed) | Required | ✅ | N/A | N/A | `agentAuthOrBootstrap` |

---

## 2. Plan & Build Pipeline

| Feature | Replit Spec | Web IDE | Mobile IDE | VS Code Ext | Notes |
|---------|------------|---------|------------|-------------|-------|
| Plan generation (streaming) | Required | ✅ | ✅ | N/A | `POST /api/agent/plan` |
| Plan SSE heartbeat | Required | ✅ | ✅ | N/A | `agent-plan.router.ts` has 15 s interval |
| Build execution (streaming) | Required | ✅ | ✅ | N/A | `POST /api/agent/build` |
| Build SSE heartbeat | Required | ✅ | ✅ | N/A | `agent-build.router.ts` has 15 s interval |
| Step cache (cost optimisation) | Required | ✅ | N/A | N/A | `agent-step-cache.router.ts` |
| Agent action approval (approve/reject) | Required | ✅ | ⚠️ | N/A | Mobile panel pending |
| Pending actions (Redis backed) | Required | ✅ | ✅ | N/A | Fails fast in prod if Redis down |

---

## 3. Orchestration

| Feature | Replit Spec | Web IDE | Mobile IDE | VS Code Ext | Notes |
|---------|------------|---------|------------|-------------|-------|
| Orchestrate run (plan→act→observe→reflect) | Required | ✅ | N/A | N/A | `agent-orchestration.router.ts` |
| Orchestrate streaming | Required | ✅ | N/A | N/A | `GET /api/agent/orchestrate/:id/stream` |
| Session pause / resume | Required | ✅ | N/A | N/A | `POST /api/agent/orchestrate/:id/pause` |
| Session fork | Required | ✅ | N/A | N/A | `POST /api/agent/orchestrate/:id/fork` |
| Concurrent session limit | Required | ✅ | N/A | N/A | enforced in orchestration service |

---

## 4. Checkpoints & Rollback

| Feature | Replit Spec | Web IDE | Mobile IDE | VS Code Ext | Notes |
|---------|------------|---------|------------|-------------|-------|
| Automatic checkpoints | Required | ✅ | ✅ | N/A | On every build + milestone |
| Manual checkpoints | Required | ✅ | ⚠️ | N/A | UI button in CheckpointHistoryPanel |
| Restore checkpoint | Required | ✅ | ⚠️ | N/A | Route exists; mobile UI partial |
| Checkpoint list | Required | ✅ | ✅ | N/A | |
| Checkpoint diff/summary | Required | ✅ | N/A | N/A | AI summary on checkpoint creation |
| Idempotency key on restore | Best practice | ✅ | ✅ | N/A | |

---

## 5. Max Autonomy / Message Queue

| Feature | Replit Spec | Web IDE | Mobile IDE | VS Code Ext | Notes |
|---------|------------|---------|------------|-------------|-------|
| Start autonomy session | Required | ✅ | N/A | N/A | `POST /api/autonomy/sessions` |
| Pause / resume | Required | ✅ | N/A | N/A | |
| Session SSE stream | Required | ✅ | N/A | N/A | `tierRateLimiters.streaming` |
| Queue message | Required | ✅ | ✅ | N/A | `POST /api/autonomy/sessions/:id/messages` |
| Cancel queued message | Required | ✅ | ✅ | N/A | `DELETE /api/autonomy/sessions/:id/messages/:messageId` |
| Re-prioritise queued message | Required | ✅ | ✅ | N/A | `PATCH .../messages/:messageId/priority` |
| Session ownership enforcement | Required | ✅ | ✅ | N/A | `ensureSessionOwnership` middleware |

---

## 6. Tool Coverage

| Tool | agent-tool-definitions.ts | Web IDE UI | Mobile UI | Notes |
|------|--------------------------|-----------|-----------|-------|
| read_file | ✅ | ✅ | ✅ | |
| write_file | ✅ | ✅ | ✅ | |
| create_directory | ✅ | ✅ | ✅ | |
| delete_file | ✅ | ✅ | ✅ | |
| run_command | ✅ | ✅ | ✅ | sandboxed via Runner |
| web_search | ✅ | ✅ | ✅ | `/api/agent/tools/web-search` |
| doc_search | ✅ | ✅ | N/A | |
| read_context | ✅ | ✅ | N/A | |
| write_context | ✅ | ✅ | N/A | |
| execute_test | ✅ | 🔒 | N/A | admin-only Playwright |
| image_generation | ✅ | ✅ | N/A | Added in Task #61 — `/api/agent/tools/image-generation` |
| update_replit_md | ✅ | ✅ | N/A | Added in Task #61 — `/api/agent/tools/replit-md` |

---

## 7. Web Search

| Feature | Replit Spec | Web IDE | Mobile IDE | Notes |
|---------|------------|---------|------------|-------|
| Perplexity / Tavily search | Required | ✅ | ✅ | `WebSearchService` |
| Search history persistence | Required | ✅ | N/A | stored in `webSearchHistory` table |
| Search toggle in UI | Required | ✅ | N/A | `WebSearchToggle.tsx` |
| Doc-specific search | Required | ✅ | N/A | `/api/agent/web-search/docs` |
| AI-optimised search | Required | ✅ | N/A | `/api/agent/web-search/ai` |

---

## 8. Extended Thinking / High-Power Mode

| Feature | Replit Spec | Web IDE | Mobile IDE | Notes |
|---------|------------|---------|------------|-------|
| Extended thinking toggle | Required | ✅ | ✅ | `AgentPreferences.extendedThinking` |
| Thinking step display | Required | ✅ | ✅ | `ThinkingDisplay.tsx` |
| High-power model switch | Required | ✅ | ✅ | `AgentPreferences.highPowerMode` |
| Model selection UI | Required | ✅ | ✅ | |

---

## 9. App Testing & Video Replays

| Feature | Replit Spec | Web IDE | Mobile IDE | Notes |
|---------|------------|---------|------------|-------|
| Playwright e2e execution | Required | 🔒 | N/A | admin-only (correct security posture) |
| Video replay recording | Required | 🔒 | N/A | `agent-recording.service.ts` |
| Video replay viewer | Required | ✅ | N/A | `VideoReplayViewer.tsx` |
| Screenshot capture | Required | 🔒 | N/A | admin-only |
| Background test toggling | Required | ✅ | N/A | `BackgroundTestingService` |

---

## 10. Auth & Security

| Feature | Replit Spec | Implementation | Notes |
|---------|------------|----------------|-------|
| Session auth on all agent routes | Required | ✅ | `agentAuthOrBootstrap` |
| Bootstrap JWT for workspace embed | Required | ✅ | short-lived JWT |
| Admin gate on Playwright tests | Required | 🔒 | ✅ correct |
| Session ownership on autonomy queue | Required | ✅ | `ensureSessionOwnership` |
| Redis-backed pending actions | Required | ✅ | fails fast if Redis down in production |
| Rate limiting — streaming | Required | ✅ | `tierRateLimiters.streaming` |
| Rate limiting — API | Required | ✅ | `tierRateLimiters.api` |
| Idempotency keys | Best practice | ✅ | orchestration, checkpoints |

---

## 11. Cross-Surface Session Continuity

| Scenario | Result | Notes |
|----------|--------|-------|
| Session started on Web IDE, resumed on Mobile | ✅ | Shared DB + Redis session store |
| Message queue visible across surfaces | ✅ | REST API; any surface can poll |
| Checkpoint created on Web, viewed on Mobile | ✅ | projectId-scoped |
| VS Code extension consuming agent session | ❌ | No agent panel in extension yet |
| Bootstrap token → session handoff | ✅ | JWT decoded → session user created |

---

## 12. Gaps & Remediation

| Gap | Severity | Remediation | Status |
|-----|----------|-------------|--------|
| `/chat/stream` had no SSE heartbeat | High | Added 15 s interval + `close` cleanup | ✅ Fixed (Task #61) |
| `/chat/stream` had no Zod validation | Medium | `ChatRequestSchema.safeParse` added | ✅ Fixed (Task #61) |
| No `image_generation` agent tool route | Medium | `POST /api/agent/tools/image-generation` added | ✅ Fixed (Task #61) |
| No `update_replit_md` agent tool route | Medium | `POST/GET /api/agent/tools/replit-md` added | ✅ Fixed (Task #61) |
| Shared Zod schemas lived only in server | Medium | `shared/agent-types.ts` created | ✅ Fixed (Task #61) |
| VS Code extension has no agent panel | High | Out of scope — flagged as follow-up | ⚠️ Follow-up |
| Mobile attachment UI not wired | Low | Out of scope — flagged as follow-up | ⚠️ Follow-up |
