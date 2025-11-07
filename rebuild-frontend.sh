#!/bin/bash
echo "Building frontend with esbuild (bypassing Vite)..."
npx esbuild client/src/main.tsx \
  --bundle \
  --format=esm \
  --outfile=dist/public/assets/app.js \
  --loader:.tsx=tsx \
  --loader:.ts=ts \
  --loader:.jsx=jsx \
  --loader:.js=js \
  --minify \
  --sourcemap \
  --external:react \
  --external:react-dom
echo "Frontend rebuilt successfully!"
