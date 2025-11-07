#!/bin/bash

# E-Code Platform - Production Deployment Script
# This script ensures frontend assets are built before starting production

echo "🚀 Starting E-Code Platform Production Deployment..."
echo "=================================================="

# Step 1: Install dependencies
echo "📦 Installing dependencies..."
npm install

# Step 2: Build frontend assets using Vite
echo "🔨 Building frontend assets..."
npx vite build

# Step 3: Create dist/public directory if it doesn't exist
mkdir -p dist/public

# Step 4: Copy built assets to dist/public
echo "📁 Copying assets to dist/public..."
if [ -d "dist/client" ]; then
    cp -r dist/client/* dist/public/ 2>/dev/null || true
fi

# Step 5: Also copy to server/public for fallback
echo "📁 Setting up server/public fallback..."
mkdir -p server/public
if [ -d "dist/client" ]; then
    cp -r dist/client/* server/public/ 2>/dev/null || true
fi

# Step 6: Build server
echo "🔧 Building server..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

# Step 7: Verify build
if [ ! -f "dist/index.js" ]; then
    echo "⚠️  Server build not found, using TypeScript directly..."
    NODE_ENV=production tsx server/index.ts
else
    echo "✅ Build complete! Starting production server..."
    NODE_ENV=production node dist/index.js
fi