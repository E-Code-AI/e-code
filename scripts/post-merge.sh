#!/bin/bash
set -e

# Install dependencies (skip db:push — it tries to rename tables destructively)
npm install

echo "Post-merge setup complete."
