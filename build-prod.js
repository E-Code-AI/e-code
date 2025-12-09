#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, mkdirSync, cpSync, writeFileSync } from 'fs';
import { join } from 'path';

console.log('🚀 Starting production build...');
console.log(`📅 Timestamp: ${new Date().toISOString()}`);
console.log(`📂 Working directory: ${process.cwd()}`);
console.log(`🔧 Node version: ${process.version}`);
console.log(`💻 Platform: ${process.platform}`);
console.log('');

try {
  // Clean dist directory
  console.log('🧹 Cleaning dist directory...');
  try {
    if (existsSync('dist')) {
      console.log('  - Removing existing dist folder...');
      execSync('rm -rf dist', { stdio: 'inherit' });
      console.log('  ✅ Removed successfully');
    } else {
      console.log('  - No existing dist folder found');
    }

    console.log('  - Creating fresh dist directory...');
    mkdirSync('dist', { recursive: true });
    console.log('  ✅ Created successfully');
  } catch (error) {
    console.error('  ❌ Error cleaning dist directory:', error.message);
    throw error;
  }
  console.log('');

  // Build Vite frontend
  console.log('⚡ Building Vite frontend...');
  console.log('  - Running: npx vite build --config vite.config.production.ts');
  try {
    const startTime = Date.now();
    execSync('npx vite build --config vite.config.production.ts', {
      stdio: 'inherit',
      env: { ...process.env, FORCE_COLOR: '1' }
    });
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`  ✅ Vite frontend built successfully (${duration}s)`);
  } catch (error) {
    console.error('  ❌ Vite frontend build failed');
    console.error('  Error details:', error.message);
    console.error('  Check if you have enough disk space and memory');
    throw error;
  }
  console.log('');

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
    console.log('  - .env file copied');
  } else {
    console.log('  - .env file not found, skipping copy');
  }

  // Create a simple start script for production
  const startScript = `#!/usr/bin/env node
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

process.env.NODE_ENV = 'production';

console.log('🚀 Starting server...');

const server = spawn('tsx', [join(__dirname, 'server/index.ts')], {
  stdio: 'inherit',
  env: { ...process.env, FORCE_COLOR: '1' },
  cwd: __dirname
});

server.on('error', (err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

server.on('exit', (code) => {
  if (code !== 0) {
    console.error('❌ Server exited with code:', code);
  } else {
    console.log('✅ Server stopped gracefully.');
  }
  process.exit(code || 0);
});

// Handle SIGTERM gracefully
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down server...');
  server.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down server...');
  server.kill('SIGINT');
});
`;

  console.log('Creating start script...');
  writeFileSync('dist/start.js', startScript);
  execSync('chmod +x dist/start.js', { stdio: 'inherit' });
  console.log('  ✅ Start script created and made executable.');

  console.log('\n✅ Build completed successfully!');
  console.log('📦 Output directory: ./dist');
  console.log('🚀 Start with: node dist/start.js or ./dist/start.js\n');

} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  process.exit(1);
}