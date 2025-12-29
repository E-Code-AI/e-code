import { test, expect } from '@playwright/test';

test.describe('Comprehensive Rate Limit Verification', () => {
  
  test('1. Login page renders correctly', async ({ page }) => {
    const response = await page.goto('/login');
    expect(response?.status()).toBe(200);
    
    // Verify all login form elements
    await expect(page.locator('input[type="email"], input[name*="email"], input[placeholder*="email" i]').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[type="password"]').first()).toBeVisible({ timeout: 10000 });
    
    // Take screenshot for evidence
    await page.screenshot({ path: 'test-results/01-login-page.png' });
  });

  test('2. User can login and NO rate limit modal appears', async ({ page }) => {
    await page.goto('/login');
    
    // Fill login form
    const emailInput = page.locator('input[type="email"], input[name*="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    
    await emailInput.fill('testuser@test.com');
    await passwordInput.fill('testpass123');
    
    // Screenshot before submit
    await page.screenshot({ path: 'test-results/02-login-filled.png' });
    
    // Click submit
    const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first();
    await submitButton.click();
    
    // Wait for navigation away from login
    await page.waitForURL(/^(?!.*\/login)/, { timeout: 20000 });
    
    // Screenshot after login
    await page.screenshot({ path: 'test-results/03-after-login.png' });
    
    // CRITICAL: Verify rate limit modal is NOT visible
    const rateLimitModal = page.locator('[data-testid="rate-limit-modal"]');
    await expect(rateLimitModal).not.toBeVisible({ timeout: 5000 });
    
    console.log('✅ Rate limit modal is NOT visible - FIX CONFIRMED');
  });

  test('3. Verify rate limit modal element does not exist in DOM', async ({ page }) => {
    await page.goto('/login');
    
    // Login
    await page.locator('input[type="email"], input[name*="email"], input[placeholder*="email" i]').first().fill('testuser@test.com');
    await page.locator('input[type="password"]').first().fill('testpass123');
    await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first().click();
    
    await page.waitForURL(/^(?!.*\/login)/, { timeout: 20000 });
    
    // Wait a bit for any delayed modals
    await page.waitForTimeout(3000);
    
    // Check modal is not in DOM at all
    const modalCount = await page.locator('[data-testid="rate-limit-modal"]').count();
    expect(modalCount).toBe(0);
    
    console.log('✅ Rate limit modal not in DOM - CONFIRMED');
  });

  test('4. API conversation endpoint does not trigger rate limit', async ({ page, request }) => {
    // Login first
    await page.goto('/login');
    await page.locator('input[type="email"], input[name*="email"], input[placeholder*="email" i]').first().fill('testuser@test.com');
    await page.locator('input[type="password"]').first().fill('testpass123');
    await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first().click();
    await page.waitForURL(/^(?!.*\/login)/, { timeout: 20000 });
    
    // Get cookies from browser context
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    
    // Make multiple requests to conversation endpoint (should not be rate limited)
    for (let i = 0; i < 5; i++) {
      const response = await request.post('/api/agent/conversation', {
        headers: { 
          'Cookie': cookieHeader,
          'Content-Type': 'application/json'
        },
        data: { projectId: 1 }
      });
      
      // Should NOT get 429 rate limit error
      expect(response.status()).not.toBe(429);
      console.log(`Request ${i + 1}: Status ${response.status()}`);
    }
    
    console.log('✅ Conversation endpoint not rate limited - CONFIRMED');
  });
});
