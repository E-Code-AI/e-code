#!/bin/bash

# Run All Tests Script
echo "🔍 Starting Comprehensive Test Suite..."
echo "======================================="

# Track failures
FAILURES=0

# Run type checking
echo ""
echo "📝 Running TypeScript Type Checking..."
npm run typecheck
if [ $? -ne 0 ]; then
  echo "❌ TypeScript type checking failed!"
  FAILURES=$((FAILURES + 1))
else
  echo "✅ TypeScript type checking passed!"
fi

# Run linting
echo ""
echo "🔧 Running ESLint..."
npm run lint
if [ $? -ne 0 ]; then
  echo "❌ ESLint checks failed!"
  FAILURES=$((FAILURES + 1))
else
  echo "✅ ESLint checks passed!"
fi

# Run unit tests
echo ""
echo "🧪 Running Unit Tests..."
npm run test:unit
if [ $? -ne 0 ]; then
  echo "❌ Unit tests failed!"
  FAILURES=$((FAILURES + 1))
else
  echo "✅ Unit tests passed!"
fi

# Install Playwright browsers if needed
echo ""
echo "🎭 Installing Playwright browsers..."
npx playwright install chromium
if [ $? -ne 0 ]; then
  echo "⚠️  Playwright browser installation failed, continuing..."
fi

# Run E2E tests
echo ""
echo "🌐 Running E2E Tests..."
npm run test:e2e
if [ $? -ne 0 ]; then
  echo "❌ E2E tests failed!"
  FAILURES=$((FAILURES + 1))
else
  echo "✅ E2E tests passed!"
fi

# Run performance tests
echo ""
echo "⚡ Running Performance Tests..."
npm run test:performance
if [ $? -ne 0 ]; then
  echo "❌ Performance tests failed!"
  FAILURES=$((FAILURES + 1))
else
  echo "✅ Performance tests passed!"
fi

# Summary
echo ""
echo "======================================="
echo "📊 Test Summary:"

if [ $FAILURES -eq 0 ]; then
  echo "✅ All tests passed successfully!"
  exit 0
else
  echo "❌ $FAILURES test suite(s) failed!"
  exit 1
fi