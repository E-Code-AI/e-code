#!/bin/bash

echo "Starting build process..."

# Install dependencies if not already installed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Build client
echo "Building client..."
npx vite build

# Build server
echo "Building server..."
npx tsc -p tsconfig.server.json || {
  # Fallback to esbuild if tsc fails
  echo "TypeScript compilation failed, trying esbuild..."
  npx esbuild server/index.ts \
    --platform=node \
    --target=node20 \
    --format=esm \
    --bundle \
    --packages=external \
    --outfile=dist/server/index.js \
    --sourcemap
}

# Copy necessary files
echo "Copying additional files..."
mkdir -p dist/server/views
cp -r server/views/* dist/server/views/ 2>/dev/null || true

# Copy package.json for production dependencies
cp package.json dist/

echo "Build complete!"