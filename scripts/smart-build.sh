#!/bin/bash
# Smart build script optimized for <8 GiB deployment images
# Skips frontend build if dist/public already exists

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

# Run aggressive cleanup if the script exists
if [ -f "scripts/cleanup-for-deploy.sh" ]; then
    echo "🧹 Running deployment cleanup..."
    chmod +x scripts/cleanup-for-deploy.sh
    bash scripts/cleanup-for-deploy.sh
fi

echo "✅ Build complete!"
