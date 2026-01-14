#!/bin/bash
# Smart build script optimized for <8 GiB deployment images
# Automatically detects deployment mode and applies aggressive cleanup

set -e

echo "🔍 Checking build environment..."

# Check if this is a deployment build
if [ -n "$REPLIT_DEPLOYMENT" ] || [ "$NODE_ENV" = "production" ]; then
  echo "📦 DEPLOYMENT BUILD detected"
  export REPLIT_DEPLOYMENT=1
  export NODE_ENV=production
else
  echo "🔧 Development build"
fi

# Build frontend if needed
if [ -d "dist/public" ] && [ -f "dist/public/index.html" ]; then
  echo "✅ Pre-built frontend found, skipping Vite build"
else
  echo "📦 Building frontend with Vite..."
  npx vite build
fi

# Build server bundle if needed
if [ -f "dist/index.js" ]; then
  echo "✅ Pre-built server bundle found, skipping esbuild"
else
  echo "📦 Building server bundle..."
  node scripts/build-server.mjs
fi

# Run cleanup ONLY in deployment mode
if [ "$REPLIT_DEPLOYMENT" = "1" ] || [ "$NODE_ENV" = "production" ]; then
  if [ -f "scripts/cleanup-for-deploy.sh" ]; then
    echo "🧹 Running production cleanup..."
    chmod +x scripts/cleanup-for-deploy.sh
    REPLIT_DEPLOYMENT=1 bash scripts/cleanup-for-deploy.sh
  fi
fi

echo "✅ Build complete!"
