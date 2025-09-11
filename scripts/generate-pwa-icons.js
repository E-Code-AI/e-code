#!/usr/bin/env node

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const svgPath = path.join(__dirname, '../client/public/favicon.svg');
const outputDir = path.join(__dirname, '../client/public/assets/icons');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
  console.log('🎨 Generating PWA icons...');
  
  try {
    const svgBuffer = fs.readFileSync(svgPath);
    
    // Generate standard icons
    for (const size of sizes) {
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(path.join(outputDir, `icon-${size}.png`));
      console.log(`✅ Generated icon-${size}.png`);
    }
    
    // Generate maskable icons (with padding for safe area)
    const maskableSizes = [192, 512];
    for (const size of maskableSizes) {
      // Create a larger canvas with padding for maskable icon safe area (80% of total size)
      const canvasSize = Math.floor(size / 0.8);
      const iconSize = size;
      const padding = Math.floor((canvasSize - iconSize) / 2);
      
      await sharp({
        create: {
          width: canvasSize,
          height: canvasSize,
          channels: 4,
          background: { r: 15, g: 15, b: 15, alpha: 1 } // Dark background matching theme
        }
      })
      .composite([{
        input: await sharp(svgBuffer).resize(iconSize, iconSize).png().toBuffer(),
        top: padding,
        left: padding
      }])
      .png()
      .toFile(path.join(outputDir, `icon-${size}-maskable.png`));
      console.log(`✅ Generated icon-${size}-maskable.png`);
    }
    
    // Generate shortcut icons
    const shortcutIcons = [
      { name: 'shortcut-new.png', color: '#10b981' },
      { name: 'shortcut-templates.png', color: '#3b82f6' }
    ];
    
    for (const shortcut of shortcutIcons) {
      // Create a simple colored version for shortcuts
      await sharp({
        create: {
          width: 96,
          height: 96,
          channels: 4,
          background: shortcut.color
        }
      })
      .composite([{
        input: await sharp(svgBuffer).resize(64, 64).png().toBuffer(),
        top: 16,
        left: 16
      }])
      .png()
      .toFile(path.join(outputDir, shortcut.name));
      console.log(`✅ Generated ${shortcut.name}`);
    }
    
    console.log('🎉 All PWA icons generated successfully!');
    
  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

// Also create placeholder screenshots directory
const screenshotsDir = path.join(__dirname, '../client/public/assets/screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
  
  // Create placeholder screenshots (simple colored rectangles for now)
  sharp({
    create: {
      width: 1280,
      height: 720,
      channels: 3,
      background: { r: 15, g: 15, b: 15 }
    }
  })
  .jpeg()
  .toFile(path.join(screenshotsDir, 'desktop-screenshot.png'));
  
  sharp({
    create: {
      width: 375,
      height: 667,
      channels: 3,
      background: { r: 15, g: 15, b: 15 }
    }
  })
  .jpeg()
  .toFile(path.join(screenshotsDir, 'mobile-screenshot.png'));
  
  console.log('📸 Generated placeholder screenshots');
}

generateIcons().catch(console.error);