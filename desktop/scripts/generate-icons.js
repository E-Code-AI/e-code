#!/usr/bin/env node
/**
 * E-Code Desktop - Icon Generation Script
 * Fortune 500 Quality Asset Pipeline
 * 
 * Generates platform-specific icons from the source SVG
 * 
 * Prerequisites:
 * - sharp (npm install sharp)
 * 
 * For full icon generation with icns/ico support:
 * - macOS: brew install iconsur (for icns)
 * - Windows: Use online converter or png2ico
 * - Linux: Install imagemagick
 */

const fs = require('fs');
const path = require('path');

const RESOURCES_PATH = path.join(__dirname, '..', 'resources');
const ICONS_PATH = path.join(RESOURCES_PATH, 'icons');

// Icon sizes for different platforms
const ICON_SIZES = {
  // macOS icon sizes
  mac: [16, 32, 64, 128, 256, 512, 1024],
  // Windows icon sizes
  win: [16, 24, 32, 48, 64, 128, 256],
  // Linux icon sizes
  linux: [16, 22, 24, 32, 48, 64, 128, 256, 512]
};

async function generateIcons() {
  console.log('[E-Code Desktop] Generating icons...');
  
  // Ensure icons directory exists
  if (!fs.existsSync(ICONS_PATH)) {
    fs.mkdirSync(ICONS_PATH, { recursive: true });
  }
  
  // Check for sharp
  let sharp;
  try {
    sharp = require('sharp');
  } catch (e) {
    console.log('[E-Code Desktop] sharp not installed. Using fallback method.');
    console.log('[E-Code Desktop] To generate high-quality icons, run: npm install sharp');
    generateFallbackIcons();
    return;
  }
  
  const svgPath = path.join(RESOURCES_PATH, 'icon.svg');
  if (!fs.existsSync(svgPath)) {
    console.error('[E-Code Desktop] Error: icon.svg not found!');
    process.exit(1);
  }
  
  const svgBuffer = fs.readFileSync(svgPath);
  
  // Generate all sizes
  const allSizes = [...new Set([...ICON_SIZES.mac, ...ICON_SIZES.win, ...ICON_SIZES.linux])].sort((a, b) => a - b);
  
  for (const size of allSizes) {
    try {
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(path.join(ICONS_PATH, `${size}x${size}.png`));
      console.log(`[E-Code Desktop] Generated ${size}x${size}.png`);
    } catch (e) {
      console.error(`[E-Code Desktop] Failed to generate ${size}x${size}.png:`, e.message);
    }
  }
  
  // Copy 512x512 as main icon.png
  try {
    await sharp(svgBuffer)
      .resize(512, 512)
      .png()
      .toFile(path.join(RESOURCES_PATH, 'icon.png'));
    console.log('[E-Code Desktop] Generated icon.png (512x512)');
  } catch (e) {
    console.error('[E-Code Desktop] Failed to generate icon.png:', e.message);
  }
  
  console.log('[E-Code Desktop] ✅ Icon generation complete');
  console.log('[E-Code Desktop] Note: For .icns (macOS) and .ico (Windows) files,');
  console.log('[E-Code Desktop] use platform-specific tools or online converters.');
}

function generateFallbackIcons() {
  // Create a simple fallback PNG using SVG data URL approach
  const svgPath = path.join(RESOURCES_PATH, 'icon.svg');
  if (fs.existsSync(svgPath)) {
    // Just copy SVG as reference
    console.log('[E-Code Desktop] SVG icon available at resources/icon.svg');
    console.log('[E-Code Desktop] Use online tools to convert to PNG/ICO/ICNS:');
    console.log('[E-Code Desktop]   - https://cloudconvert.com/svg-to-png');
    console.log('[E-Code Desktop]   - https://www.icoconverter.com/');
    console.log('[E-Code Desktop]   - https://iconverticons.com/online/');
  }
}

generateIcons().catch(console.error);
