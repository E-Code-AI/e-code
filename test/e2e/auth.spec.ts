import { test, expect } from '@playwright/test';

test.describe('Authentication Tests', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login');
    
    // Check for login form elements
    const emailInput = page.locator('input[type="email"], input[name="email"], input[name="username"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")').first();
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    await page.goto('/login');
    
    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")').first();
    await submitButton.click();
    
    // Wait for potential error messages
    await page.waitForTimeout(1000);
    
    // Check for error messages or required field indicators
    const errors = page.locator('.error, .text-red-500, [role="alert"]');
    const hasErrors = await errors.count() > 0;
    const hasRequiredFields = await page.locator(':required').count() > 0;
    
    expect(hasErrors || hasRequiredFields).toBeTruthy();
  });

  test('should display register page', async ({ page }) => {
    await page.goto('/register');
    
    // Check for registration form elements
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const usernameInput = page.locator('input[name="username"], input[name="displayName"]').first();
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    // Username might be optional on some forms
    if (await usernameInput.isVisible()) {
      await expect(usernameInput).toBeVisible();
    }
  });

  test('should handle login with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill in invalid credentials
    const emailInput = page.locator('input[type="email"], input[name="email"], input[name="username"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")').first();
    
    await emailInput.fill('nonexistent@example.com');
    await passwordInput.fill('wrongpassword123');
    await submitButton.click();
    
    // Wait for error message
    const errorMessage = await page.waitForSelector(
      '.error, .text-red-500, [role="alert"], :text("Invalid"), :text("incorrect")',
      { timeout: 5000 }
    ).catch(() => null);
    
    // Should show some kind of error
    expect(errorMessage).toBeTruthy();
  });

  test('should toggle between login and register', async ({ page }) => {
    await page.goto('/login');
    
    // Find link to register
    const registerLink = page.locator('a[href="/register"], :text("Sign up"), :text("Register"), :text("Create account")').first();
    
    if (await registerLink.isVisible()) {
      await registerLink.click();
      await expect(page).toHaveURL(/register|signup/);
      
      // Find link back to login
      const loginLink = page.locator('a[href="/login"], :text("Sign in"), :text("Login"), :text("Already have an account")').first();
      
      if (await loginLink.isVisible()) {
        await loginLink.click();
        await expect(page).toHaveURL(/login|signin/);
      }
    }
  });
});