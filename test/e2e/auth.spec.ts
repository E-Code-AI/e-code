import { test, expect } from '@playwright/test';

test.describe('Authentication Tests', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login');
    
    // Check for login form elements using data-testids
    const emailInput = page.locator('[data-testid="input-email"]');
    const passwordInput = page.locator('[data-testid="input-password"]');
    const submitButton = page.locator('[data-testid="button-login"]');
    
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
    
    // Fill in invalid credentials using data-testids
    const emailInput = page.locator('[data-testid="input-email"]');
    const passwordInput = page.locator('[data-testid="input-password"]');
    const submitButton = page.locator('[data-testid="button-login"]');
    
    await emailInput.fill('nonexistent@example.com');
    await passwordInput.fill('wrongpassword123');
    await submitButton.click();
    
    // Wait for error message (toast notification)
    await page.waitForTimeout(2000);
    
    // Check for toast error or inline error message
    const hasError = await page.locator('[role="alert"], .toast, :text("Invalid"), :text("incorrect")').count() > 0;
    expect(hasError).toBeTruthy();
  });

  test('should toggle between login and register', async ({ page }) => {
    await page.goto('/login');
    
    // Find link to register using data-testid
    const registerLink = page.locator('[data-testid="link-register"]');
    
    await expect(registerLink).toBeVisible();
    await registerLink.click();
    await expect(page).toHaveURL(/register/);
    
    // Find link back to login
    const loginLink = page.locator('a[href="/login"]:has-text("Sign in"), a[href="/login"]:has-text("Already")').first();
    
    if (await loginLink.isVisible()) {
      await loginLink.click();
      await expect(page).toHaveURL(/login/);
    }
  });
});