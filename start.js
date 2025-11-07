#!/usr/bin/env node

/**
 * Production entry point for Replit deployment
 * Uses tsx to run TypeScript directly without compilation
 */

import { spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🚀 E-Code Platform Production Startup');
console.log('📁 Project root:', __dirname);
console.log('🌐 Environment:', process.env.NODE_ENV || 'development');
console.log('🔍 Checking build files...');

// Check if build files exist
const distPublicPath = join(__dirname, 'dist', 'public');
const serverPublicPath = join(__dirname, 'server', 'public');

if (existsSync(distPublicPath)) {
  console.log('✅ Found build files at:', distPublicPath);
  
  // Ensure symlink exists for production serving
  if (!existsSync(serverPublicPath)) {
    console.log('📎 Creating symlink for production serving...');
    try {
      execSync(`ln -sfn ../dist/public server/public`, { cwd: __dirname });
      console.log('✅ Symlink created successfully');
    } catch (error) {
      console.log('⚠️ Could not create symlink:', error.message);
    }
  } else {
    console.log('✅ Server public path exists');
  }
} else {
  console.log('⚠️ Build files not found at:', distPublicPath);
  console.log('📦 Building React app for production...');
  
  try {
    // Run the build command
    console.log('🔨 Running: npm run build');
    execSync('npm run build', { 
      stdio: 'inherit', 
      cwd: __dirname 
    });
    console.log('✅ Build completed successfully');
    
    // Create symlink after successful build
    if (!existsSync(serverPublicPath)) {
      console.log('📎 Creating symlink for production serving...');
      try {
        execSync(`ln -sfn ../dist/public server/public`, { cwd: __dirname });
        console.log('✅ Symlink created successfully');
      } catch (error) {
        console.log('⚠️ Could not create symlink:', error.message);
      }
    }
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    console.log('⚠️ Continuing anyway - server may not serve frontend properly');
  }
}

// Set production environment
process.env.NODE_ENV = 'production';
console.log('⚙️ Starting production server with NODE_ENV=production');

// Run the production server directly with tsx
// Use production.ts for deployed environments
const serverFile = process.env.NODE_ENV === 'production' || process.env.REPLIT_DEPLOYMENT ? 
  'server/production.ts' : 'server/index.ts';
  
console.log('📄 Using server file:', serverFile);

const serverProcess = spawn('npx', ['tsx', serverFile], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' },
  cwd: __dirname
});

console.log('🚀 Server process started with PID:', serverProcess.pid);

serverProcess.on('error', (error) => {
  console.error('❌ Failed to start server:', error.message);
  process.exit(1);
});

serverProcess.on('close', (code) => {
  if (code !== 0) {
    console.error(`❌ Server exited with code ${code}`);
    process.exit(code || 1);
  }
  console.log('Server process ended');
});