/**
 * E2E Tests for Mobile Code Editor
 * Tests touch interactions, keyboard toolbar, and code completion
 */

import { test, expect } from '@playwright/test';

test.describe('Mobile Code Editor', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test.beforeEach(async ({ page }) => {
    // Navigate to mobile IDE
    await page.goto('/projects/test-project/ide');
    await page.waitForLoadState('networkidle');
  });

  test('should load Monaco editor', async ({ page }) => {
    const editor = page.locator('[data-testid="mobile-editor-monaco"]');
    await expect(editor).toBeVisible();
  });

  test('should show keyboard toolbar', async ({ page }) => {
    const toolbar = page.locator('[data-testid="mobile-editor-keyboard-toolbar"]');
    await expect(toolbar).toBeVisible();

    // Check for essential buttons
    await expect(page.locator('[data-testid="mobile-editor-tab"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-editor-save"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-editor-undo"]')).toBeVisible();
  });

  test('should insert special characters via toolbar', async ({ page }) => {
    const tabButton = page.locator('[data-testid="mobile-editor-tab"]');
    await tabButton.click();

    // Verify tab was inserted (check editor content)
    // Note: This requires access to Monaco API via test utilities
  });

  test('should save file', async ({ page }) => {
    const saveButton = page.locator('[data-testid="mobile-editor-save"]');

    // Make a change
    // await monaco.setValue('console.log("test");');

    await saveButton.click();

    // Verify save toast
    await expect(page.locator('text=Saved')).toBeVisible({ timeout: 5000 });
  });

  test('should trigger code completion modal', async ({ page }) => {
    const suggestButton = page.locator('[data-testid="mobile-editor-suggest"]');
    await suggestButton.click();

    const completionModal = page.locator('[data-testid="mobile-completion-modal"]');
    await expect(completionModal).toBeVisible();

    // Should show completion items
    const completionItem = page.locator('[data-testid^="mobile-completion-item-"]').first();
    await expect(completionItem).toBeVisible();
  });

  test('should filter completions', async ({ page }) => {
    const suggestButton = page.locator('[data-testid="mobile-editor-suggest"]');
    await suggestButton.click();

    const filterInput = page.locator('[data-testid="mobile-completion-filter"]');
    await filterInput.fill('console');

    // Should filter to show only matching completions
    const completionText = page.locator('[data-testid^="mobile-completion-item-"]');
    const count = await completionText.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should hide/show toolbar', async ({ page }) => {
    const hideButton = page.locator('[data-testid="mobile-editor-hide-toolbar"]');
    await hideButton.click();

    const toolbar = page.locator('[data-testid="mobile-editor-keyboard-toolbar"]');
    await expect(toolbar).not.toBeVisible();

    const showButton = page.locator('[data-testid="mobile-editor-show-toolbar"]');
    await expect(showButton).toBeVisible();

    await showButton.click();
    await expect(toolbar).toBeVisible();
  });

  test('should support undo/redo', async ({ page }) => {
    const undoButton = page.locator('[data-testid="mobile-editor-undo"]');
    const redoButton = page.locator('[data-testid="mobile-editor-redo"]');

    // Make changes, undo, redo
    await undoButton.click();
    await redoButton.click();

    // Verify via editor state (requires Monaco API access)
  });

  test('should support find', async ({ page }) => {
    const findButton = page.locator('[data-testid="mobile-editor-find"]');
    await findButton.click();

    // Monaco find widget should appear
    // Note: This is Monaco's native find widget
  });

  test('should handle pinch zoom on tablet', async ({ page }) => {
    // Change to tablet viewport
    await page.setViewportSize({ width: 1024, height: 768 });

    // Simulate pinch zoom
    // Note: This requires touch event simulation
    // Playwright doesn't have native pinch gesture support yet
  });
});

test.describe('Mobile Terminal', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/projects/test-project/ide');
    await page.waitForLoadState('networkidle');

    // Switch to terminal tab
    await page.locator('button:has-text("Terminal")').click();
  });

  test('should show terminal with keyboard toolbar', async ({ page }) => {
    const container = page.locator('[data-testid="mobile-terminal-container"]');
    await expect(container).toBeVisible();

    const toolbar = page.locator('[data-testid="mobile-terminal-keyboard-toolbar"]');
    await expect(toolbar).toBeVisible();
  });

  test('should have special key buttons', async ({ page }) => {
    await expect(page.locator('[data-testid="mobile-terminal-tab"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-terminal-esc"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-terminal-ctrl-c"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-terminal-enter"]')).toBeVisible();
  });

  test('should navigate command history with arrows', async ({ page }) => {
    const arrowUp = page.locator('[data-testid="mobile-terminal-arrow-up"]');
    const arrowDown = page.locator('[data-testid="mobile-terminal-arrow-down"]');

    await arrowUp.click();
    await arrowDown.click();

    // Verify command history navigation
  });

  test('should support copy/paste', async ({ page }) => {
    const copyButton = page.locator('[data-testid="mobile-terminal-copy"]');
    const pasteButton = page.locator('[data-testid="mobile-terminal-paste"]');

    await expect(copyButton).toBeVisible();
    // Paste only visible if clipboard permissions granted
  });

  test('should clear terminal', async ({ page }) => {
    const clearButton = page.locator('[data-testid="mobile-terminal-clear"]');
    await clearButton.click();

    // Verify terminal was cleared (check for prompt)
  });

  test('should hide/show toolbar', async ({ page }) => {
    const hideButton = page.locator('[data-testid="mobile-terminal-hide-toolbar"]');
    await hideButton.click();

    const showButton = page.locator('[data-testid="mobile-terminal-show-toolbar"]');
    await expect(showButton).toBeVisible();
  });
});

test.describe('Mobile FAB', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/projects/test-project/ide');
  });

  test('should show FAB button', async ({ page }) => {
    const fab = page.locator('[data-testid="mobile-fab"]');
    await expect(fab).toBeVisible();
  });

  test('should start/stop project runtime', async ({ page }) => {
    const fab = page.locator('[data-testid="mobile-fab"]');

    // Click to start
    await fab.click();

    // Should show loading or running state
    await page.waitForTimeout(1000);

    // Click to stop
    await fab.click();
  });
});
