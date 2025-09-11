#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// PWA validation tests
const distPath = path.join(__dirname, '../dist/public');

console.log('🔍 Running PWA validation tests...\n');

const tests = [
  {
    name: 'Manifest file exists',
    test: () => fs.existsSync(path.join(distPath, 'manifest.json')),
    expected: true
  },
  {
    name: 'Service worker exists',
    test: () => fs.existsSync(path.join(distPath, 'sw.js')),
    expected: true
  },
  {
    name: 'Browserconfig.xml exists',
    test: () => fs.existsSync(path.join(distPath, 'browserconfig.xml')),
    expected: true
  },
  {
    name: 'Required icons exist',
    test: () => {
      const requiredIcons = [
        'assets/icons/icon-192.png',
        'assets/icons/icon-512.png',
        'assets/icons/icon-192-maskable.png',
        'assets/icons/icon-512-maskable.png'
      ];
      return requiredIcons.every(icon => 
        fs.existsSync(path.join(distPath, icon))
      );
    },
    expected: true
  },
  {
    name: 'HTML includes PWA meta tags',
    test: () => {
      const htmlPath = path.join(distPath, 'index.html');
      if (!fs.existsSync(htmlPath)) return false;
      
      const html = fs.readFileSync(htmlPath, 'utf8');
      return html.includes('rel="manifest"') &&
             html.includes('name="theme-color"') &&
             html.includes('apple-mobile-web-app-capable');
    },
    expected: true
  },
  {
    name: 'Manifest has required fields',
    test: () => {
      const manifestPath = path.join(distPath, 'manifest.json');
      if (!fs.existsSync(manifestPath)) return false;
      
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      const requiredFields = ['name', 'short_name', 'start_url', 'display', 'icons'];
      return requiredFields.every(field => manifest[field]);
    },
    expected: true
  },
  {
    name: 'Service worker has PWA features',
    test: () => {
      const swPath = path.join(distPath, 'sw.js');
      if (!fs.existsSync(swPath)) return false;
      
      const sw = fs.readFileSync(swPath, 'utf8');
      return sw.includes('install') &&
             sw.includes('activate') &&
             sw.includes('fetch') &&
             sw.includes('cache');
    },
    expected: true
  },
  {
    name: 'Icons have correct sizes',
    test: () => {
      // Check if icon files have reasonable sizes (not empty)
      const iconSizes = [
        'assets/icons/icon-192.png',
        'assets/icons/icon-512.png'
      ];
      
      return iconSizes.every(iconPath => {
        const fullPath = path.join(distPath, iconPath);
        if (!fs.existsSync(fullPath)) return false;
        const stats = fs.statSync(fullPath);
        return stats.size > 1000; // At least 1KB
      });
    },
    expected: true
  }
];

let passed = 0;
let failed = 0;

tests.forEach(test => {
  try {
    const result = test.test();
    if (result === test.expected) {
      console.log(`✅ ${test.name}`);
      passed++;
    } else {
      console.log(`❌ ${test.name} - Expected: ${test.expected}, Got: ${result}`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ ${test.name} - Error: ${error.message}`);
    failed++;
  }
});

console.log(`\n📊 PWA Validation Results:`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

if (failed === 0) {
  console.log('\n🎉 All PWA validation tests passed! Your app is PWA-ready.');
} else {
  console.log('\n⚠️  Some PWA features may not work correctly. Please check the failed tests.');
  process.exit(1);
}