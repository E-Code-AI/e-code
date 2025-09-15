#!/usr/bin/env bash
set -euo pipefail

# E-Code Replit bootstrapper
# - If DATABASE_URL is unset: run the frontend-only demo on Replit's $PORT
# - If DATABASE_URL is set: best-effort db push, then run the full app

log() { echo -e "[replit] $*"; }

PORT="${PORT:-5173}"
export HOST="${HOST:-0.0.0.0}"
export NODE_ENV="development"

# Helper: install deps for a directory if it has package.json
install_deps() {
  local dir="$1"
  if [ -f "$dir/package.json" ]; then
    log "Installing dependencies in $dir ..."
    pushd "$dir" >/dev/null
    if [ -f package-lock.json ]; then
      npm ci || npm install
    else
      npm install
    fi
    popd >/dev/null
  fi
}

# Install root deps (if any), then client/server deps (monorepo-safe)
install_deps "."
[ -d client ] && install_deps "client"
[ -d server ] && install_deps "server"

if [ -z "${DATABASE_URL:-}" ]; then
  # Frontend-only mode
  log "DATABASE_URL not set → starting frontend-only demo"
  if [ -d client ] && [ -f client/package.json ]; then
    log "Launching client dev server on http://$HOST:$PORT"
    exec bash -lc "cd client && npm run dev -- --host $HOST --port $PORT"
  else
    # Fallback: run vite directly from root (client config in vite.config.ts)
    log "Running frontend-only mode with vite on http://$HOST:$PORT"
    exec bash -lc "npx vite --host $HOST --port $PORT"
  fi
else
  # Full-stack mode
  log "DATABASE_URL set → starting full-stack dev"
  # Try to push/migrate schema if a script exists
  if npm run | grep -qE '^\s*db:push'; then
    log "Running db:push (best-effort) ..."
    (npm run db:push) || true
  fi
  log "Starting app bound to $HOST:$PORT (NODE_ENV=$NODE_ENV)"
  exec bash -lc "HOST=$HOST PORT=$PORT npm run dev"
fi