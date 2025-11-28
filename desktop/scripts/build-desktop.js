#!/usr/bin/env node
/**
 * E-Code Desktop - Complete Build Script
 * Fortune 500 Quality Build Orchestration
 * 
 * This script handles the complete desktop app build process:
 * 1. Build the frontend
 * 2. Prepare the renderer
 * 3. Generate icons (if sharp is available)
 * 4. Run electron-builder
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_PATH = path.join(__dirname, '..', '..');
const DESKTOP_PATH = path.join(__dirname, '..');

// Parse command line arguments
const args = process.argv.slice(2);
const platform = args.find(a => ['--mac', '--win', '--linux', '--all'].includes(a)) || '--all';
const skipFrontend = args.includes('--skip-frontend');
const skipIcons = args.includes('--skip-icons');
const verbose = args.includes('--verbose');

function log(message) {
  console.log(`[E-Code Desktop] ${message}`);
}

function error(message) {
  console.error(`[E-Code Desktop] ❌ ${message}`);
}

function success(message) {
  console.log(`[E-Code Desktop] ✅ ${message}`);
}

function runCommand(command, cwd = ROOT_PATH, env = {}) {
  return new Promise((resolve, reject) => {
    log(`Running: ${command}`);
    
    const [cmd, ...cmdArgs] = command.split(' ');
    const proc = spawn(cmd, cmdArgs, {
      cwd,
      env: { ...process.env, ...env },
      stdio: verbose ? 'inherit' : 'pipe',
      shell: true
    });
    
    let stdout = '';
    let stderr = '';
    
    if (!verbose) {
      proc.stdout?.on('data', (data) => { stdout += data.toString(); });
      proc.stderr?.on('data', (data) => { stderr += data.toString(); });
    }
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr || stdout}`));
      }
    });
    
    proc.on('error', reject);
  });
}

async function buildFrontend() {
  log('Building frontend...');
  try {
    await runCommand('npm run build', ROOT_PATH);
    success('Frontend built successfully');
  } catch (e) {
    error(`Frontend build failed: ${e.message}`);
    throw e;
  }
}

async function prepareRenderer() {
  log('Preparing renderer...');
  try {
    await runCommand('node scripts/prepare-renderer.js', DESKTOP_PATH);
    success('Renderer prepared successfully');
  } catch (e) {
    error(`Renderer preparation failed: ${e.message}`);
    throw e;
  }
}

async function generateIcons() {
  log('Generating icons...');
  try {
    await runCommand('node scripts/generate-icons.js', DESKTOP_PATH);
    success('Icons generated successfully');
  } catch (e) {
    log(`Icon generation skipped: ${e.message}`);
  }
}

async function installDependencies() {
  const nodeModulesPath = path.join(DESKTOP_PATH, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    log('Installing desktop dependencies...');
    try {
      await runCommand('npm install', DESKTOP_PATH);
      success('Dependencies installed');
    } catch (e) {
      error(`Dependency installation failed: ${e.message}`);
      throw e;
    }
  }
}

async function runElectronBuilder() {
  let buildCommand = 'npm run build';
  
  switch (platform) {
    case '--mac':
      buildCommand = 'npm run build:mac';
      break;
    case '--win':
      buildCommand = 'npm run build:win';
      break;
    case '--linux':
      buildCommand = 'npm run build:linux';
      break;
    case '--all':
      buildCommand = 'npm run build:all';
      break;
  }
  
  log(`Running electron-builder (${platform.replace('--', '')})...`);
  try {
    await runCommand(buildCommand, DESKTOP_PATH);
    success('Electron build complete');
  } catch (e) {
    error(`Electron build failed: ${e.message}`);
    throw e;
  }
}

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║     E-Code Desktop Build System          ║');
  console.log('║     Fortune 500 Quality                  ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
  
  const startTime = Date.now();
  
  try {
    // Step 1: Build frontend (unless skipped)
    if (!skipFrontend) {
      await buildFrontend();
    } else {
      log('Skipping frontend build');
    }
    
    // Step 2: Prepare renderer
    await prepareRenderer();
    
    // Step 3: Generate icons (unless skipped)
    if (!skipIcons) {
      await generateIcons();
    } else {
      log('Skipping icon generation');
    }
    
    // Step 4: Install dependencies
    await installDependencies();
    
    // Step 5: Run electron-builder
    await runElectronBuilder();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('');
    console.log('╔══════════════════════════════════════════╗');
    console.log('║     Build Complete! 🎉                   ║');
    console.log(`║     Duration: ${duration}s                        ║`.slice(0, 45) + '║');
    console.log('╚══════════════════════════════════════════╝');
    console.log('');
    log(`Output directory: ${path.join(DESKTOP_PATH, 'dist')}`);
    
  } catch (e) {
    console.log('');
    console.log('╔══════════════════════════════════════════╗');
    console.log('║     Build Failed! ❌                     ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log('');
    error(e.message);
    process.exit(1);
  }
}

// Print help
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
E-Code Desktop Build Script

Usage: node build-desktop.js [options]

Options:
  --mac           Build for macOS only
  --win           Build for Windows only
  --linux         Build for Linux only
  --all           Build for all platforms (default)
  --skip-frontend Skip frontend build (use existing dist)
  --skip-icons    Skip icon generation
  --verbose       Show detailed output
  --help, -h      Show this help message

Examples:
  node build-desktop.js --mac
  node build-desktop.js --win --skip-frontend
  node build-desktop.js --all --verbose
`);
  process.exit(0);
}

main();
