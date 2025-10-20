#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, mkdirSync, cpSync, writeFileSync } from 'fs';
import { join } from 'path';

console.log('🚀 Starting production build...\n');

try {
  // Clean dist directory
  if (existsSync('dist')) {
    console.log('Cleaning dist directory...');
    execSync('rm -rf dist', { stdio: 'inherit' });
  }
  mkdirSync('dist', { recursive: true });

  // Build frontend with production config
  console.log('Building frontend with Vite...');
  execSync('npx vite build --config vite.config.production.ts', { stdio: 'inherit' });

  // Copy server files
  console.log('\nCopying server files...');
  cpSync('server', 'dist/server', { recursive: true });
  cpSync('shared', 'dist/shared', { recursive: true });
  
  // Copy necessary config files
  console.log('Copying configuration files...');
  cpSync('package.json', 'dist/package.json');
  cpSync('package-lock.json', 'dist/package-lock.json');
  cpSync('tsconfig.json', 'dist/tsconfig.json');
  cpSync('drizzle.config.ts', 'dist/drizzle.config.ts');
  
  // Copy environment file if it exists
  if (existsSync('.env')) {
    cpSync('.env', 'dist/.env');
  }

  // Create a simple start script for production
  const startScript = `#!/usr/bin/env node
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

process.env.NODE_ENV = 'production';

const server = spawn('tsx', [join(__dirname, 'server/index.ts')], {
  stdio: 'inherit',
  env: process.env,
  cwd: __dirname
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

server.on('exit', (code) => {
  if (code !== 0) {
    console.error('Server exited with code:', code);
  }
  process.exit(code || 0);
});

// Handle SIGTERM gracefully
process.on('SIGTERM', () => {
  server.kill('SIGTERM');
});

process.on('SIGINT', () => {
  server.kill('SIGINT');
});`;

  writeFileSync('dist/start.js', startScript);
  execSync('chmod +x dist/start.js', { stdio: 'inherit' });

  console.log('\n✅ Build completed successfully!');
  console.log('📦 Output directory: ./dist');
  console.log('🚀 Start with: node dist/start.js\n');

} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  process.exit(1);
}