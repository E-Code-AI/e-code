#!/bin/bash

echo "🚀 E-Code Platform Production Build & Start"
echo "============================================"
echo ""

# Check if build files exist
if [ -d "dist/public" ]; then
  echo "✅ Build files found, skipping build step"
else
  echo "📦 Building React app for production..."
  npm run build
  
  if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully"
  else
    echo "❌ Build failed, but continuing anyway..."
  fi
fi

echo ""
echo "🚀 Starting production server..."
node start.js