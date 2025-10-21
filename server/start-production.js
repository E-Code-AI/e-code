#!/usr/bin/env node
// Simple production starter for Replit Reserved VM
// This avoids complex build processes and runs directly

console.log('Starting E-Code Platform in production mode...');
process.env.NODE_ENV = 'production';

// Start the TypeScript server directly
require('child_process').execSync('tsx server/index.ts', {
  stdio: 'inherit'
});