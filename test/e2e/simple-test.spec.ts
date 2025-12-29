import { test, expect } from '@playwright/test';

test('basic navigation test', async ({ page }) => {
  console.log('Navigating to homepage...');
  
  const response = await page.goto('/');
  console.log('Response status:', response?.status());
  
  await page.screenshot({ path: 'test-results/debug-screenshot.png' });
  
  expect(response?.status()).toBe(200);
});
