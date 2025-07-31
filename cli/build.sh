#!/bin/bash

echo "Building E-Code CLI..."

# Install dependencies
npm install

# Build TypeScript
npm run build

# Make executable
chmod +x dist/index.js

echo "Build complete! You can now run: npm link"
echo "Then use the CLI with: ecode"