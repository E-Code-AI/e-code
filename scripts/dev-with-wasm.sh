#!/bin/bash

# Force Rollup to use WASM implementation
export ROLLUP_WASM=1
export ROLLUP_SKIP_NODE_RESOLUTION=1
export NODE_ENV=development

echo "[ROLLUP-WASM] Forcing Rollup to use WASM implementation"
echo "[ROLLUP-WASM] ROLLUP_WASM=1"
echo "[ROLLUP-WASM] ROLLUP_SKIP_NODE_RESOLUTION=1"
echo "[ROLLUP-WASM] Starting development server..."
echo ""

# Run the development server
tsx server/index.ts
