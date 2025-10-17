#!/bin/bash
# Direct Start Script - Bypasses package.json issues
# This script starts the app directly without using npm scripts

echo "🚀 Starting E-Code Platform (Direct Mode)..."
echo "================================================"

# Set environment variables
export NODE_ENV=development
export HOST=0.0.0.0
export PORT=5000
export NODE_OPTIONS="--max-old-space-size=2048"

# Check if tsx is installed globally or locally
if ! command -v tsx &> /dev/null; then
    if [ -f "./node_modules/.bin/tsx" ]; then
        TSX_CMD="./node_modules/.bin/tsx"
    else
        echo "⚠️  tsx not found. Installing it..."
        npm install --save-dev tsx
        TSX_CMD="./node_modules/.bin/tsx"
    fi
else
    TSX_CMD="tsx"
fi

# Start the server directly
echo "🖥️  Starting backend server on port $PORT..."
cd server && $TSX_CMD index.ts