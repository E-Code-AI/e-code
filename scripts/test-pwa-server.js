#!/usr/bin/env node

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const distPath = path.join(__dirname, '../dist/public');

// Serve static files
app.use(express.static(distPath));

// Handle SPA routing - serve index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 PWA Test Server running on http://localhost:${PORT}`);
  console.log(`📁 Serving files from: ${distPath}`);
  console.log('\n📱 PWA Features Available:');
  console.log('  • Service Worker: /sw.js');
  console.log('  • Web App Manifest: /manifest.json');
  console.log('  • App Icons: /assets/icons/');
  console.log('  • Install Prompt: Available in supported browsers');
  console.log('\n🧪 To test PWA features:');
  console.log('  1. Open Chrome DevTools');
  console.log('  2. Go to Application > Manifest');
  console.log('  3. Check "Service Workers" tab');
  console.log('  4. Use Lighthouse to audit PWA compliance');
  console.log('  5. Try installing the app using browser menu');
});