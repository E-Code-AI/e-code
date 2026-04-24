#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync, spawn } from 'child_process';

console.log('Starting E-Code Platform in production mode...');
process.env.NODE_ENV = 'production';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');
const distIndexPath = path.join(projectRoot, 'dist', 'index.js');

function buildProject() {
  console.log('Building application for production...');

  try {
    execSync('npm run build', {
      cwd: projectRoot,
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' },
    });
    return true;
  } catch (error) {
    console.error('Build failed:', error.message);
    return false;
  }
}

if (!fs.existsSync(distIndexPath) && !buildProject()) {
  console.error('Failed to build the project');
  process.exit(1);
}

console.log('Starting compiled production server from dist/index.js...');
const serverProcess = spawn('node', [distIndexPath], {
  cwd: projectRoot,
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' },
});

serverProcess.on('error', (error) => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
});

serverProcess.on('exit', (code) => {
  if (code !== 0) {
    console.error(`Server exited with code ${code}`);
    process.exit(code ?? 1);
  }
});
