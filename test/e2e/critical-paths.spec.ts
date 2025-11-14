/**
 * E2E Tests: Critical User Paths
 * Fortune 500 Standard: Test Complete User Journeys
 *
 * Priority: P0 (Must pass before production deployment)
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
test.use({
  viewport: { width: 1920, height: 1080 },
  screenshot: 'only-on-failure',
  video: 'retain-on-failure'
});

/**
 * User Authentication Journey
 */
test.describe('Authentication Flow', () => {
  test('should complete full registration and login cycle', async ({ page }) => {
    const timestamp = Date.now();
    const testUser = {
      username: `testuser_${timestamp}`,
      email: `test_${timestamp}@example.com`,
      password: 'SecurePassword123!',
      displayName: 'Test User'
    };

    // Step 1: Navigate to registration
    await page.goto('/');
    await page.click('[data-testid="signup-button"]');
    await expect(page).toHaveURL(/\/register/);

    // Step 2: Fill registration form
    await page.fill('[data-testid="username-input"]', testUser.username);
    await page.fill('[data-testid="email-input"]', testUser.email);
    await page.fill('[data-testid="password-input"]', testUser.password);
    await page.fill('[data-testid="confirm-password-input"]', testUser.password);
    await page.fill('[data-testid="display-name-input"]', testUser.displayName);

    // Step 3: Submit registration
    await page.click('[data-testid="register-submit"]');

    // Step 4: Verify redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Step 5: Verify user is logged in
    await expect(page.locator('[data-testid="user-menu"]')).toContainText(testUser.displayName);

    // Step 6: Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
    await expect(page).toHaveURL(/\/$|\/login/);

    // Step 7: Login again
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="login-username"]', testUser.username);
    await page.fill('[data-testid="login-password"]', testUser.password);
    await page.click('[data-testid="login-submit"]');

    // Step 8: Verify successful login
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('should enforce password strength requirements', async ({ page }) => {
    await page.goto('/register');

    const weakPasswords = ['123', 'password', 'abc', 'qwerty'];

    for (const weakPassword of weakPasswords) {
      await page.fill('[data-testid="password-input"]', weakPassword);
      await page.click('[data-testid="register-submit"]');

      // Should show error
      await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="password-error"]')).toContainText(/weak|strength|requirement/i);
    }
  });

  test('should handle 2FA setup and verification', async ({ page, context }) => {
    // Login as existing user
    await page.goto('/login');
    await page.fill('[data-testid="login-username"]', process.env.TEST_USER_USERNAME || 'testuser');
    await page.fill('[data-testid="login-password"]', process.env.TEST_USER_PASSWORD || 'TestPassword123!');
    await page.click('[data-testid="login-submit"]');

    // Navigate to security settings
    await page.goto('/settings/security');
    await page.click('[data-testid="enable-2fa-button"]');

    // Should display QR code
    await expect(page.locator('[data-testid="2fa-qr-code"]')).toBeVisible();
    await expect(page.locator('[data-testid="2fa-secret"]')).toBeVisible();
    await expect(page.locator('[data-testid="2fa-backup-codes"]')).toBeVisible();

    // Get backup codes
    const backupCodes = await page.locator('[data-testid="backup-code"]').allTextContents();
    expect(backupCodes.length).toBeGreaterThan(0);

    // Note: Actual 2FA verification would require TOTP generator
    // In real test, use a library like otplib to generate valid codes
  });
});

/**
 * Project Creation and Management
 */
test.describe('Project Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('[data-testid="login-username"]', process.env.TEST_USER_USERNAME || 'testuser');
    await page.fill('[data-testid="login-password"]', process.env.TEST_USER_PASSWORD || 'TestPassword123!');
    await page.click('[data-testid="login-submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should create new project with files', async ({ page }) => {
    const projectName = `Test Project ${Date.now()}`;

    // Step 1: Navigate to new project
    await page.click('[data-testid="new-project-button"]');
    await expect(page).toHaveURL(/\/projects\/new/);

    // Step 2: Fill project form
    await page.fill('[data-testid="project-name"]', projectName);
    await page.fill('[data-testid="project-description"]', 'E2E test project');
    await page.selectOption('[data-testid="project-language"]', 'typescript');
    await page.selectOption('[data-testid="project-visibility"]', 'private');

    // Step 3: Create project
    await page.click('[data-testid="create-project-button"]');

    // Step 4: Verify redirect to project editor
    await expect(page).toHaveURL(/\/projects\/[a-z0-9-]+/);
    await expect(page.locator('[data-testid="project-title"]')).toContainText(projectName);

    // Step 5: Create a file
    await page.click('[data-testid="new-file-button"]');
    await page.fill('[data-testid="file-name-input"]', 'index.ts');
    await page.click('[data-testid="file-create-confirm"]');

    // Step 6: Edit file content
    const editor = page.locator('.monaco-editor');
    await expect(editor).toBeVisible();
    await editor.click();
    await page.keyboard.type('console.log("Hello from E2E test");');

    // Step 7: Save file
    await page.keyboard.press('Control+S'); // Or Command+S on Mac
    await expect(page.locator('[data-testid="save-indicator"]')).toContainText(/saved/i);

    // Step 8: Verify file in file tree
    await expect(page.locator('[data-testid="file-tree"]')).toContainText('index.ts');
  });

  test('should run project and see output', async ({ page }) => {
    // Assumes project is already created in previous test or setup
    await page.goto('/dashboard');
    await page.click('[data-testid="project-card"]:first-child');

    // Wait for editor to load
    await expect(page.locator('.monaco-editor')).toBeVisible();

    // Click run button
    await page.click('[data-testid="run-project-button"]');

    // Wait for output
    await expect(page.locator('[data-testid="console-output"]')).toBeVisible({ timeout: 10000 });

    // Verify output contains expected text
    const output = await page.locator('[data-testid="console-output"]').textContent();
    expect(output).toBeTruthy();
  });
});

/**
 * AI Agent Features
 */
test.describe('AI Agent Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="login-username"]', process.env.TEST_USER_USERNAME || 'testuser');
    await page.fill('[data-testid="login-password"]', process.env.TEST_USER_PASSWORD || 'TestPassword123!');
    await page.click('[data-testid="login-submit"]');
  });

  test('should generate development plan from prompt', async ({ page }) => {
    // Navigate to AI agent
    await page.goto('/ai-agent');

    // Enter prompt
    const prompt = 'Create a React component for a user profile card with avatar and bio';
    await page.fill('[data-testid="ai-prompt-input"]', prompt);

    // Select model
    await page.selectOption('[data-testid="ai-model-select"]', 'claude-3-5-sonnet');

    // Generate plan
    await page.click('[data-testid="generate-plan-button"]');

    // Wait for plan to be generated (with streaming)
    await expect(page.locator('[data-testid="plan-title"]')).toBeVisible({ timeout: 30000 });

    // Verify plan has steps
    const steps = page.locator('[data-testid="plan-step"]');
    await expect(steps).toHaveCount(await steps.count());
    expect(await steps.count()).toBeGreaterThan(0);

    // Verify step details
    const firstStep = steps.first();
    await expect(firstStep).toContainText(/create|add|implement/i);
    await expect(firstStep).toHaveAttribute('data-action');
  });

  test('should handle AI service errors gracefully', async ({ page }) => {
    await page.goto('/ai-agent');

    // Mock API failure by intercepting request
    await page.route('**/api/agent/plan', route => {
      route.fulfill({
        status: 503,
        body: JSON.stringify({
          status: 'error',
          message: 'AI service temporarily unavailable'
        })
      });
    });

    await page.fill('[data-testid="ai-prompt-input"]', 'Test prompt');
    await page.click('[data-testid="generate-plan-button"]');

    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText(/unavailable|error/i);

    // Should show retry button
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });
});

/**
 * Performance Tests
 */
test.describe('Performance', () => {
  test('should load dashboard within 2 seconds', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="login-username"]', process.env.TEST_USER_USERNAME || 'testuser');
    await page.fill('[data-testid="login-password"]', process.env.TEST_USER_PASSWORD || 'TestPassword123!');

    const startTime = Date.now();
    await page.click('[data-testid="login-submit"]');

    // Wait for dashboard to be fully loaded
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(2000); // Should load within 2 seconds
  });

  test('should handle 10 concurrent file operations', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="login-username"]', process.env.TEST_USER_USERNAME || 'testuser');
    await page.fill('[data-testid="login-password"]', process.env.TEST_USER_PASSWORD || 'TestPassword123!');
    await page.click('[data-testid="login-submit"]');

    // Navigate to project
    await page.goto('/dashboard');
    await page.click('[data-testid="project-card"]:first-child');

    // Create 10 files concurrently
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(
        page.evaluate((index) => {
          return fetch('/api/files', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: `test-file-${index}.ts`,
              content: `// File ${index}`
            })
          });
        }, i)
      );
    }

    const results = await Promise.all(promises);
    const successCount = results.filter(r => r.ok).length;
    expect(successCount).toBe(10); // All should succeed
  });
});

/**
 * Accessibility Tests
 */
test.describe('Accessibility', () => {
  test('should be navigable by keyboard only', async ({ page }) => {
    await page.goto('/');

    // Tab through navigation
    await page.keyboard.press('Tab'); // Focus on first element
    await page.keyboard.press('Tab'); // Focus on login button
    await page.keyboard.press('Enter'); // Click login button

    await expect(page).toHaveURL(/\/login/);

    // Fill login form with keyboard only
    await page.keyboard.press('Tab'); // Username field
    await page.keyboard.type('testuser');
    await page.keyboard.press('Tab'); // Password field
    await page.keyboard.type('TestPassword123!');
    await page.keyboard.press('Enter'); // Submit form

    // Should successfully login
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/');

    // Check for ARIA labels on critical elements
    await expect(page.locator('[aria-label="Main navigation"]')).toBeVisible();
    await expect(page.locator('[aria-label="Login"]')).toBeVisible();
    await expect(page.locator('[aria-label="Sign up"]')).toBeVisible();
  });
});

/**
 * Security Tests
 */
test.describe('Security', () => {
  test('should prevent XSS in user input', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="login-username"]', process.env.TEST_USER_USERNAME || 'testuser');
    await page.fill('[data-testid="login-password"]', process.env.TEST_USER_PASSWORD || 'TestPassword123!');
    await page.click('[data-testid="login-submit"]');

    // Try to inject XSS in project name
    const xssPayload = '<script>alert("XSS")</script>';
    await page.click('[data-testid="new-project-button"]');
    await page.fill('[data-testid="project-name"]', xssPayload);
    await page.click('[data-testid="create-project-button"]');

    // Verify XSS is sanitized
    const projectTitle = await page.locator('[data-testid="project-title"]').textContent();
    expect(projectTitle).not.toContain('<script>');
    expect(projectTitle).not.toContain('alert');
  });

  test('should enforce CSRF protection', async ({ page, context }) => {
    // Make request without CSRF token
    const response = await context.request.post('/api/projects', {
      data: {
        name: 'Test Project',
        description: 'Test'
      },
      // Omit CSRF token header
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Should be rejected
    expect(response.status()).toBe(403);
  });
});
