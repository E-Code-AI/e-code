#!/usr/bin/env bash
# setup-local-db.sh — idempotent bootstrap of a local Postgres for e-code dev.
#
# What it does, in order:
#   1. Pick a free local port (default 5455 to avoid clashing with anything on 5432).
#   2. Reuse an existing `e-code-postgres` container if it is already running and
#      published on the chosen port; otherwise (re)create one.
#   3. Wait until pg_isready succeeds inside the container.
#   4. Write/refresh DATABASE_URL into .env.local — never touching .env (which
#      may hold prod creds) and merging with any pre-existing keys.
#   5. Run `npm run db:push` against the local instance to apply Drizzle schema.
#
# Safe to re-run any time. Pass FORCE_RECREATE=1 to drop and respawn.

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

CONTAINER_NAME="${ECODE_PG_CONTAINER:-e-code-postgres}"
PG_USER="${ECODE_PG_USER:-postgres}"
PG_DB="${ECODE_PG_DB:-ecode_dev}"
PG_PORT="${ECODE_PG_PORT:-5455}"
PG_IMAGE="${ECODE_PG_IMAGE:-postgres:16-alpine}"

log() { printf '[setup-local-db] %s\n' "$*"; }

require() {
  if ! command -v "$1" >/dev/null 2>&1; then
    log "missing required tool: $1"
    exit 1
  fi
}

require docker

# 1. Generate (or reuse) a stable password kept in .env.local
mkdir -p .
ENV_LOCAL=".env.local"
PG_PASSWORD=""
if [[ -f "$ENV_LOCAL" ]] && grep -qE '^DATABASE_URL=' "$ENV_LOCAL"; then
  EXISTING_URL="$(grep -E '^DATABASE_URL=' "$ENV_LOCAL" | tail -n1 | cut -d= -f2-)"
  if [[ "$EXISTING_URL" =~ postgres://[^:]+:([^@]+)@ ]]; then
    PG_PASSWORD="${BASH_REMATCH[1]}"
  fi
fi
if [[ -z "$PG_PASSWORD" ]]; then
  # 32 hex chars (16 bytes of entropy) — avoids SIGPIPE from /dev/urandom | head
  if command -v openssl >/dev/null 2>&1; then
    PG_PASSWORD="$(openssl rand -hex 16)"
  else
    # Fallback: read a fixed-size block once, no pipe close.
    PG_PASSWORD="$(LC_ALL=C dd if=/dev/urandom bs=24 count=1 2>/dev/null | base64 | tr -dc 'A-Za-z0-9' | cut -c1-24)"
  fi
fi

DATABASE_URL="postgres://${PG_USER}:${PG_PASSWORD}@localhost:${PG_PORT}/${PG_DB}"

# 2. Manage the container
running=""
if docker ps --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  running="yes"
fi

if [[ "${FORCE_RECREATE:-0}" == "1" && -n "$running" ]]; then
  log "FORCE_RECREATE=1 — removing existing $CONTAINER_NAME"
  docker rm -f "$CONTAINER_NAME" >/dev/null
  running=""
fi

if [[ -z "$running" ]]; then
  if docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
    log "starting existing $CONTAINER_NAME"
    docker start "$CONTAINER_NAME" >/dev/null
  else
    log "creating $CONTAINER_NAME on 127.0.0.1:${PG_PORT}"
    docker run -d --name "$CONTAINER_NAME" \
      -e POSTGRES_USER="$PG_USER" \
      -e POSTGRES_DB="$PG_DB" \
      -e POSTGRES_PASSWORD="$PG_PASSWORD" \
      -p "127.0.0.1:${PG_PORT}:5432" \
      "$PG_IMAGE" >/dev/null
  fi
else
  log "container $CONTAINER_NAME already running — reusing"
fi

# 3. Wait for readiness (max 30s)
for i in $(seq 1 30); do
  if docker exec "$CONTAINER_NAME" pg_isready -U "$PG_USER" -d "$PG_DB" >/dev/null 2>&1; then
    log "postgres ready after ${i}s"
    break
  fi
  sleep 1
  if [[ "$i" == "30" ]]; then
    log "postgres did not become ready in 30s"
    docker logs --tail 50 "$CONTAINER_NAME" || true
    exit 1
  fi
done

# 4. Persist DATABASE_URL into .env.local idempotently
touch "$ENV_LOCAL"
TMP_ENV="$(mktemp)"
grep -vE '^DATABASE_URL=' "$ENV_LOCAL" > "$TMP_ENV" || true
printf 'DATABASE_URL=%s\n' "$DATABASE_URL" >> "$TMP_ENV"
mv "$TMP_ENV" "$ENV_LOCAL"
chmod 600 "$ENV_LOCAL"
log "wrote DATABASE_URL into $ENV_LOCAL (host=localhost port=${PG_PORT} db=${PG_DB})"

# 5. Apply Drizzle schema
if [[ -f "drizzle.config.ts" ]]; then
  log "applying Drizzle schema (npm run db:push)"
  if ! DATABASE_URL="$DATABASE_URL" npm run db:push --silent; then
    log "db:push failed — schema not applied. Inspect drizzle output above."
    exit 1
  fi
else
  log "no drizzle.config.ts — skipping schema push"
fi

log "done."
log "  DATABASE_URL exported to .env.local"
log "  start the dev server with:  source .env.local && npm run dev"
