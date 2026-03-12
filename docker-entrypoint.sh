#!/bin/sh
set -e

echo "=== E-Code Production Entrypoint ==="

# Validate critical environment variables before proceeding
echo "Validating environment variables..."
MISSING=""
[ -z "$DATABASE_URL" ] && MISSING="$MISSING DATABASE_URL"
[ -z "$SESSION_SECRET" ] && MISSING="$MISSING SESSION_SECRET"
[ -z "$JWT_SECRET" ] && MISSING="$MISSING JWT_SECRET"
[ -z "$ENCRYPTION_KEY" ] && MISSING="$MISSING ENCRYPTION_KEY"

WARN=""
[ -z "$SENTRY_DSN" ] && WARN="$WARN SENTRY_DSN"
[ -z "$REDIS_URL" ] && WARN="$WARN REDIS_URL"
[ -z "$RUNNER_JWT_SECRET" ] && WARN="$WARN RUNNER_JWT_SECRET"

if [ -n "$MISSING" ]; then
  echo "FATAL: Missing required environment variables:$MISSING"
  echo "Set these variables before starting the application."
  echo "See ✅_.env.production.example for the full list."
  exit 1
fi

if [ -n "$WARN" ]; then
  echo "WARNING: Recommended variables not set:$WARN"
  echo "Some features may be disabled."
fi

echo "Environment variables validated."

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL..."
until pg_isready -h ${PGHOST:-postgres} -p ${PGPORT:-5432} -U ${PGUSER:-ecode_user} -q; do
  echo "PostgreSQL is unavailable - sleeping 2s..."
  sleep 2
done
echo "PostgreSQL is ready!"

# Run database migrations
echo "Running database migrations..."
if ! npm run db:push; then
  echo "WARNING: db:push failed, retrying..."
  if ! npm run db:push; then
    echo "ERROR: Database schema sync failed! Cannot start without valid schema."
    exit 1
  fi
fi
echo "Migrations complete!"

# Start the application
echo "Starting E-Code application..."
exec node dist/index.js
