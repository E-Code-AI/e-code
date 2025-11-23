/**
 * Playwright End-to-End Test Configuration
 * Tests all platforms: web, mobile, tablet, desktop
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'test-results/html' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // Desktop Browsers
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox-desktop',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit-desktop',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile Browsers
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
    },

    // Tablets
    {
      name: 'ipad-pro',
      use: {
        ...devices['iPad Pro'],
        viewport: { width: 1024, height: 1366 },
      },
    },
    {
      name: 'ipad',
      use: { ...devices['iPad (gen 7)'] },
    },
    {
      name: 'tablet-landscape',
      use: {
        viewport: { width: 1024, height: 768 },
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
      },
    },

    // Edge cases
    {
      name: 'small-mobile',
      use: {
        viewport: { width: 375, height: 667 }, // iPhone SE
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)',
      },
    },
    {
      name: 'large-desktop',
      use: {
        viewport: { width: 2560, height: 1440 },
      },
    },
  ],

  webServer: {
    command: process.env.CI ? 'npm run preview' : 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
