#!/bin/bash
if [ ! -f "node_modules/.bin/tsx" ] || [ ! -f "node_modules/.bin/vite" ]; then
  echo "📦 Dev dependencies missing (post-deployment cleanup). Reinstalling..."
  npm install --no-audit --no-fund
  echo "✅ Dev dependencies restored!"
fi

NODE_ENV=development npx tsx server/index.ts
