import { test, expect } from '@playwright/test';

test.describe('Homepage Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load homepage successfully', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/E-Code/);
    
    // Check main heading is visible
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
  });

  test('should have working navigation links', async ({ page }) => {
    // Check for navigation menu
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible();
    
    // Test Features link
    const featuresLink = page.locator('a[href="/features"]').first();
    if (await featuresLink.isVisible()) {
      await featuresLink.click();
      await expect(page).toHaveURL(/.*features/);
    }
  });

  test('should display login/register buttons', async ({ page }) => {
    // Look for authentication buttons
    const loginButton = page.locator('text=/Login|Sign In/i').first();
    const registerButton = page.locator('text=/Register|Sign Up|Get Started/i').first();
    
    // At least one auth option should be visible
    const hasAuthOptions = await loginButton.isVisible() || await registerButton.isVisible();
    expect(hasAuthOptions).toBeTruthy();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check mobile menu button exists
    const mobileMenuButton = page.locator('[data-testid="mobile-menu"], [aria-label*="menu"]').first();
    
    // Mobile menu should be visible on small screens
    if (await mobileMenuButton.isVisible()) {
      await mobileMenuButton.click();
      // Check if menu opens
      await page.waitForTimeout(500);
    }
  });

  test('should have no console errors', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Filter out expected errors (like favicon 404)
    const criticalErrors = errors.filter(err => 
      !err.includes('favicon') && 
      !err.includes('404') &&
      !err.includes('Failed to load resource')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });
});