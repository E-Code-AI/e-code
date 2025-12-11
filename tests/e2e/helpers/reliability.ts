
/**
 * Helpers pour améliorer la fiabilité des tests E2E sur Replit
 */

import { Page, expect } from '@playwright/test';

/**
 * Attendre que la page soit complètement chargée avec retry
 */
export async function waitForPageLoad(page: Page, timeout = 30000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      await page.waitForLoadState('networkidle', { timeout: 5000 });
      return;
    } catch (error) {
      // Retry si timeout
      await page.waitForTimeout(1000);
    }
  }
  
  throw new Error('Page failed to load after retries');
}

/**
 * Navigation avec retry automatique en cas d'erreur 502
 */
export async function navigateWithRetry(page: Page, url: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      // Vérifier que ce n'est pas une erreur 502
      if (response && response.status() === 502) {
        console.log(`Got 502, retry ${i + 1}/${maxRetries}`);
        await page.waitForTimeout(2000 * (i + 1)); // Backoff exponentiel
        continue;
      }
      
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.log(`Navigation failed, retry ${i + 1}/${maxRetries}`, error);
      await page.waitForTimeout(2000 * (i + 1));
    }
  }
}

/**
 * Click avec retry en cas d'échec
 */
export async function clickWithRetry(page: Page, selector: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await page.click(selector, { timeout: 10000 });
      return;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.log(`Click failed, retry ${i + 1}/${maxRetries}`);
      await page.waitForTimeout(1000);
    }
  }
}

/**
 * Attendre un élément avec retry
 */
export async function waitForElementWithRetry(
  page: Page, 
  selector: string, 
  maxRetries = 3
) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await page.waitForSelector(selector, { timeout: 10000 });
      return;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.log(`Wait for element failed, retry ${i + 1}/${maxRetries}`);
      await page.waitForTimeout(1000);
    }
  }
}
