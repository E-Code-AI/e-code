#!/usr/bin/env node

/**
 * Deployment verification script
 * Checks that all necessary files are in place for production deployment
 */

import { existsSync } from 'fs';
import { join } from 'path';

console.log('🔍 Verifying deployment readiness...\n');

const checks = [
  { path: 'dist/public/index.html', description: 'React build HTML' },
  { path: 'dist/public/assets', description: 'React build assets', isDirectory: true },
  { path: 'server/production.ts', description: 'Production server' },
  { path: 'start.js', description: 'Production entry point' },
  { path: 'dist/index.js', description: 'Dist entry point' },
  { path: 'server/routes.ts', description: 'API routes' },
  { path: 'server/db-init.ts', description: 'Database initialization' },
];

let allPassed = true;

for (const check of checks) {
  const exists = existsSync(check.path);
  const status = exists ? '✅' : '❌';
  console.log(`${status} ${check.description}: ${check.path}`);
  if (!exists) {
    allPassed = false;
  }
}

console.log('\n' + '='.repeat(50));

if (allPassed) {
  console.log('✅ All checks passed! Your application is ready for deployment.');
  console.log('\nDeployment will:');
  console.log('1. Run "npm install" to install dependencies');
  console.log('2. Run "npm run build" to build the React app');
  console.log('3. Run "node start.js" which will:');
  console.log('   - Use the production server (server/production.ts)');
  console.log('   - Serve React build files from dist/public');
  console.log('   - Handle all API routes and database connections');
} else {
  console.log('❌ Some files are missing. Please run "npm run build" first.');
}

process.exit(allPassed ? 0 : 1);