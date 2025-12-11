
import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🔍 Checking server health before tests...');
  
  const baseURL = config.use?.baseURL || 'http://localhost:5173';
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Attendre que le serveur soit vraiment prêt
  let attempts = 0;
  const maxAttempts = 30;
  
  while (attempts < maxAttempts) {
    try {
      const response = await page.goto(baseURL, { 
        timeout: 5000,
        waitUntil: 'domcontentloaded'
      });
      
      if (response && response.status() < 500) {
        console.log('✅ Server is healthy');
        await browser.close();
        return;
      }
    } catch (error) {
      // Continuer à attendre
    }
    
    attempts++;
    console.log(`⏳ Waiting for server (${attempts}/${maxAttempts})...`);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  await browser.close();
  throw new Error('Server failed health check');
}

export default globalSetup;
