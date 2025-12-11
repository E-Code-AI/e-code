/**
 * E2E Test Global Setup
 * 
 * Waits for the server to be fully ready before running tests.
 * Uses the /health/liveness endpoint which is designed for this purpose.
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🔍 Checking server health before tests...');
  
  const baseURL = config.use?.baseURL || 'http://localhost:5000';
  const healthURL = `${baseURL}/health/liveness`;
  
  console.log(`📍 Base URL: ${baseURL}`);
  console.log(`🏥 Health endpoint: ${healthURL}`);
  
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  let attempts = 0;
  const maxAttempts = 45; // 90 seconds total (45 × 2s)
  
  while (attempts < maxAttempts) {
    try {
      // First, check the health endpoint directly via fetch
      const response = await page.request.get(healthURL, { timeout: 5000 });
      
      if (response.status() === 200) {
        const body = await response.json().catch(() => ({}));
        console.log(`✅ Health check passed: ${JSON.stringify(body)}`);
        
        // Extra warmup: load the homepage to prime caches
        console.log('🔥 Warming up application...');
        try {
          await page.goto(baseURL, { 
            timeout: 15000,
            waitUntil: 'domcontentloaded'
          });
          console.log('✅ Homepage loaded successfully');
          
          // Small delay for any async initialization
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (warmupError) {
          console.log('⚠️ Homepage warmup had issues, but health check passed');
        }
        
        await browser.close();
        console.log('🚀 Server ready - starting tests');
        return;
      }
      
      console.log(`⏳ Health check returned ${response.status()}, retrying...`);
    } catch (error: any) {
      const errorMsg = error?.message || 'Unknown error';
      if (attempts % 5 === 0) {
        console.log(`⏳ Waiting for server (${attempts}/${maxAttempts}): ${errorMsg.substring(0, 50)}`);
      }
    }
    
    attempts++;
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Final attempt with more details
  console.log('❌ Server failed to become healthy after maximum attempts');
  
  try {
    const finalCheck = await page.request.get(healthURL, { timeout: 10000 });
    console.log(`Final health status: ${finalCheck.status()}`);
    const body = await finalCheck.text();
    console.log(`Final health body: ${body.substring(0, 200)}`);
  } catch (e: any) {
    console.log(`Final health error: ${e?.message}`);
  }
  
  await browser.close();
  throw new Error(`Server failed health check after ${maxAttempts * 2} seconds. Endpoint: ${healthURL}`);
}

export default globalSetup;
