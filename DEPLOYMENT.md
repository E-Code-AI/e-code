# Production Deployment

This runbook is for deploying `e-code` to a production VM or container host with PostgreSQL, Redis, TLS termination, durable object storage, and GitHub Actions.

## 1. Prerequisites

- Node.js `20.x`
- Docker and Docker Compose plugin
- PostgreSQL `15+`
- Redis `7+`
- A reverse proxy or load balancer terminating TLS
- Durable object storage:
  - Replit Object Storage, or
  - S3-compatible bucket
- GitHub Actions secrets and variables configured

## 2. Required Secrets And Variables

Copy `.env.production.example` to your secret manager or deployment platform and set, at minimum:

- `DATABASE_URL`
- `REDIS_URL`
- `SESSION_SECRET`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `ENCRYPTION_KEY`
- `APP_URL`
- `ALLOWED_ORIGINS`
- `RUNNER_JWT_SECRET`
- AI provider keys you actually use

Recommended:

- `SENTRY_DSN`
- `VITE_SENTRY_DSN`
- `BACKUP_CRON`
- `STORAGE_BACKEND`
- `S3_REGION`
- `S3_BUCKET`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`

Production guards enforced by the app:

- `APP_URL` must use `https://`
- `JWT_SECRET` and `ENCRYPTION_KEY` must be at least 32 characters
- `ALLOWED_ORIGINS` must be explicit origins, not wildcards
- durable object storage must be configured

## 3. Database Migrations

Before first deploy and on every release:

```bash
npm ci
npm run db:migrate
```

Do not rely on `db:push` in normal production deploys. The container entrypoint now refuses schema push unless `ALLOW_SCHEMA_PUSH_IN_PRODUCTION=true` is set explicitly for emergency recovery.

Current migration files live in `migrations/`. Verify the latest SQL files before deploy:

```bash
find migrations -maxdepth 1 -name '*.sql' | sort | tail -5
```

## 4. Build Verification

Run locally or in CI before shipping:

```bash
npm ci
npm run build
npm run deploy:check
```

Expected build artifacts:

- `dist/public/index.html`
- `dist/index.js`

The frontend build already uses Vite code splitting and vendor chunking via `vite.config.ts`.

## 5. Container Deployment

For a VM-based production deployment:

1. Provision PostgreSQL, Redis, and object storage.
2. Put the repository on the target host.
3. Inject production secrets with your secret manager, `.env`, or CI.
4. Start the stack:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

The application container will:

- validate production env
- wait for PostgreSQL readiness
- run `npm run db:migrate`
- start `dist/index.js`

## 6. Reverse Proxy And TLS

Terminate TLS at Nginx, Caddy, Traefik, Cloudflare, or your cloud load balancer.

Requirements:

- forward `X-Forwarded-Proto`, `X-Forwarded-For`, and `Host`
- set `APP_URL` to the public `https://` URL
- set `TRUST_PROXY_HOPS` to match the number of trusted proxies in front of the app

Recommended Nginx upstream behavior:

- proxy WebSocket upgrades
- preserve `Host`
- enable HTTP/2 or HTTP/3 at the edge
- redirect HTTP to HTTPS

## 7. Health Checks And Monitoring

Use these endpoints:

- `/health`
- `/health/liveness`
- `/health/readiness`
- `/api/health`
- `/api/health/readiness`
- `/api/cors-health`

Suggested monitors:

- liveness every 30s
- readiness every 30s
- alert on repeated `5xx`
- alert on failed deploy health checks

Sentry is optional but supported on both server and client when `SENTRY_DSN` and `VITE_SENTRY_DSN` are configured.

## 8. Security Hardening

Already enforced in app middleware:

- Helmet security headers
- production HSTS
- strict CORS allowlist
- API and WebSocket rate limiting
- Redis-backed distributed throttling when available

Operational recommendations:

- put Cloudflare, AWS ALB + WAF, or equivalent in front of the app
- only expose `80/443` publicly
- keep PostgreSQL and Redis private
- rotate secrets through a secret manager, not committed files

## 9. Backups And Restore Drills

Application data to protect:

- PostgreSQL
- object storage bucket contents
- user uploads and generated artifacts

Database backup commands:

```bash
npm run db:backup
npm run db:restore -- backups/backup_YYYY-MM-DD_HH-MM-SS.sql
```

Recommended strategy:

- nightly `pg_dump`
- upload backups to durable object storage
- retain daily, weekly, and monthly snapshots
- test restore into a staging database at least once per month

If `ENABLE_BACKUPS=true`, set `BACKUP_CRON` and run the backup job from cron, systemd timer, or your orchestrator scheduler.

## 10. CI/CD

Primary production workflow:

- `.github/workflows/deploy-main.yml`

Replit-specific validation workflow:

- `.github/workflows/replit-deployment.yml`

The production pipeline should now:

- install dependencies
- typecheck
- run CI tests
- build optimized bundles
- run `npm run deploy:check`
- deploy via SSH
- verify `/health/liveness`, `/health/readiness`, and `/api/health`

Configure these GitHub repository settings:

- Secrets:
  - `SSH_HOST`
  - `SSH_USER`
  - `SSH_PRIVATE_KEY`
  - `DATABASE_URL`
  - `SESSION_SECRET`
  - `JWT_SECRET`
  - `ENCRYPTION_KEY`
  - `SENTRY_DSN`
  - `VITE_SENTRY_DSN`
- Variables:
  - `APP_URL`
  - `ALLOWED_ORIGINS`
  - `DEPLOY_DIR`

## 11. Rollback

If a deploy fails:

1. stop the new app container
2. redeploy the previous known-good image or git revision
3. confirm `/health/readiness` returns `200`
4. restore the database only if the failed release applied destructive migrations

Avoid automatic rollback of the database unless the migration plan explicitly supports it.

## 12. Post-Deploy Smoke Checks

After every deploy:

1. `curl -f https://your-app/health/liveness`
2. `curl -f https://your-app/health/readiness`
3. `curl -f https://your-app/api/health`
4. log in through the UI
5. open a project
6. save a file
7. start preview
8. open terminal
9. verify Redis-backed real-time features work

## 13. Minimal Production Checklist

- env vars loaded from a secret manager
- PostgreSQL reachable
- Redis reachable
- durable object storage configured
- `npm run build` passes
- `npm run deploy:check` passes
- TLS enabled at the edge
- health monitors configured
- backup job scheduled
- CI/CD secrets and vars configured
