#!/usr/bin/env node
/**
 * E-Code Desktop - Renderer Preparation Script
 * Fortune 500 Quality Build Process
 * 
 * This script copies the built frontend to the desktop/renderer directory
 */

const fs = require('fs');
const path = require('path');

const DIST_PATH = path.join(__dirname, '..', '..', 'dist', 'public');
const RENDERER_PATH = path.join(__dirname, '..', 'renderer');

function copyRecursive(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursive(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

function main() {
  console.log('[E-Code Desktop] Preparing renderer...');
  console.log(`[E-Code Desktop] Source: ${DIST_PATH}`);
  console.log(`[E-Code Desktop] Destination: ${RENDERER_PATH}`);

  // Check if dist exists
  if (!fs.existsSync(DIST_PATH)) {
    console.error('[E-Code Desktop] Error: dist/public not found!');
    console.error('[E-Code Desktop] Run "npm run build" in the root directory first.');
    process.exit(1);
  }

  // Check if index.html exists
  const indexPath = path.join(DIST_PATH, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.error('[E-Code Desktop] Error: index.html not found in dist/public!');
    process.exit(1);
  }

  // Clean renderer directory
  if (fs.existsSync(RENDERER_PATH)) {
    console.log('[E-Code Desktop] Cleaning existing renderer directory...');
    fs.rmSync(RENDERER_PATH, { recursive: true, force: true });
  }

  // Copy files
  console.log('[E-Code Desktop] Copying files...');
  copyRecursive(DIST_PATH, RENDERER_PATH);

  // Modify index.html for Electron compatibility
  console.log('[E-Code Desktop] Patching index.html for Electron...');
  let indexHtml = fs.readFileSync(path.join(RENDERER_PATH, 'index.html'), 'utf-8');
  
  // Ensure base href is relative for file:// protocol
  if (!indexHtml.includes('<base href')) {
    indexHtml = indexHtml.replace('<head>', '<head>\n    <base href="./">');
  }
  
  // Add CSP for Electron
  if (!indexHtml.includes('Content-Security-Policy')) {
    const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: ws: wss: https:; img-src 'self' data: blob: https:; font-src 'self' data: https:;">`;
    indexHtml = indexHtml.replace('<head>', `<head>\n    ${csp}`);
  }
  
  fs.writeFileSync(path.join(RENDERER_PATH, 'index.html'), indexHtml);

  // Count files
  let fileCount = 0;
  function countFiles(dir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      if (fs.statSync(fullPath).isDirectory()) {
        countFiles(fullPath);
      } else {
        fileCount++;
      }
    }
  }
  countFiles(RENDERER_PATH);

  console.log(`[E-Code Desktop] ✅ Renderer prepared successfully (${fileCount} files)`);
}

main();
