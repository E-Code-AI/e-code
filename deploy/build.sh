#!/bin/bash

# Simple build script for deployment that avoids hanging issues

echo "Starting production build..."

# Build the frontend with Vite (without hanging plugins)
NODE_ENV=production npx vite build --mode production

# Copy server files to dist
echo "Copying server files..."
mkdir -p dist
cp -r server dist/
cp -r shared dist/
cp package.json dist/
cp package-lock.json dist/
cp tsconfig.json dist/
cp .env dist/ 2>/dev/null || true

# Create a simple start script
cat > dist/start.js << 'EOF'
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Start the server
const server = spawn('tsx', [join(__dirname, 'server/index.ts')], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' }
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

server.on('exit', (code) => {
  process.exit(code);
});
EOF

echo "Build complete!"