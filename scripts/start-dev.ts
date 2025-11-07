#!/usr/bin/env tsx
/**
 * Development server wrapper script to prevent ENOSPC (file watcher) crashes
 * This script sets environment variables before starting the actual server
 */

import { spawn } from 'child_process';
import * as path from 'path';

console.log('[start-dev.ts] Setting up environment for stable file watching...');

// Set environment variables to prevent ENOSPC file watcher issues
process.env.CHOKIDAR_USEPOLLING = 'true';
process.env.CHOKIDAR_INTERVAL = '250';
process.env.TSX_WATCH_IGNORE = 'node_modules/**,builds/**,temp/**,logs/**,dist/**,.git/**,coverage/**';
process.env.WATCHPACK_POLLING = 'true';

// Set Node.js memory limit for better performance
process.env.NODE_OPTIONS = '--max-old-space-size=4096';

// Ensure development mode
process.env.NODE_ENV = 'development';

console.log('[start-dev.ts] Environment variables set:');
console.log('  CHOKIDAR_USEPOLLING:', process.env.CHOKIDAR_USEPOLLING);
console.log('  CHOKIDAR_INTERVAL:', process.env.CHOKIDAR_INTERVAL);
console.log('  TSX_WATCH_IGNORE:', process.env.TSX_WATCH_IGNORE);
console.log('  WATCHPACK_POLLING:', process.env.WATCHPACK_POLLING);
console.log('  NODE_OPTIONS:', process.env.NODE_OPTIONS);

// Start the actual server
console.log('[start-dev.ts] Starting server with tsx...');

const serverPath = path.resolve(__dirname, '..', 'server', 'index.ts');

const child = spawn('tsx', [serverPath], {
  stdio: 'inherit',
  env: process.env,
  shell: true
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[start-dev.ts] Received SIGINT, shutting down gracefully...');
  child.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[start-dev.ts] Received SIGTERM, shutting down gracefully...');
  child.kill('SIGTERM');
  process.exit(0);
});

child.on('error', (error) => {
  console.error('[start-dev.ts] Failed to start server:', error);
  process.exit(1);
});

child.on('exit', (code) => {
  if (code !== null && code !== 0) {
    console.error(`[start-dev.ts] Server exited with code ${code}`);
  }
  process.exit(code || 0);
});