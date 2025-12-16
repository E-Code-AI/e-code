#!/usr/bin/env node
/**
 * E-Code Desktop - Platform Icon Generation Script
 * Generates ICO, ICNS, and BMP files from PNG sources
 */

const fs = require('fs');
const path = require('path');

const RESOURCES_PATH = path.join(__dirname, '..', 'resources');
const ICONS_PATH = path.join(RESOURCES_PATH, 'icons');

/**
 * Create a simple ICO file from PNG data
 * ICO format: Header + Directory entries + Image data
 */
function createIcoFromPngs(pngPaths, outputPath) {
  const images = [];
  
  for (const pngPath of pngPaths) {
    if (fs.existsSync(pngPath)) {
      const data = fs.readFileSync(pngPath);
      const size = parseInt(path.basename(pngPath).split('x')[0], 10);
      images.push({ data, size });
    }
  }
  
  if (images.length === 0) {
    console.error('[E-Code Desktop] No PNG images found for ICO generation');
    return false;
  }
  
  // ICO Header: 6 bytes
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);           // Reserved
  header.writeUInt16LE(1, 2);           // Type: 1 = ICO
  header.writeUInt16LE(images.length, 4); // Number of images
  
  // Directory entries: 16 bytes each
  const dirEntries = [];
  let dataOffset = 6 + (images.length * 16);
  
  for (const img of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(img.size >= 256 ? 0 : img.size, 0);  // Width (0 = 256)
    entry.writeUInt8(img.size >= 256 ? 0 : img.size, 1);  // Height (0 = 256)
    entry.writeUInt8(0, 2);                               // Color palette
    entry.writeUInt8(0, 3);                               // Reserved
    entry.writeUInt16LE(1, 4);                            // Color planes
    entry.writeUInt16LE(32, 6);                           // Bits per pixel
    entry.writeUInt32LE(img.data.length, 8);              // Size of image data
    entry.writeUInt32LE(dataOffset, 12);                  // Offset to image data
    
    dirEntries.push(entry);
    dataOffset += img.data.length;
  }
  
  // Combine all buffers
  const buffers = [header, ...dirEntries, ...images.map(img => img.data)];
  fs.writeFileSync(outputPath, Buffer.concat(buffers));
  
  console.log(`[E-Code Desktop] ✅ Generated ${path.basename(outputPath)}`);
  return true;
}

/**
 * Create a simple BMP file with gradient background and E-Code branding
 */
function createBmpImage(width, height, outputPath, type) {
  // BMP file format
  const rowSize = Math.ceil((width * 24) / 32) * 4; // Row size must be multiple of 4
  const pixelDataSize = rowSize * height;
  const headerSize = 54;
  const fileSize = headerSize + pixelDataSize;
  
  const buffer = Buffer.alloc(fileSize);
  
  // BMP Header (14 bytes)
  buffer.write('BM', 0);                              // Signature
  buffer.writeUInt32LE(fileSize, 2);                  // File size
  buffer.writeUInt32LE(0, 6);                         // Reserved
  buffer.writeUInt32LE(headerSize, 10);               // Pixel data offset
  
  // DIB Header (40 bytes)
  buffer.writeUInt32LE(40, 14);                       // DIB header size
  buffer.writeInt32LE(width, 18);                     // Width
  buffer.writeInt32LE(height, 22);                    // Height (positive = bottom-up)
  buffer.writeUInt16LE(1, 26);                        // Color planes
  buffer.writeUInt16LE(24, 28);                       // Bits per pixel
  buffer.writeUInt32LE(0, 30);                        // Compression (0 = none)
  buffer.writeUInt32LE(pixelDataSize, 34);            // Image size
  buffer.writeInt32LE(2835, 38);                      // X pixels per meter
  buffer.writeInt32LE(2835, 42);                      // Y pixels per meter
  buffer.writeUInt32LE(0, 46);                        // Colors in palette
  buffer.writeUInt32LE(0, 50);                        // Important colors
  
  // E-Code brand colors
  const primaryR = 242, primaryG = 98, primaryB = 7;    // #F26207 (E-Code orange)
  const bgR = 26, bgG = 26, bgB = 46;                   // #1a1a2e (Dark blue)
  
  // Pixel data (BGR format, bottom-up)
  let offset = headerSize;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Create gradient from dark to slightly lighter
      const gradientY = y / height;
      const gradientX = x / width;
      
      let r, g, b;
      
      if (type === 'header') {
        // Header: subtle gradient with brand feel
        r = Math.floor(bgR + (25 * gradientY));
        g = Math.floor(bgG + (25 * gradientY));
        b = Math.floor(bgB + (20 * gradientY));
      } else {
        // Sidebar: vertical gradient with accent
        const accentStrength = Math.sin(gradientY * Math.PI) * 0.3;
        r = Math.floor(bgR + (primaryR - bgR) * accentStrength * 0.2);
        g = Math.floor(bgG + (primaryG - bgG) * accentStrength * 0.2);
        b = Math.floor(bgB + (primaryB - bgB) * accentStrength * 0.2);
      }
      
      buffer.writeUInt8(b, offset);     // Blue
      buffer.writeUInt8(g, offset + 1); // Green
      buffer.writeUInt8(r, offset + 2); // Red
      offset += 3;
    }
    // Padding to make row size multiple of 4
    const padding = rowSize - (width * 3);
    for (let p = 0; p < padding; p++) {
      buffer.writeUInt8(0, offset);
      offset++;
    }
  }
  
  fs.writeFileSync(outputPath, buffer);
  console.log(`[E-Code Desktop] ✅ Generated ${path.basename(outputPath)} (${width}x${height})`);
  return true;
}

/**
 * Create ICNS iconset folder structure for macOS
 * Note: Actual .icns conversion requires iconutil on macOS
 */
function createIconsetFolder() {
  const iconsetPath = path.join(RESOURCES_PATH, 'icon.iconset');
  if (!fs.existsSync(iconsetPath)) {
    fs.mkdirSync(iconsetPath, { recursive: true });
  }
  
  // Icon mappings for macOS iconset
  const iconMappings = [
    { src: '16x16.png', dest: 'icon_16x16.png' },
    { src: '32x32.png', dest: 'icon_16x16@2x.png' },
    { src: '32x32.png', dest: 'icon_32x32.png' },
    { src: '64x64.png', dest: 'icon_32x32@2x.png' },
    { src: '128x128.png', dest: 'icon_128x128.png' },
    { src: '256x256.png', dest: 'icon_128x128@2x.png' },
    { src: '256x256.png', dest: 'icon_256x256.png' },
    { src: '512x512.png', dest: 'icon_256x256@2x.png' },
    { src: '512x512.png', dest: 'icon_512x512.png' },
  ];
  
  let copied = 0;
  for (const mapping of iconMappings) {
    const srcPath = path.join(ICONS_PATH, mapping.src);
    const destPath = path.join(iconsetPath, mapping.dest);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
      copied++;
    }
  }
  
  if (copied > 0) {
    console.log(`[E-Code Desktop] ✅ Created icon.iconset with ${copied} icons`);
    console.log('[E-Code Desktop] To generate .icns on macOS, run:');
    console.log('  iconutil -c icns resources/icon.iconset -o resources/icon.icns');
  }
  
  return copied > 0;
}

async function main() {
  console.log('[E-Code Desktop] Generating platform-specific icons...\n');
  
  // 1. Generate ICO file for Windows
  const icoSizes = ['16x16', '32x32', '48x48', '64x64', '128x128', '256x256'];
  const icoPngs = icoSizes.map(size => path.join(ICONS_PATH, `${size}.png`));
  createIcoFromPngs(icoPngs, path.join(RESOURCES_PATH, 'icon.ico'));
  
  // 2. Create iconset folder for macOS
  createIconsetFolder();
  
  // 3. Generate installer BMP files for NSIS (Windows)
  // Header: 150x57 pixels
  createBmpImage(150, 57, path.join(RESOURCES_PATH, 'installer-header.bmp'), 'header');
  // Sidebar: 164x314 pixels  
  createBmpImage(164, 314, path.join(RESOURCES_PATH, 'installer-sidebar.bmp'), 'sidebar');
  
  console.log('\n[E-Code Desktop] ✅ Platform icon generation complete!');
  console.log('\nNote: For production-quality .icns file, run on macOS:');
  console.log('  iconutil -c icns resources/icon.iconset -o resources/icon.icns');
}

main().catch(console.error);
