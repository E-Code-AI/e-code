#!/bin/bash

# run-replit.sh - Starter script for E-Code platform on Replit
# This script builds and starts the backend with remote-runner for code execution

set -e

echo "🚀 Starting E-Code platform on Replit..."

# Set environment variables for Replit
export NODE_ENV=development
export PORT=5000
export REPLIT_MODE=true

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p server/execution
mkdir -p .executions
mkdir -p .exports

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
if [ ! -d "node_modules" ]; then
    npm ci
else
    echo "✅ Node modules already installed"
fi

# Build the Go remote runner if it doesn't exist
echo "🔨 Building Go remote runner..."
if [ ! -f "server/execution/remote-runner" ]; then
    cd server/execution
    if [ -f "remote-runner.go" ]; then
        echo "Building remote-runner from source..."
        go build -o remote-runner remote-runner.go
    else
        echo "⚠️  remote-runner.go not found, skipping Go build"
    fi
    cd ../..
else
    echo "✅ Remote runner already built"
fi

# Start the remote runner in background if available
if [ -f "server/execution/remote-runner" ]; then
    echo "🏃 Starting remote runner on port 8080..."
    ./server/execution/remote-runner &
    RUNNER_PID=$!
    echo "Remote runner started with PID: $RUNNER_PID"
    
    # Save PID for cleanup
    echo $RUNNER_PID > .remote-runner.pid
fi

# Build the frontend if not already built
echo "🏗️  Building frontend..."
if [ ! -d "client/dist" ] || [ ! "$(ls -A client/dist 2>/dev/null)" ]; then
    npm run build
else
    echo "✅ Frontend already built"
fi

echo "🌟 Starting E-Code platform..."
echo "📝 Platform will be available at: https://$REPL_SLUG.$REPL_OWNER.repl.co"
echo "🔧 Remote execution service: ${SANDBOX_SERVICE_URL:-'Not configured - set SANDBOX_SERVICE_URL in secrets'}"

# Start the main application
exec npm run start