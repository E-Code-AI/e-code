# Horizontal Scaling Guide

## Architecture Overview

E-Code runs as an Express/Node.js application. A single instance handles HTTP
requests, WebSocket connections, and preview child processes. This document
describes how to run multiple instances behind a load balancer.

## Shared State Requirements

Every instance must connect to the **same** Postgres and Redis clusters.

| Service  | Env Var           | Purpose                                           |
|----------|-------------------|---------------------------------------------------|
| Postgres | `DATABASE_URL`    | User data, projects, files, sessions (`connect-pg-simple`) |
| Redis    | `REDIS_URL`       | Cache, terminal session checkpoints, pub/sub      |

### HTTP Session Store

HTTP sessions are stored in Postgres via `connect-pg-simple`. Any instance can
authenticate any request because the session table is shared. The session cookie
(`ecode.sid`) is verified against Postgres on every request.

### WebSocket Authentication

WebSocket upgrade requests (terminal, collaboration) authenticate using the
same session cookie. The PTY terminal service reads the `ecode.sid` cookie,
looks up the session in the Postgres-backed store, and verifies the user. JWT
tokens are supported as a fallback for programmatic clients.

### Terminal Sessions

Terminal session metadata (working directory, command history, dimensions) is
checkpointed to Redis on client disconnect and restored on reconnect. The Redis
key format is `terminal:session:terminal-{projectId}` with a 24-hour TTL.

PTY processes are per-instance (a shell process cannot migrate between hosts).
If a user reconnects to a different instance, the server detects that the
original PTY is gone, restores the saved session metadata from Redis, and spawns
a fresh shell in the same working directory.

## Per-Instance State (Not Shared)

| Component           | Why it is per-instance                               | Mitigation                                                  |
|---------------------|------------------------------------------------------|-------------------------------------------------------------|
| Preview processes   | Child processes (`spawn`) are OS-level                | Sticky sessions or a dedicated preview-runner service       |
| PTY shells          | File descriptors are per-process                      | Redis checkpoint restores metadata; new shell spawned       |
| In-memory caches    | `fileHashCache` (preview sync), `terminalSessions`    | Reconstructed on demand from DB/Redis                       |

## Load Balancer Configuration

### Sticky Sessions

WebSocket connections (terminal, collaboration, LSP) require sticky sessions so
that all frames in a connection reach the same instance. Configure your load
balancer to use cookie-based affinity on the `connect.sid` cookie.

| LB               | Setting                                 |
|-------------------|-----------------------------------------|
| AWS ALB           | Target group stickiness (application cookie) |
| Nginx             | `ip_hash` or `sticky cookie`           |
| HAProxy           | `balance source` or `cookie SERVERID`   |
| GCP Cloud Run     | Session affinity = enabled              |

### Health Checks

Point the load balancer health check at:

- **Readiness**: `GET /health/readiness` — returns `200` when all services are
  up, `503` when the instance is starting or draining.
- **Liveness**: `GET /health/liveness` — returns `200` as long as the process is
  alive.

### Draining

On `SIGTERM` the instance enters **draining mode**:

1. `/health` and `/health/readiness` return `503` immediately, signalling the LB
   to stop routing new requests.
2. Existing connections continue to be served for up to 30 seconds.
3. After 30 seconds the process exits.

This gives in-flight requests time to complete while new traffic is routed
elsewhere.

## Running Multiple Instances

```bash
# Instance 1
DATABASE_URL=postgres://... REDIS_URL=redis://... PORT=5000 node dist/index.js

# Instance 2
DATABASE_URL=postgres://... REDIS_URL=redis://... PORT=5001 node dist/index.js
```

Both instances share the same Postgres and Redis. The load balancer distributes
traffic across ports 5000 and 5001 (or separate hosts).

## Scaling Limits

- **Preview processes**: Each instance can run `MAX_CONCURRENT_PREVIEWS` (default
  10) child processes. To scale previews independently, extract them into a
  separate preview-runner microservice (out of scope for this document).
- **WebSocket connections**: Each Node.js process handles ~10K concurrent
  WebSocket connections. Beyond that, add more instances.
- **Redis**: A single Redis instance handles the session checkpoint and cache
  load for dozens of app instances. For higher throughput, use Redis Cluster.

## Environment Variables

All instances must share these variables:

| Variable               | Required | Description                          |
|------------------------|----------|--------------------------------------|
| `DATABASE_URL`         | Yes      | Shared Postgres connection string    |
| `REDIS_URL`            | Yes      | Shared Redis connection string       |
| `SESSION_SECRET`       | Yes      | Must be identical across instances   |
| `RUNNER_JWT_SECRET`     | Yes      | Must be identical across instances   |
| `ALLOWED_ORIGINS`      | Yes      | CORS allowlist (production)          |
| `STRIPE_WEBHOOK_SECRET`| If billing | Stripe webhook verification        |
| `SENDGRID_API_KEY`     | If email | Transactional email                  |
