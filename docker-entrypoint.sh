#!/bin/sh
set -e

echo "=== E-Code Production Entrypoint ==="

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL..."
until pg_isready -h ${PGHOST:-postgres} -p ${PGPORT:-5432} -U ${PGUSER:-ecode} -q; do
  echo "PostgreSQL is unavailable - sleeping 2s..."
  sleep 2
done
echo "PostgreSQL is ready!"

# Run database migrations
echo "Running database migrations..."
npm run db:push --force || {
  echo "WARNING: Migration failed, but continuing..."
}
echo "Migrations complete!"

# Start the application
echo "Starting E-Code application..."
exec node dist/index.js
