#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const RESOURCES_PATH = path.join(__dirname, '..', 'resources');
const ICONS_PATH = path.join(RESOURCES_PATH, 'icons');
const SVG_PATH = path.join(RESOURCES_PATH, 'icon.svg');

const LINUX_SIZES = [16, 32, 48, 64, 128, 256, 512];

function generateIcons() {
  console.log('[E-Code Desktop] Generating Linux desktop icons using ImageMagick...');
  
  if (!fs.existsSync(ICONS_PATH)) {
    fs.mkdirSync(ICONS_PATH, { recursive: true });
  }
  
  if (!fs.existsSync(SVG_PATH)) {
    console.error('[E-Code Desktop] Error: icon.svg not found at', SVG_PATH);
    process.exit(1);
  }
  
  for (const size of LINUX_SIZES) {
    const outputPath = path.join(ICONS_PATH, `${size}x${size}.png`);
    try {
      execSync(`convert -background none -density 300 "${SVG_PATH}" -resize ${size}x${size} "${outputPath}"`, {
        stdio: 'pipe'
      });
      console.log(`[E-Code Desktop] Generated ${size}x${size}.png`);
    } catch (e) {
      console.error(`[E-Code Desktop] Failed to generate ${size}x${size}.png:`, e.message);
    }
  }
  
  console.log('[E-Code Desktop] ✅ Icon generation complete');
}

generateIcons();
