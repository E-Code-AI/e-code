#!/bin/bash
set -e

echo "🚀 Building E-Code Platform for production with optimizations..."

# Step 1: Clean previous builds
echo "🧹 Cleaning previous build artifacts..."
rm -rf dist server/public node_modules/.vite .vite

# Step 2: Build frontend with optimizations
echo "📦 Building optimized frontend assets..."
NODE_ENV=production NODE_OPTIONS="--max-old-space-size=4096" npx vite build --config vite.production.config.ts

# Step 3: Skip backend build - we'll use tsx in production
echo "⚙️ Backend will use tsx in production (no build needed)..."
# Note: For Replit deployment, we use tsx to run TypeScript directly
# The .replit file specifies: run = ["sh", "-c", "NODE_ENV=production tsx server/index.ts"]

# Step 4: Copy static assets to server/public
echo "📂 Copying static assets to server/public..."
mkdir -p server/public
cp -r dist/public/* server/public/

# Step 5: Remove source maps to save space
echo "🗑️ Removing source maps..."
find dist -name "*.map" -type f -delete 2>/dev/null || true
find server/public -name "*.map" -type f -delete 2>/dev/null || true

# Step 6: Clean development artifacts from node_modules
echo "🧹 Cleaning development artifacts..."
find node_modules -name "*.md" -not -name "README.md" -type f -delete 2>/dev/null || true
find node_modules -name "*.markdown" -type f -delete 2>/dev/null || true
find node_modules -name ".npmignore" -type f -delete 2>/dev/null || true
find node_modules -name ".gitignore" -type f -delete 2>/dev/null || true

# Create a production start script
cat > dist/start.js << 'EOF'
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

process.env.NODE_ENV = 'production';

const server = spawn('node', ['dist/index.js'], {
  stdio: 'inherit',
  cwd: process.cwd(),
  env: process.env
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

server.on('exit', (code) => {
  process.exit(code);
});
EOF

echo "✅ Build complete!"
echo "📊 Build size summary:"
du -sh dist/ server/public/ 2>/dev/null || true
echo "📦 Node modules size:"
du -sh node_modules/ 2>/dev/null || true