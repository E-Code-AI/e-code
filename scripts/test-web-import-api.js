#!/usr/bin/env node

/**
 * Web Content Import API Test Script
 * 
 * This script demonstrates the web content import functionality
 * by testing the API endpoints with real requests.
 */

const fetch = require('node-fetch');

const API_BASE = process.env.API_BASE || 'http://localhost:3100';
const TEST_URLS = [
  'https://example.com',
  'https://github.com/microsoft/TypeScript',
  'https://docs.npmjs.com/cli/v7/commands/npm-install'
];

async function testFeatureStatus() {
  console.log('🔍 Testing feature status endpoint...');
  
  try {
    const response = await fetch(`${API_BASE}/api/import/status`, {
      headers: {
        'Authorization': 'Bearer test-token' // In real usage, use actual token
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Feature status:', data.data.features);
      return data.data.features;
    } else {
      console.log('❌ Feature status check failed:', response.status);
      return null;
    }
  } catch (error) {
    console.log('❌ Feature status error:', error.message);
    return null;
  }
}

async function testUrlImport(url, features) {
  console.log(`\n📄 Testing URL import: ${url}`);
  
  if (!features?.urlImport) {
    console.log('⚠️  URL import feature is disabled');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/import/url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        url,
        options: {
          includeScreenshot: false,
          saveArtifacts: true,
          extractionType: 'readability'
        }
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log(`✅ Import successful!`);
      console.log(`   Title: ${data.data.content.title}`);
      console.log(`   Word Count: ${data.data.content.wordCount}`);
      console.log(`   Reading Time: ${data.data.content.readingTime} min`);
      console.log(`   Processing Time: ${data.data.metadata.processingTime}ms`);
    } else {
      console.log(`❌ Import failed: ${data.error}`);
    }
  } catch (error) {
    console.log(`❌ Import error: ${error.message}`);
  }
}

async function testScreenshotCapture(url, features) {
  console.log(`\n📸 Testing screenshot capture: ${url}`);
  
  if (!features?.screenshotCapture) {
    console.log('⚠️  Screenshot capture feature is disabled');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/import/screenshot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        url,
        viewport: {
          width: 1280,
          height: 720
        }
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log(`✅ Screenshot captured!`);
      console.log(`   Dimensions: ${data.data.screenshot.metadata.width}x${data.data.screenshot.metadata.height}`);
      console.log(`   Full Page Height: ${data.data.screenshot.metadata.fullPageHeight}px`);
      console.log(`   Processing Time: ${data.data.metadata.processingTime}ms`);
    } else {
      console.log(`❌ Screenshot failed: ${data.error}`);
    }
  } catch (error) {
    console.log(`❌ Screenshot error: ${error.message}`);
  }
}

async function runTests() {
  console.log('🚀 Starting Web Content Import API Tests\n');
  console.log(`API Base URL: ${API_BASE}`);
  console.log(`Test URLs: ${TEST_URLS.join(', ')}\n`);

  // Test feature status
  const features = await testFeatureStatus();

  if (!features) {
    console.log('\n❌ Cannot proceed without feature status. Check authentication and API availability.');
    return;
  }

  // Test URL imports
  for (const url of TEST_URLS.slice(0, 2)) { // Limit to 2 URLs for demo
    await testUrlImport(url, features);
  }

  // Test screenshot capture
  await testScreenshotCapture(TEST_URLS[0], features);

  console.log('\n✅ Web Content Import API tests completed!');
  console.log('\n📝 Notes:');
  console.log('   - Features are disabled by default and need to be enabled per user');
  console.log('   - Authentication tokens are required for all API calls');
  console.log('   - Screenshot capture requires Playwright to be properly initialized');
  console.log('   - Processing times vary based on page complexity and network speed');
}

// Run tests if called directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testFeatureStatus, testUrlImport, testScreenshotCapture };