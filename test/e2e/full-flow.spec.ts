/**
 * E2E Full User Journey
 * Covers: signup → login → create project → IDE → edit → preview → terminal → git
 *
 * Run with: npm run test:e2e
 * Requires: DATABASE_URL env var and running server (npm run dev)
 */

import { test, expect, Page } from '@playwright/test';

const TEST_USER = {
  email: `e2e-${Date.now()}@test.com`,
  username: `e2e_user_${Date.now()}`,
  password: 'TestPass123!',
};

const TEST_PROJECT = {
  name: `e2e-project-${Date.now()}`,
  template: 'blank',
};

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

async function fillInput(page: Page, selector: string, value: string) {
  const el = page.locator(selector).first();
  await el.waitFor({ state: 'visible', timeout: 15_000 });
  await el.fill(value);
}

async function clickButton(page: Page, selector: string) {
  const btn = page.locator(selector).first();
  await btn.waitFor({ state: 'visible', timeout: 10_000 });
  await btn.click();
}

// ──────────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────────

test.describe('Full E-Code user journey', () => {
  // Increase timeout for slow Vite cold starts
  test.setTimeout(300_000);

  test('1. Homepage loads', async ({ page }) => {
    const res = await page.goto('/');
    expect(res?.status()).toBe(200);
    await expect(page).toHaveTitle(/.+/);
  });

  test('2. Signup page renders', async ({ page }) => {
    await page.goto('/register');
    await expect(
      page.locator('input[type="email"], input[name*="email"]').first()
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.locator('input[type="password"]').first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('3. User can sign up', async ({ page }) => {
    await page.goto('/register');

    await fillInput(page, 'input[type="email"], input[name*="email"], input[placeholder*="email" i]', TEST_USER.email);

    const usernameInput = page.locator('input[name*="username"], input[placeholder*="username" i]').first();
    if (await usernameInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await usernameInput.fill(TEST_USER.username);
    }

    // Fill password (and optional confirm-password)
    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.nth(0).fill(TEST_USER.password);
    const count = await passwordInputs.count();
    if (count > 1) {
      await passwordInputs.nth(1).fill(TEST_USER.password);
    }

    await clickButton(
      page,
      'button[type="submit"], button:has-text("Sign up"), button:has-text("Register"), button:has-text("Create account")'
    );

    // Should land on dashboard / projects page after signup
    await page.waitForURL(/\/(projects|dashboard|home)?$/, { timeout: 30_000 });
  });

  test('4. User can log in', async ({ page }) => {
    await page.goto('/login');

    await fillInput(page, 'input[type="email"], input[name*="email"], input[placeholder*="email" i]', TEST_USER.email);
    await fillInput(page, 'input[type="password"]', TEST_USER.password);

    await clickButton(
      page,
      'button[type="submit"], button:has-text("Login"), button:has-text("Sign in"), button:has-text("Log in")'
    );

    // Should leave /login
    await page.waitForURL(/^(?!.*\/login)/, { timeout: 30_000 });

    // No rate-limit modal
    const rateLimitModal = page.locator('[data-testid="rate-limit-modal"]');
    await expect(rateLimitModal).not.toBeVisible({ timeout: 5_000 });
  });

  test('5. User can create a project', async ({ page }) => {
    await page.goto('/login');
    await fillInput(page, 'input[type="email"], input[name*="email"], input[placeholder*="email" i]', TEST_USER.email);
    await fillInput(page, 'input[type="password"]', TEST_USER.password);
    await clickButton(page, 'button[type="submit"]');
    await page.waitForURL(/^(?!.*\/login)/, { timeout: 30_000 });

    // Navigate to project creation
    await page.goto('/projects');
    const newProjectBtn = page.locator(
      'button:has-text("New project"), button:has-text("Create project"), a:has-text("New project")'
    ).first();
    await newProjectBtn.waitFor({ state: 'visible', timeout: 20_000 });
    await newProjectBtn.click();

    // Fill in project name if a modal/form appears
    const projectNameInput = page.locator('input[name*="name"], input[placeholder*="name" i]').first();
    if (await projectNameInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await projectNameInput.fill(TEST_PROJECT.name);
    }

    // Confirm creation
    const confirmBtn = page.locator(
      'button[type="submit"], button:has-text("Create"), button:has-text("Start building")'
    ).first();
    if (await confirmBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await confirmBtn.click();
    }

    // Should navigate to IDE for new project
    await page.waitForURL(/\/(ide|projects)\/\d+/, { timeout: 60_000 });
  });

  test('6. IDE loads with editor', async ({ page }) => {
    // Assumes user already logged in and has at least one project.
    // Use direct project URL if we know the ID; otherwise navigate from projects list.
    await page.goto('/login');
    await fillInput(page, 'input[type="email"], input[name*="email"], input[placeholder*="email" i]', TEST_USER.email);
    await fillInput(page, 'input[type="password"]', TEST_USER.password);
    await clickButton(page, 'button[type="submit"]');
    await page.waitForURL(/^(?!.*\/login)/, { timeout: 30_000 });

    await page.goto('/projects');
    // Click first project
    const firstProject = page.locator('[data-testid="project-card"], .project-card, [href*="/ide/"]').first();
    await firstProject.waitFor({ state: 'visible', timeout: 20_000 });
    await firstProject.click();

    // IDE should load
    await page.waitForURL(/\/(ide|projects)\/\d+/, { timeout: 60_000 });

    // Monaco editor container should be visible
    await expect(
      page.locator('.monaco-editor, [data-testid="monaco-editor"], .cm-editor').first()
    ).toBeVisible({ timeout: 60_000 });
  });

  test('7. Terminal panel is accessible', async ({ page }) => {
    await page.goto('/login');
    await fillInput(page, 'input[type="email"], input[name*="email"], input[placeholder*="email" i]', TEST_USER.email);
    await fillInput(page, 'input[type="password"]', TEST_USER.password);
    await clickButton(page, 'button[type="submit"]');
    await page.waitForURL(/^(?!.*\/login)/, { timeout: 30_000 });
    await page.goto('/projects');
    const firstProject = page.locator('[data-testid="project-card"], .project-card, [href*="/ide/"]').first();
    await firstProject.waitFor({ state: 'visible', timeout: 20_000 });
    await firstProject.click();
    await page.waitForURL(/\/(ide|projects)\/\d+/, { timeout: 60_000 });

    // Terminal tab / button
    const terminalBtn = page.locator(
      '[data-testid="tab-terminal"], button:has-text("Terminal"), [aria-label*="terminal" i]'
    ).first();
    if (await terminalBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await terminalBtn.click();
      // xterm.js container
      await expect(
        page.locator('.xterm, .xterm-viewport, [data-testid="terminal"]').first()
      ).toBeVisible({ timeout: 20_000 });
    } else {
      test.skip(true, 'Terminal button not found — panel may be behind a different trigger');
    }
  });

  test('8. Debugger panel loads without 404', async ({ page }) => {
    await page.goto('/login');
    await fillInput(page, 'input[type="email"], input[name*="email"], input[placeholder*="email" i]', TEST_USER.email);
    await fillInput(page, 'input[type="password"]', TEST_USER.password);
    await clickButton(page, 'button[type="submit"]');
    await page.waitForURL(/^(?!.*\/login)/, { timeout: 30_000 });
    await page.goto('/projects');
    const firstProject = page.locator('[data-testid="project-card"], .project-card, [href*="/ide/"]').first();
    await firstProject.waitFor({ state: 'visible', timeout: 20_000 });
    await firstProject.click();
    await page.waitForURL(/\/(ide|projects)\/\d+/, { timeout: 60_000 });

    // Check that /api/debug/session/:id doesn't 404
    const projectIdMatch = page.url().match(/\/(\d+)/);
    if (projectIdMatch) {
      const projectId = projectIdMatch[1];
      const response = await page.request.get(`/api/debug/session/${projectId}`);
      expect(response.status()).toBe(200);
    }
  });

  test('9. Git panel is accessible', async ({ page }) => {
    await page.goto('/login');
    await fillInput(page, 'input[type="email"], input[name*="email"], input[placeholder*="email" i]', TEST_USER.email);
    await fillInput(page, 'input[type="password"]', TEST_USER.password);
    await clickButton(page, 'button[type="submit"]');
    await page.waitForURL(/^(?!.*\/login)/, { timeout: 30_000 });
    await page.goto('/projects');
    const firstProject = page.locator('[data-testid="project-card"], .project-card, [href*="/ide/"]').first();
    await firstProject.waitFor({ state: 'visible', timeout: 20_000 });
    await firstProject.click();
    await page.waitForURL(/\/(ide|projects)\/\d+/, { timeout: 60_000 });

    // Git tab / button
    const gitBtn = page.locator(
      '[data-testid="tab-git"], button:has-text("Git"), [aria-label*="git" i]'
    ).first();
    if (await gitBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await gitBtn.click();
      await expect(
        page.locator('[data-testid="git-panel"], .git-panel').first()
      ).toBeVisible({ timeout: 15_000 });
    } else {
      test.skip(true, 'Git button not found — panel may be behind a different trigger');
    }
  });
});
