import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.join(__dirname, '..');
const publicDir = path.join(rootDir, 'client', 'public');
const iconsDir = path.join(publicDir, 'icons');
const faviconPath = path.join(publicDir, 'favicon.svg');

async function generateIcons() {
  console.log('Generating PWA icons from favicon.svg...');
  
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }
  
  const sizes = [
    { name: 'icon-192x192.png', size: 192, path: path.join(iconsDir, 'icon-192x192.png') },
    { name: 'icon-512x512.png', size: 512, path: path.join(iconsDir, 'icon-512x512.png') },
    { name: 'apple-touch-icon.png', size: 180, path: path.join(publicDir, 'apple-touch-icon.png') }
  ];
  
  for (const icon of sizes) {
    try {
      execSync(`convert -background none -density 300 "${faviconPath}" -resize ${icon.size}x${icon.size} "${icon.path}"`, {
        stdio: 'pipe'
      });
      console.log(`✓ Generated ${icon.name} (${icon.size}x${icon.size})`);
    } catch (error) {
      console.error(`✗ Failed to generate ${icon.name}:`, error.message);
    }
  }
  
  console.log('Done!');
}

generateIcons().catch(console.error);
