#!/bin/bash
# Monaco Regression Check Script
# This script ensures no Monaco dependencies are reintroduced to the codebase
# Run this in CI/CD pipeline to prevent Monaco bundle size regression

set -e

echo "🔍 Checking for Monaco Editor regressions..."

# Check for monaco-editor package imports
MONACO_IMPORTS=$(grep -r "from ['\"]monaco-editor" --include="*.ts" --include="*.tsx" client/src 2>/dev/null || true)
if [ -n "$MONACO_IMPORTS" ]; then
    echo "❌ ERROR: Found monaco-editor imports in client/src:"
    echo "$MONACO_IMPORTS"
    exit 1
fi

# Check for @monaco-editor/react imports
REACT_MONACO_IMPORTS=$(grep -r "@monaco-editor/react" --include="*.ts" --include="*.tsx" client/src 2>/dev/null || true)
if [ -n "$REACT_MONACO_IMPORTS" ]; then
    echo "❌ ERROR: Found @monaco-editor/react imports in client/src:"
    echo "$REACT_MONACO_IMPORTS"
    exit 1
fi

# Check for y-monaco imports (use y-codemirror.next instead)
Y_MONACO_IMPORTS=$(grep -r "from ['\"]y-monaco" --include="*.ts" --include="*.tsx" client/src 2>/dev/null || true)
if [ -n "$Y_MONACO_IMPORTS" ]; then
    echo "❌ ERROR: Found y-monaco imports in client/src:"
    echo "$Y_MONACO_IMPORTS"
    exit 1
fi

# Check for Monaco CDN loader usage
CDN_LOADER=$(grep -r "monaco-cdn-loader\|initMonaco\|getMonaco" --include="*.ts" --include="*.tsx" client/src 2>/dev/null || true)
if [ -n "$CDN_LOADER" ]; then
    echo "❌ ERROR: Found Monaco CDN loader references in client/src:"
    echo "$CDN_LOADER"
    exit 1
fi

# Check for MonacoBinding references
MONACO_BINDING=$(grep -r "MonacoBinding" --include="*.ts" --include="*.tsx" client/src 2>/dev/null || true)
if [ -n "$MONACO_BINDING" ]; then
    echo "❌ ERROR: Found MonacoBinding references in client/src:"
    echo "$MONACO_BINDING"
    exit 1
fi

# Check package.json for Monaco dependencies
if grep -q "monaco-editor\|@monaco-editor/react\|y-monaco" package.json 2>/dev/null; then
    echo "⚠️  WARNING: Monaco packages found in package.json"
    echo "Consider removing if not needed for backward compatibility"
fi

echo "✅ No Monaco regressions detected!"
echo "CodeMirror 6 migration verified."
exit 0
