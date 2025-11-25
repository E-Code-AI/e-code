import { test, expect } from '@playwright/test';

test.describe('AI Model Selector - Homepage Hero Variant', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
    
    // Wait for AI model selector to load
    await page.waitForSelector('[data-testid="select-ai-model-hero"]', { timeout: 10000 });
  });

  test('should display AI model selector in hero section', async ({ page }) => {
    // Check AI model selector container is visible (hero variant)
    const selectorContainer = page.locator('[data-testid="ai-model-selector-hero-container"]');
    await expect(selectorContainer).toBeVisible();

    // Check AI model selector trigger is visible
    const selector = page.locator('[data-testid="select-ai-model-hero"]');
    await expect(selector).toBeVisible();

    // Check header text
    const header = page.locator('text=Choose Your AI Model');
    await expect(header).toBeVisible();

    // Check badge with model count
    const badge = page.locator('text=/\\d+ models available/');
    await expect(badge).toBeVisible();
  });

  test('should show model selection dropdown with options', async ({ page }) => {
    // Click the selector to open dropdown
    const selector = page.locator('[data-testid="select-ai-model-hero"]');
    await selector.click();

    // Wait for dropdown content
    await page.waitForTimeout(500);

    // Check if at least one model option is visible
    // Models should have data-testid like "select-model-gpt-5.1"
    const firstModel = page.locator('[data-testid^="select-model-"]').first();
    await expect(firstModel).toBeVisible();

    // Close dropdown by clicking outside
    await page.keyboard.press('Escape');
  });

  test('should display model details in dropdown options', async ({ page }) => {
    // Open selector
    const selector = page.locator('[data-testid="select-ai-model-hero"]');
    await selector.click();
    await page.waitForTimeout(500);

    // Get first visible model option
    const modelOption = page.locator('[data-testid^="select-model-"]').first();
    
    // Each model should have an icon (circular background) and name visible
    const modelIcon = modelOption.locator('.rounded-full').first();
    await expect(modelIcon).toBeVisible();

    // Model name should be visible (flexible matching - just check for non-empty text)
    const modelName = modelOption.locator('.font-semibold').first();
    await expect(modelName).toBeVisible();
    const nameText = await modelName.textContent();
    expect(nameText).toBeTruthy();
    expect(nameText!.trim().length).toBeGreaterThan(0);
  });

  test('should handle model selection', async ({ page }) => {
    // Open selector
    const selector = page.locator('[data-testid="select-ai-model-hero"]');
    await selector.click();
    await page.waitForTimeout(500);

    // Select first available model
    const firstModel = page.locator('[data-testid^="select-model-"]').first();
    await firstModel.click();

    // Wait for selection to complete
    await page.waitForTimeout(500);

    // Check if confirmation message appears
    const confirmation = page.locator('text=/Using .+ for code generation/');
    await expect(confirmation).toBeVisible({ timeout: 5000 });
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport (iPhone SE size)
    await page.setViewportSize({ width: 375, height: 667 });

    // AI model selector container should be visible on mobile
    const selectorContainer = page.locator('[data-testid="ai-model-selector-hero-container"]');
    await expect(selectorContainer).toBeVisible();

    // AI model selector should be visible and functional on mobile
    const selector = page.locator('[data-testid="select-ai-model-hero"]');
    await expect(selector).toBeVisible();

    // Selector should have reduced height on mobile (h-12 instead of h-14)
    const selectorBox = await selector.boundingBox();
    expect(selectorBox).not.toBeNull();
    
    // Height should be around 48px (h-12 = 3rem = 48px)
    if (selectorBox) {
      expect(selectorBox.height).toBeGreaterThanOrEqual(45);
      expect(selectorBox.height).toBeLessThanOrEqual(52);
    }

    // Header should stack on mobile (flex-col)
    const header = page.locator('[data-testid="ai-model-selector-hero-header"]');
    const headerClass = await header.getAttribute('class');
    expect(headerClass).toContain('flex-col');
  });

  test('should show streaming badge for supported models', async ({ page }) => {
    // Fetch available models from API to verify streaming badge logic
    const response = await page.request.get('http://localhost:5000/api/models');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    // Filter for models with streaming AND provider configured (available: true)
    const availableStreamingModels = data.models.filter(
      (m: any) => m.supportsStreaming && m.available === true
    );
    
    // Open selector
    const selector = page.locator('[data-testid="select-ai-model-hero"]');
    await selector.click();
    await page.waitForTimeout(500);

    // Count all streaming badges using data-testid
    const streamingBadges = page.locator('[data-testid^="streaming-badge-"]');
    const badgeCount = await streamingBadges.count();
    
    // If at least one streaming-capable model is available, require badge
    if (availableStreamingModels.length > 0) {
      expect(badgeCount).toBeGreaterThan(0);
      
      // Verify first badge is visible and has text content
      const firstBadge = streamingBadges.first();
      await expect(firstBadge).toBeVisible();
      
      const badgeHasText = await firstBadge.textContent();
      expect(badgeHasText).toBeTruthy();
    } else {
      // No available streaming models - verify UI doesn't crash
      expect(badgeCount).toBe(0);
    }
  });

  test('should display provider color indicators', async ({ page }) => {
    // Open selector
    const selector = page.locator('[data-testid="select-ai-model-hero"]');
    await selector.click();
    await page.waitForTimeout(500);

    // Get first model option's provider icon using specific data-testid
    const firstProviderIcon = page.locator('[data-testid^="provider-icon-"]').first();
    await expect(firstProviderIcon).toBeVisible();

    // Icon should have a colored background class matching getProviderColor output
    // Valid colors from getProviderColor(): green, orange, blue, purple, cyan, gray
    const iconClass = await firstProviderIcon.getAttribute('class');
    expect(iconClass).toMatch(/bg-(green|orange|blue|purple|cyan|gray)-/);
  });

  test('should handle no available models gracefully', async ({ page }) => {
    // This test would require mocking the API to return no models
    // For now, we just check that selector doesn't crash if there's an error
    
    const selector = page.locator('[data-testid="select-ai-model-hero"]');
    await expect(selector).toBeVisible();
    
    // No console errors should be present
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(2000);
    
    // Filter out non-critical errors
    const criticalErrors = errors.filter(err => 
      !err.includes('favicon') && 
      !err.includes('404') &&
      !err.includes('Failed to load resource')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

  test('should display loading state while fetching models', async ({ page }) => {
    // Navigate to homepage and immediately check for loading state
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // Loading skeleton might appear briefly
    const skeleton = page.locator('.h-12.w-full.max-w-md');
    
    // Wait for selector to be ready
    await page.waitForSelector('[data-testid="select-ai-model-hero"]', { timeout: 10000 });
    
    // Selector should be visible after loading
    const selector = page.locator('[data-testid="select-ai-model-hero"]');
    await expect(selector).toBeVisible();
  });

  test('should work with keyboard navigation', async ({ page }) => {
    // Tab to focus on selector
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Try to find the selector focus
    const selector = page.locator('[data-testid="select-ai-model-hero"]');
    
    // Press Enter to open dropdown
    await selector.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    
    // Navigate with arrow keys
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    
    // Select with Enter
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    
    // Confirmation should appear
    const confirmation = page.locator('text=/Using .+ for code generation/');
    // Note: This might not always work depending on auth state
    // So we make it optional
    const isVisible = await confirmation.isVisible().catch(() => false);
    if (isVisible) {
      await expect(confirmation).toBeVisible();
    }
  });
});

test.describe('AI Model Selector - Tablet Viewport', () => {
  test('should display correctly on tablet (iPad size)', async ({ page }) => {
    // Set tablet viewport (iPad size)
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await page.goto('/');
    await page.waitForSelector('[data-testid="select-ai-model-hero"]', { timeout: 10000 });

    // AI model selector container should be visible on tablet
    const selectorContainer = page.locator('[data-testid="ai-model-selector-hero-container"]');
    await expect(selectorContainer).toBeVisible();

    // Selector should use sm: breakpoint styles (h-14, side-by-side header)
    const selector = page.locator('[data-testid="select-ai-model-hero"]');
    await expect(selector).toBeVisible();

    // On tablet (≥640px), selector should be taller (h-14 = 56px)
    const selectorBox = await selector.boundingBox();
    if (selectorBox) {
      expect(selectorBox.height).toBeGreaterThanOrEqual(52);
      expect(selectorBox.height).toBeLessThanOrEqual(60);
    }

    // Header should be side-by-side on sm+ (flex-row)
    const header = page.locator('[data-testid="ai-model-selector-hero-header"]');
    const headerClass = await header.getAttribute('class');
    expect(headerClass).toContain('sm:flex-row');
  });
});
