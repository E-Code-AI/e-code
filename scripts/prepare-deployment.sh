#!/bin/bash

# E-Code Platform Production Deployment Preparation Script
# This script prepares the application for production deployment

set -e  # Exit on error

echo "🚀 E-Code Platform - Production Deployment Preparation"
echo "=================================================="

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "❌ Error: .env.production not found!"
    echo "📝 Creating from template..."
    cp .env.production.example .env.production
    echo "⚠️  Please edit .env.production and fill in all required values"
    exit 1
fi

# Validate environment variables
echo "✅ Checking environment variables..."
required_vars=(
    "DATABASE_URL"
    "SESSION_SECRET"
    "ANTHROPIC_API_KEY"
    "SENDGRID_API_KEY"
)

missing_vars=()
for var in "${required_vars[@]}"; do
    if ! grep -q "^$var=" .env.production || grep -q "^$var=your-" .env.production; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    echo "❌ Missing or unconfigured environment variables:"
    printf '%s\n' "${missing_vars[@]}"
    echo "Please configure these in .env.production"
    exit 1
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p logs
mkdir -p uploads
mkdir -p dist

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Run database migrations
echo "🗄️  Running database migrations..."
NODE_ENV=production npm run db:push

# Build the application
echo "🔨 Building application..."
npm run build

# Verify build
if [ ! -d "dist" ] || [ ! -f "dist/server/index.js" ]; then
    echo "❌ Build failed! dist/server/index.js not found"
    exit 1
fi

# Check health endpoint
echo "🏥 Checking health endpoint..."
npm run dev &
SERVER_PID=$!
sleep 5

if curl -f http://localhost:5000/api/monitoring/health > /dev/null 2>&1; then
    echo "✅ Health check passed!"
else
    echo "❌ Health check failed!"
    kill $SERVER_PID
    exit 1
fi

kill $SERVER_PID

echo ""
echo "✅ Deployment preparation complete!"
echo ""
echo "Next steps:"
echo "1. Review the PRODUCTION_CHECKLIST.md"
echo "2. Set up your production server"
echo "3. Configure SSL certificates"
echo "4. Deploy using one of these methods:"
echo "   - Docker: docker-compose up -d"
echo "   - PM2: pm2 start ecosystem.config.js --env production"
echo "   - Manual: NODE_ENV=production npm start"
echo ""
echo "📚 See DEPLOYMENT.md for detailed instructions"