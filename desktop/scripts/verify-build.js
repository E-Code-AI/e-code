#!/usr/bin/env node
/**
 * E-Code Desktop - Build Verification Script
 * 
 * This script verifies that the desktop build process works correctly.
 * It checks:
 * 1. All required dependencies are installed
 * 2. Required resource files exist
 * 3. electron-builder configuration is valid
 * 4. The pack command successfully creates an unpacked build
 * 
 * Usage: node scripts/verify-build.js [--quick] [--verbose]
 * 
 * Options:
 *   --quick    Skip the actual build test (only check deps and config)
 *   --verbose  Show detailed output
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const DESKTOP_PATH = path.join(__dirname, '..');
const RENDERER_PATH = path.join(DESKTOP_PATH, 'renderer');
const RESOURCES_PATH = path.join(DESKTOP_PATH, 'resources');
const DIST_PATH = path.join(DESKTOP_PATH, 'dist');

const args = process.argv.slice(2);
const quickMode = args.includes('--quick');
const verbose = args.includes('--verbose');

let passed = 0;
let failed = 0;
const issues = [];

function log(msg) {
  console.log(msg);
}

function success(msg) {
  passed++;
  console.log(`  ✅ ${msg}`);
}

function fail(msg, details = null) {
  failed++;
  console.log(`  ❌ ${msg}`);
  if (details && verbose) {
    console.log(`     ${details}`);
  }
  issues.push(msg);
}

function warn(msg) {
  console.log(`  ⚠️  ${msg}`);
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    return null;
  }
}

log('');
log('╔══════════════════════════════════════════════════════════════╗');
log('║          E-Code Desktop Build Verification                   ║');
log('╚══════════════════════════════════════════════════════════════╝');
log('');

// ============================================================
// 1. Check Core Files
// ============================================================
log('📁 Checking core files...');

const coreFiles = [
  { path: 'package.json', required: true },
  { path: 'main.js', required: true },
  { path: 'preload.js', required: true },
  { path: 'package-lock.json', required: false },
];

for (const file of coreFiles) {
  const fullPath = path.join(DESKTOP_PATH, file.path);
  if (fileExists(fullPath)) {
    success(`${file.path} exists`);
  } else if (file.required) {
    fail(`${file.path} is missing (required)`);
  } else {
    warn(`${file.path} is missing (optional)`);
  }
}

// ============================================================
// 2. Check package.json Configuration
// ============================================================
log('');
log('📦 Checking package.json configuration...');

const pkg = readJSON(path.join(DESKTOP_PATH, 'package.json'));
if (!pkg) {
  fail('Could not read package.json');
} else {
  // Check required fields
  if (pkg.name) success(`Package name: ${pkg.name}`);
  else fail('Package name is missing');
  
  if (pkg.version) success(`Version: ${pkg.version}`);
  else fail('Version is missing');
  
  if (pkg.main === 'main.js') success('Main entry point configured');
  else fail('Main entry point should be "main.js"');
  
  // Check build scripts
  const requiredScripts = ['start', 'dev', 'build', 'pack'];
  for (const script of requiredScripts) {
    if (pkg.scripts && pkg.scripts[script]) {
      success(`Script "${script}" defined`);
    } else {
      fail(`Script "${script}" is missing`);
    }
  }
  
  // Check electron-builder config
  if (pkg.build) {
    success('electron-builder config present');
    
    if (pkg.build.appId) success(`App ID: ${pkg.build.appId}`);
    else fail('App ID is missing in build config');
    
    if (pkg.build.productName) success(`Product name: ${pkg.build.productName}`);
    else fail('Product name is missing');
    
    // Platform configs
    if (pkg.build.mac) success('macOS config present');
    else warn('macOS config missing');
    
    if (pkg.build.win) success('Windows config present');
    else warn('Windows config missing');
    
    if (pkg.build.linux) success('Linux config present');
    else warn('Linux config missing');
  } else {
    fail('electron-builder config missing from package.json');
  }
  
  // Check dependencies
  const requiredDeps = ['electron-store', 'electron-updater'];
  for (const dep of requiredDeps) {
    if (pkg.dependencies && pkg.dependencies[dep]) {
      success(`Dependency "${dep}" listed`);
    } else {
      fail(`Dependency "${dep}" is missing`);
    }
  }
  
  const requiredDevDeps = ['electron', 'electron-builder'];
  for (const dep of requiredDevDeps) {
    if (pkg.devDependencies && pkg.devDependencies[dep]) {
      success(`Dev dependency "${dep}" listed`);
    } else {
      fail(`Dev dependency "${dep}" is missing`);
    }
  }
}

// ============================================================
// 3. Check Resource Files
// ============================================================
log('');
log('🎨 Checking resource files...');

const resourceFiles = [
  { path: 'icon.png', required: true, desc: 'Base icon' },
  { path: 'icon.icns', required: true, desc: 'macOS icon' },
  { path: 'icon.ico', required: true, desc: 'Windows icon' },
  { path: 'entitlements.mac.plist', required: true, desc: 'macOS entitlements' },
  { path: 'license.txt', required: false, desc: 'License file' },
  { path: 'icons/256x256.png', required: true, desc: 'Linux icon (256x256)' },
  { path: 'installer-header.bmp', required: false, desc: 'Windows installer header' },
  { path: 'installer-sidebar.bmp', required: false, desc: 'Windows installer sidebar' },
];

for (const file of resourceFiles) {
  const fullPath = path.join(RESOURCES_PATH, file.path);
  if (fileExists(fullPath)) {
    success(`${file.desc} (${file.path})`);
  } else if (file.required) {
    fail(`${file.desc} is missing: ${file.path}`);
  } else {
    warn(`${file.desc} is missing (optional): ${file.path}`);
  }
}

// ============================================================
// 4. Check Node Modules
// ============================================================
log('');
log('📚 Checking node_modules...');

const nodeModulesPath = path.join(DESKTOP_PATH, 'node_modules');
if (fileExists(nodeModulesPath)) {
  success('node_modules directory exists');
  
  const criticalModules = [
    'electron',
    'electron-builder',
    'electron-store',
    'electron-updater',
  ];
  
  for (const mod of criticalModules) {
    if (fileExists(path.join(nodeModulesPath, mod))) {
      success(`Module "${mod}" installed`);
    } else {
      fail(`Module "${mod}" not installed`);
    }
  }
} else {
  fail('node_modules not found - run "npm install"');
}

// ============================================================
// 5. Check Renderer Files
// ============================================================
log('');
log('🖥️  Checking renderer files...');

if (fileExists(RENDERER_PATH)) {
  success('Renderer directory exists');
  
  const indexPath = path.join(RENDERER_PATH, 'index.html');
  if (fileExists(indexPath)) {
    success('index.html present');
  } else {
    fail('index.html missing - run "npm run prepare-renderer"');
  }
} else {
  warn('Renderer directory not found - will use dev server or production URL');
}

// ============================================================
// 6. Test Build (unless --quick)
// ============================================================
if (!quickMode) {
  log('');
  log('🔨 Testing build process...');
  log('   (Use --quick to skip this step)');
  
  try {
    const result = spawnSync('npm', ['run', 'pack'], {
      cwd: DESKTOP_PATH,
      timeout: 300000,
      encoding: 'utf-8',
      shell: true,
    });
    
    if (result.status === 0) {
      success('Build completed successfully');
      
      const unpackedPath = path.join(DIST_PATH, 'linux-unpacked');
      const macUnpackedPath = path.join(DIST_PATH, 'mac');
      const winUnpackedPath = path.join(DIST_PATH, 'win-unpacked');
      
      if (fileExists(unpackedPath)) {
        success('Linux unpacked build created');
        
        const executable = path.join(unpackedPath, 'e-code-desktop');
        if (fileExists(executable)) {
          const stats = fs.statSync(executable);
          const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
          success(`Executable created (${sizeMB} MB)`);
        }
      } else if (fileExists(macUnpackedPath)) {
        success('macOS unpacked build created');
      } else if (fileExists(winUnpackedPath)) {
        success('Windows unpacked build created');
      } else {
        warn('Could not locate unpacked build directory');
      }
    } else {
      fail('Build failed', result.stderr || result.stdout);
    }
  } catch (error) {
    fail(`Build error: ${error.message}`);
  }
} else {
  log('');
  log('⏭️  Skipping build test (--quick mode)');
}

// ============================================================
// Summary
// ============================================================
log('');
log('════════════════════════════════════════════════════════════════');
log('');
log(`  Results: ${passed} passed, ${failed} failed`);
log('');

if (failed === 0) {
  log('  ✅ All checks passed! The build configuration is valid.');
  log('');
  log('  Next steps:');
  log('    • Run "npm run pack" to create an unpacked build');
  log('    • Run "npm run build:linux" for Linux installers');
  log('    • Run "npm run build:mac" for macOS installers (requires macOS)');
  log('    • Run "npm run build:win" for Windows installers');
  log('');
  process.exit(0);
} else {
  log('  ❌ Some checks failed. Please fix the issues above.');
  log('');
  log('  Issues found:');
  for (const issue of issues) {
    log(`    • ${issue}`);
  }
  log('');
  process.exit(1);
}
