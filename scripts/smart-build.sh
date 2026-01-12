#!/bin/bash
# Smart build script that skips frontend build if dist/public already exists
# This allows pre-building locally to avoid deployment timeouts

set -e

echo "🔍 Checking for pre-built frontend..."

if [ -d "dist/public" ] && [ -f "dist/public/index.html" ]; then
    echo "✅ Pre-built frontend found, skipping Vite build"
else
    echo "📦 Building frontend with Vite..."
    npx vite build
fi

echo "📦 Building server bundle..."
node scripts/build-server.mjs

echo "✅ Build complete!"
