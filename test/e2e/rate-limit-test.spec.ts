import { test, expect } from '@playwright/test';

test.describe('Rate Limit Fix Verification', () => {
  test('login page loads correctly', async ({ page }) => {
    const response = await page.goto('/login');
    expect(response?.status()).toBe(200);
    
    // Verify login form elements exist
    await expect(page.locator('input[type="email"], input[name*="email"], input[placeholder*="email" i]').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[type="password"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('can login with test user', async ({ page }) => {
    await page.goto('/login');
    
    // Fill login form
    const emailInput = page.locator('input[type="email"], input[name*="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    
    await emailInput.fill('testuser@test.com');
    await passwordInput.fill('testpass123');
    
    // Click submit
    const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first();
    await submitButton.click();
    
    // Wait for navigation away from login
    await page.waitForURL(/^(?!.*\/login)/, { timeout: 15000 });
    
    // Verify rate limit modal is NOT visible
    const rateLimitModal = page.locator('[data-testid="rate-limit-modal"]');
    await expect(rateLimitModal).not.toBeVisible({ timeout: 5000 });
  });
});
