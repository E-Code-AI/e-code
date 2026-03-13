#!/bin/bash
set -e

echo "=== E-Code Mobile Build ==="
echo ""

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
  echo "ERROR: Capacitor CLI requires Node.js >= 22.0.0"
  echo "Current version: $(node -v)"
  exit 1
fi

echo "1. Building web layer..."
npx vite build

echo ""
echo "2. Syncing to Android..."
if [ -d "android" ]; then
  npx cap sync android
else
  echo "   WARNING: Android platform not added yet — run: npx cap add android"
fi

echo ""
echo "3. Syncing to iOS..."
if [ -d "ios" ]; then
  npx cap sync ios
else
  echo "   WARNING: iOS platform not added yet — run: npx cap add ios"
fi

echo ""
echo "=== Mobile Build Complete ==="
