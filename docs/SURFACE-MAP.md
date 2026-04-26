# E-code Surface Map

Generated: 2026-04-26T16:22:19.174Z
Branch: codex/production-certification-20260426

This map is generated from repository wiring and is the certification source of truth for static and dynamic coverage.

## Backend Routes (1285)

| Method | Route | File |
| --- | --- | --- |
| GET | /system-status | server/admin/routes.ts |
| GET | /user-stats | server/admin/routes.ts |
| GET | /project-stats | server/admin/routes.ts |
| GET | /activities | server/admin/routes.ts |
| POST | /cache/clear | server/admin/routes.ts |
| POST | /maintenance/run | server/admin/routes.ts |
| GET | /repo-overview/:projectId | server/agent/routes/agent-context.ts |
| GET | /context/:projectId | server/agent/routes/agent-context.ts |
| POST | /repo-overview/refresh/:projectId | server/agent/routes/agent-context.ts |
| GET | /repo-overview/health | server/agent/routes/agent-context.ts |
| POST | /agent/chat/stream | server/api/ai-streaming.ts |
| POST | /agent/chat/stop | server/api/ai-streaming.ts |
| GET | /agent/models | server/api/ai-streaming.ts |
| POST | /projects/:id/environment | server/api/isolation.ts |
| GET | /projects/:id/environment | server/api/isolation.ts |
| DELETE | /projects/:id/environment | server/api/isolation.ts |
| GET | /admin/environments | server/api/isolation.ts |
| GET | /environments/:id/usage | server/api/isolation.ts |
| PUT | /environments/:id/network-policy | server/api/isolation.ts |
| USE | /github | server/api/mcp.ts |
| USE | /postgres | server/api/mcp.ts |
| USE | /memory | server/api/mcp.ts |
| GET | /servers | server/api/mcp.ts |
| GET | /tools | server/api/mcp.ts |
| POST | /tools/:name | server/api/mcp.ts |
| POST | /mobile/auth/login | server/api/mobile.ts |
| POST | /mobile/auth/refresh | server/api/mobile.ts |
| GET | /mobile/projects | server/api/mobile.ts |
| POST | /mobile/projects | server/api/mobile.ts |
| GET | /mobile/projects/:projectId/files | server/api/mobile.ts |
| PUT | /mobile/projects/:projectId/files/:fileId | server/api/mobile.ts |
| POST | /mobile/projects/:projectId/run | server/api/mobile.ts |
| POST | /mobile/ai/chat | server/api/mobile.ts |
| POST | /mobile/ai/chat/stream | server/api/mobile.ts |
| GET | /mobile/explore | server/api/mobile.ts |
| GET | /mobile/notifications | server/api/mobile.ts |
| POST | /mobile/device-token | server/api/mobile.ts |
| DELETE | /mobile/device-token | server/api/mobile.ts |
| POST | /mobile/admin/test-notification | server/api/mobile.ts |
| GET | /mobile/auth/oauth/github | server/api/mobile.ts |
| GET | /mobile/auth/oauth/github/callback | server/api/mobile.ts |
| GET | /mobile/auth/oauth/google | server/api/mobile.ts |
| GET | /mobile/auth/oauth/google/callback | server/api/mobile.ts |
| GET | /models | server/api/opensource-models.ts |
| POST | /generate | server/api/opensource-models.ts |
| POST | /code | server/api/opensource-models.ts |
| GET | /pricing | server/api/opensource-models.ts |
| GET | /status/:modelId | server/api/opensource-models.ts |
| GET | /api/docs/swagger.json | server/docs/swagger.ts |
| USE | /api/docs | server/docs/swagger.ts |
| POST | /api/security/csp-report | server/index.ts |
| USE | /api | server/index.ts |
| GET | /health | server/index.ts |
| GET | /api/health | server/index.ts |
| GET | /health/liveness | server/index.ts |
| GET | /api/health/liveness | server/index.ts |
| GET | /health/readiness | server/index.ts |
| GET | /api/health/readiness | server/index.ts |
| GET | /health/components | server/index.ts |
| GET | /api/cors-health | server/index.ts |
| USE | /api | server/index.ts |
| GET | /health/liveness | server/index.ts |
| GET | /health/readiness | server/index.ts |
| GET | /health/deep | server/index.ts |
| GET | /health/startup | server/index.ts |
| USE | /api | server/index.ts |
| USE | /api | server/index.ts |
| USE | /api/ai-optimization | server/index.ts |
| USE | /api/slack-config | server/index.ts |
| USE | /api/agent/autonomous | server/index.ts |
| USE | /api/workspace | server/index.ts |
| USE | /api/websocket | server/index.ts |
| USE | /api/templates | server/index.ts |
| USE | /api | server/index.ts |
| USE | /api/payments | server/index.ts |
| USE | /api/billing | server/index.ts |
| USE | /api/agent | server/index.ts |
| USE | /api | server/index.ts |
| GET | /api/debug/sentry-test | server/index.ts |
| USE | /attached_assets | server/index.ts |
| USE | /assets | server/index.ts |
| USE | * | server/index.ts |
| GET | * | server/index.ts |
| GET | /repositories | server/mcp/api/github.ts |
| POST | /repositories | server/mcp/api/github.ts |
| GET | /issues | server/mcp/api/github.ts |
| POST | /issues | server/mcp/api/github.ts |
| GET | /pull-requests | server/mcp/api/github.ts |
| POST | /pull-requests | server/mcp/api/github.ts |
| POST | /search | server/mcp/api/memory.ts |
| GET | /conversations | server/mcp/api/memory.ts |
| POST | /nodes | server/mcp/api/memory.ts |
| POST | /edges | server/mcp/api/memory.ts |
| POST | /conversations | server/mcp/api/memory.ts |
| GET | /tables | server/mcp/api/postgres.ts |
| GET | /schema/:table | server/mcp/api/postgres.ts |
| POST | /query | server/mcp/api/postgres.ts |
| POST | /backup | server/mcp/api/postgres.ts |
| POST | /mcp/connect | server/mcp/http-transport.ts |
| POST | /mcp/message | server/mcp/http-transport.ts |
| GET | /mcp/events | server/mcp/http-transport.ts |
| POST | /mcp/disconnect | server/mcp/http-transport.ts |
| GET | /mcp/tools | server/mcp/http-transport.ts |
| GET | /mcp/resources | server/mcp/http-transport.ts |
| GET | /oauth/authorize | server/mcp/routes.ts |
| POST | /oauth/token | server/mcp/routes.ts |
| GET | /auth/info | server/mcp/routes.ts |
| GET | /health | server/mcp/routes.ts |
| USE | /github | server/mcp/routes.ts |
| USE | /postgres | server/mcp/routes.ts |
| USE | /memory | server/mcp/routes.ts |
| USE | /mcp | server/mcp/routes.ts |
| POST | /mcp/connect | server/mcp/routes.ts |
| POST | /mcp/message | server/mcp/routes.ts |
| GET | /mcp/tools | server/mcp/routes.ts |
| GET | /mcp/resources | server/mcp/routes.ts |
| GET | /mcp/events | server/mcp/routes.ts |
| POST | /mcp/connect | server/mcp/simple-http-transport.ts |
| POST | /mcp/message | server/mcp/simple-http-transport.ts |
| POST | /mcp/disconnect | server/mcp/simple-http-transport.ts |
| GET | /health | server/mcp/standalone-server.ts |
| GET | /tools | server/mcp/standalone-server.ts |
| POST | /tools/:toolName | server/mcp/standalone-server.ts |
| POST | /connect | server/mcp/standalone-server.ts |
| POST | /message | server/mcp/standalone-server.ts |
| GET | /events | server/mcp/standalone-server.ts |
| POST | /disconnect | server/mcp/standalone-server.ts |
| GET | /api/projects/:id | server/middleware/bootstrap-auth.ts |
| GET | /polyglot/health | server/polyglot-routes.ts |
| POST | /containers/create | server/polyglot-routes.ts |
| GET | /containers/list | server/polyglot-routes.ts |
| POST | /files/batch-operations | server/polyglot-routes.ts |
| POST | /builds/fast-build | server/polyglot-routes.ts |
| POST | /ai/code-analysis | server/polyglot-routes.ts |
| POST | /ml/train-model | server/polyglot-routes.ts |
| GET | /ml/training-status/:jobId | server/polyglot-routes.ts |
| POST | /ai/text-analysis | server/polyglot-routes.ts |
| POST | /data/advanced-processing | server/polyglot-routes.ts |
| POST | /ai/inference | server/polyglot-routes.ts |
| POST | /smart-route | server/polyglot-routes.ts |
| GET | /polyglot/capabilities | server/polyglot-routes.ts |
| GET | /polyglot/benchmark | server/polyglot-routes.ts |
| USE | /preview/:projectId/:port/* | server/preview/preview-service.ts |
| USE | /preview/:projectId/* | server/preview/preview-service.ts |
| GET | /health | server/production.ts |
| GET | /api/cors-health | server/production.ts |
| GET | * | server/production.ts |
| GET | * | server/production.ts |
| GET | /status | server/routes/2fa.router.ts |
| POST | /setup | server/routes/2fa.router.ts |
| POST | /confirm | server/routes/2fa.router.ts |
| POST | /verify | server/routes/2fa.router.ts |
| POST | /challenge/verify | server/routes/2fa.router.ts |
| POST | /challenge/emergency | server/routes/2fa.router.ts |
| POST | /disable | server/routes/2fa.router.ts |
| POST | /backup-codes/regenerate | server/routes/2fa.router.ts |
| POST | /emergency | server/routes/2fa.router.ts |
| GET | /plans | server/routes/admin-billing.router.ts |
| GET | /settings | server/routes/admin-billing.router.ts |
| PUT | /settings | server/routes/admin-billing.router.ts |
| PUT | /plans/:planId | server/routes/admin-billing.router.ts |
| PUT | /plans/:planId/limits/:limitId | server/routes/admin-billing.router.ts |
| GET | /subscriptions | server/routes/admin-billing.router.ts |
| GET | /usage-summary | server/routes/admin-billing.router.ts |
| GET | /invoices | server/routes/admin-billing.router.ts |
| GET | /revenue | server/routes/admin-billing.router.ts |
| GET | /rate-limit-violations | server/routes/admin-monitoring.router.ts |
| GET | /rate-limit-stats | server/routes/admin-monitoring.router.ts |
| GET | /system-health | server/routes/admin-monitoring.router.ts |
| DELETE | /rate-limit-violations/:id | server/routes/admin-monitoring.router.ts |
| POST | /rate-limit-violations/cleanup | server/routes/admin-monitoring.router.ts |
| GET | /overview | server/routes/admin-system-metrics.router.ts |
| GET | /storage | server/routes/admin-system-metrics.router.ts |
| GET | /alerts | server/routes/admin-system-metrics.router.ts |
| GET | /capacity-forecast | server/routes/admin-system-metrics.router.ts |
| GET | /dashboard/stats | server/routes/admin.ts |
| GET | /stats | server/routes/admin.ts |
| GET | /import-stats | server/routes/admin.ts |
| GET | /users | server/routes/admin.ts |
| PATCH | /users/:id/toggle-admin | server/routes/admin.ts |
| POST | /users/:id/lock | server/routes/admin.ts |
| POST | /users/:id/unlock | server/routes/admin.ts |
| GET | /api-keys | server/routes/admin.ts |
| GET | /api-keys/:provider | server/routes/admin.ts |
| POST | /api-keys | server/routes/admin.ts |
| PATCH | /api-keys/:id | server/routes/admin.ts |
| DELETE | /api-keys/:id | server/routes/admin.ts |
| PATCH | /users/:id | server/routes/admin.ts |
| DELETE | /users/:id | server/routes/admin.ts |
| GET | /projects | server/routes/admin.ts |
| PATCH | /projects/:id | server/routes/admin.ts |
| DELETE | /projects/:id | server/routes/admin.ts |
| PATCH | /projects/:id/pin | server/routes/admin.ts |
| PATCH | /projects/:id/unpin | server/routes/admin.ts |
| GET | /cms/pages | server/routes/admin.ts |
| GET | /cms/pages/:slug | server/routes/admin.ts |
| POST | /cms/pages | server/routes/admin.ts |
| PATCH | /cms/pages/:id | server/routes/admin.ts |
| POST | /cms/pages/:id/publish | server/routes/admin.ts |
| DELETE | /cms/pages/:id | server/routes/admin.ts |
| GET | /docs/categories | server/routes/admin.ts |
| POST | /docs/categories | server/routes/admin.ts |
| GET | /docs | server/routes/admin.ts |
| POST | /docs | server/routes/admin.ts |
| PATCH | /docs/:id | server/routes/admin.ts |
| POST | /docs/:id/publish | server/routes/admin.ts |
| GET | /support/tickets | server/routes/admin.ts |
| GET | /support/tickets/:id | server/routes/admin.ts |
| GET | /support/tickets/:id/replies | server/routes/admin.ts |
| POST | /support/tickets/:id/replies | server/routes/admin.ts |
| POST | /support/tickets/:id/assign | server/routes/admin.ts |
| POST | /support/tickets/:id/resolve | server/routes/admin.ts |
| POST | /support/tickets/:id/close | server/routes/admin.ts |
| GET | /subscriptions | server/routes/admin.ts |
| POST | /subscriptions | server/routes/admin.ts |
| PATCH | /subscriptions/:id | server/routes/admin.ts |
| POST | /subscriptions/:id/cancel | server/routes/admin.ts |
| GET | /activity-logs | server/routes/admin.ts |
| GET | /activity | server/routes/admin.ts |
| GET | /usage/stats | server/routes/admin.ts |
| GET | /usage/users | server/routes/admin.ts |
| GET | /audit-logs | server/routes/admin.ts |
| POST | /enable | server/routes/agent-autonomous.router.ts |
| POST | /disable | server/routes/agent-autonomous.router.ts |
| POST | /assess-risk | server/routes/agent-autonomous.router.ts |
| POST | /execute | server/routes/agent-autonomous.router.ts |
| GET | /actions/:sessionId | server/routes/agent-autonomous.router.ts |
| GET | /health | server/routes/agent-autonomous.router.ts |
| POST | /build | server/routes/agent-autonomous.router.ts |
| POST | /execute | server/routes/agent-build.router.ts |
| GET | /:id/stream | server/routes/agent-build.router.ts |
| POST | /:id/cancel | server/routes/agent-build.router.ts |
| GET | /:id | server/routes/agent-build.router.ts |
| GET | /sessions | server/routes/agent-grid.router.ts |
| GET | /sessions/:sessionId | server/routes/agent-grid.router.ts |
| GET | /actions | server/routes/agent-grid.router.ts |
| GET | /files | server/routes/agent-grid.router.ts |
| GET | /conversations | server/routes/agent-grid.router.ts |
| GET | /metrics | server/routes/agent-grid.router.ts |
| GET | /export/sessions | server/routes/agent-grid.router.ts |
| POST | /stream | server/routes/agent-plan.router.ts |
| POST | /generate | server/routes/agent-plan.router.ts |
| GET | /:conversationId | server/routes/agent-plan.router.ts |
| GET | /models | server/routes/agent-preferences.router.ts |
| GET | /preferences | server/routes/agent-preferences.router.ts |
| PUT | /preferences | server/routes/agent-preferences.router.ts |
| POST | /recommend-model | server/routes/agent-preferences.router.ts |
| GET | /effective-model | server/routes/agent-preferences.router.ts |
| POST | /conversation | server/routes/agent-preferences.router.ts |
| GET | /:projectId | server/routes/agent-step-cache.router.ts |
| GET | /:projectId/latest | server/routes/agent-step-cache.router.ts |
| GET | /:projectId/:stepType | server/routes/agent-step-cache.router.ts |
| POST | /:projectId/invalidate | server/routes/agent-step-cache.router.ts |
| GET | /metrics | server/routes/agent-step-cache.router.ts |
| POST | /metrics/reset | server/routes/agent-step-cache.router.ts |
| POST | /test/execute | server/routes/agent-testing.router.ts |
| POST | /test/screenshot | server/routes/agent-testing.router.ts |
| GET | /test/history/:sessionId | server/routes/agent-testing.router.ts |
| GET | /test/artifacts/:executionId | server/routes/agent-testing.router.ts |
| POST | /selector/generate | server/routes/agent-testing.router.ts |
| GET | /selector/history/:sessionId | server/routes/agent-testing.router.ts |
| POST | /recording/start | server/routes/agent-testing.router.ts |
| POST | /recording/stop/:recordingId | server/routes/agent-testing.router.ts |
| POST | /recording/marker/:recordingId | server/routes/agent-testing.router.ts |
| GET | /recording/:recordingId | server/routes/agent-testing.router.ts |
| GET | /recording/session/:sessionId | server/routes/agent-testing.router.ts |
| GET | /tools/web-search | server/routes/agent-tools.router.ts |
| POST | /tools/web-search | server/routes/agent-tools.router.ts |
| POST | /web-search | server/routes/agent-tools.router.ts |
| POST | /web-search/docs | server/routes/agent-tools.router.ts |
| POST | /web-search/ai | server/routes/agent-tools.router.ts |
| POST | /testing/start | server/routes/agent-tools.router.ts |
| GET | /testing/sessions | server/routes/agent-tools.router.ts |
| GET | /testing/sessions/:sessionId | server/routes/agent-tools.router.ts |
| GET | /testing/replays | server/routes/agent-tools.router.ts |
| GET | /testing/replays/:replayId | server/routes/agent-tools.router.ts |
| GET | /thinking/:conversationId | server/routes/agent-tools.router.ts |
| POST | /thinking/analyze | server/routes/agent-tools.router.ts |
| GET | /tools/testing/replays | server/routes/agent-tools.router.ts |
| POST | /tools/testing/start | server/routes/agent-tools.router.ts |
| GET | /tools/thinking/:conversationId | server/routes/agent-tools.router.ts |
| GET | /workflows | server/routes/agent-tools.router.ts |
| GET | /workflows/:workflowId | server/routes/agent-tools.router.ts |
| GET | /tools | server/routes/agent-tools.router.ts |
| GET | /tools/status | server/routes/agent-tools.router.ts |
| GET | /tools/database/:projectId | server/routes/agent-tools.router.ts |
| POST | /tools/database/:projectId/provision | server/routes/agent-tools.router.ts |
| GET | /tools/database/:projectId/credentials | server/routes/agent-tools.router.ts |
| POST | /features/generate | server/routes/agent-workflow.router.ts |
| POST | /build/full | server/routes/agent-workflow.router.ts |
| POST | /build/from-design | server/routes/agent-workflow.router.ts |
| POST | /build/extended | server/routes/agent-workflow.router.ts |
| GET | /models | server/routes/agent.router.ts |
| GET | /preferences | server/routes/agent.router.ts |
| PUT | /preferences | server/routes/agent.router.ts |
| POST | /recommend-model | server/routes/agent.router.ts |
| GET | /actions/:projectId | server/routes/agent.router.ts |
| POST | /actions/:actionId/approve | server/routes/agent.router.ts |
| POST | /actions/:actionId/reject | server/routes/agent.router.ts |
| POST | /chat | server/routes/agent.router.ts |
| POST | /chat/stream | server/routes/agent.router.ts |
| GET | /conversation | server/routes/agent.router.ts |
| GET | /projects/:projectId/conversations | server/routes/agent.router.ts |
| POST | /conversation | server/routes/agent.router.ts |
| GET | /conversation/:id | server/routes/agent.router.ts |
| POST | /conversation/:id/mode | server/routes/agent.router.ts |
| GET | /conversation/:id/messages | server/routes/agent.router.ts |
| POST | /conversation/:id/messages | server/routes/agent.router.ts |
| POST | /sessions | server/routes/agent.router.ts |
| GET | /sessions | server/routes/agent.router.ts |
| POST | /sessions/:sessionId/execute | server/routes/agent.router.ts |
| POST | /sessions/:sessionId/stream | server/routes/agent.router.ts |
| POST | /sessions/:sessionId/close | server/routes/agent.router.ts |
| POST | /files/read | server/routes/agent.router.ts |
| POST | /files/write | server/routes/agent.router.ts |
| POST | /files/delete | server/routes/agent.router.ts |
| POST | /files/list | server/routes/agent.router.ts |
| GET | /files/history/:sessionId | server/routes/agent.router.ts |
| POST | /commands/execute | server/routes/agent.router.ts |
| POST | /commands/kill | server/routes/agent.router.ts |
| GET | /commands/history/:sessionId | server/routes/agent.router.ts |
| GET | /tools | server/routes/agent.router.ts |
| POST | /tools/execute | server/routes/agent.router.ts |
| GET | /tools/history/:sessionId | server/routes/agent.router.ts |
| POST | /workflows/create | server/routes/agent.router.ts |
| POST | /workflows/generate | server/routes/agent.router.ts |
| GET | /workflows/:workflowId/status | server/routes/agent.router.ts |
| POST | /workflows/:workflowId/cancel | server/routes/agent.router.ts |
| POST | /workflows/:workflowId/restore | server/routes/agent.router.ts |
| GET | /context/:projectId | server/routes/agent.router.ts |
| GET | /stats/:sessionId | server/routes/agent.router.ts |
| POST | /schema/warm | server/routes/agent.router.ts |
| GET | /schema/status/:projectId | server/routes/agent.router.ts |
| GET | /schema/stream/:projectId | server/routes/agent.router.ts |
| POST | /attachments | server/routes/agent.router.ts |
| GET | / | server/routes/ai-health.ts |
| GET | /:provider | server/routes/ai-health.ts |
| POST | /clear-cache | server/routes/ai-health.ts |
| GET | /health | server/routes/ai-models.router.ts |
| GET | / | server/routes/ai-models.router.ts |
| GET | /preferred | server/routes/ai-models.router.ts |
| GET | /pricing | server/routes/ai-models.router.ts |
| POST | /preferred | server/routes/ai-models.router.ts |
| GET | /metrics/prometheus | server/routes/ai-optimization.router.ts |
| POST | /queue/enqueue | server/routes/ai-optimization.router.ts |
| POST | /queue/dequeue | server/routes/ai-optimization.router.ts |
| POST | /queue/complete | server/routes/ai-optimization.router.ts |
| POST | /queue/fail | server/routes/ai-optimization.router.ts |
| GET | /queue/stats | server/routes/ai-optimization.router.ts |
| GET | /circuit-breaker/status | server/routes/ai-optimization.router.ts |
| POST | /circuit-breaker/reset/:provider | server/routes/ai-optimization.router.ts |
| GET | /token-usage/summary | server/routes/ai-optimization.router.ts |
| GET | /token-usage/by-provider | server/routes/ai-optimization.router.ts |
| GET | /task-classification/stats | server/routes/ai-optimization.router.ts |
| GET | /dashboard | server/routes/ai-optimization.router.ts |
| GET | /prompt-cache/metrics | server/routes/ai-optimization.router.ts |
| POST | /prompt-cache/clear | server/routes/ai-optimization.router.ts |
| POST | /prompt-cache/warm | server/routes/ai-optimization.router.ts |
| POST | /batch/queue | server/routes/ai-optimization.router.ts |
| GET | /batch/status/:taskId | server/routes/ai-optimization.router.ts |
| GET | /batch/metrics | server/routes/ai-optimization.router.ts |
| GET | /latency/providers | server/routes/ai-optimization.router.ts |
| GET | /latency/models | server/routes/ai-optimization.router.ts |
| GET | /latency/provider/:provider | server/routes/ai-optimization.router.ts |
| POST | /latency/reset | server/routes/ai-optimization.router.ts |
| GET | /current | server/routes/ai-usage.router.ts |
| GET | /monthly | server/routes/ai-usage.router.ts |
| GET | /history | server/routes/ai-usage.router.ts |
| GET | /alerts | server/routes/ai-usage.router.ts |
| POST | /alerts | server/routes/ai-usage.router.ts |
| PATCH | /alerts/:id | server/routes/ai-usage.router.ts |
| GET | /budgets | server/routes/ai-usage.router.ts |
| POST | /budgets | server/routes/ai-usage.router.ts |
| GET | /admin/all | server/routes/ai-usage.router.ts |
| GET | /admin/stats | server/routes/ai-usage.router.ts |
| GET | /features | server/routes/ai.router.ts |
| GET | /openai/models | server/routes/ai.router.ts |
| GET | /opensource/models | server/routes/ai.router.ts |
| POST | /completion | server/routes/ai.router.ts |
| POST | /explanation | server/routes/ai.router.ts |
| POST | /convert | server/routes/ai.router.ts |
| POST | /documentation | server/routes/ai.router.ts |
| POST | /tests | server/routes/ai.router.ts |
| POST | /code-actions | server/routes/ai.router.ts |
| POST | /code-actions/stream | server/routes/ai.router.ts |
| POST | /generate | server/routes/ai.router.ts |
| POST | /openai/generate | server/routes/ai.router.ts |
| POST | /opensource/generate | server/routes/ai.router.ts |
| POST | /feedback | server/routes/ai.router.ts |
| POST | /:projectId/chat | server/routes/ai.router.ts |
| GET | /:projectId/history | server/routes/ai.router.ts |
| POST | /:projectId/suggestions | server/routes/ai.router.ts |
| GET | / | server/routes/analytics.router.ts |
| GET | /realtime | server/routes/analytics.router.ts |
| GET | /deployment/:deploymentId | server/routes/analytics.router.ts |
| GET | /weekly-activity | server/routes/analytics.router.ts |
| GET | /storage | server/routes/analytics.router.ts |
| POST | /register | server/routes/auth-complete.ts |
| POST | /verify-email | server/routes/auth-complete.ts |
| POST | /forgot-password | server/routes/auth-complete.ts |
| POST | /reset-password | server/routes/auth-complete.ts |
| GET | /google | server/routes/auth-complete.ts |
| GET | /google/callback | server/routes/auth-complete.ts |
| GET | /github | server/routes/auth-complete.ts |
| GET | /github/callback | server/routes/auth-complete.ts |
| USE | /register | server/routes/auth.router.ts |
| USE | /login | server/routes/auth.router.ts |
| USE | /logout | server/routes/auth.router.ts |
| USE | /auth | server/routes/auth.router.ts |
| USE | /verify-email | server/routes/auth.router.ts |
| USE | /resend-verification | server/routes/auth.router.ts |
| USE | /forgot-password | server/routes/auth.router.ts |
| USE | /reset-password | server/routes/auth.router.ts |
| GET | /me | server/routes/auth.router.ts |
| GET | /user | server/routes/auth.router.ts |
| POST | /register | server/routes/auth.router.ts |
| POST | /login | server/routes/auth.router.ts |
| POST | /logout | server/routes/auth.router.ts |
| POST | /login/2fa-complete | server/routes/auth.router.ts |
| GET | /auth/user | server/routes/auth.router.ts |
| POST | /auth/register | server/routes/auth.router.ts |
| POST | /auth/login | server/routes/auth.router.ts |
| POST | /auth/logout | server/routes/auth.router.ts |
| GET | /auth/check | server/routes/auth.router.ts |
| POST | /auth/revoke-token | server/routes/auth.router.ts |
| POST | /auth/revoke-all-tokens | server/routes/auth.router.ts |
| POST | /verify-email | server/routes/auth.router.ts |
| POST | /resend-verification | server/routes/auth.router.ts |
| POST | /forgot-password | server/routes/auth.router.ts |
| POST | /reset-password | server/routes/auth.router.ts |
| GET | /auth/ws-token | server/routes/auth.router.ts |
| GET | /projects/:projectId/auto-checkpoints | server/routes/auto-checkpoints.router.ts |
| POST | /projects/:projectId/auto-checkpoints | server/routes/auto-checkpoints.router.ts |
| GET | /auto-checkpoints/:id | server/routes/auto-checkpoints.router.ts |
| GET | /auto-checkpoints/:id/files | server/routes/auto-checkpoints.router.ts |
| POST | /auto-checkpoints/:id/files | server/routes/auto-checkpoints.router.ts |
| POST | /auto-checkpoints/:id/restore | server/routes/auto-checkpoints.router.ts |
| PATCH | /auto-checkpoints/:id | server/routes/auto-checkpoints.router.ts |
| DELETE | /auto-checkpoints/:id | server/routes/auto-checkpoints.router.ts |
| POST | /schedule | server/routes/background-tests.router.ts |
| GET | /status/:projectId | server/routes/background-tests.router.ts |
| GET | /all | server/routes/background-tests.router.ts |
| POST | / | server/routes/bounties.router.ts |
| GET | / | server/routes/bounties.router.ts |
| GET | /featured | server/routes/bounties.router.ts |
| GET | /my | server/routes/bounties.router.ts |
| GET | /:id | server/routes/bounties.router.ts |
| POST | /:id/apply | server/routes/bounties.router.ts |
| POST | /:id/assign | server/routes/bounties.router.ts |
| POST | /:id/submit | server/routes/bounties.router.ts |
| POST | /:id/complete | server/routes/bounties.router.ts |
| POST | /:id/cancel | server/routes/bounties.router.ts |
| POST | /:id/review | server/routes/bounties.router.ts |
| POST | /:id/rate | server/routes/bounties.router.ts |
| POST | /connect/onboard | server/routes/bounties.router.ts |
| GET | /connect/status | server/routes/bounties.router.ts |
| POST | /payment/confirm | server/routes/bounties.router.ts |
| USE | /admin/chatgpt | server/routes/chatgpt.router.ts |
| GET | /admin/check | server/routes/chatgpt.router.ts |
| GET | /admin/chatgpt/models | server/routes/chatgpt.router.ts |
| POST | /admin/chatgpt/stream | server/routes/chatgpt.router.ts |
| POST | /admin/chatgpt/sessions | server/routes/chatgpt.router.ts |
| GET | /admin/chatgpt/sessions | server/routes/chatgpt.router.ts |
| GET | /admin/chatgpt/sessions/:sessionId | server/routes/chatgpt.router.ts |
| POST | /admin/chatgpt/sessions/:sessionId/messages | server/routes/chatgpt.router.ts |
| POST | /admin/chatgpt/generate-code | server/routes/chatgpt.router.ts |
| DELETE | /admin/chatgpt/sessions/:sessionId/messages | server/routes/chatgpt.router.ts |
| DELETE | /admin/chatgpt/sessions/:sessionId | server/routes/chatgpt.router.ts |
| GET | /admin/chatgpt/projects | server/routes/chatgpt.router.ts |
| POST | /admin/chatgpt/sessions/:sessionId/stream | server/routes/chatgpt.router.ts |
| GET | /admin/chatgpt/all-projects | server/routes/chatgpt.router.ts |
| GET | /admin/chatgpt/projects/:projectId | server/routes/chatgpt.router.ts |
| GET | /admin/chatgpt/projects/:projectId/files | server/routes/chatgpt.router.ts |
| GET | /admin/chatgpt/projects/:projectId/files/:fileId | server/routes/chatgpt.router.ts |
| PUT | /admin/chatgpt/projects/:projectId/files/:fileId | server/routes/chatgpt.router.ts |
| GET | /admin/chatgpt/agent-sessions | server/routes/chatgpt.router.ts |
| POST | /admin/chatgpt/agent-sessions/:sessionId/terminate | server/routes/chatgpt.router.ts |
| GET | /admin/chatgpt/platform/tree | server/routes/chatgpt.router.ts |
| GET | /admin/chatgpt/platform/file | server/routes/chatgpt.router.ts |
| PUT | /admin/chatgpt/platform/file | server/routes/chatgpt.router.ts |
| GET | /admin/chatgpt/platform/stats | server/routes/chatgpt.router.ts |
| POST | /checkpoints | server/routes/checkpoints.router.ts |
| GET | /checkpoints/:id | server/routes/checkpoints.router.ts |
| GET | /projects/:projectId/checkpoints | server/routes/checkpoints.router.ts |
| POST | /checkpoints/:id/restore | server/routes/checkpoints.router.ts |
| POST | /checkpoints/rollback | server/routes/checkpoints.router.ts |
| POST | /checkpoints/rollforward | server/routes/checkpoints.router.ts |
| GET | /projects/:projectId/checkpoints/tree | server/routes/checkpoints.router.ts |
| GET | /projects/:projectId/checkpoints/navigation | server/routes/checkpoints.router.ts |
| DELETE | /checkpoints/:id | server/routes/checkpoints.router.ts |
| GET | /projects/:projectId/auto-checkpoints | server/routes/checkpoints.router.ts |
| GET | /auto-checkpoints/:id | server/routes/checkpoints.router.ts |
| POST | /projects/:projectId/auto-checkpoints | server/routes/checkpoints.router.ts |
| POST | /auto-checkpoints/:id/restore | server/routes/checkpoints.router.ts |
| GET | /projects/:projectId/auto-checkpoints/latest | server/routes/checkpoints.router.ts |
| GET | /projects/:projectId/auto-checkpoints/restore-history | server/routes/checkpoints.router.ts |
| POST | /generate | server/routes/code-generation.router.ts |
| GET | /models | server/routes/code-generation.router.ts |
| GET | /languages | server/routes/code-generation.router.ts |
| POST | /analyze | server/routes/code-review.router.ts |
| GET | /current | server/routes/code-review.router.ts |
| GET | /issues/:projectId | server/routes/code-review.router.ts |
| GET | /report/:projectId | server/routes/code-review.router.ts |
| POST | /fix/:issueId | server/routes/code-review.router.ts |
| POST | /generate-link | server/routes/collaboration.ts |
| GET | /sessions/:projectId | server/routes/collaboration.ts |
| GET | /sessions/:sessionId/participants | server/routes/collaboration.ts |
| POST | /join | server/routes/collaboration.ts |
| GET | /stats/:projectId | server/routes/collaboration.ts |
| POST | /invite | server/routes/collaboration.ts |
| GET | /active | server/routes/collaboration.ts |
| GET | /:projectId/users | server/routes/collaboration.ts |
| POST | /:projectId/invite | server/routes/collaboration.ts |
| PATCH | /:projectId/users/:collaboratorId | server/routes/collaboration.ts |
| DELETE | /:projectId/users/:collaboratorId | server/routes/collaboration.ts |
| GET | /sessions/:sessionId/messages | server/routes/collaboration.ts |
| POST | /sessions/:sessionId/messages | server/routes/collaboration.ts |
| GET | /:projectId/messages | server/routes/collaboration.ts |
| POST | /:projectId/messages | server/routes/collaboration.ts |
| GET | /categories | server/routes/community.router.ts |
| GET | /posts | server/routes/community.router.ts |
| GET | /challenges | server/routes/community.router.ts |
| GET | /leaderboard | server/routes/community.router.ts |
| POST | /posts/:postId/like | server/routes/community.router.ts |
| POST | /posts/:postId/bookmark | server/routes/community.router.ts |
| GET | /posts/:postId | server/routes/community.router.ts |
| POST | /posts/:postId/comments | server/routes/community.router.ts |
| GET | /top-developers | server/routes/community.router.ts |
| GET | /collections | server/routes/community.router.ts |
| GET | /activity | server/routes/community.router.ts |
| GET | /stats | server/routes/community.router.ts |
| POST | /projects/:projectId/container | server/routes/containers.ts |
| GET | /projects/:projectId/container/status | server/routes/containers.ts |
| DELETE | /projects/:projectId/container | server/routes/containers.ts |
| POST | /projects/:projectId/container/exec | server/routes/containers.ts |
| POST | /projects/:projectId/container/stop | server/routes/containers.ts |
| GET | /projects/:projectId/container/logs | server/routes/containers.ts |
| POST | /projects/:projectId/container/restart | server/routes/containers.ts |
| POST | /generate | server/routes/data-provisioning.router.ts |
| POST | /seed | server/routes/data-provisioning.router.ts |
| POST | /import | server/routes/data-provisioning.router.ts |
| POST | /fixtures | server/routes/data-provisioning.router.ts |
| POST | /migrate | server/routes/data-provisioning.router.ts |
| GET | /templates | server/routes/data-provisioning.router.ts |
| POST | /projects/:projectId/deploy | server/routes/deployment.ts |
| GET | /deployments/:deploymentId | server/routes/deployment.ts |
| GET | /projects/:projectId/deployments | server/routes/deployment.ts |
| GET | /projects/:projectId/deployments/stats | server/routes/deployment.ts |
| PUT | /deployments/:deploymentId | server/routes/deployment.ts |
| DELETE | /deployments/:deploymentId | server/routes/deployment.ts |
| POST | /deployments/:deploymentId/stop | server/routes/deployment.ts |
| POST | /deployments/:deploymentId/restart | server/routes/deployment.ts |
| POST | /deployments/:deploymentId/rollback | server/routes/deployment.ts |
| POST | /deployments/:deploymentId/logs/clear | server/routes/deployment.ts |
| POST | /deployments/:deploymentId/scale | server/routes/deployment.ts |
| GET | /deployments/:deploymentId/metrics | server/routes/deployment.ts |
| POST | /deployments/:deploymentId/domain | server/routes/deployment.ts |
| DELETE | /deployments/:deploymentId/domain | server/routes/deployment.ts |
| POST | /deployments/:deploymentId/ssl/renew | server/routes/deployment.ts |
| GET | /deployment/regions | server/routes/deployment.ts |
| GET | /deployment/types | server/routes/deployment.ts |
| POST | /projects/:projectId/publish | server/routes/deployment.ts |
| POST | /projects/:projectId/republish | server/routes/deployment.ts |
| GET | /projects/:projectId/publish/status | server/routes/deployment.ts |
| GET | /projects/:projectId/deployment/latest | server/routes/deployment.ts |
| GET | /deployments/:deploymentId/logs | server/routes/deployment.ts |
| GET | /projects/:projectId/deployments/analytics | server/routes/deployment.ts |
| POST | /projects/:projectId/domains | server/routes/deployment.ts |
| POST | /projects/:projectId/domains/verify | server/routes/deployment.ts |
| GET | /usage/:projectId | server/routes/effort.router.ts |
| GET | /:projectId | server/routes/env-vars.router.ts |
| POST | / | server/routes/env-vars.router.ts |
| PATCH | /:id | server/routes/env-vars.router.ts |
| DELETE | /:id | server/routes/env-vars.router.ts |
| POST | /:id/reveal | server/routes/env-vars.router.ts |
| GET | /:projectId/export | server/routes/env-vars.router.ts |
| POST | /:projectId/import | server/routes/env-vars.router.ts |
| POST | /session/:projectId | server/routes/expo-snack.router.ts |
| GET | /session/:projectId | server/routes/expo-snack.router.ts |
| PATCH | /session/:projectId/files | server/routes/expo-snack.router.ts |
| DELETE | /session/:projectId | server/routes/expo-snack.router.ts |
| GET | /sessions | server/routes/expo-snack.router.ts |
| POST | /embed | server/routes/expo-snack.router.ts |
| POST | /iframe-url | server/routes/expo-snack.router.ts |
| GET | /status | server/routes/expo-snack.router.ts |
| GET | / | server/routes/extensions.router.ts |
| GET | /marketplace | server/routes/extensions.router.ts |
| GET | /:projectId/installed | server/routes/extensions.router.ts |
| POST | /:projectId/install | server/routes/extensions.router.ts |
| DELETE | /:projectId/:extensionId | server/routes/extensions.router.ts |
| PATCH | /:projectId/:extensionId | server/routes/extensions.router.ts |
| GET | / | server/routes/feature-flags.router.ts |
| POST | /projects/:id/upload | server/routes/file-upload.ts |
| POST | /projects/:id/upload-multiple | server/routes/file-upload.ts |
| GET | /files/:id/download | server/routes/file-upload.ts |
| GET | /:projectId/files | server/routes/files.router.ts |
| GET | /:projectId/files/* | server/routes/files.router.ts |
| POST | /:projectId/files | server/routes/files.router.ts |
| PUT | /:projectId/files/* | server/routes/files.router.ts |
| DELETE | /:projectId/files/* | server/routes/files.router.ts |
| PATCH | /:projectId/files/by-id/:fileId | server/routes/files.router.ts |
| DELETE | /:projectId/files/by-id/:fileId | server/routes/files.router.ts |
| PATCH | /:fileId | server/routes/files.router.ts |
| PUT | /:fileId | server/routes/files.router.ts |
| DELETE | /:fileId | server/routes/files.router.ts |
| POST | /:projectId | server/routes/files.router.ts |
| POST | /:projectId/folders | server/routes/files.router.ts |
| GET | /:projectId/file-history | server/routes/files.router.ts |
| GET | /:projectId/files/:fileId/history | server/routes/files.router.ts |
| POST | /:projectId/files/:fileId/versions | server/routes/files.router.ts |
| POST | /:projectId/files/:fileId/versions/:versionId/restore | server/routes/files.router.ts |
| GET | /:projectId/files-with-history | server/routes/files.router.ts |
| GET | / | server/routes/generation-metrics.router.ts |
| GET | /racing | server/routes/generation-metrics.router.ts |
| GET | /recent | server/routes/generation-metrics.router.ts |
| GET | /:sessionId | server/routes/generation-metrics.router.ts |
| USE | /:projectId | server/routes/git-project.router.ts |
| GET | /:projectId/status | server/routes/git-project.router.ts |
| GET | /:projectId/branches | server/routes/git-project.router.ts |
| GET | /:projectId/commits | server/routes/git-project.router.ts |
| POST | /:projectId/init | server/routes/git-project.router.ts |
| POST | /:projectId/stage | server/routes/git-project.router.ts |
| POST | /:projectId/unstage | server/routes/git-project.router.ts |
| POST | /:projectId/commit | server/routes/git-project.router.ts |
| POST | /:projectId/push | server/routes/git-project.router.ts |
| POST | /:projectId/pull | server/routes/git-project.router.ts |
| POST | /:projectId/fetch | server/routes/git-project.router.ts |
| GET | /:projectId/remotes | server/routes/git-project.router.ts |
| POST | /:projectId/remotes | server/routes/git-project.router.ts |
| POST | /:projectId/clone | server/routes/git-project.router.ts |
| POST | /:projectId/branch | server/routes/git-project.router.ts |
| POST | /:projectId/checkout | server/routes/git-project.router.ts |
| GET | /:projectId/diff/:filePath(*) | server/routes/git-project.router.ts |
| POST | /:projectId/resolve-conflict | server/routes/git-project.router.ts |
| POST | /:projectId/complete-merge | server/routes/git-project.router.ts |
| POST | /:projectId/abort-merge | server/routes/git-project.router.ts |
| GET | /:projectId/backup-status | server/routes/git-project.router.ts |
| GET | /:projectId/backups | server/routes/git-project.router.ts |
| POST | /:projectId/backup | server/routes/git-project.router.ts |
| POST | /:projectId/backup/restore | server/routes/git-project.router.ts |
| GET | /status | server/routes/git.router.ts |
| GET | /diff/:filePath(*) | server/routes/git.router.ts |
| POST | /stage | server/routes/git.router.ts |
| POST | /unstage | server/routes/git.router.ts |
| POST | /commit | server/routes/git.router.ts |
| POST | /push | server/routes/git.router.ts |
| POST | /pull | server/routes/git.router.ts |
| POST | /fetch | server/routes/git.router.ts |
| GET | /github/status | server/routes/git.router.ts |
| GET | /github/connect | server/routes/git.router.ts |
| GET | /github/repos | server/routes/git.router.ts |
| POST | /github/disconnect | server/routes/git.router.ts |
| GET | /branches | server/routes/git.router.ts |
| POST | /branches | server/routes/git.router.ts |
| DELETE | /branches/:name(*) | server/routes/git.router.ts |
| POST | /checkout | server/routes/git.router.ts |
| POST | /merge | server/routes/git.router.ts |
| GET | /log | server/routes/git.router.ts |
| GET | /log/stream | server/routes/git.router.ts |
| GET | /diff/stream/:filePath(*) | server/routes/git.router.ts |
| GET | /remotes | server/routes/git.router.ts |
| POST | /remotes | server/routes/git.router.ts |
| GET | /blame/:filePath(*) | server/routes/git.router.ts |
| GET | / | server/routes/global-search.router.ts |
| POST | /global | server/routes/global-search.router.ts |
| POST | / | server/routes/global-search.router.ts |
| POST | /replace | server/routes/global-search.router.ts |
| GET | / | server/routes/global-themes.router.ts |
| GET | /settings | server/routes/global-themes.router.ts |
| GET | /installed | server/routes/global-themes.router.ts |
| PUT | /settings | server/routes/global-themes.router.ts |
| POST | /install | server/routes/global-themes.router.ts |
| POST | /create | server/routes/global-themes.router.ts |
| GET | /export | server/routes/global-themes.router.ts |
| POST | /import | server/routes/global-themes.router.ts |
| GET | /health | server/routes/health.router.ts |
| GET | /health/detailed | server/routes/health.router.ts |
| GET | /cors-health | server/routes/health.router.ts |
| GET | /liveness | server/routes/health.router.ts |
| GET | /health/liveness | server/routes/health.router.ts |
| GET | /monitoring/health | server/routes/health.router.ts |
| GET | /readiness | server/routes/health.router.ts |
| GET | /health/metrics | server/routes/health.router.ts |
| GET | /health/providers | server/routes/health.router.ts |
| GET | /health/runtimes | server/routes/health.router.ts |
| GET | /health | server/routes/health.ts |
| GET | /health/detailed | server/routes/health.ts |
| GET | /ready | server/routes/health.ts |
| GET | /alive | server/routes/health.ts |
| GET | /health/liveness | server/routes/health.ts |
| GET | /health/readiness | server/routes/health.ts |
| GET | /metrics | server/routes/health.ts |
| GET | /metrics/prometheus | server/routes/health.ts |
| USE | /api | server/routes/index.ts |
| USE | /api | server/routes/index.ts |
| USE | /api | server/routes/index.ts |
| USE | /api | server/routes/index.ts |
| USE | /api | server/routes/index.ts |
| GET | /api/csrf-token | server/routes/index.ts |
| GET | /api/auth/csrf-token | server/routes/index.ts |
| USE | /api | server/routes/index.ts |
| USE | /api | server/routes/index.ts |
| USE | /api | server/routes/index.ts |
| USE | /api/auth | server/routes/index.ts |
| USE | /api/2fa | server/routes/index.ts |
| USE | /api/users | server/routes/index.ts |
| USE | /api/user | server/routes/index.ts |
| USE | /api/projects | server/routes/index.ts |
| USE | /api/projects | server/routes/index.ts |
| USE | /api | server/routes/index.ts |
| USE | /api/agent | server/routes/index.ts |
| USE | /api/admin/agent | server/routes/index.ts |
| USE | /api/agent | server/routes/index.ts |
| USE | /api/agent | server/routes/index.ts |
| USE | /api/admin/agent | server/routes/index.ts |
| USE | /api/agent/plan | server/routes/index.ts |
| USE | /api/agent/build | server/routes/index.ts |
| USE | /api/agent | server/routes/index.ts |
| USE | /api/agent | server/routes/index.ts |
| USE | /api/agent | server/routes/index.ts |
| USE | /api/agent/step-cache | server/routes/index.ts |
| USE | /api/admin/agent | server/routes/index.ts |
| USE | /api | server/routes/index.ts |
| GET | /api/runner/status | server/routes/index.ts |
| USE | /api/collaboration | server/routes/index.ts |
| USE | /api | server/routes/index.ts |
| USE | /api | server/routes/index.ts |
| USE | /api/upload | server/routes/index.ts |
| USE | /api/notifications | server/routes/index.ts |
| USE | /api/preview | server/routes/index.ts |
| USE | /api/shell | server/routes/index.ts |
| USE | /api/containers | server/routes/index.ts |
| USE | /api/scalability | server/routes/index.ts |
| USE | /api | server/routes/index.ts |
| USE | /api/marketplace | server/routes/index.ts |
| USE | /api/community | server/routes/index.ts |
| USE | /api/teams | server/routes/index.ts |
| USE | /api | server/routes/index.ts |
| USE | /api/admin | server/routes/index.ts |
| USE | /api/admin/monitoring | server/routes/index.ts |
| USE | /api/admin/system | server/routes/index.ts |
| USE | /api/admin/billing | server/routes/index.ts |
| USE | /api/admin/seo | server/routes/index.ts |
| GET | /api/system/status | server/routes/index.ts |
| USE | /api/metrics/generation | server/routes/index.ts |
| USE | /api/ai | server/routes/index.ts |
| USE | /api | server/routes/index.ts |
| USE | /api/ai | server/routes/index.ts |
| USE | /api/usage | server/routes/index.ts |
| USE | /api/ai/usage | server/routes/index.ts |
| USE | /api/admin/ai-usage | server/routes/index.ts |
| USE | /api/models | server/routes/index.ts |
| USE | /api/ai/models | server/routes/index.ts |
| USE | /api/rag | server/routes/index.ts |
| USE | /api/memory-bank | server/routes/index.ts |
| USE | /api | server/routes/index.ts |
| USE | /api | server/routes/index.ts |
| USE | /api/ai/health | server/routes/index.ts |
| USE | /api/code-generation | server/routes/index.ts |
| USE | /api | server/routes/index.ts |
| USE | /api | server/routes/index.ts |
| USE | /api/voice-video | server/routes/index.ts |
| USE | /api/voice | server/routes/index.ts |
| USE | /api/data-provisioning | server/routes/index.ts |
| USE | /api | server/routes/index.ts |
| USE | /api/terminal | server/routes/index.ts |
| USE | /api | server/routes/index.ts |
| USE | /api/packages | server/routes/index.ts |
| USE | /api/projects | server/routes/index.ts |
| USE | /api/code-review | server/routes/index.ts |
| USE | /api/workspace | server/routes/index.ts |
| USE | /api/workspace | server/routes/index.ts |
| USE | /api | server/routes/index.ts |
| USE | /api/mobile | server/routes/index.ts |
| USE | /api/mobile | server/routes/index.ts |
| USE | /api/expo-snack | server/routes/index.ts |
| USE | /api/git | server/routes/index.ts |
| USE | /api/git | server/routes/index.ts |
| USE | /api/debug | server/routes/index.ts |
| USE | /api/admin/database | server/routes/index.ts |
| USE | /api/database | server/routes/index.ts |
| USE | /api/db | server/routes/index.ts |
| USE | /api/kv-store | server/routes/index.ts |
| USE | /api/projects | server/routes/index.ts |
| USE | /api/search | server/routes/index.ts |
| USE | /api/projects | server/routes/index.ts |
| USE | /api/logs | server/routes/index.ts |
| USE | /api/env-vars | server/routes/index.ts |
| USE | /api | server/routes/index.ts |
| USE | /api/ssh-keys | server/routes/index.ts |
| USE | /api/projects | server/routes/index.ts |
| USE | /api/projects/:projectId/secrets | server/routes/index.ts |
| USE | /api/projects/:projectId/themes | server/routes/index.ts |
| USE | /api/themes | server/routes/index.ts |
| USE | /api/projects/:projectId/settings | server/routes/index.ts |
| USE | /api/projects/:projectId/storage | server/routes/index.ts |
| USE | /api/extensions | server/routes/index.ts |
| USE | /api/workflows | server/routes/index.ts |
| USE | /api/projects | server/routes/index.ts |
| USE | /api/projects | server/routes/index.ts |
| USE | /api/projects | server/routes/index.ts |
| USE | /api/projects | server/routes/index.ts |
| USE | /api/mcp | server/routes/index.ts |
| USE | /api/sync | server/routes/index.ts |
| USE | /api/background-tests | server/routes/index.ts |
| USE | /api/autonomy | server/routes/index.ts |
| USE | /api/bounties | server/routes/index.ts |
| USE | /api/effort | server/routes/index.ts |
| USE | /api/agent-grid | server/routes/index.ts |
| USE | /api | server/routes/index.ts |
| USE | /api/webhooks | server/routes/index.ts |
| USE | /api | server/routes/index.ts |
| USE | /api | server/routes/index.ts |
| USE | /api/runner | server/routes/index.ts |
| USE | /api/workspaces | server/routes/index.ts |
| USE | /api/project-auth | server/routes/index.ts |
| USE | /api/screenshots | server/routes/index.ts |
| USE | /projects/:projectId/integrations | server/routes/integrations.router.ts |
| USE | /projects/:projectId/integrations | server/routes/integrations.router.ts |
| GET | /integrations/catalog | server/routes/integrations.router.ts |
| GET | /user/connections | server/routes/integrations.router.ts |
| GET | /projects/:projectId/integrations | server/routes/integrations.router.ts |
| GET | /projects/:projectId/integrations/:integrationId/logs | server/routes/integrations.router.ts |
| POST | /projects/:projectId/integrations | server/routes/integrations.router.ts |
| DELETE | /projects/:projectId/integrations/:integrationId | server/routes/integrations.router.ts |
| POST | /projects/:projectId/integrations/oauth/start | server/routes/integrations.router.ts |
| POST | /projects/:projectId/integrations/:integrationId/test | server/routes/integrations.router.ts |
| GET | / | server/routes/kv-store.router.ts |
| GET | /stats | server/routes/kv-store.router.ts |
| POST | / | server/routes/kv-store.router.ts |
| PUT | /:key | server/routes/kv-store.router.ts |
| DELETE | /bulk | server/routes/kv-store.router.ts |
| DELETE | /:key | server/routes/kv-store.router.ts |
| POST | /import | server/routes/kv-store.router.ts |
| POST | /load-test/comprehensive | server/routes/load-testing.router.ts |
| POST | /load-test/ai-streaming | server/routes/load-testing.router.ts |
| POST | /load-test/database | server/routes/load-testing.router.ts |
| POST | /load-test/websocket | server/routes/load-testing.router.ts |
| GET | /load-test/metrics | server/routes/load-testing.router.ts |
| GET | / | server/routes/logs-viewer.router.ts |
| POST | /export | server/routes/logs-viewer.router.ts |
| GET | /stats | server/routes/logs-viewer.router.ts |
| POST | /logs/ingest | server/routes/logs.router.ts |
| GET | /logs/query | server/routes/logs.router.ts |
| GET | /logs/recent | server/routes/logs.router.ts |
| GET | /logs/search | server/routes/logs.router.ts |
| GET | /logs/request/:requestId | server/routes/logs.router.ts |
| GET | /logs/correlation/:correlationId | server/routes/logs.router.ts |
| GET | /logs/stats | server/routes/logs.router.ts |
| GET | /logs/errors | server/routes/logs.router.ts |
| GET | /logs/export | server/routes/logs.router.ts |
| POST | /logs/clear | server/routes/logs.router.ts |
| GET | /templates | server/routes/marketplace.ts |
| GET | /template/:id | server/routes/marketplace.ts |
| GET | /template/:id/reviews | server/routes/marketplace.ts |
| GET | /template/:id/similar | server/routes/marketplace.ts |
| POST | /rate/:id | server/routes/marketplace.ts |
| GET | /trending | server/routes/marketplace.ts |
| GET | /categories | server/routes/marketplace.ts |
| GET | /collections | server/routes/marketplace.ts |
| GET | /collection/:id | server/routes/marketplace.ts |
| POST | /template/:id/use | server/routes/marketplace.ts |
| POST | /template/:id/star | server/routes/marketplace.ts |
| POST | /template | server/routes/marketplace.ts |
| GET | /stats | server/routes/marketplace.ts |
| GET | /tags | server/routes/marketplace.ts |
| GET | /extensions | server/routes/marketplace.ts |
| POST | /template/:id/fork | server/routes/marketplace.ts |
| POST | /template/:id/deploy | server/routes/marketplace.ts |
| GET | /publishers | server/routes/marketplace.ts |
| GET | /orchestrator/health | server/routes/max-autonomy.router.ts |
| POST | /sessions | server/routes/max-autonomy.router.ts |
| GET | /sessions/:id | server/routes/max-autonomy.router.ts |
| POST | /sessions/:id/pause | server/routes/max-autonomy.router.ts |
| POST | /sessions/:id/resume | server/routes/max-autonomy.router.ts |
| POST | /sessions/:id/stop | server/routes/max-autonomy.router.ts |
| GET | /sessions/:id/tasks | server/routes/max-autonomy.router.ts |
| GET | /sessions/:id/progress | server/routes/max-autonomy.router.ts |
| GET | /sessions | server/routes/max-autonomy.router.ts |
| GET | /projects/:projectId/session | server/routes/max-autonomy.router.ts |
| GET | /health | server/routes/max-autonomy.router.ts |
| GET | /sessions/:id/messages | server/routes/max-autonomy.router.ts |
| POST | /sessions/:id/messages | server/routes/max-autonomy.router.ts |
| DELETE | /sessions/:id/messages/:messageId | server/routes/max-autonomy.router.ts |
| PATCH | /sessions/:id/messages/:messageId/priority | server/routes/max-autonomy.router.ts |
| GET | /:projectId/mcp/servers | server/routes/mcp-servers.router.ts |
| POST | /:projectId/mcp/servers | server/routes/mcp-servers.router.ts |
| PUT | /:projectId/mcp/servers/:serverId | server/routes/mcp-servers.router.ts |
| DELETE | /:projectId/mcp/servers/:serverId | server/routes/mcp-servers.router.ts |
| POST | /:projectId/mcp/servers/test-remote | server/routes/mcp-servers.router.ts |
| POST | /:projectId/mcp/servers/:serverId/test | server/routes/mcp-servers.router.ts |
| POST | /:projectId/mcp/servers/:serverId/connect | server/routes/mcp-servers.router.ts |
| GET | /:projectId/mcp/servers/:serverId/tools | server/routes/mcp-servers.router.ts |
| POST | /:projectId/mcp/init-builtin | server/routes/mcp-servers.router.ts |
| GET | /:projectId/mcp/tools | server/routes/mcp-servers.router.ts |
| POST | /:projectId/mcp/servers/:serverId/start | server/routes/mcp-servers.router.ts |
| POST | /:projectId/mcp/servers/:serverId/stop | server/routes/mcp-servers.router.ts |
| POST | /:projectId/mcp/servers/:serverId/restart | server/routes/mcp-servers.router.ts |
| GET | /:projectId/mcp/servers/:serverId/logs | server/routes/mcp-servers.router.ts |
| GET | / | server/routes/memory-bank.router.ts |
| GET | /:projectId | server/routes/memory-bank.router.ts |
| GET | /:projectId/status | server/routes/memory-bank.router.ts |
| GET | /:projectId/context | server/routes/memory-bank.router.ts |
| GET | /:projectId/files/:filename | server/routes/memory-bank.router.ts |
| PUT | /:projectId/files/:filename | server/routes/memory-bank.router.ts |
| DELETE | /:projectId/files/:filename | server/routes/memory-bank.router.ts |
| POST | /:projectId/log-change | server/routes/memory-bank.router.ts |
| GET | /templates | server/routes/memory-bank.router.ts |
| POST | /builds | server/routes/mobile-builds.router.ts |
| GET | /builds | server/routes/mobile-builds.router.ts |
| GET | /builds/:buildId | server/routes/mobile-builds.router.ts |
| GET | /builds/:buildId/artifact | server/routes/mobile-builds.router.ts |
| DELETE | /builds/:buildId | server/routes/mobile-builds.router.ts |
| GET | /config | server/routes/mobile-builds.router.ts |
| GET | /sessions | server/routes/mobile-sessions.router.ts |
| POST | /sessions | server/routes/mobile-sessions.router.ts |
| PATCH | /sessions/:deviceId | server/routes/mobile-sessions.router.ts |
| POST | /push-token | server/routes/mobile-sessions.router.ts |
| DELETE | /sessions/:deviceId | server/routes/mobile-sessions.router.ts |
| GET | /monitoring/metrics | server/routes/monitoring.router.ts |
| GET | /monitoring/metrics/:name/history | server/routes/monitoring.router.ts |
| GET | /monitoring/health | server/routes/monitoring.router.ts |
| GET | /monitoring/health/summary | server/routes/monitoring.router.ts |
| GET | /monitoring/cache/stats | server/routes/monitoring.router.ts |
| POST | /monitoring/cache/flush | server/routes/monitoring.router.ts |
| GET | /monitoring/alerts | server/routes/monitoring.router.ts |
| GET | /monitoring/slow-endpoints | server/routes/monitoring.router.ts |
| GET | /:projectId/networking/ports | server/routes/networking.router.ts |
| POST | /:projectId/networking/ports | server/routes/networking.router.ts |
| PATCH | /:projectId/networking/ports/:id | server/routes/networking.router.ts |
| DELETE | /:projectId/networking/ports/:id | server/routes/networking.router.ts |
| POST | /:projectId/networking/ports/scan | server/routes/networking.router.ts |
| GET | /:projectId/networking/domains | server/routes/networking.router.ts |
| POST | /:projectId/networking/domains | server/routes/networking.router.ts |
| POST | /:projectId/networking/domains/:id/verify | server/routes/networking.router.ts |
| DELETE | /:projectId/networking/domains/:id | server/routes/networking.router.ts |
| GET | / | server/routes/notifications.ts |
| GET | /unread-count | server/routes/notifications.ts |
| GET | /preferences | server/routes/notifications.ts |
| GET | /settings | server/routes/notifications.ts |
| PATCH | /preferences | server/routes/notifications.ts |
| PUT | /preferences | server/routes/notifications.ts |
| PATCH | /settings | server/routes/notifications.ts |
| PUT | /settings | server/routes/notifications.ts |
| PATCH | /:id/read | server/routes/notifications.ts |
| PUT | /:id/read | server/routes/notifications.ts |
| PATCH | /read-all | server/routes/notifications.ts |
| PUT | /read-all | server/routes/notifications.ts |
| DELETE | /:id | server/routes/notifications.ts |
| DELETE | / | server/routes/notifications.ts |
| POST | / | server/routes/notifications.ts |
| POST | /:projectId/install | server/routes/packages.router.ts |
| POST | /:projectId/uninstall | server/routes/packages.router.ts |
| GET | /installed | server/routes/packages.router.ts |
| GET | /:projectId/search/:query? | server/routes/packages.router.ts |
| POST | /:projectId/update | server/routes/packages.router.ts |
| GET | /:projectId/list | server/routes/packages.router.ts |
| DELETE | /:projectId/:packageName | server/routes/packages.router.ts |
| GET | /:projectId/audit | server/routes/packages.router.ts |
| GET | /:projectId/outdated | server/routes/packages.router.ts |
| GET | /:projectId/dependencies | server/routes/packages.router.ts |
| GET | /search | server/routes/packages.router.ts |
| GET | /plans | server/routes/payments.router.ts |
| POST | /create-subscription | server/routes/payments.router.ts |
| POST | /cancel-subscription | server/routes/payments.router.ts |
| POST | /update-subscription | server/routes/payments.router.ts |
| POST | /create-checkout-session | server/routes/payments.router.ts |
| POST | /create-payment-intent | server/routes/payments.router.ts |
| POST | /webhook | server/routes/payments.router.ts |
| GET | /subscription-status | server/routes/payments.router.ts |
| GET | /credits-status | server/routes/payments.router.ts |
| GET | /billing-history | server/routes/payments.router.ts |
| POST | /record-usage | server/routes/payments.router.ts |
| GET | /queue-health | server/routes/payments.router.ts |
| POST | /queue-retry | server/routes/payments.router.ts |
| POST | /subscribe | server/routes/payments.router.ts |
| POST | /cancel | server/routes/payments.router.ts |
| GET | /subscription | server/routes/payments.router.ts |
| GET | /skills/:projectId | server/routes/phantom-panels.router.ts |
| POST | /skills/:projectId | server/routes/phantom-panels.router.ts |
| PUT | /skills/:id | server/routes/phantom-panels.router.ts |
| DELETE | /skills/:id | server/routes/phantom-panels.router.ts |
| POST | /skills/:projectId/upload | server/routes/phantom-panels.router.ts |
| GET | /projects/:projectId/feedback | server/routes/phantom-panels.router.ts |
| PATCH | /projects/:projectId/feedback/:id | server/routes/phantom-panels.router.ts |
| DELETE | /projects/:projectId/feedback/:id | server/routes/phantom-panels.router.ts |
| GET | /projects/:projectId/slides | server/routes/phantom-panels.router.ts |
| PUT | /projects/:projectId/slides | server/routes/phantom-panels.router.ts |
| GET | /avatar/:name/:size? | server/routes/placeholder.router.ts |
| GET | /placeholder/:width/:height | server/routes/placeholder.router.ts |
| GET | /placeholder/:dimensions | server/routes/placeholder.router.ts |
| GET | /url | server/routes/preview.ts |
| GET | /projects/:id/preview | server/routes/preview.ts |
| GET | /projects/:id/preview/ | server/routes/preview.ts |
| GET | /projects/:id/preview/status | server/routes/preview.ts |
| POST | /projects/:id/preview/start | server/routes/preview.ts |
| POST | /projects/:id/preview/stop | server/routes/preview.ts |
| POST | /projects/:id/preview/switch-port | server/routes/preview.ts |
| GET | /projects/:id/preview/:filepath(*) | server/routes/preview.ts |
| GET | /projects/:id/preview-url | server/routes/preview.ts |
| GET | /:projectId/config | server/routes/project-auth.router.ts |
| PUT | /:projectId/config | server/routes/project-auth.router.ts |
| GET | /:projectId/users | server/routes/project-auth.router.ts |
| DELETE | /:projectId/users/:userId | server/routes/project-auth.router.ts |
| GET | /:projectId/monitoring/metrics | server/routes/project-monitoring.router.ts |
| GET | /:projectId/monitoring/summary | server/routes/project-monitoring.router.ts |
| GET | /:projectId/monitoring/alerts | server/routes/project-monitoring.router.ts |
| POST | /:projectId/monitoring/record | server/routes/project-monitoring.router.ts |
| POST | /:projectId/monitoring/alerts | server/routes/project-monitoring.router.ts |
| DELETE | /:projectId/monitoring/alerts/:alertId | server/routes/project-monitoring.router.ts |
| GET | /:projectId/search | server/routes/project-search.router.ts |
| GET | /:projectId/files | server/routes/project-search.router.ts |
| GET | / | server/routes/projects.router.ts |
| GET | /explore | server/routes/projects.router.ts |
| POST | / | server/routes/projects.router.ts |
| GET | /:projectId | server/routes/projects.router.ts |
| PUT | /:projectId | server/routes/projects.router.ts |
| DELETE | /:projectId | server/routes/projects.router.ts |
| GET | /u/:username/:slug | server/routes/projects.router.ts |
| POST | /:id/ai/chat | server/routes/projects.router.ts |
| POST | /:id/ai/approve/:actionId | server/routes/projects.router.ts |
| POST | /:id/ai/reject/:actionId | server/routes/projects.router.ts |
| GET | /:projectId/visual-edits | server/routes/projects.router.ts |
| POST | /:projectId/visual-edit | server/routes/projects.router.ts |
| POST | /:projectId/visual-edit/undo | server/routes/projects.router.ts |
| POST | /:projectId/visual-edit/redo | server/routes/projects.router.ts |
| GET | /:projectId/creation-progress | server/routes/projects.router.ts |
| GET | /:id/stats | server/routes/projects.router.ts |
| GET | /:id/ai/pending | server/routes/projects.router.ts |
| GET | /metrics | server/routes/prometheus.router.ts |
| POST | /contact | server/routes/public-forms.router.ts |
| POST | /contact/sales | server/routes/public-forms.router.ts |
| POST | /newsletter/subscribe | server/routes/public-forms.router.ts |
| POST | /newsletter/unsubscribe | server/routes/public-forms.router.ts |
| GET | /stats | server/routes/rag.router.ts |
| GET | /context/:sessionId | server/routes/rag.router.ts |
| POST | /session-config | server/routes/rag.router.ts |
| GET | /session-config/:sessionId | server/routes/rag.router.ts |
| POST | /index | server/routes/rag.router.ts |
| POST | /search | server/routes/rag.router.ts |
| GET | /models | server/routes/rag.router.ts |
| GET | /resources | server/routes/resources.router.ts |
| GET | /deployments/:deploymentId/snapshots | server/routes/rollback.router.ts |
| GET | /deployments/:deploymentId/snapshots/:snapshotId | server/routes/rollback.router.ts |
| POST | /deployments/:deploymentId/rollback | server/routes/rollback.router.ts |
| GET | /deployments/:deploymentId/rollback/status | server/routes/rollback.router.ts |
| POST | /deployments/:deploymentId/snapshot | server/routes/rollback.router.ts |
| POST | /deployments/:deploymentId/rollback/cancel | server/routes/rollback.router.ts |
| GET | /deployments/:deploymentId/diff | server/routes/rollback.router.ts |
| GET | /deployments/:deploymentId/rollback/history | server/routes/rollback.router.ts |
| GET | /status | server/routes/runner-workspaces.router.ts |
| GET | /workspaces/:projectId | server/routes/runner-workspaces.router.ts |
| POST | /workspaces/:projectId | server/routes/runner-workspaces.router.ts |
| DELETE | /workspaces/:projectId | server/routes/runner-workspaces.router.ts |
| GET | /workspaces/:projectId/token | server/routes/runner-workspaces.router.ts |
| USE | /preview/:workspaceId | server/routes/runner-workspaces.router.ts |
| GET | /runtime/public/dependencies | server/routes/runtime.router.ts |
| GET | /runtime/dashboard | server/routes/runtime.router.ts |
| POST | /projects/:id/runtime/start | server/routes/runtime.router.ts |
| POST | /projects/:id/runtime/stop | server/routes/runtime.router.ts |
| GET | /projects/:id/runtime | server/routes/runtime.router.ts |
| POST | /projects/:id/runtime/execute | server/routes/runtime.router.ts |
| GET | /projects/:id/runtime/logs | server/routes/runtime.router.ts |
| POST | /runtime/start | server/routes/runtime.router.ts |
| POST | /runtime/stop | server/routes/runtime.router.ts |
| GET | /runtime/dependencies | server/routes/runtime.router.ts |
| GET | /runtime/:projectId | server/routes/runtime.router.ts |
| POST | /runtime/:projectId/start | server/routes/runtime.router.ts |
| POST | /runtime/:projectId/stop | server/routes/runtime.router.ts |
| POST | /runtime/:projectId/execute | server/routes/runtime.router.ts |
| GET | /runtime/:projectId/logs | server/routes/runtime.router.ts |
| POST | /execute | server/routes/runtime.router.ts |
| POST | /projects/:id/execute-direct | server/routes/runtime.router.ts |
| GET | /execute/languages | server/routes/runtime.router.ts |
| GET | /cluster/status | server/routes/scalability.ts |
| POST | /cluster/containers | server/routes/scalability.ts |
| DELETE | /cluster/containers/:containerId | server/routes/scalability.ts |
| POST | /cluster/route | server/routes/scalability.ts |
| GET | /cache/:key | server/routes/scalability.ts |
| POST | /cache | server/routes/scalability.ts |
| DELETE | /cache/:key | server/routes/scalability.ts |
| GET | /database/pool/stats | server/routes/scalability.ts |
| GET | /cdn/status | server/routes/scalability.ts |
| POST | /cdn/purge | server/routes/scalability.ts |
| GET | /health/lb | server/routes/scalability.ts |
| GET | /:projectId | server/routes/screenshots.router.ts |
| POST | /:projectId/capture | server/routes/screenshots.router.ts |
| GET | /:id/download | server/routes/screenshots.router.ts |
| DELETE | /:id | server/routes/screenshots.router.ts |
| GET | / | server/routes/secrets.router.ts |
| POST | / | server/routes/secrets.router.ts |
| PATCH | /:id | server/routes/secrets.router.ts |
| DELETE | /:id | server/routes/secrets.router.ts |
| POST | /:id/reveal | server/routes/secrets.router.ts |
| GET | /analytics | server/routes/seo.router.ts |
| GET | / | server/routes/settings.router.ts |
| PUT | / | server/routes/settings.router.ts |
| POST | /:projectId/shell/create | server/routes/shell.router.ts |
| GET | /:projectId/shell/sessions | server/routes/shell.router.ts |
| DELETE | /:projectId/shell/:sessionId | server/routes/shell.router.ts |
| GET | /:projectId/shell/:sessionId/status | server/routes/shell.router.ts |
| GET | /sessions | server/routes/shell.ts |
| POST | /sessions | server/routes/shell.ts |
| DELETE | /sessions/:sessionId | server/routes/shell.ts |
| POST | /generate-command | server/routes/shell.ts |
| POST | /clear | server/routes/shell.ts |
| GET | /sitemap.xml | server/routes/sitemap.router.ts |
| GET | /sitemap-index.xml | server/routes/sitemap.router.ts |
| GET | /sitemap-blog.xml | server/routes/sitemap.router.ts |
| GET | / | server/routes/slack-config.router.ts |
| PUT | / | server/routes/slack-config.router.ts |
| POST | /test | server/routes/slack-config.router.ts |
| GET | / | server/routes/ssh-keys.router.ts |
| POST | / | server/routes/ssh-keys.router.ts |
| DELETE | /:id | server/routes/ssh-keys.router.ts |
| GET | /status | server/routes/status.router.ts |
| GET | /status/services | server/routes/status.router.ts |
| GET | /status/incidents | server/routes/status.router.ts |
| GET | /status/maintenance | server/routes/status.router.ts |
| GET | /status/metrics | server/routes/status.router.ts |
| GET | /status/uptime | server/routes/status.router.ts |
| GET | / | server/routes/storage.router.ts |
| POST | /upload | server/routes/storage.router.ts |
| POST | /folder | server/routes/storage.router.ts |
| GET | /:path(*)/download | server/routes/storage.router.ts |
| GET | /:path(*)/url | server/routes/storage.router.ts |
| DELETE | /:path(*) | server/routes/storage.router.ts |
| GET | /workspace | server/routes/sync.ts |
| PUT | /workspace | server/routes/sync.ts |
| GET | /preferences | server/routes/sync.ts |
| PUT | /preferences | server/routes/sync.ts |
| GET | /devices | server/routes/sync.ts |
| POST | /devices | server/routes/sync.ts |
| PUT | /devices/:deviceId | server/routes/sync.ts |
| DELETE | /devices/:deviceId | server/routes/sync.ts |
| GET | /status | server/routes/sync.ts |
| GET | / | server/routes/teams.router.ts |
| GET | /invitations | server/routes/teams.router.ts |
| POST | / | server/routes/teams.router.ts |
| GET | /:id | server/routes/teams.router.ts |
| PATCH | /:id | server/routes/teams.router.ts |
| DELETE | /:id | server/routes/teams.router.ts |
| GET | /:id/members | server/routes/teams.router.ts |
| POST | /:id/invitations | server/routes/teams.router.ts |
| POST | /invitations/:invitationId/accept | server/routes/teams.router.ts |
| POST | /invitations/:invitationId/decline | server/routes/teams.router.ts |
| DELETE | /:id/members/:userId | server/routes/teams.router.ts |
| PATCH | /:id/members/:userId | server/routes/teams.router.ts |
| GET | /:id/projects | server/routes/teams.router.ts |
| GET | /:id/workspaces | server/routes/teams.router.ts |
| POST | /:id/workspaces | server/routes/teams.router.ts |
| GET | / | server/routes/templates.ts |
| GET | /featured | server/routes/templates.ts |
| GET | /:id | server/routes/templates.ts |
| POST | / | server/routes/templates.ts |
| PATCH | /:id | server/routes/templates.ts |
| DELETE | /:id | server/routes/templates.ts |
| GET | /categories | server/routes/templates.ts |
| POST | /:id/rate | server/routes/templates.ts |
| POST | /:id/use | server/routes/templates.ts |
| GET | /:id/preview | server/routes/templates.ts |
| POST | /:id/fork | server/routes/templates.ts |
| GET | /:id/forks | server/routes/templates.ts |
| GET | /:id/ratings | server/routes/templates.ts |
| GET | /collections | server/routes/templates.ts |
| GET | /collections/:id | server/routes/templates.ts |
| GET | /suggestions | server/routes/templates.ts |
| GET | /metrics | server/routes/terminal-metrics.router.ts |
| GET | /health | server/routes/terminal-metrics.router.ts |
| GET | /logs | server/routes/terminal.router.ts |
| POST | /logs | server/routes/terminal.router.ts |
| DELETE | /logs | server/routes/terminal.router.ts |
| POST | /sync | server/routes/terminal.router.ts |
| GET | /workspace-path | server/routes/terminal.router.ts |
| POST | /test/agent | server/routes/test-agent.ts |
| GET | /test/agent/health | server/routes/test-agent.ts |
| GET | / | server/routes/themes.router.ts |
| PUT | / | server/routes/themes.router.ts |
| GET | /projects/:projectId/checkpoints | server/routes/unified-checkpoints.router.ts |
| POST | /projects/:projectId/checkpoints | server/routes/unified-checkpoints.router.ts |
| GET | /projects/:projectId/checkpoints/:checkpointId | server/routes/unified-checkpoints.router.ts |
| POST | /projects/:projectId/checkpoints/:checkpointId/restore | server/routes/unified-checkpoints.router.ts |
| GET | /projects/:projectId/checkpoints/:checkpointId/files | server/routes/unified-checkpoints.router.ts |
| DELETE | /projects/:projectId/checkpoints/:checkpointId | server/routes/unified-checkpoints.router.ts |
| PATCH | /projects/:projectId/checkpoints/:checkpointId | server/routes/unified-checkpoints.router.ts |
| POST | /projects/:projectId/checkpoints/:checkpointId/files | server/routes/unified-checkpoints.router.ts |
| GET | /me | server/routes/users.router.ts |
| GET | /search | server/routes/users.router.ts |
| GET | /username/:username | server/routes/users.router.ts |
| GET | /usage | server/routes/users.router.ts |
| GET | /billing | server/routes/users.router.ts |
| GET | /billing-summary | server/routes/users.router.ts |
| GET | /:id/subscription | server/routes/users.router.ts |
| GET | /:id/usage | server/routes/users.router.ts |
| GET | /:id | server/routes/users.router.ts |
| PUT | /:id | server/routes/users.router.ts |
| DELETE | /:id | server/routes/users.router.ts |
| GET | /:projectId/video | server/routes/video.router.ts |
| PUT | /:projectId/video | server/routes/video.router.ts |
| GET | /:projectId/video/export | server/routes/video.router.ts |
| POST | /transcribe | server/routes/voice-transcribe.router.ts |
| POST | /tts | server/routes/voice-transcribe.router.ts |
| POST | /sessions | server/routes/voice-video.router.ts |
| GET | /projects/:projectId/sessions | server/routes/voice-video.router.ts |
| GET | /sessions/:roomId | server/routes/voice-video.router.ts |
| POST | /sessions/:roomId/end | server/routes/voice-video.router.ts |
| POST | /sessions/:roomId/recording | server/routes/voice-video.router.ts |
| GET | /sessions/:roomId/stats | server/routes/voice-video.router.ts |
| POST | /sendgrid | server/routes/webhooks-sendgrid.router.ts |
| GET | /metrics | server/routes/websocket-metrics.router.ts |
| POST | /metrics/reset | server/routes/websocket-metrics.router.ts |
| DELETE | /cache | server/routes/websocket-metrics.router.ts |
| POST | /bootstrap | server/routes/workspace-bootstrap.router.ts |
| GET | /bootstrap/:token/status | server/routes/workspace-bootstrap.router.ts |
| GET | /bootstrap/metrics | server/routes/workspace-bootstrap.router.ts |
| GET | /bootstrap/fast-check | server/routes/workspace-bootstrap.router.ts |
| USE | /projects/:projectId | server/routes/workspace.ts |
| GET | /projects/:projectId/diagnostics | server/routes/workspace.ts |
| GET | /projects/:projectId/diagnostics/stats | server/routes/workspace.ts |
| POST | /projects/:projectId/diagnostics | server/routes/workspace.ts |
| PATCH | /diagnostics/:id | server/routes/workspace.ts |
| DELETE | /diagnostics/:id | server/routes/workspace.ts |
| DELETE | /projects/:projectId/diagnostics | server/routes/workspace.ts |
| GET | /projects/:projectId/build-logs | server/routes/workspace.ts |
| POST | /projects/:projectId/build-logs | server/routes/workspace.ts |
| DELETE | /projects/:projectId/build-logs | server/routes/workspace.ts |
| GET | /projects/:projectId/tests/detect | server/routes/workspace.ts |
| POST | /projects/:projectId/tests/run | server/routes/workspace.ts |
| GET | /projects/:projectId/test-runs | server/routes/workspace.ts |
| GET | /test-runs/:id | server/routes/workspace.ts |
| POST | /projects/:projectId/test-runs | server/routes/workspace.ts |
| PATCH | /test-runs/:id | server/routes/workspace.ts |
| GET | /projects/:projectId/resource-metrics | server/routes/workspace.ts |
| GET | /projects/:projectId/resource-metrics/latest | server/routes/workspace.ts |
| GET | /projects/:projectId/security-scans | server/routes/workspace.ts |
| GET | /security-scans/:id | server/routes/workspace.ts |
| POST | /projects/:projectId/security-scans | server/routes/workspace.ts |
| PATCH | /security-scans/:id | server/routes/workspace.ts |
| GET | /security-scans/:scanId/vulnerabilities | server/routes/workspace.ts |
| GET | /projects/:projectId/vulnerabilities | server/routes/workspace.ts |
| POST | /security-scans/:scanId/vulnerabilities | server/routes/workspace.ts |
| PATCH | /vulnerabilities/:id | server/routes/workspace.ts |
| GET | /projects/:projectId/vulnerabilities/by-hidden | server/routes/workspace.ts |
| PATCH | /vulnerabilities/:id/hide | server/routes/workspace.ts |
| GET | /projects/:projectId/security-settings | server/routes/workspace.ts |
| PATCH | /projects/:projectId/security-settings | server/routes/workspace.ts |
| GET | /projects/:projectId/resource-metrics | server/routes/workspace.ts |
| GET | /projects/:projectId/resource-metrics/latest | server/routes/workspace.ts |
| POST | /projects/:projectId/resource-metrics | server/routes/workspace.ts |
| GET | /users/:userId/pane-configs | server/routes/workspace.ts |
| POST | /users/:userId/pane-configs | server/routes/workspace.ts |
| PATCH | /pane-configs/:id | server/routes/workspace.ts |
| DELETE | /pane-configs/:id | server/routes/workspace.ts |
| GET | /:projectId | server/routes/workspaces.router.ts |
| POST | /:projectId | server/routes/workspaces.router.ts |
| DELETE | /:projectId | server/routes/workspaces.router.ts |
| GET | / | server/services/agent-content-generator.service.ts |
| GET | /api/health | server/services/agent-content-generator.service.ts |
| GET | / | server/services/agent-content-generator.service.ts |
| GET | /api/health | server/services/agent-content-generator.service.ts |
| GET | / | server/services/agent-content-generator.service.ts |
| GET | /api/health | server/services/agent-content-generator.service.ts |
| GET | /auth/gitlab | server/services/enhanced-auth.ts |
| GET | /auth/gitlab/callback | server/services/enhanced-auth.ts |
| GET | /auth/bitbucket | server/services/enhanced-auth.ts |
| GET | /auth/bitbucket/callback | server/services/enhanced-auth.ts |
| GET | /auth/discord | server/services/enhanced-auth.ts |
| GET | /auth/discord/callback | server/services/enhanced-auth.ts |
| GET | /auth/slack | server/services/enhanced-auth.ts |
| GET | /auth/slack/callback | server/services/enhanced-auth.ts |
| GET | /auth/azure | server/services/enhanced-auth.ts |
| GET | /auth/azure/callback | server/services/enhanced-auth.ts |
| GET | /health | server/services/speculative-scaffold.service.ts |
| GET | /items | server/services/speculative-scaffold.service.ts |
| POST | /items | server/services/speculative-scaffold.service.ts |
| USE | /api | server/services/speculative-scaffold.service.ts |
| USE | /api | server/services/speculative-scaffold.service.ts |
| GET | /health | server/services/speculative-scaffold.service.ts |
| USE | /assets | server/vite-loader.ts |
| USE | * | server/vite-loader.ts |
| USE | /assets | server/vite-loader.ts |
| GET | * | server/vite-loader.ts |
| GET | * | server/vite-loader.ts |
| USE | * | server/vite.ts |
| USE | * | server/vite.ts |

## Frontend Routes / Pages (192)

| Route | Component | File |
| --- | --- | --- |
| /auth | inline | client/src/App.tsx |
| /showcase | inline | client/src/App.tsx |
| /agent | inline | client/src/App.tsx |
| /ai-agent | inline | client/src/App.tsx |
| /login | Login | client/src/routes/config.ts |
| /register | Register | client/src/routes/config.ts |
| /forgot-password | ForgotPassword | client/src/routes/config.ts |
| /reset-password | ResetPassword | client/src/routes/config.ts |
| /verify-email | VerifyEmail | client/src/routes/config.ts |
| /runtime-test | RuntimePublicPage | client/src/routes/config.ts |
| / | Landing | client/src/routes/config.ts |
| /pricing | Pricing | client/src/routes/config.ts |
| /features | Features | client/src/routes/config.ts |
| /about | About | client/src/routes/config.ts |
| /careers | Careers | client/src/routes/config.ts |
| /blog | Blog | client/src/routes/config.ts |
| /blog/:slug | BlogDetail | client/src/routes/config.ts |
| /docs | Docs | client/src/routes/config.ts |
| /contact-sales | ContactSales | client/src/routes/config.ts |
| /terms | Terms | client/src/routes/config.ts |
| /privacy | Privacy | client/src/routes/config.ts |
| /dpa | DPA | client/src/routes/config.ts |
| /commercial-agreement | CommercialAgreement | client/src/routes/config.ts |
| /report-abuse | ReportAbuse | client/src/routes/config.ts |
| /status | Status | client/src/routes/config.ts |
| /forum | Forum | client/src/routes/config.ts |
| /compare/:slug | ComparePage | client/src/routes/config.ts |
| /marketing/bounties | MarketingBounties | client/src/routes/config.ts |
| /marketing/deployments | PublicDeploymentsPage | client/src/routes/config.ts |
| /marketing/teams | PublicTeamPage | client/src/routes/config.ts |
| /compare | Compare | client/src/routes/config.ts |
| /compare/github-codespaces | VsGitHubCodespaces | client/src/routes/config.ts |
| /compare/glitch | VsGlitch | client/src/routes/config.ts |
| /compare/heroku | VsHeroku | client/src/routes/config.ts |
| /compare/codesandbox | VsCodeSandbox | client/src/routes/config.ts |
| /compare/aws-cloud9 | VsAwsCloud9 | client/src/routes/config.ts |
| /solutions/app-builder | AppBuilder | client/src/routes/config.ts |
| /solutions/website-builder | WebsiteBuilder | client/src/routes/config.ts |
| /solutions/game-builder | GameBuilder | client/src/routes/config.ts |
| /solutions/dashboard-builder | DashboardBuilder | client/src/routes/config.ts |
| /solutions/chatbot-builder | ChatbotBuilder | client/src/routes/config.ts |
| /solutions/internal-ai-builder | InternalAIBuilder | client/src/routes/config.ts |
| /solutions/enterprise | Enterprise | client/src/routes/config.ts |
| /solutions/startups | Startups | client/src/routes/config.ts |
| /solutions/freelancers | Freelancers | client/src/routes/config.ts |
| /tutorials | Tutorials | client/src/routes/config.ts |
| /changelog | Changelog | client/src/routes/config.ts |
| /case-studies | CaseStudies | client/src/routes/config.ts |
| /help-center | HelpCenter | client/src/routes/config.ts |
| /contact | Contact | client/src/routes/config.ts |
| /accessibility | Accessibility | client/src/routes/config.ts |
| /mobile | MobileMarketingPage | client/src/routes/config.ts |
| /mobile-workspace/:projectId | MobileWorkspace | client/src/routes/config.ts |
| /ai | AI | client/src/routes/config.ts |
| /ai-documentation | AIDocumentation | client/src/routes/config.ts |
| /mcp | MCPInterface | client/src/routes/config.ts |
| /polyglot | PolyglotBackendPage | client/src/routes/config.ts |
| /demo | AuthenticationDemo | client/src/routes/config.ts |
| /theme-validation | ThemeValidation | client/src/routes/config.ts |
| /press | Press | client/src/routes/config.ts |
| /partners | Partners | client/src/routes/config.ts |
| /security | Security | client/src/routes/config.ts |
| /desktop | Desktop | client/src/routes/config.ts |
| /subprocessors | Subprocessors | client/src/routes/config.ts |
| /student-dpa | StudentDPA | client/src/routes/config.ts |
| /languages | Languages | client/src/routes/config.ts |
| /templates/languages | Languages | client/src/routes/config.ts |
| /team | PublicTeamPage | client/src/routes/config.ts |
| /collaboration | PublicTeamPage | client/src/routes/config.ts |
| /deployments | PublicDeploymentsPage | client/src/routes/config.ts |
| /newsletter-confirmed | NewsletterConfirmed | client/src/routes/config.ts |
| /newsletter/confirm | NewsletterConfirm | client/src/routes/config.ts |
| /newsletter/unsubscribe | NewsletterUnsubscribe | client/src/routes/config.ts |
| /share/:shareId | SharedSnippet | client/src/routes/config.ts |
| /u/:username/:projectname | ProjectPage | client/src/routes/config.ts |
| /u/:username | UserProfile | client/src/routes/config.ts |
| /ide/new | Dashboard | client/src/routes/config.ts |
| /ide/:id | IDEPage | client/src/routes/config.ts |
| /marketplace | Marketplace | client/src/routes/config.ts |
| /marketplace/templates | TemplateMarketplace | client/src/routes/config.ts |
| /templates | TemplatesPage | client/src/routes/config.ts |
| /community | Community | client/src/routes/config.ts |
| /community/post/:id | CommunityPost | client/src/routes/config.ts |
| /search | SearchPage | client/src/routes/config.ts |
| /explore | Explore | client/src/routes/config.ts |
| /ai-agent/studio | AIAgentStudio | client/src/routes/config.ts |
| /github-import | GitHubImport | client/src/routes/config.ts |
| /projects/:id/import/figma | FigmaImport | client/src/routes/config.ts |
| /projects/:id/import/bolt | BoltImport | client/src/routes/config.ts |
| /projects/:id/import/lovable | LovableImport | client/src/routes/config.ts |
| /new | Dashboard | client/src/routes/config.ts |
| /editor/new | Dashboard | client/src/routes/config.ts |
| /projects/new | Dashboard | client/src/routes/config.ts |
| /dashboard | Dashboard | client/src/routes/config.ts |
| /agent-activity | AgentActivity | client/src/routes/config.ts |
| /apps | Apps | client/src/routes/config.ts |
| /teams | Teams | client/src/routes/config.ts |
| /teams/new | NewTeamPage | client/src/routes/config.ts |
| /teams/:id | TeamPage | client/src/routes/config.ts |
| /teams/:id/settings | TeamSettings | client/src/routes/config.ts |
| /vnc | VNCPage | client/src/routes/config.ts |
| /notifications | Notifications | client/src/routes/config.ts |
| /analytics | Analytics | client/src/routes/config.ts |
| /scalability | Scalability | client/src/routes/config.ts |
| /education | Education | client/src/routes/config.ts |
| /api-sdk | APISDKPage | client/src/routes/config.ts |
| /mobile-apps | MobileAppsPage | client/src/routes/config.ts |
| /advanced/mobile | MobileAdmin | client/src/routes/config.ts |
| /advanced/sso | SSOConfiguration | client/src/routes/config.ts |
| /advanced/collaboration | Community | client/src/routes/config.ts |
| /advanced/storage | Usage | client/src/routes/config.ts |
| /advanced/community | Community | client/src/routes/config.ts |
| /settings | Settings | client/src/routes/config.ts |
| /settings/notifications | Notifications | client/src/routes/config.ts |
| /settings/billing | Usage | client/src/routes/config.ts |
| /profile/:username? | Profile | client/src/routes/config.ts |
| /home | Home | client/src/routes/config.ts |
| /projects | ProjectsPage | client/src/routes/config.ts |
| /projects/:id | ProjectPage | client/src/routes/config.ts |
| /project/:id | ProjectPage | client/src/routes/config.ts |
| /editor/:id | EditorRedirect | client/src/routes/config.ts |
| /runtimes | RuntimesPage | client/src/routes/config.ts |
| /runtime-diagnostics | RuntimeDiagnosticsPage | client/src/routes/config.ts |
| /user/:username | UserProfile | client/src/routes/config.ts |
| /user/settings | UserSettings | client/src/routes/config.ts |
| /search-advanced | SearchPage | client/src/routes/config.ts |
| /secrets | Secrets | client/src/routes/config.ts |
| /workflows | Workflows | client/src/routes/config.ts |
| /ssh | SSH | client/src/routes/config.ts |
| /security-scanner | SecurityScanner | client/src/routes/config.ts |
| /dependencies | Dependencies | client/src/routes/config.ts |
| /object-storage | ObjectStorage | client/src/routes/config.ts |
| /projects/:id/database | DatabaseManagement | client/src/routes/config.ts |
| /projects/:id/secrets | SecretManagement | client/src/routes/config.ts |
| /usage-alerts | UsageAlerts | client/src/routes/config.ts |
| /projects/:id/preview | PreviewWithDevTools | client/src/routes/config.ts |
| /mobile-admin | MobileAdmin | client/src/routes/config.ts |
| /admin | AdminDashboard | client/src/routes/config.ts |
| /admin/dashboard | AdminDashboard | client/src/routes/config.ts |
| /admin/usage | AdminUsage | client/src/routes/config.ts |
| /admin/ai-usage | AdminAIUsage | client/src/routes/config.ts |
| /admin/requests | AdminFormRequests | client/src/routes/config.ts |
| /admin/billing | AdminBilling | client/src/routes/config.ts |
| /admin/ai-models | AdminAIModels | client/src/routes/config.ts |
| /admin/ai-optimization | AdminAIOptimization | client/src/routes/config.ts |
| /admin/seo | AdminSEOManagement | client/src/routes/config.ts |
| /admin/monitoring | AdminMonitoring | client/src/routes/config.ts |
| /admin/system-monitoring | AdminSystemMonitoring | client/src/routes/config.ts |
| /admin/pitch-deck | PitchDeck | client/src/routes/config.ts |
| /admin/chatgpt | ChatGPTAdmin | client/src/routes/config.ts |
| /admin/users | AdminUsers | client/src/routes/config.ts |
| /admin/projects | AdminProjects | client/src/routes/config.ts |
| /admin/subscriptions | AdminSubscriptions | client/src/routes/config.ts |
| /admin/activity | AdminActivityLogs | client/src/routes/config.ts |
| /admin/settings | AdminSettings | client/src/routes/config.ts |
| /admin/api-keys | AdminApiKeys | client/src/routes/config.ts |
| /admin/support | AdminSupport | client/src/routes/config.ts |
| /admin/cms | AdminCMS | client/src/routes/config.ts |
| /admin/docs | AdminDocs | client/src/routes/config.ts |
| /account | Account | client/src/routes/config.ts |
| /deployments | Deployments | client/src/routes/config.ts |
| /usage | Usage | client/src/routes/config.ts |
| /billing | Billing | client/src/routes/config.ts |
| /cycles | Cycles | client/src/routes/config.ts |
| /bounties | Bounties | client/src/routes/config.ts |
| /powerups | PowerUps | client/src/routes/config.ts |
| /badges | Badges | client/src/routes/config.ts |
| /subscribe | Subscribe | client/src/routes/config.ts |
| /plans | Plans | client/src/routes/config.ts |
| /learn | Learn | client/src/routes/config.ts |
| /support | Support | client/src/routes/config.ts |
| /themes | Themes | client/src/routes/config.ts |
| /health | HealthDashboard | client/src/routes/config.ts |
| /performance | PerformanceDashboard | client/src/routes/config.ts |
| /sso-configuration | SSOConfiguration | client/src/routes/config.ts |
| /audit-logs | AuditLogs | client/src/routes/config.ts |
| /custom-roles | CustomRoles | client/src/routes/config.ts |
| /assistant | AssistantPage | client/src/routes/config.ts |
| /code-search | CodeSearchPage | client/src/routes/config.ts |
| /problems | ProblemsPage | client/src/routes/config.ts |
| /database | DatabasePage | client/src/routes/config.ts |
| /console | ConsolePage | client/src/routes/config.ts |
| /shell | ShellPage | client/src/routes/config.ts |
| /packages | PackagesPage | client/src/routes/config.ts |
| /kv-store | KVStorePage | client/src/routes/config.ts |
| /preview | PreviewPage | client/src/routes/config.ts |
| /authentication | AuthenticationPage | client/src/routes/config.ts |
| /extensions | ExtensionsPage | client/src/routes/config.ts |
| /integrations | IntegrationsPage | client/src/routes/config.ts |
| /networking | NetworkingPage | client/src/routes/config.ts |
| /threads | ThreadsPage | client/src/routes/config.ts |
| /referrals | ReferralsPage | client/src/routes/config.ts |

## IDE Panels and Workspace Components (95)

| Component | File | Status |
| --- | --- | --- |
| CommandPalette | client/src/components/command-palette/CommandPalette.tsx | mapped |
| AIAgentPanel | client/src/components/editor/AIAgentPanel.tsx | mapped |
| AdvancedEditorIntegration | client/src/components/editor/AdvancedEditorIntegration.tsx | mapped |
| AppStoragePanel | client/src/components/editor/AppStoragePanel.tsx | mapped |
| AutonomyControlPanel | client/src/components/editor/AutonomyControlPanel.tsx | mapped |
| CM6Editor | client/src/components/editor/CM6Editor.tsx | mapped |
| CodeReviewPanel | client/src/components/editor/CodeReviewPanel.tsx | mapped |
| DraggableTabBar | client/src/components/editor/DraggableTabBar.tsx | mapped |
| EditorToolbar | client/src/components/editor/EditorToolbar.tsx | mapped |
| MobileEditorTabs | client/src/components/editor/MobileEditorTabs.tsx | mapped |
| MultiEditorManager | client/src/components/editor/MultiEditorManager.tsx | mapped |
| MultiTabEditor | client/src/components/editor/MultiTabEditor.tsx | mapped |
| PackagesPanel | client/src/components/editor/PackagesPanel.tsx | mapped |
| PanelShell | client/src/components/editor/PanelShell.tsx | mapped |
| ReplitCodeEditor | client/src/components/editor/ReplitCodeEditor.tsx | mapped |
| ReplitConsole | client/src/components/editor/ReplitConsole.tsx | mapped |
| ReplitDatabasePanel | client/src/components/editor/ReplitDatabasePanel.tsx | mapped |
| ReplitDebuggerPanel | client/src/components/editor/ReplitDebuggerPanel.tsx | mapped |
| ReplitEditorLayout | client/src/components/editor/ReplitEditorLayout.tsx | mapped |
| ReplitFileExplorer | client/src/components/editor/ReplitFileExplorer.tsx | mapped |
| ReplitGitPanel | client/src/components/editor/ReplitGitPanel.tsx | mapped |
| ReplitHistoryPanel | client/src/components/editor/ReplitHistoryPanel.tsx | mapped |
| ReplitMonacoEditor | client/src/components/editor/ReplitMonacoEditor.tsx | mapped |
| ReplitOutputPanel | client/src/components/editor/ReplitOutputPanel.tsx | mapped |
| ReplitPackagesPanel | client/src/components/editor/ReplitPackagesPanel.tsx | mapped |
| ReplitProblemsPanel | client/src/components/editor/ReplitProblemsPanel.tsx | mapped |
| ReplitResourcesPanel | client/src/components/editor/ReplitResourcesPanel.tsx | mapped |
| ReplitSearchPanel | client/src/components/editor/ReplitSearchPanel.tsx | mapped |
| ReplitSecretsPanel | client/src/components/editor/ReplitSecretsPanel.tsx | mapped |
| ReplitSecurityPanel | client/src/components/editor/ReplitSecurityPanel.tsx | mapped |
| ReplitSettingsPanel | client/src/components/editor/ReplitSettingsPanel.tsx | mapped |
| ReplitTerminalPanel | client/src/components/editor/ReplitTerminalPanel.tsx | mapped |
| ReplitTestingPanel | client/src/components/editor/ReplitTestingPanel.tsx | mapped |
| ReplitThemesPanel | client/src/components/editor/ReplitThemesPanel.tsx | mapped |
| ResponsiveTerminal | client/src/components/editor/ResponsiveTerminal.tsx | mapped |
| ResponsiveWebPreview | client/src/components/editor/ResponsiveWebPreview.tsx | mapped |
| SecretsPanel | client/src/components/editor/SecretsPanel.tsx | mapped |
| ShellPanel | client/src/components/editor/ShellPanel.tsx | mapped |
| TestResultsPanel | client/src/components/editor/TestResultsPanel.tsx | mapped |
| ReplitFileExplorer | client/src/components/files/ReplitFileExplorer.tsx | mapped |
| AIAgentPanel | client/src/components/ide/AIAgentPanel.tsx | mapped |
| AgentActionsPanel | client/src/components/ide/AgentActionsPanel.tsx | mapped |
| ConsolePanel | client/src/components/ide/ConsolePanel.tsx | mapped |
| DatabasePanel | client/src/components/ide/DatabasePanel.tsx | mapped |
| DebuggerPanel | client/src/components/ide/DebuggerPanel.tsx | mapped |
| DeploymentPanel | client/src/components/ide/DeploymentPanel.tsx | mapped |
| FileExplorerPanel | client/src/components/ide/FileExplorerPanel.tsx | mapped |
| GitPanel | client/src/components/ide/GitPanel.tsx | mapped |
| GlobalSearchPanel | client/src/components/ide/GlobalSearchPanel.tsx | mapped |
| LogsViewerPanel | client/src/components/ide/LogsViewerPanel.tsx | mapped |
| PreviewPanel | client/src/components/ide/PreviewPanel.tsx | mapped |
| PreviewSplashScreen | client/src/components/ide/PreviewSplashScreen.tsx | mapped |
| ProfessionalCodeEditor | client/src/components/ide/ProfessionalCodeEditor.tsx | mapped |
| QuickFileSearch | client/src/components/ide/QuickFileSearch.tsx | mapped |
| ReplitActivityBar | client/src/components/ide/ReplitActivityBar.tsx | mapped |
| ReplitAuthPanel | client/src/components/ide/ReplitAuthPanel.tsx | mapped |
| ReplitConsolePanel | client/src/components/ide/ReplitConsolePanel.tsx | mapped |
| ReplitDeploymentPanel | client/src/components/ide/ReplitDeploymentPanel.tsx | mapped |
| ReplitTabBar | client/src/components/ide/ReplitTabBar.tsx | mapped |
| ReplitToolsSheet | client/src/components/ide/ReplitToolsSheet.tsx | mapped |
| ResourcesPanel | client/src/components/ide/ResourcesPanel.tsx | mapped |
| RewindPanel | client/src/components/ide/RewindPanel.tsx | mapped |
| SecretsPanel | client/src/components/ide/SecretsPanel.tsx | mapped |
| TabBar | client/src/components/ide/TabBar.tsx | mapped |
| TerminalPanel | client/src/components/ide/TerminalPanel.tsx | mapped |
| ToolsPanel | client/src/components/ide/ToolsPanel.tsx | mapped |
| VisualEditorPanel | client/src/components/ide/VisualEditorPanel.tsx | mapped |
| WorkflowsPanel | client/src/components/ide/WorkflowsPanel.tsx | mapped |
| EnhancedMobileCodeEditor | client/src/components/mobile/EnhancedMobileCodeEditor.tsx | mapped |
| EnhancedMobileFileExplorer | client/src/components/mobile/EnhancedMobileFileExplorer.tsx | mapped |
| EnhancedMobileTerminal | client/src/components/mobile/EnhancedMobileTerminal.tsx | mapped |
| InlineMobileFileExplorer | client/src/components/mobile/InlineMobileFileExplorer.tsx | mapped |
| LazyMobileCodeEditor | client/src/components/mobile/LazyMobileCodeEditor.tsx | mapped |
| MobileCollaborationPanel | client/src/components/mobile/MobileCollaborationPanel.tsx | mapped |
| MobileDatabasePanel | client/src/components/mobile/MobileDatabasePanel.tsx | mapped |
| MobileDebugPanel | client/src/components/mobile/MobileDebugPanel.tsx | mapped |
| MobileDeployPanel | client/src/components/mobile/MobileDeployPanel.tsx | mapped |
| MobileFileExplorer | client/src/components/mobile/MobileFileExplorer.tsx | mapped |
| MobileGitPanel | client/src/components/mobile/MobileGitPanel.tsx | mapped |
| MobilePackagesPanel | client/src/components/mobile/MobilePackagesPanel.tsx | mapped |
| MobilePreviewPanel | client/src/components/mobile/MobilePreviewPanel.tsx | mapped |
| MobileSearch | client/src/components/mobile/MobileSearch.tsx | mapped |
| MobileSecretsPanel | client/src/components/mobile/MobileSecretsPanel.tsx | mapped |
| MobileSecurityPanel | client/src/components/mobile/MobileSecurityPanel.tsx | mapped |
| MobileSessionsPanel | client/src/components/mobile/MobileSessionsPanel.tsx | mapped |
| MobileSlidePanel | client/src/components/mobile/MobileSlidePanel.tsx | mapped |
| MobileTerminal | client/src/components/mobile/MobileTerminal.tsx | mapped |
| MobileToolsPanel | client/src/components/mobile/MobileToolsPanel.tsx | mapped |
| ReplitToolsSheet | client/src/components/mobile/ReplitToolsSheet.tsx | mapped |
| EditorDefaultLayout | client/src/components/splits/EditorDefaultLayout.tsx | mapped |
| SplitsEditorLayout | client/src/components/splits/SplitsEditorLayout.tsx | mapped |
| SplitsEditorLayoutV2 | client/src/components/splits/SplitsEditorLayoutV2.tsx | mapped |
| AdvancedTerminal | client/src/components/terminal/AdvancedTerminal.tsx | mapped |
| ReplitTerminal | client/src/components/terminal/ReplitTerminal.tsx | mapped |
| TerminalMetricsIndicator | client/src/components/terminal/TerminalMetricsIndicator.tsx | mapped |

## Supported App Formats / Templates (293 source files)

| File | Formats |
| --- | --- |
| server/agent/project-context.ts | express, next.js, react, typescript, vue |
| server/agent/repo-overview-service.ts | express, go, html, javascript, next.js, python, react, rust, typescript |
| server/ai/advanced-ai-service.ts | go, html, javascript, python, rust, typescript |
| server/ai/autonomous-builder.ts | html, javascript, node, react, typescript |
| server/ai/code-analyzer.ts | javascript, python, typescript |
| server/ai/code-completion-service.ts | javascript, typescript |
| server/ai/context-awareness-service.ts | go, javascript, python, rust, typescript |
| server/ai/enhanced-autonomous-agent.ts | express, next.js, nextjs, nodejs, python, react, svelte, vue |
| server/ai/openai-agents-service.ts | python |
| server/ai/prompts/modern-design-system.ts | react, typescript |
| server/ai/real-code-generator.ts | javascript, nodejs |
| server/ai.ts | express, go, javascript, python, rust, typescript |
| server/api/isolation.ts | express, nodejs |
| server/api/mobile-app-service.ts | go, html, javascript, python, react, rust, typescript, vue |
| server/api/mobile.ts | express, html, javascript, python, react, typescript |
| server/api/opensource-models.ts | express, javascript |
| server/api/sdk-service.ts | go, javascript, python |
| server/auth/session-manager.ts | express |
| server/db-init.ts | html, javascript |
| server/db-seed.ts | html, typescript |
| server/deployment/build-pipeline.ts | html, next.js, nextjs, nodejs, python, react, static, vue |
| server/deployment/container-builder.ts | python |
| server/deployment/k8s-deployment-service.ts | static |
| server/deployment/real-deployment-service-v2.ts | nodejs, static |
| server/deployment.ts | nodejs |
| server/docker-executor.ts | html, javascript, node, nodejs, python, static |
| server/docs/swagger.ts | express, go, javascript, python, rust, typescript |
| server/education/auto-grading-service.ts | go, javascript, python |
| server/education/plagiarism-detector.ts | static |
| server/execution/container-executor.ts | go |
| server/execution/docker-executor.ts | go, javascript, node, nodejs, python, rust, typescript |
| server/execution/executor.ts | go, html, javascript, node, nodejs, python, rust, typescript |
| server/execution/remote-executor.ts | go, javascript, python, rust, typescript |
| server/execution/runtime-warmup.ts | go, javascript, node, nodejs, python, rust, typescript |
| server/execution/sandbox.ts | javascript, nodejs |
| server/export/export-manager.ts | go, javascript, nextjs, python, rust |
| server/extensions/extension-manager.ts | javascript, python |
| server/import/lovable-import-service.ts | express, react |
| server/index.ts | express, html, static |
| server/isolation/process-isolation.ts | python |
| server/mcp/api/github.ts | express |
| server/middleware/input-validation.ts | express, html, javascript, typescript |
| server/middleware/security.ts | express, html, javascript, python, typescript |
| server/middleware/tier-rate-limiter.ts | express |
| server/mobile/mobile-api-service.ts | express, go, html, javascript, python, react, rust, typescript |
| server/orchestration/container-orchestrator.ts | go, javascript, node, python, rust, typescript |
| server/package-installer.ts | go, nodejs, python, rust, typescript |
| server/package-management/nix-environment-builder.ts | node |
| server/package-management/nix-package-manager.ts | go, javascript, nodejs, python, rust |
| server/package-management/simple-package-installer.ts | javascript, nodejs, python, typescript |
| server/polyglot-routes.ts | express, go, javascript, python, typescript |
| server/preview/preview-service.ts | express, go, html, node, python, react, rust, static, typescript, vue |
| server/routes/admin.ts | express, typescript |
| server/routes/agent-autonomous.router.ts | express |
| server/routes/agent-tools.router.ts | express |
| server/routes/agent.router.ts | express |
| server/routes/ai.router.ts | express, go, python, react, rust, typescript |
| server/routes/analytics.router.ts | express |
| server/routes/chatgpt.router.ts | express |
| server/routes/code-generation.router.ts | express, go, html, javascript, python, react, rust, typescript |
| server/routes/code-review.router.ts | express |
| server/routes/collaboration.ts | express |
| server/routes/community.router.ts | express |
| server/routes/data-provisioning.router.ts | express |
| server/routes/database.router.ts | express |
| server/routes/extensions.router.ts | express, javascript, python, react, rust, typescript |
| server/routes/global-search.router.ts | express, go, html, javascript, python, rust, typescript |
| server/routes/index.ts | express, go, python, typescript |
| server/routes/marketplace.ts | express, javascript, static, typescript |
| server/routes/memory-bank.router.ts | express |
| server/routes/mobile-builds.router.ts | express |
| server/routes/packages.router.ts | express, go, javascript, nodejs, python, rust |
| server/routes/preview.ts | express, html, static |
| server/routes/projects.router.ts | go, html, javascript, python, rust, typescript |
| server/routes/runtime.router.ts | express, javascript |
| server/routes/seo.router.ts | express, python, react |
| server/routes/shell.ts | express |
| server/routes/sitemap.router.ts | express |
| server/routes/teams.router.ts | express, javascript |
| server/routes/templates.ts | express, go, html, javascript, nodejs, python, rust, typescript |
| server/routes/voice-transcribe.router.ts | express |
| server/routes/workspace-bootstrap.router.ts | express, fastapi, go, javascript, python, react, rust, svelte, typescript, vue |
| server/routes/workspace.ts | express |
| server/runtime.ts | javascript |
| server/runtimes/api.ts | express, go, javascript, python, rust, typescript |
| server/runtimes/container-manager.ts | go, nodejs, python, rust, typescript |
| server/runtimes/languages.ts | go, html, javascript, nodejs, python, rust, typescript |
| server/runtimes/nix-manager.ts | go, nodejs, python, rust, typescript |
| server/runtimes/runtime-manager.ts | go, javascript, node, nodejs, python, rust, typescript |
| server/sandbox/__tests__/language-matrix.test.ts | go, javascript, node, nodejs, python, rust, typescript |
| server/sandbox/runtimes/htmlPreview.ts | html, javascript |
| server/sandbox/sandbox-executor.ts | go, html, javascript, node, python, rust, typescript |
| server/seed-blog.ts | express, html, javascript, react |
| server/seed-templates.ts | express, fastapi, go, html, javascript, next.js, nextjs, nodejs, python, react, rust, static, svelte, typescript, vanilla, vanilla js, vue |
| server/seo-meta.ts | go, javascript, python, react, rust, typescript |
| server/services/agent-content-generator.service.ts | express, fastapi, go, javascript, node, python, react, rust, svelte, typescript, vue |
| server/services/agent-file-operations.service.ts | go, html, javascript, python, rust, static, typescript |
| server/services/agent-grid-data.service.ts | go, html, javascript, python, rust, typescript |
| server/services/agent-orchestrator.service.ts | go, html, python, react, typescript, vue |
| server/services/agent-tool-framework.service.ts | html, react |
| server/services/agent-websocket-service.ts | express, react, typescript |
| server/services/agent-workflow-engine.service.ts | html |
| server/services/ai-code-review.ts | go, html, javascript, python, rust, typescript |
| server/services/ai-plan-generator.service.ts | html, javascript, react, typescript |
| server/services/ai-security.service.ts | javascript, typescript |
| server/services/build-verification.service.ts | express, nextjs, python, typescript |
| server/services/chatgpt-service.ts | typescript |
| server/services/code-analysis-engine.ts | go, javascript, python, rust, typescript |
| server/services/education-service.ts | html, javascript, python, react |
| server/services/export-service.ts | nodejs, python |
| server/services/figma-import-service.ts | javascript, react, typescript |
| server/services/file-service.ts | express, javascript, typescript |
| server/services/github-oauth.ts | express |
| server/services/marketplace-service.ts | express, javascript, next.js, python, react, typescript, vue |
| server/services/memory-bank.service.ts | express, react, typescript |
| server/services/mobile-container-service.ts | javascript |
| server/services/polyglot-ai-proxy.ts | python, typescript |
| server/services/polyglot-coordinator.ts | express, python, typescript |
| server/services/project-ai-agent.service.ts | html, javascript, python, typescript |
| server/services/project-context.service.ts | go, javascript, python, rust, typescript |
| server/services/real-mobile-compiler.ts | nodejs, react |
| server/services/real-package-manager.ts | go, nodejs, python, rust |
| server/services/speculative-scaffold.service.ts | express, fastapi, next.js, nextjs, react, svelte, typescript, vue |
| server/services/web-search-service.ts | javascript, node, python, react |
| server/storage.ts | express, javascript, next.js, nextjs, nodejs, python, react, typescript, vue |
| server/terminal/real-terminal.ts | nodejs |
| server/terminal.ts | node, nodejs, python |
| server/utils/security-utils.ts | express, html |
| server/utils/security.ts | express, html, react, typescript |
| server/vite.ts | express |
| client/src/App.tsx | react |
| client/src/components/AIAssistant.tsx | react |
| client/src/components/AIPanel.tsx | go, html, javascript, python, react, rust, typescript |
| client/src/components/AdvancedAIPanel.tsx | go, javascript, python, react, rust, typescript |
| client/src/components/AdvancedSearch.tsx | go, javascript, python, react, rust, typescript |
| client/src/components/ApplicationIDEWrapper.tsx | react, typescript |
| client/src/components/AuthenticationDemo.tsx | go, javascript, python, react, typescript |
| client/src/components/AutomationsPanel.tsx | javascript, python |
| client/src/components/BillingSystem.tsx | react |
| client/src/components/CodeEditor.tsx | go, html, javascript, python, rust, typescript |
| client/src/components/CodeGenerationPanel.tsx | react, typescript |
| client/src/components/CommandPalette.tsx | go, react |
| client/src/components/CommunityFeatures.tsx | javascript, nodejs, python, react |
| client/src/components/ConfigPanel.tsx | react |
| client/src/components/CreateProjectModal.tsx | express, html, javascript, python, react, static, typescript |
| client/src/components/DatabaseManagement.tsx | react |
| client/src/components/EducationDashboard.tsx | react |
| client/src/components/ExtensionsMarketplace.tsx | react |
| client/src/components/Ghostwriter.tsx | go, html, javascript, python, react, rust, typescript |
| client/src/components/GlobalSearch.tsx | react |
| client/src/components/LanguageEnvironments.tsx | go, html, nodejs, python, react, rust, typescript |
| client/src/components/LanguageTemplates.tsx | express, go, javascript, next.js, python, react, rust, svelte, typescript, vue |
| client/src/components/LazyCM6Editor.tsx | go, html, javascript, python, react, rust, typescript |
| client/src/components/LazyMonacoEditor.tsx | javascript, react |
| client/src/components/MobileApp.tsx | react |
| client/src/components/MobileAppDevelopment.tsx | react |
| client/src/components/OptimizedDashboard.tsx | javascript, react |
| client/src/components/PackageManager.tsx | go, javascript, python, react, rust |
| client/src/components/PolyglotBackend.tsx | python, react, typescript |
| client/src/components/Preview.tsx | react |
| client/src/components/ProjectTemplates.tsx | react |
| client/src/components/ReplitAssistant.tsx | react |
| client/src/components/ReplitCoreServices.tsx | react |
| client/src/components/ReplitJSONEditor.tsx | react |
| client/src/components/ReplitPackages.tsx | go, python, react, rust |
| client/src/components/RunButton.tsx | react, static |
| client/src/components/SpotlightSearch.tsx | react |
| client/src/components/TemplateGallery.tsx | javascript, react |
| client/src/components/TemplatesMarketplace.tsx | react |
| client/src/components/admin/ProjectManagement.tsx | go, javascript, python, react, rust, typescript |
| client/src/components/agent/messages/CollapsibleSection.tsx | react |
| client/src/components/agent/messages/FileDiffViewer.tsx | react |
| client/src/components/agent/messages/RichMessageContent.tsx | react |
| client/src/components/ai/EnhancedChatMessage.tsx | react, typescript |
| client/src/components/ai/InlineBuildProgress.tsx | react, static |
| client/src/components/ai/PreviewDeploymentPanel.tsx | react, static |
| client/src/components/ai/ReplitAgentPanelV3.tsx | html, react |
| client/src/components/apps/AppsView.tsx | go, javascript, python, rust, typescript |
| client/src/components/collaboration/RealTimeCollaboration.tsx | react |
| client/src/components/editor/AIAgentPanel.tsx | javascript, react |
| client/src/components/editor/AdvancedEditorIntegration.tsx | react |
| client/src/components/editor/CM6Editor.tsx | react |
| client/src/components/editor/MultiEditorManager.tsx | react |
| client/src/components/editor/MultiTabEditor.tsx | react |
| client/src/components/editor/PackagesPanel.tsx | go, nodejs, python, react, rust |
| client/src/components/editor/ReplitCodeEditor.tsx | go, html, javascript, python, react, rust, typescript |
| client/src/components/editor/ReplitDatabasePanel.tsx | react |
| client/src/components/editor/ReplitMonacoEditor.tsx | go, html, javascript, python, rust, svelte, typescript, vue |
| client/src/components/editor/ReplitPackagesPanel.tsx | javascript, nodejs, python, react |
| client/src/components/editor/ReplitStatusBar.tsx | react |
| client/src/components/editor/ReplitTestingPanel.tsx | react |
| client/src/components/editor/ResponsiveWebPreview.tsx | html, react, static |
| client/src/components/files/ReplitFileExplorer.tsx | go, html |
| client/src/components/git/VisualDiffEditor.tsx | react, typescript |
| client/src/components/grids/AgentMetricsDashboard.tsx | react |
| client/src/components/grids/FileOperationsGrid.tsx | html, javascript, python, react, typescript |
| client/src/components/ide/PreviewPanel.tsx | react, static |
| client/src/components/ide/ProfessionalCodeEditor.tsx | react |
| client/src/components/ide/RateLimitExperience.tsx | react |
| client/src/components/ide/ReplitAuthPanel.tsx | express, node, python, react |
| client/src/components/ide/StatusBar.tsx | go |
| client/src/components/ide/UnifiedIDELayout.tsx | go, html, javascript, python, react, rust, typescript |
| client/src/components/landing/DeferredSections.tsx | react |
| client/src/components/landing/sections/LandingLanguages.tsx | go, javascript, python, react, rust, typescript |
| client/src/components/layout/MobileMenu.tsx | react |
| client/src/components/layout/PublicNavbar.tsx | react |
| client/src/components/marketplace/AnimatedTemplateCard.tsx | react |
| client/src/components/marketplace/CommunityHub.tsx | react |
| client/src/components/marketplace/TemplateCard.tsx | react |
| client/src/components/marketplace/TemplateFilters.tsx | express, go, javascript, next.js, nextjs, python, react, rust, typescript, vue |
| client/src/components/marketplace/TemplatePreview.tsx | react |
| client/src/components/marketplace/TemplateSearch.tsx | fastapi, next.js, python, react, vue |
| client/src/components/mcp/GitHubMCPPanel.tsx | react |
| client/src/components/mobile/EnhancedMobileCodeEditor.tsx | react, typescript |
| client/src/components/mobile/EnhancedMobileFileExplorer.tsx | go, html, react |
| client/src/components/mobile/LazyMobileCodeEditor.tsx | react |
| client/src/components/mobile/MobileCodeActions.tsx | react |
| client/src/components/mobile/MobileCodeKeyboard.tsx | html, javascript, python, react, typescript |
| client/src/components/mobile/MobileCreateModal.tsx | express, fastapi, javascript, next.js, node, python, react, typescript, vue |
| client/src/components/mobile/MobileDatabasePanel.tsx | react |
| client/src/components/mobile/MobilePackagesPanel.tsx | javascript, nodejs, python, react |
| client/src/components/mobile/MobileSearch.tsx | python, react, typescript |
| client/src/components/replit/ReplitStatusBar.tsx | javascript, react |
| client/src/components/replit/ReplitTabBar.tsx | html, react |
| client/src/components/replit/ReplitToolbar.tsx | javascript, react |
| client/src/components/runtime/RuntimeEnvironments.tsx | go, html, javascript, node, python, react, rust, typescript |
| client/src/components/seo/SEOHead.tsx | react |
| client/src/components/splits/SplitsEditorLayout.tsx | react |
| client/src/components/splits/SplitsEditorLayoutV2.tsx | react |
| client/src/components/ui/LightSyntaxHighlighter.tsx | go, html, javascript, python, react, rust, typescript |
| client/src/components/utilities/VirtualScrollList.tsx | react |
| client/src/config/seo.config.ts | python, react |
| client/src/design-system/components/Onboarding.tsx | go, react |
| client/src/design-system/components/Settings.tsx | react |
| client/src/design-system/components/Skeleton.tsx | react |
| client/src/design-system/components/SplitView.tsx | react |
| client/src/design-system/components/StatusBar.tsx | react |
| client/src/hooks/use-autonomous-chat-integration.ts | react, static |
| client/src/hooks/useIDEWorkspace.ts | javascript, react |
| client/src/lib/ai-code-completion.ts | javascript |
| client/src/lib/cm6/autocomplete-adapter.ts | go, html, javascript, python, rust, typescript |
| client/src/lib/cm6/language-loader.ts | go, html, javascript, python, rust, typescript |
| client/src/lib/languages.ts | go, html, nodejs, python, rust, typescript |
| client/src/lib/monaco-config.ts | html, javascript, typescript |
| client/src/lib/utils/file-icons.ts | go, html |
| client/src/pages/AI.tsx | react |
| client/src/pages/AIAgent.tsx | html, javascript, python, react |
| client/src/pages/AIAgentStudio.tsx | go, html, javascript, python, typescript |
| client/src/pages/AIDocumentation.tsx | react, typescript |
| client/src/pages/APISDKPage.tsx | go, javascript, python |
| client/src/pages/AdminCMS.tsx | react |
| client/src/pages/AssistantPage.tsx | react |
| client/src/pages/Careers.tsx | go, python, react, rust, typescript |
| client/src/pages/ChatGPTAdmin.tsx | react |
| client/src/pages/CodeSearchPage.tsx | html, javascript, python, react, typescript |
| client/src/pages/Community.tsx | react |
| client/src/pages/Dashboard.tsx | javascript, react, typescript |
| client/src/pages/Docs.tsx | express, go, next.js, python, react, typescript |
| client/src/pages/Explore.tsx | go, javascript, python, react, rust, typescript |
| client/src/pages/FeaturePlaceholder.tsx | go, react |
| client/src/pages/Features.tsx | react |
| client/src/pages/GitHubImport.tsx | go, html, javascript, python, react, rust, typescript, vue |
| client/src/pages/Home.tsx | react, typescript |
| client/src/pages/Landing.tsx | fastapi, go, javascript, next.js, python, react, rust, typescript, vue |
| client/src/pages/LandingOptimized.tsx | react, typescript |
| client/src/pages/Languages.tsx | go, html, javascript, python, react, rust, typescript |
| client/src/pages/Login.tsx | javascript, react |
| client/src/pages/Marketplace.tsx | react |
| client/src/pages/Plans.tsx | go |
| client/src/pages/Pricing.tsx | express, react |
| client/src/pages/Profile.tsx | go, javascript, python, react, rust, typescript |
| client/src/pages/ProjectsPage.tsx | go, javascript, python, react, rust, typescript |
| client/src/pages/PublicDeploymentsPage.tsx | static |
| client/src/pages/Register.tsx | react |
| client/src/pages/RuntimePublicPage.tsx | nodejs, python, react, typescript |
| client/src/pages/RuntimesPage.tsx | nodejs, python, react, typescript |
| client/src/pages/SharedSnippet.tsx | go, html, javascript, python, rust, typescript |
| client/src/pages/ShellPage.tsx | react |
| client/src/pages/Support.tsx | go, javascript, python, react, rust, typescript |
| client/src/pages/TeamPage.tsx | react |
| client/src/pages/TemplateMarketplace.tsx | react, static |
| client/src/pages/TemplatesPage.tsx | react |
| client/src/pages/Themes.tsx | react |
| client/src/pages/UserProfile.tsx | go, react |
| client/src/pages/admin/PitchDeck.tsx | express, go, react, typescript |
| client/src/pages/auth-page.tsx | html, javascript, python |
| client/src/pages/compare/ComparePage.tsx | go, python, react, svelte, vue |
| client/src/pages/mobile.tsx | go, javascript, python, react, rust |
| client/src/pages/resources/HelpCenter.tsx | go, javascript, python, rust, typescript |
| shared/agent/repo-overview.ts | typescript |
| shared/mobile-types.ts | go, html, javascript, python, react, rust, typescript |
| shared/schema.ts | go, html, javascript, node, python, rust, typescript |
| shared/types/agent-grid.types.ts | typescript |

## External Integrations (691 source files)

| File | Integrations |
| --- | --- |
| server/admin/routes.ts | OpenAI, Redis, Stripe |
| server/agent/context-manager.ts | Anthropic, Gemini, Grok, Kimi, Moonshot, OpenAI, xAI |
| server/agent/project-context.ts | Docker |
| server/agent/repo-overview-service.ts | Postgres |
| server/agent/routes/agent-context.ts | Replit |
| server/agent/tool-definitions.ts | Anthropic, OpenAI, Replit |
| server/ai/ai-provider-factory.ts | OpenAI |
| server/ai/ai-provider-manager.ts | Anthropic, Gemini, Grok, Kimi, Mistral, Moonshot, OpenAI, Replit, xAI |
| server/ai/ai-provider.ts | Anthropic, Gemini, OpenAI, Replit |
| server/ai/ai-providers.ts | Anthropic, Gemini, Grok, Kimi, Mistral, Moonshot, OpenAI, xAI |
| server/ai/ai-service.ts | Anthropic, OpenAI |
| server/ai/autonomous-builder.ts | Linear |
| server/ai/batch-api-manager.ts | OpenAI |
| server/ai/code-completion-service.ts | Anthropic, GitHub, OpenAI |
| server/ai/context-window-manager.ts | Redis |
| server/ai/enhanced-autonomous-agent.ts | Anthropic, MCP, Stripe |
| server/ai/mcp-client.ts | MCP |
| server/ai/openai-agents-service.ts | OpenAI |
| server/ai/openai-enhanced-provider.ts | OpenAI |
| server/ai/opensource-models-provider.ts | GitHub, Mistral, OpenAI |
| server/ai/prompt-cache-manager.ts | Anthropic, Gemini, Grok, Moonshot, OpenAI, xAI |
| server/ai/prompts/agent-system-prompt.ts | Postgres, Stripe |
| server/ai/provider-latency-monitor.ts | Anthropic, Gemini, Moonshot, OpenAI, xAI |
| server/ai/real-code-generator.ts | Anthropic, Docker, OpenAI |
| server/ai.ts | Anthropic, Gemini, Grok, Kimi, Moonshot, OpenAI, Replit, xAI |
| server/api/ai-streaming.ts | Anthropic, Gemini, Grok, Kimi, MCP, Moonshot, OpenAI, Replit, Stripe, xAI |
| server/api/challenges-service.ts | OpenAI |
| server/api/code-review-service.ts | OpenAI |
| server/api/mcp.ts | GitHub, MCP, Postgres |
| server/api/mentorship-service.ts | Zoom |
| server/api/mobile.ts | GitHub, Kimi, Replit |
| server/auth/token-revocation.ts | Redis |
| server/billing/simple-payment-processor.ts | Stripe |
| server/billing/subscription-manager.ts | Stripe |
| server/collaboration/collaboration-server.ts | Redis |
| server/collaboration/real-collaboration.ts | Redis |
| server/community/community-service.ts | GitHub |
| server/config/ai-pricing.ts | Anthropic, Gemini, Grok, Moonshot, OpenAI, xAI |
| server/config/database.ts | Postgres |
| server/config/deployment-mode.ts | Kubernetes, Replit |
| server/config/environment.ts | Redis, Sentry |
| server/containers/container-orchestrator.ts | MCP, Sentry |
| server/database/database-hosting.ts | Docker, Postgres, Redis |
| server/database/replitdb.ts | Replit |
| server/db/drizzle.ts | Postgres |
| server/db/index.ts | Postgres |
| server/db-init.ts | Postgres |
| server/db.ts | Postgres, Replit |
| server/deployment/ab-testing-service.ts | Redis |
| server/deployment/buildpack-deployment.ts | Docker, Kubernetes |
| server/deployment/container-builder.ts | Docker |
| server/deployment/container-orchestrator.ts | Docker, Kubernetes |
| server/deployment/k8s-deployment-service.ts | Kubernetes |
| server/deployment/multi-region-failover-service.ts | AWS, Kubernetes |
| server/deployment/real-deployment-service.ts | Docker |
| server/deployment/real-kubernetes-deployment.ts | Kubernetes |
| server/distributed/task-scheduler.ts | Redis |
| server/docker-executor.ts | Docker |
| server/docs/swagger.ts | Gemini, Grok, Kimi, Kubernetes |
| server/edge/edge-functions.ts | Redis |
| server/edge/edge-manager.ts | Replit |
| server/education/auto-grading-service.ts | Docker |
| server/execution/container-executor.ts | Docker |
| server/execution/docker-executor.ts | Docker, Replit |
| server/execution/executor.ts | Docker, Replit |
| server/execution/remote-executor.ts | GitHub |
| server/export/export-manager.ts | Docker, GitHub, Kubernetes, Postgres, Redis |
| server/extensions/extension-manager.ts | Replit |
| server/git/git-backend.ts | GitHub |
| server/health/health-checks.ts | Anthropic, Gemini, Kubernetes, Moonshot, OpenAI, Redis, xAI |
| server/import-export/exporter.ts | Replit |
| server/index.ts | Docker, Kubernetes, Linear, OpenAI, Redis, Replit, SendGrid, Sentry, Slack, Stripe |
| server/integrations/datadog-newrelic-service.ts | Datadog, New Relic |
| server/integrations/fcm-service.ts | Firebase |
| server/integrations/jira-linear-service.ts | Jira, Linear |
| server/integrations/slack-discord-service.ts | Discord, Redis, Slack |
| server/integrations/zoom-service.ts | Zoom |
| server/isolation/process-isolation.ts | Docker, Kubernetes, Postgres |
| server/jobs/storage-metrics-collector.ts | Postgres |
| server/kubernetes/deployment-manager.ts | Docker, Kubernetes |
| server/kubernetes/orchestrator.ts | Kubernetes |
| server/lib/stripe-client.ts | Stripe |
| server/mcp/api/github.ts | GitHub, MCP |
| server/mcp/api/memory.ts | MCP |
| server/mcp/api/postgres.ts | MCP, Postgres |
| server/mcp/auth.ts | MCP |
| server/mcp/client.ts | MCP |
| server/mcp/cors.ts | Grok, MCP |
| server/mcp/http-transport.ts | MCP |
| server/mcp/routes.ts | GitHub, MCP, Postgres |
| server/mcp/server.ts | Anthropic, Docker, GitHub, MCP, OpenAI, Postgres, Slack |
| server/mcp/servers/figma-mcp.ts | MCP |
| server/mcp/servers/github-mcp.ts | GitHub, MCP |
| server/mcp/servers/memory-mcp.ts | MCP |
| server/mcp/servers/postgres-mcp.ts | MCP, Postgres |
| server/mcp/servers/slack-mcp.ts | MCP, Slack |
| server/mcp/simple-http-transport.ts | MCP, S3 |
| server/mcp/standalone-server.ts | MCP, OpenAI |
| server/middleware/ai-usage-tracker.ts | Anthropic, Gemini, Grok, Kimi, Moonshot, OpenAI, Replit, Stripe, xAI |
| server/middleware/cors-config.ts | Replit |
| server/middleware/csrf.ts | GitHub, Replit, Stripe |
| server/middleware/error-handler.ts | Redis, Sentry |
| server/middleware/helmet-config.ts | Anthropic, OpenAI, Replit, Stripe |
| server/middleware/input-validation.ts | AWS, Docker |
| server/middleware/passport-setup.ts | GitHub |
| server/middleware/rate-limiter.ts | Redis |
| server/middleware/security.ts | Anthropic, OpenAI, Replit, Stripe |
| server/middleware/tier-rate-limiter.ts | Redis |
| server/mobile/mobile-api-service.ts | Firebase |
| server/monitoring/routes.ts | Redis |
| server/objectStorage.ts | Replit |
| server/observability/opentelemetry.ts | Postgres, Redis, Replit |
| server/orchestration/container-orchestrator.ts | Replit |
| server/orchestration/container-runtime.ts | Docker |
| server/package-management/nix-package-manager.ts | Docker, GitHub, Postgres, Redis |
| server/payments/pricing-constants.ts | Postgres, Replit, SAML |
| server/payments/stripe-service.ts | SendGrid, Stripe |
| server/preview/preview-service.ts | Anthropic, GitHub, OpenAI, Replit, SendGrid, Stripe |
| server/production.ts | Docker |
| server/realtime/http-proxy.ts | Anthropic, GitHub, OpenAI, Stripe |
| server/resilience/circuit-breaker.ts | Anthropic, OpenAI, Redis |
| server/routes/admin-billing.router.ts | Stripe |
| server/routes/admin.ts | Stripe |
| server/routes/agent-plan.router.ts | OpenAI |
| server/routes/agent-testing.router.ts | GitHub, Replit |
| server/routes/agent-tools.router.ts | Postgres |
| server/routes/agent-workflow.router.ts | MCP, Stripe |
| server/routes/agent.router.ts | Docker, Replit |
| server/routes/ai-health.ts | Anthropic, Gemini, Moonshot, OpenAI, xAI |
| server/routes/ai-models.router.ts | Anthropic, Gemini, Grok, Kimi, Moonshot, xAI |
| server/routes/ai-optimization.router.ts | OpenAI |
| server/routes/ai-usage.router.ts | Gemini, Replit |
| server/routes/ai.router.ts | Anthropic, Gemini, Grok, Kimi, Mistral, Moonshot, OpenAI, Postgres, Replit, Stripe, xAI |
| server/routes/auth-complete.ts | GitHub |
| server/routes/auth.router.ts | GitHub, SendGrid, Stripe |
| server/routes/auto-checkpoints.router.ts | Replit |
| server/routes/bounties.router.ts | Stripe |
| server/routes/chatgpt.router.ts | Replit |
| server/routes/checkpoints.router.ts | Replit |
| server/routes/code-generation.router.ts | Gemini |
| server/routes/code-review.router.ts | Anthropic |
| server/routes/collaboration.ts | Linear, Replit, SendGrid |
| server/routes/containers.ts | Kubernetes |
| server/routes/database.router.ts | Postgres, Stripe |
| server/routes/deployment.ts | Replit |
| server/routes/extensions.router.ts | Docker |
| server/routes/git-project.router.ts | GitHub |
| server/routes/git.router.ts | GitHub |
| server/routes/global-themes.router.ts | GitHub |
| server/routes/health.router.ts | Anthropic, Docker, Gemini, Kubernetes, Moonshot, OpenAI, Postgres, Replit, xAI |
| server/routes/health.ts | Kubernetes, Redis, Replit |
| server/routes/index.ts | GitHub, MCP, Postgres, Replit, SendGrid, Stripe |
| server/routes/integrations.router.ts | GitHub, OpenAI, Postgres, SendGrid, Slack, Stripe |
| server/routes/kv-store.router.ts | Replit |
| server/routes/logs-viewer.router.ts | Replit |
| server/routes/marketplace.ts | Docker |
| server/routes/mcp-servers.router.ts | MCP, Postgres |
| server/routes/memory-bank.router.ts | Replit |
| server/routes/monitoring.router.ts | Redis |
| server/routes/packages.router.ts | Replit |
| server/routes/payments.router.ts | Replit, Stripe |
| server/routes/placeholder.router.ts | Linear, Replit |
| server/routes/preview.ts | Replit |
| server/routes/project-data.router.ts | Replit |
| server/routes/projects.router.ts | GitHub, Replit |
| server/routes/public-forms.router.ts | Postgres |
| server/routes/rag.router.ts | Anthropic, Gemini, Grok, Kimi, MCP, Moonshot, OpenAI, xAI |
| server/routes/replitdb.router.ts | Replit |
| server/routes/runtime.router.ts | Docker |
| server/routes/scalability.ts | Redis |
| server/routes/seo.router.ts | GitHub, Replit |
| server/routes/settings.router.ts | Replit |
| server/routes/shell.ts | AWS, OpenAI, Replit |
| server/routes/sitemap.router.ts | AWS, GitHub |
| server/routes/slack-config.router.ts | Slack |
| server/routes/test-agent.ts | OpenAI |
| server/routes/unified-checkpoints.router.ts | Replit |
| server/routes/users.router.ts | Stripe |
| server/routes/voice-transcribe.router.ts | Anthropic, Gemini, OpenAI, xAI |
| server/routes/webhooks-sendgrid.router.ts | SendGrid |
| server/routes/websocket-metrics.router.ts | Redis |
| server/routes/workspace-bootstrap.router.ts | Anthropic, Gemini, Moonshot, OpenAI, Redis, Replit, xAI |
| server/runnerClient/index.ts | Sentry |
| server/runtime.ts | Docker |
| server/runtimes/api.ts | Docker |
| server/runtimes/container-manager.ts | Docker |
| server/runtimes/languages.ts | Replit |
| server/runtimes/nix-manager.ts | Replit |
| server/runtimes/runtime-health.ts | Docker |
| server/runtimes/runtime-manager.ts | Docker, Replit |
| server/sandbox/sandbox-executor.ts | Docker |
| server/sandbox/sandbox-monitor.ts | Linear |
| server/security/security-scanner.ts | AWS, GitHub, OpenAI, Postgres |
| server/seed-blog.ts | Docker, GitHub, Redis, SAML |
| server/seed-templates.ts | AWS, Discord, Docker, GitHub, Kubernetes, Linear, OpenAI, Postgres, Redis, Replit, S3, Slack |
| server/seo-meta.ts | GitHub, Replit |
| server/services/RuntimeLogsService.ts | AWS |
| server/services/ServerLogsService.ts | AWS, Replit |
| server/services/advanced-monitoring.ts | Linear, Slack |
| server/services/agent-autonomous-engine.service.ts | Docker, Replit |
| server/services/agent-command-execution.service.ts | Docker, Redis |
| server/services/agent-content-generator.service.ts | Docker |
| server/services/agent-element-selector.service.ts | Replit, S3 |
| server/services/agent-file-operations.service.ts | Docker |
| server/services/agent-orchestrator.service.ts | Anthropic, Gemini, Grok, Kimi, Moonshot, OpenAI, Redis, Replit, xAI |
| server/services/agent-plan-generator.service.ts | OpenAI, Replit |
| server/services/agent-preferences.service.ts | Anthropic, Gemini, Grok, Kimi, Moonshot, OpenAI, Replit, xAI |
| server/services/agent-session-cache.service.ts | Redis |
| server/services/agent-testing-orchestrator.service.ts | Replit, S3 |
| server/services/agent-tool-framework.service.ts | GitHub, MCP, OpenAI, Postgres, Replit |
| server/services/agent-usage-tracking-service.ts | Gemini |
| server/services/agent-websocket-service.ts | Replit |
| server/services/agent-workflow-engine.service.ts | Anthropic, OpenAI, Postgres, Redis |
| server/services/ai-approval-queue.service.ts | Postgres |
| server/services/ai-billing-service.ts | Anthropic, Gemini, Grok, Moonshot, OpenAI, Replit, xAI |
| server/services/ai-code-review.ts | Anthropic, Redis |
| server/services/ai-metering-service.ts | Stripe |
| server/services/ai-optimization/index.ts | Anthropic, Gemini, MCP, OpenAI, xAI |
| server/services/ai-optimization/mcp-router.service.ts | MCP |
| server/services/ai-optimization/observability.service.ts | Datadog, Sentry, Slack |
| server/services/ai-optimization/plan-cache.service.ts | Redis |
| server/services/ai-optimization/priority-queue.service.ts | Postgres |
| server/services/ai-optimization/slack-alert.service.ts | Slack |
| server/services/ai-optimization/task-classifier.service.ts | MCP |
| server/services/ai-optimization/token-usage-logger.service.ts | Anthropic, Gemini, Grok, MCP, Moonshot, xAI |
| server/services/ai-optimization-worker.service.ts | MCP |
| server/services/ai-plan-generator.service.ts | Anthropic, Gemini, Grok, Kimi, Moonshot, OpenAI, Redis, xAI |
| server/services/ai-pricing.ts | Anthropic, Gemini, Grok, Moonshot, OpenAI, xAI |
| server/services/ai-security.service.ts | Docker, Postgres, Redis |
| server/services/alert-service.ts | Sentry, Slack, Stripe |
| server/services/alert-system.ts | Slack |
| server/services/audit-logger.ts | Slack |
| server/services/autonomy-task-executor.ts | Docker, OpenAI, Postgres |
| server/services/billing-service.ts | Postgres, Redis, SendGrid |
| server/services/bounty-payment-service.ts | Stripe |
| server/services/cdn-optimization.ts | Replit |
| server/services/chatgpt-service.ts | Anthropic, OpenAI |
| server/services/checkpoint-service.ts | Replit, Sentry, Slack |
| server/services/checkpoint.service.ts | Replit |
| server/services/code-analysis-engine.ts | Linear |
| server/services/credits-service.ts | Replit, Stripe |
| server/services/database-hosting-service.ts | Postgres, Redis |
| server/services/database-management-service.ts | Postgres |
| server/services/database-pool.ts | Postgres |
| server/services/database-query-optimizer.ts | Redis |
| server/services/delegation-manager.service.ts | Anthropic, Gemini, Grok, Moonshot, OpenAI, xAI |
| server/services/deployment-manager.ts | Datadog |
| server/services/deployment-rollback.ts | Docker |
| server/services/effort-pricing-service.ts | Stripe |
| server/services/enhanced-auth.ts | Discord, GitHub, Slack |
| server/services/error-tracking.ts | Sentry |
| server/services/export-service.ts | Docker, GitHub |
| server/services/fast-bootstrap.service.ts | Anthropic, Gemini, OpenAI |
| server/services/file-service.ts | Docker |
| server/services/git-review-integration.ts | GitHub |
| server/services/github-oauth.ts | GitHub |
| server/services/integration.ts | Docker |
| server/services/load-testing.service.ts | Anthropic, OpenAI |
| server/services/marketplace-service.ts | Postgres |
| server/services/max-autonomy-service.ts | Anthropic, OpenAI |
| server/services/memory-bank.service.ts | Anthropic, Gemini, Grok, Moonshot, OpenAI, Postgres, Replit, xAI |
| server/services/mobile-app-service.ts | Zoom |
| server/services/mobile-container-service.ts | Docker |
| server/services/monitoring-service.ts | Slack |
| server/services/object-storage.service.ts | Replit |
| server/services/persistence-engine.ts | Postgres |
| server/services/project-ai-agent.service.ts | Anthropic, Gemini, OpenAI, xAI |
| server/services/project-database-provisioning.service.ts | Postgres |
| server/services/providers/cloudnativepg.provider.ts | Kubernetes, Postgres, S3 |
| server/services/providers/database-provider.interface.ts | Postgres |
| server/services/providers/index.ts | Kubernetes |
| server/services/providers/local.provider.ts | Postgres |
| server/services/providers/neon.provider.ts | AWS, Postgres |
| server/services/real-database-hosting.ts | Postgres, Redis |
| server/services/real-database-management.ts | Postgres |
| server/services/real-email-service.ts | SendGrid |
| server/services/real-mobile-compiler.ts | Docker, OIDC |
| server/services/real-object-storage.ts | Google Cloud Storage, Replit |
| server/services/real-package-manager.ts | Docker |
| server/services/real-secret-management.ts | AWS, Datadog, Postgres, Sentry |
| server/services/real-usage-tracking.ts | Redis |
| server/services/real-web-search.ts | GitHub |
| server/services/redis-cache.service.ts | Redis |
| server/services/redis-cache.ts | Redis |
| server/services/redis-idempotency.service.ts | Redis |
| server/services/resource-monitor.ts | Stripe |
| server/services/rollback-service.ts | Replit |
| server/services/scalability-orchestrator.ts | Docker, Kubernetes, Redis, Replit |
| server/services/schema-warming.service.ts | Replit |
| server/services/screenshot-service.ts | Linear |
| server/services/security-monitoring.ts | Slack |
| server/services/speculative-scaffold.service.ts | Replit, Stripe |
| server/services/spotlight-service.ts | GitHub |
| server/services/ssl-renewal.service.ts | Replit |
| server/services/storage.service.ts | AWS, Replit, S3 |
| server/services/stripe-billing-service.ts | Stripe |
| server/services/stripe-utils.ts | Stripe |
| server/services/template-marketplace.ts | GitHub, Postgres |
| server/services/template-submission.ts | GitHub, Slack, Stripe |
| server/services/web-search-service.ts | GitHub, Postgres |
| server/sso/enterprise-sso-service.ts | OIDC, SAML |
| server/status/status-page-service.ts | Anthropic, OpenAI, Postgres |
| server/storage.ts | Anthropic, Discord, Gemini, Kubernetes, Mistral, OpenAI, Postgres, Redis, Replit, Stripe, xAI |
| server/terminal/pty-terminal-service.ts | Docker, Redis, Replit |
| server/terminal/real-terminal.ts | Docker |
| server/terminal/redis-session-manager.ts | Redis |
| server/terminal/socket-io-terminal.ts | Replit |
| server/terminal.ts | Redis |
| server/tests/env-persistence.e2e.test.ts | Postgres |
| server/tools/web-import-service.ts | GitHub |
| server/utils/billing-email-templates.ts | Linear, Replit |
| server/utils/db-streaming.ts | Postgres, Replit |
| server/utils/env-config.ts | Anthropic, OpenAI, Postgres, Redis, Replit, S3, SendGrid, Sentry, Slack, Stripe, xAI |
| server/utils/gandi-email.ts | Linear |
| server/utils/model-normalizer.ts | Anthropic, Gemini, Grok, Kimi, Moonshot, OpenAI, xAI |
| server/utils/origin-validation.ts | Replit |
| server/utils/postgres-js-url.ts | Postgres |
| server/utils/production-validation.ts | Anthropic, Docker, Gemini, OpenAI, Postgres, Redis, Replit, S3, SendGrid, Sentry, Stripe, xAI |
| server/utils/secrets-manager.ts | Replit |
| server/utils/security.ts | GitHub |
| server/utils/sendgrid-email-service.ts | Linear, Replit, SendGrid |
| server/utils/sse-headers.ts | Replit |
| server/utils/validators.ts | Docker |
| server/vite-loader.ts | Linear |
| server/websocket/central-upgrade-dispatcher.ts | AWS, Replit |
| server/workflows/payg-queue-processor.ts | Postgres, Stripe |
| server/workflows/stripe-usage-worker.ts | Postgres, Stripe |
| client/src/App.tsx | Replit |
| client/src/components/AIUsageDashboard.tsx | Gemini |
| client/src/components/AllModelsSelector.tsx | Anthropic, Gemini, Grok, Kimi, MCP, Moonshot, OpenAI, xAI |
| client/src/components/ApplicationIDEWrapper.tsx | Replit |
| client/src/components/AuthenticationDemo.tsx | OpenAI |
| client/src/components/AutomationsPanel.tsx | Slack |
| client/src/components/BillingSystem.tsx | Replit, SAML, Stripe |
| client/src/components/BottomPanel.tsx | Replit |
| client/src/components/CodeReviewSettings.tsx | Anthropic, Gemini, Grok, OpenAI, xAI |
| client/src/components/CommandPalette.tsx | Postgres |
| client/src/components/CommunityFeatures.tsx | GitHub |
| client/src/components/ConfigPanel.tsx | Replit |
| client/src/components/CoverageInsightsPanel.tsx | Replit |
| client/src/components/CreateProjectModal.tsx | GitHub |
| client/src/components/DashboardCharts.tsx | Linear |
| client/src/components/DatabaseBrowser.tsx | Postgres |
| client/src/components/DatabaseHosting.tsx | Postgres, Redis |
| client/src/components/DatabaseManagement.tsx | Postgres |
| client/src/components/DeploymentManager.tsx | Linear |
| client/src/components/DesignCanvas.tsx | Linear, Zoom |
| client/src/components/ECodeLoading.tsx | Linear |
| client/src/components/ECodeLogo.tsx | Linear |
| client/src/components/EnterpriseSSO.tsx | OIDC, SAML |
| client/src/components/EnvironmentManager.tsx | Postgres |
| client/src/components/EnvironmentPanel.tsx | Postgres |
| client/src/components/ErrorBoundary.tsx | Sentry |
| client/src/components/ExportOptions.tsx | Docker, GitHub |
| client/src/components/GPUManagement.tsx | Anthropic, OpenAI |
| client/src/components/GitHubPanel.tsx | GitHub |
| client/src/components/GitIntegration.tsx | GitHub |
| client/src/components/GitPanel.tsx | GitHub |
| client/src/components/GlobalSearch.tsx | Replit |
| client/src/components/ImportExport.tsx | GitHub |
| client/src/components/IntegrationsPanel.tsx | GitHub, MCP |
| client/src/components/LanguageEnvironments.tsx | Docker, Replit |
| client/src/components/LanguageTemplates.tsx | Postgres, Redis |
| client/src/components/MCPPanel.tsx | MCP |
| client/src/components/MCPServersPanel.tsx | GitHub, MCP, Postgres |
| client/src/components/MobileChatInterface.tsx | Replit |
| client/src/components/NixConfig.tsx | Postgres, Replit |
| client/src/components/OpenAIModelSelector.tsx | OpenAI |
| client/src/components/PendingApprovalsPanel.tsx | Replit |
| client/src/components/Preview.tsx | Replit |
| client/src/components/ProjectTemplates.tsx | Discord |
| client/src/components/ReplitAnalytics.tsx | Replit |
| client/src/components/ReplitAssistant.tsx | Anthropic, Replit |
| client/src/components/ReplitBackups.tsx | Replit |
| client/src/components/ReplitCollaboration.tsx | Replit |
| client/src/components/ReplitCoreServices.tsx | Docker, GitHub, Postgres, Redis, Replit |
| client/src/components/ReplitDB.tsx | Replit |
| client/src/components/ReplitDatabase.tsx | Replit |
| client/src/components/ReplitDeploymentPipeline.tsx | Replit |
| client/src/components/ReplitDevTools.tsx | Replit |
| client/src/components/ReplitForkGraph.tsx | Replit, Zoom |
| client/src/components/ReplitJSONEditor.tsx | Replit |
| client/src/components/ReplitMonitoring.tsx | Replit |
| client/src/components/ReplitMultiplayer.tsx | Replit |
| client/src/components/ReplitNetworking.tsx | Replit |
| client/src/components/ReplitObjectStorage.tsx | Replit, S3 |
| client/src/components/ReplitPackageExplorer.tsx | Replit, Zoom |
| client/src/components/ReplitPackages.tsx | Replit |
| client/src/components/ReplitResourceMonitor.tsx | Replit |
| client/src/components/ReplitSecrets.tsx | Replit |
| client/src/components/ReplitTesting.tsx | Replit |
| client/src/components/ReplitVersionControl.tsx | Replit |
| client/src/components/ReplitWorkflows.tsx | Replit |
| client/src/components/ScalabilityDashboard.tsx | Redis |
| client/src/components/SpotlightSearch.tsx | Replit |
| client/src/components/SpotlightSettingsPanel.tsx | Replit |
| client/src/components/TemplateGallery.tsx | OpenAI, Stripe |
| client/src/components/TemplatesMarketplace.tsx | GitHub |
| client/src/components/ThreadsPanel.tsx | Replit |
| client/src/components/ToolsDropdown.tsx | Replit |
| client/src/components/UnifiedAIInterface.tsx | Anthropic, Gemini, Grok, OpenAI, xAI |
| client/src/components/VideoEditor.tsx | Zoom |
| client/src/components/agent/AIModelIndicator.tsx | Anthropic, Gemini, Grok, Kimi, Moonshot, OpenAI, xAI |
| client/src/components/agent/ModelSelector.tsx | Anthropic, Gemini, Grok, Kimi, Moonshot, OpenAI, xAI |
| client/src/components/agent/ProviderHealthIndicator.tsx | Anthropic, Moonshot, OpenAI, xAI |
| client/src/components/agent/ReplitProgressBar.tsx | Replit |
| client/src/components/agent/StopButton.tsx | Replit |
| client/src/components/agent/messages/CollapsibleSection.tsx | Replit |
| client/src/components/agent/messages/FileDiffViewer.tsx | Replit |
| client/src/components/agent/messages/MessageRenderer.tsx | OpenAI, Replit |
| client/src/components/agent/messages/RichMessageContent.tsx | Replit |
| client/src/components/agent/messages/StreamingSkeleton.tsx | Replit |
| client/src/components/agent/messages/VibingAnimation.tsx | Replit |
| client/src/components/agent/messages/index.ts | Replit |
| client/src/components/agent/messages/types.ts | Replit |
| client/src/components/ai/AIModelSelector.tsx | Anthropic, Gemini, Kimi, Moonshot, OpenAI, Replit, xAI |
| client/src/components/ai/AgentToolsPanel.tsx | Replit |
| client/src/components/ai/BuildModeSelector.tsx | Replit |
| client/src/components/ai/CurrentModelChip.tsx | Anthropic, Gemini, Moonshot, OpenAI, xAI |
| client/src/components/ai/EnhancedChatMessage.tsx | GitHub, Replit, Stripe |
| client/src/components/ai/InlineBuildProgress.tsx | Linear, Replit |
| client/src/components/ai/MaxAutonomyProgress.tsx | Postgres |
| client/src/components/ai/ProgressPanel.tsx | Replit |
| client/src/components/ai/RAGControls.tsx | Anthropic, Gemini, OpenAI |
| client/src/components/ai/ReplitAgentPanelV3.tsx | MCP, OpenAI, Replit |
| client/src/components/ai/SlashCommandMenu.tsx | Anthropic, Gemini, Grok, Kimi, MCP, Moonshot, OpenAI, Replit, xAI |
| client/src/components/ai/VideoReplayPlayer.tsx | Replit |
| client/src/components/ai/WebSearchResultsDisplay.tsx | Linear |
| client/src/components/deployment/DeploymentMetrics.tsx | Linear |
| client/src/components/editor/AIAgentPanel.tsx | Anthropic, Gemini, OpenAI |
| client/src/components/editor/AICodeReview.tsx | Redis |
| client/src/components/editor/AdvancedEditorIntegration.tsx | Replit |
| client/src/components/editor/CodeReviewPanel.tsx | Redis |
| client/src/components/editor/MultiTabEditor.tsx | Replit |
| client/src/components/editor/ReplitBreadcrumbs.tsx | Replit |
| client/src/components/editor/ReplitCodeEditor.tsx | Docker, Replit |
| client/src/components/editor/ReplitConsole.tsx | Replit |
| client/src/components/editor/ReplitDatabasePanel.tsx | Linear, Postgres, Replit |
| client/src/components/editor/ReplitDebuggerPanel.tsx | Linear, Replit |
| client/src/components/editor/ReplitEditorLayout.tsx | MCP, Replit |
| client/src/components/editor/ReplitFileExplorer.tsx | Replit |
| client/src/components/editor/ReplitFileSidebar.tsx | Replit |
| client/src/components/editor/ReplitGitPanel.tsx | GitHub, Linear, Replit |
| client/src/components/editor/ReplitHistoryPanel.tsx | Replit |
| client/src/components/editor/ReplitMonacoEditor.tsx | Docker, Replit |
| client/src/components/editor/ReplitMultiplayers.tsx | Replit |
| client/src/components/editor/ReplitOutputPanel.tsx | Replit |
| client/src/components/editor/ReplitPackagesPanel.tsx | Linear, Replit |
| client/src/components/editor/ReplitProblemsPanel.tsx | Replit |
| client/src/components/editor/ReplitResourcesPanel.tsx | Replit |
| client/src/components/editor/ReplitSearchPanel.tsx | Replit |
| client/src/components/editor/ReplitSecretsPanel.tsx | Postgres, Replit |
| client/src/components/editor/ReplitSecurityPanel.tsx | Replit |
| client/src/components/editor/ReplitSettingsPanel.tsx | GitHub, Replit |
| client/src/components/editor/ReplitSidebarMenu.tsx | Replit |
| client/src/components/editor/ReplitStatusBar.tsx | Replit |
| client/src/components/editor/ReplitTerminalPanel.tsx | Replit |
| client/src/components/editor/ReplitTestingPanel.tsx | Replit |
| client/src/components/editor/ReplitThemesPanel.tsx | GitHub, Replit |
| client/src/components/editor/ReplitToolDock.tsx | Replit |
| client/src/components/editor/ShellPanel.tsx | Replit |
| client/src/components/files/ReplitFileExplorer.tsx | Replit |
| client/src/components/grids/AgentSessionsGrid.tsx | Gemini |
| client/src/components/grids/ConversationHistoryGrid.tsx | Gemini |
| client/src/components/ide/AddTabMenu.tsx | Zoom |
| client/src/components/ide/DatabasePanel.tsx | Postgres |
| client/src/components/ide/FileExplorerPanel.tsx | Replit |
| client/src/components/ide/GitPanel.tsx | Replit |
| client/src/components/ide/PreviewPanel.tsx | Replit |
| client/src/components/ide/PreviewSplashScreen.tsx | Replit |
| client/src/components/ide/ProfessionalCodeEditor.tsx | Replit |
| client/src/components/ide/ReplitActivityBar.tsx | MCP, Replit |
| client/src/components/ide/ReplitAuthPanel.tsx | Discord, GitHub, Replit |
| client/src/components/ide/ReplitConsolePanel.tsx | Replit |
| client/src/components/ide/ReplitDeploymentPanel.tsx | Replit |
| client/src/components/ide/ReplitPublishButton.tsx | Replit |
| client/src/components/ide/ReplitTabBar.tsx | Linear, Replit |
| client/src/components/ide/ReplitToolsSheet.tsx | Replit |
| client/src/components/ide/SplashScreenSequence.tsx | Postgres |
| client/src/components/ide/TerminalPanel.tsx | Replit |
| client/src/components/ide/TopNavBar.tsx | Replit |
| client/src/components/ide/UnifiedIDELayout.tsx | GitHub, MCP, Postgres, Replit |
| client/src/components/ide/VisualEditorPanel.tsx | Zoom |
| client/src/components/landing/sections/LandingLanguages.tsx | Docker, Kubernetes |
| client/src/components/landing/sections/LandingProjects.tsx | Postgres, Redis |
| client/src/components/layout/PublicFooter.tsx | AWS, GitHub |
| client/src/components/layout/ReplitFooter.tsx | Replit |
| client/src/components/layout/ReplitHeader.tsx | GitHub, Replit |
| client/src/components/layout/ReplitLayout.tsx | Replit |
| client/src/components/layout/ReplitSidebar.tsx | Postgres, Replit |
| client/src/components/lazy/LazyCM6Editor.tsx | Replit |
| client/src/components/lazy/LazyMonacoEditor.tsx | Replit |
| client/src/components/lazy/LazyTerminal.tsx | Replit |
| client/src/components/lazy/index.tsx | Replit |
| client/src/components/mcp/GitHubMCPPanel.tsx | GitHub, MCP |
| client/src/components/mcp/MemoryMCPPanel.tsx | MCP |
| client/src/components/mcp/PostgreSQLMCPPanel.tsx | MCP, Postgres |
| client/src/components/mobile/EnhancedMobileFileExplorer.tsx | Replit |
| client/src/components/mobile/InlineMobileFileExplorer.tsx | Replit |
| client/src/components/mobile/MobileCodeJoystick.tsx | Replit, S3 |
| client/src/components/mobile/MobileCodeKeyboard.tsx | Replit |
| client/src/components/mobile/MobileCreateModal.tsx | GitHub, OpenAI, Postgres, Redis |
| client/src/components/mobile/MobileDatabasePanel.tsx | Postgres |
| client/src/components/mobile/MobileGitPanel.tsx | GitHub, Linear |
| client/src/components/mobile/MobileNotifications.tsx | Linear |
| client/src/components/mobile/MobilePackagesPanel.tsx | Linear |
| client/src/components/mobile/MobilePreviewPanel.tsx | Replit |
| client/src/components/mobile/MobileProfile.tsx | Linear |
| client/src/components/mobile/MobileSecurityPanel.tsx | Replit |
| client/src/components/mobile/MobileTabSwitcher.tsx | Replit |
| client/src/components/mobile/MobileTransitions.tsx | Linear |
| client/src/components/mobile/ReplitBottomTabs.tsx | Linear, Replit |
| client/src/components/mobile/ReplitMobileHeader.tsx | Replit |
| client/src/components/mobile/ReplitMobileInputBar.tsx | MCP, Replit |
| client/src/components/mobile/ReplitMobileNavigation.tsx | MCP, Replit |
| client/src/components/mobile/ReplitToolsSheet.tsx | Replit |
| client/src/components/mobile/index.ts | Replit |
| client/src/components/monitoring/AlertManager.tsx | Slack |
| client/src/components/monitoring/ResourceUsageChart.tsx | Linear |
| client/src/components/replit/ReplitBreadcrumb.tsx | Replit |
| client/src/components/replit/ReplitContextMenu.tsx | Replit |
| client/src/components/replit/ReplitMinimap.tsx | Replit |
| client/src/components/replit/ReplitSearchBox.tsx | Replit |
| client/src/components/replit/ReplitStatusBar.tsx | Replit |
| client/src/components/replit/ReplitTabBar.tsx | Replit |
| client/src/components/replit/ReplitToolbar.tsx | Replit |
| client/src/components/seo/SEOHead.tsx | GitHub |
| client/src/components/shell/ReplitDesktopShell.tsx | Replit |
| client/src/components/shell/ReplitMobileShell.tsx | Replit |
| client/src/components/shell/ResponsiveShell.tsx | Replit |
| client/src/components/shell/index.ts | Replit |
| client/src/components/splits/SplitsDemoPage.tsx | Replit |
| client/src/components/splits/SplitsEditorLayout.tsx | Replit |
| client/src/components/splits/SplitsEditorLayoutV2.tsx | Replit |
| client/src/components/splits/SplitsResizeHandle.tsx | Replit |
| client/src/components/tablet/TabletDrawerContent.tsx | OpenAI, Replit |
| client/src/components/tablet/TabletIDEView.tsx | OpenAI, Replit |
| client/src/components/terminal/AdvancedTerminal.tsx | Zoom |
| client/src/components/terminal/ReplitTerminal.tsx | Replit |
| client/src/components/ui/alert-dialog.tsx | Zoom |
| client/src/components/ui/button.tsx | Replit |
| client/src/components/ui/context-menu.tsx | Zoom |
| client/src/components/ui/dialog.tsx | Zoom |
| client/src/components/ui/dropdown-menu.tsx | Zoom |
| client/src/components/ui/enhanced-feedback.tsx | Linear |
| client/src/components/ui/hover-card.tsx | Zoom |
| client/src/components/ui/menubar.tsx | Zoom |
| client/src/components/ui/mobile-gestures.tsx | Linear, Zoom |
| client/src/components/ui/navigation-menu.tsx | Zoom |
| client/src/components/ui/popover.tsx | Zoom |
| client/src/components/ui/select.tsx | Zoom |
| client/src/components/ui/sidebar.tsx | Linear |
| client/src/components/ui/skeleton-loader.tsx | Linear |
| client/src/components/ui/themed-panel.tsx | Replit |
| client/src/components/ui/tooltip.tsx | Zoom |
| client/src/config/seo.config.ts | GitHub, Replit |
| client/src/constants/brand.ts | Replit |
| client/src/design-system/components/Onboarding.tsx | Zoom |
| client/src/design-system/components/Settings.tsx | Linear |
| client/src/design-system/components/Skeleton.tsx | Linear |
| client/src/design-system/hooks/useGestures.ts | Zoom |
| client/src/design-system/index.ts | Zoom |
| client/src/design-system/tokens.ts | Replit |
| client/src/hooks/use-agent-model-preference.ts | Anthropic, Gemini, Grok, Kimi, Moonshot, OpenAI, xAI |
| client/src/hooks/use-auth.tsx | Replit |
| client/src/hooks/use-autonomous-chat-integration.ts | Replit |
| client/src/hooks/use-media-query.ts | Replit |
| client/src/hooks/use-mobile-persistence.ts | Replit |
| client/src/hooks/use-pinch-zoom.ts | Zoom |
| client/src/hooks/use-smooth-scroll.ts | Zoom |
| client/src/hooks/use-tablet-persistence.ts | Replit |
| client/src/hooks/useAgentTools.ts | Anthropic, Moonshot, OpenAI, xAI |
| client/src/hooks/useAutoSave.ts | Replit |
| client/src/hooks/useIDEWorkspace.ts | MCP, Replit |
| client/src/hooks/useResponsive.ts | Replit |
| client/src/hooks/useServerLogs.ts | Replit |
| client/src/lib/cm6/extensions.ts | AWS |
| client/src/lib/cm6/index.ts | Replit |
| client/src/lib/cm6/language-loader.ts | Docker |
| client/src/lib/cm6/theme.ts | Replit |
| client/src/lib/motion/CSSAnimations.tsx | Linear |
| client/src/lib/motion/OptimizedMotionProvider.tsx | Replit |
| client/src/lib/package-detector.ts | Redis |
| client/src/lib/responsive.ts | Replit, S3 |
| client/src/lib/runtimeDependencies.ts | Docker |
| client/src/lib/simulate-streaming.ts | Replit |
| client/src/lib/task-extractor.ts | Replit |
| client/src/lib/tool-registry.ts | GitHub, MCP, Postgres, Replit, S3 |
| client/src/main.tsx | Sentry |
| client/src/pages/AIAgent.tsx | Postgres |
| client/src/pages/AIAgentStudio.tsx | Stripe |
| client/src/pages/AIDocumentation.tsx | Anthropic, Gemini, OpenAI |
| client/src/pages/Accessibility.tsx | AWS, Zoom |
| client/src/pages/AdminBilling.tsx | Stripe |
| client/src/pages/AdminDashboard.tsx | Postgres, Redis |
| client/src/pages/AdminSettings.tsx | Anthropic, Gemini, Grok, OpenAI, Postgres, Redis, SendGrid, Stripe, xAI |
| client/src/pages/Analytics.tsx | Linear |
| client/src/pages/AssistantPage.tsx | Anthropic, Gemini, Grok, Moonshot, OpenAI, xAI |
| client/src/pages/AuthenticationPage.tsx | GitHub, OIDC, SAML |
| client/src/pages/Billing.tsx | Stripe |
| client/src/pages/BlogDetail.tsx | Replit |
| client/src/pages/Careers.tsx | Kubernetes |
| client/src/pages/ChatGPTAdmin.tsx | Anthropic, OpenAI |
| client/src/pages/CommercialAgreement.tsx | AWS |
| client/src/pages/Community.tsx | Replit |
| client/src/pages/ConsolePage.tsx | Zoom |
| client/src/pages/DPA.tsx | AWS |
| client/src/pages/Dashboard.tsx | GitHub, Slack |
| client/src/pages/DatabaseManagement.tsx | Replit |
| client/src/pages/DatabasePage.tsx | Postgres, Replit |
| client/src/pages/Dependencies.tsx | Replit |
| client/src/pages/Docs.tsx | Anthropic, Gemini, GitHub, Kubernetes, MCP, OIDC, OpenAI, Postgres, SAML, Slack, Stripe |
| client/src/pages/Editor.tsx | Replit |
| client/src/pages/Explore.tsx | Replit |
| client/src/pages/FeaturePlaceholder.tsx | Jira, OIDC, SAML, Slack |
| client/src/pages/Features.tsx | GitHub, Postgres |
| client/src/pages/GitHubImport.tsx | GitHub |
| client/src/pages/Home.tsx | Linear, OpenAI, Replit, Slack, Stripe |
| client/src/pages/IntegrationsPage.tsx | AWS, Datadog, Discord, GitHub, Jira, Linear, New Relic, Postgres, Redis, S3, SendGrid, Sentry, Slack, Stripe |
| client/src/pages/Landing.tsx | Docker, Jira, Kubernetes, OpenAI, Postgres, Redis, Replit, Slack, Stripe, Zoom |
| client/src/pages/LandingOptimized.tsx | Jira, OpenAI, Slack, Stripe |
| client/src/pages/Languages.tsx | Postgres, S3 |
| client/src/pages/Learn.tsx | Discord, Replit |
| client/src/pages/Login.tsx | GitHub, Linear, Replit |
| client/src/pages/MCPInterface.tsx | Docker, GitHub, MCP |
| client/src/pages/Marketplace.tsx | GitHub |
| client/src/pages/MobileWorkspace.tsx | Replit |
| client/src/pages/NewTeamPage.tsx | SAML |
| client/src/pages/NewsletterConfirmed.tsx | Zoom |
| client/src/pages/Notifications.tsx | Replit |
| client/src/pages/PackagesPage.tsx | Replit |
| client/src/pages/Partners.tsx | Docker, Firebase, GitHub, OpenAI, Redis, Stripe |
| client/src/pages/Plans.tsx | SAML |
| client/src/pages/PreviewPage.tsx | Zoom |
| client/src/pages/Pricing.tsx | GitHub, SAML |
| client/src/pages/Profile.tsx | GitHub |
| client/src/pages/ProjectsPage.tsx | Linear |
| client/src/pages/PublicDeploymentsPage.tsx | Slack |
| client/src/pages/Register.tsx | GitHub, Linear, Replit |
| client/src/pages/ReportAbuse.tsx | AWS |
| client/src/pages/RuntimeDiagnosticsPage.tsx | Docker |
| client/src/pages/RuntimePublicPage.tsx | Docker |
| client/src/pages/RuntimesPage.tsx | Docker |
| client/src/pages/SecretManagement.tsx | Replit |
| client/src/pages/Settings.tsx | GitHub |
| client/src/pages/ShellPage.tsx | Docker |
| client/src/pages/Status.tsx | Postgres, S3 |
| client/src/pages/StudentDPA.tsx | AWS |
| client/src/pages/Subprocessors.tsx | AWS, Datadog, GitHub, SendGrid, Stripe |
| client/src/pages/Subscribe.tsx | Stripe |
| client/src/pages/Support.tsx | Discord |
| client/src/pages/Terms.tsx | AWS |
| client/src/pages/ThemeValidation.tsx | Replit |
| client/src/pages/UsageAlerts.tsx | Replit |
| client/src/pages/UserProfile.tsx | GitHub |
| client/src/pages/VNCPage.tsx | Linear |
| client/src/pages/Workflows.tsx | Replit |
| client/src/pages/admin/AIModels.tsx | Anthropic, MCP, Mistral, Moonshot, OpenAI |
| client/src/pages/admin/AIOptimizationDashboard.tsx | MCP, Slack |
| client/src/pages/admin/AdminMonitoring.tsx | Kubernetes |
| client/src/pages/admin/PitchDeck.tsx | Anthropic, Discord, Docker, GitHub, Kubernetes, OpenAI, Postgres, Redis, Replit, S3, Slack |
| client/src/pages/admin/SEOManagement.tsx | Linear |
| client/src/pages/auth-page.tsx | GitHub |
| client/src/pages/compare/ComparePage.tsx | AWS, Datadog, GitHub, Linear, Postgres, Redis, SAML, Slack, Stripe |
| client/src/pages/marketing/Compare.tsx | AWS, GitHub |
| client/src/pages/marketing/VsAwsCloud9.tsx | AWS |
| client/src/pages/marketing/VsGitHubCodespaces.tsx | GitHub, Postgres |
| client/src/pages/marketing/VsGlitch.tsx | Postgres |
| client/src/pages/marketing/VsHeroku.tsx | Postgres |
| client/src/pages/mobile.tsx | Slack |
| client/src/pages/resources/Changelog.tsx | GitHub, Postgres, SAML |
| client/src/pages/resources/Tutorials.tsx | Postgres, Stripe |
| client/src/pages/solutions/ChatbotBuilder.tsx | Discord, Slack |
| client/src/pages/solutions/Enterprise.tsx | SAML |
| client/src/routes/config.ts | AWS, GitHub, MCP, Replit |
| client/src/routes/index.ts | AWS, GitHub, MCP |
| client/src/stores/autonomousBuildStore.ts | Replit |
| client/src/stores/splits-store.ts | Replit |
| client/src/types/splits.ts | Replit |
| client/src/utils/image-optimization.tsx | Linear |
| client/src/utils/instrumented-lazy.ts | Replit |
| shared/admin-schema.ts | Anthropic, OpenAI, Stripe |
| shared/aiModels.ts | Anthropic, Gemini, Grok, Kimi, MCP, Moonshot, OpenAI, Replit, xAI |
| shared/config/env.ts | Replit |
| shared/mobile-types.ts | Anthropic, Gemini, Grok, Kimi, Moonshot, OpenAI, xAI |
| shared/responsive-config.ts | Replit |
| shared/schema/checkpoints.ts | Replit |
| shared/schema.ts | Anthropic, Firebase, Gemini, GitHub, Google Cloud Storage, Grok, Kimi, Kubernetes, MCP, Moonshot, OpenAI, Postgres, Redis, Replit, S3, Slack, Stripe, xAI |
| shared/teams-schema.ts | Stripe |
| shared/theme/mobile-theme.ts | Replit |
| shared/theme/tokens.ts | Replit |

## Certification Tracking

Each mapped item must be marked in docs/PRODUCTION-CERTIFICATION.md with static, dynamic, E2E, and notes before STATUS can become PRODUCTION-READY.
