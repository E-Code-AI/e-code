#!/bin/bash
# Replit startup script for E-Code
# Supports two modes:
# 1. Frontend-only (no DATABASE_URL): Runs client dev server for UI preview
# 2. Full-stack (with DATABASE_URL): Runs migrations + full application
#
# Required secrets for full-stack mode:
# - DATABASE_URL: PostgreSQL connection string
# - SESSION_SECRET: Session encryption key
# - OPENAI_API_KEY: OpenAI API key (optional, for AI features)

set -euo pipefail

echo "🚀 Starting E-Code on Replit..."

# Default port assignment for Replit
export PORT=${PORT:-5000}
export HOST=${HOST:-0.0.0.0}

echo "📦 Installing dependencies..."
# Install dependencies with fallback - skip if node_modules exists and is recent
if [ ! -d "node_modules" ] || [ -n "$(find package.json -newer node_modules 2>/dev/null)" ]; then
    if npm ci; then
        echo "✅ Dependencies installed with npm ci"
    else
        echo "⚠️  npm ci failed, falling back to npm install..."
        npm install
    fi
else
    echo "✅ Dependencies already up to date"
fi

# Check if DATABASE_URL is set to determine mode
if [ -z "${DATABASE_URL:-}" ]; then
    echo "🎨 DATABASE_URL not set - Starting frontend-only mode"
    echo "🔗 This will preview the E-Code UI without backend functionality"
    echo "💡 To enable full-stack mode, add DATABASE_URL and SESSION_SECRET secrets in Replit"
    echo ""
    
    # Frontend-only mode: run client dev server using Vite from root
    echo "🏃 Starting client development server on http://$HOST:$PORT"
    
    # Start Vite dev server with proper host and port for Replit
    # Vite config has root set to ./client, so we run from project root
    npx vite --host $HOST --port $PORT
else
    echo "🗄️  DATABASE_URL detected - Starting full-stack mode"
    echo "🔧 Running database migrations..."
    
    # Run database migrations (best-effort, don't fail if it doesn't work)
    npm run db:push || {
        echo "⚠️  Database migration failed, but continuing..."
        echo "💡 This might be expected if DATABASE_URL is not properly configured"
    }
    
    echo "🚀 Starting full E-Code application..."
    echo "🔗 Server will be available on http://$HOST:$PORT"
    
    # Start the full application in development mode
    NODE_ENV=development HOST=$HOST PORT=$PORT npm run dev
fi