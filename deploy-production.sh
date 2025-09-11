#!/bin/bash
# E-Code Platform Production Deployment Script
# This script prepares the E-Code platform for production deployment

set -e

echo "🚀 E-Code Platform Production Deployment"
echo "========================================"

# Check if we're in the right directory
if [[ ! -f "package.json" ]]; then
    echo "❌ Error: Not in the E-Code platform directory"
    exit 1
fi

# Check for required environment variables
if [[ -z "$DATABASE_URL" ]]; then
    echo "❌ Error: DATABASE_URL environment variable is required"
    exit 1
fi

if [[ -z "$SESSION_SECRET" ]]; then
    echo "❌ Error: SESSION_SECRET environment variable is required"
    exit 1
fi

echo "✅ Environment variables validated"

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production

# Build the application
echo "🔨 Building application..."
npm run build

# Push database schema (production)
echo "🗄️  Setting up database..."
npm run db:push

echo "✅ E-Code Platform is ready for production!"
echo ""
echo "🌟 Platform Features:"
echo "   • AI-powered code generation with Claude & GPT-4"
echo "   • Real-time collaboration"
echo "   • Container orchestration"
echo "   • Live preview system"
echo "   • Multi-language support"
echo "   • Deployment management"
echo "   • Database hosting"
echo "   • Terminal access"
echo "   • File management"
echo "   • Templates & marketplace"
echo ""
echo "🚀 Start the platform with:"
echo "   NODE_ENV=production npm start"
echo ""
echo "📡 Platform will be available at the configured APP_URL"
echo "   Main app: PORT (default 5000)"
echo "   Preview server: PORT+100 (3100)"
echo "   MCP server: 3200"
echo "   Go runtime: 8080"
echo "   Python ML: 8081"