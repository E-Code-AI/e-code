/**
 * Playwright End-to-End Test Configuration
 * Tests all platforms: web, mobile, tablet, desktop
 * 
 * URL Resolution Priority:
 * 1. BASE_URL env var (explicit override)
 * 2. REPLIT_DEV_URL env var (Replit dev URL with :5000 auto-appended)
 * 3. APP_URL env var (production URL)
 * 4. localhost:5000 fallback
 */

import { defineConfig, devices } from '@playwright/test';

function getBaseURL(): string {
  if (process.env.BASE_URL) return process.env.BASE_URL;
  
  const replitDevUrl = process.env.REPLIT_DEV_URL;
  if (replitDevUrl) {
    return replitDevUrl.includes(':') ? replitDevUrl : `${replitDevUrl}:5000`;
  }
  
  if (process.env.APP_URL) return process.env.APP_URL;
  
  return 'http://localhost:5000';
}

export default defineConfig({
  globalSetup: require.resolve('./setup/global-setup'),
  testDir: './specs',
  fullyParallel: false, // Désactiver pour réduire la charge
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1, // Retry même en local
  workers: 1, // Un seul worker pour éviter la surcharge
  timeout: 60000, // 60s par test
  expect: {
    timeout: 10000, // 10s pour les assertions
  },
  reporter: [
    ['html', { outputFolder: 'test-results/html' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  use: {
    baseURL: getBaseURL(),
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    navigationTimeout: 30000, // 30s pour la navigation
    actionTimeout: 15000, // 15s pour les actions
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
    timeout: 180000, // 3 minutes pour démarrage
    stdout: 'pipe',
    stderr: 'pipe',
    // Attendre que le serveur soit vraiment prêt
    reuseExistingServer: true, // Réutiliser le serveur existant
  },
});
