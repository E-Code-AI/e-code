#!/bin/bash
set -e

echo "🚀 E-Code Platform - Production Deployment"
echo "=========================================="

# Build de production
echo "📦 Installing dependencies..."
npm ci --omit=dev

echo "🔨 Building application..."
npm run build

echo "✅ Deployment ready!"
echo "Start with: npm start"