#!/bin/bash

# Production Deployment Script for E-Code Platform
# This script builds and prepares the application for production deployment

set -e  # Exit on error
set -x  # Print commands (debug mode)

echo "🚀 E-Code Platform Production Deployment"
echo "========================================"
echo "Timestamp: $(date)"
echo "Current directory: $(pwd)"
echo "Available disk space:"
df -h
echo ""

# Set production environment
export NODE_ENV=production

# Step 1: Install dependencies
echo ""
echo "📦 Installing production dependencies..."
echo "Running: npm ci --omit=dev"
npm ci --omit=dev 2>&1 | tee /tmp/npm-install.log
echo "✅ Dependencies installed successfully"
echo ""

# Step 2: Run production build
echo ""
echo "🔨 Building production assets..."
echo "Running: node build-prod.js"
node build-prod.js 2>&1 | tee /tmp/build.log
echo "✅ Build completed successfully"
echo ""

# Step 3: Verify build output
if [ ! -d "dist" ]; then
    echo "❌ Build failed: dist directory not created"
    exit 1
fi

if [ ! -f "dist/start.js" ]; then
    echo "❌ Build failed: start.js not found"
    exit 1
fi

if [ ! -d "dist/public" ]; then
    echo "❌ Build failed: public assets not found"
    exit 1
fi

echo ""
echo "✅ Production build complete!"
echo ""
echo "📁 Build artifacts:"
echo "   - Frontend: dist/public/"
echo "   - Server: dist/server/"
echo "   - Start script: dist/start.js"
echo ""
echo "🚀 Starting production server..."
echo "========================================"

# Start the production server
node dist/start.js