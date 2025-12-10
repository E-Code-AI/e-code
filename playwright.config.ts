import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 * 
 * URL Resolution Priority:
 * 1. BASE_URL env var (explicit override)
 * 2. REPLIT_DEV_URL env var (Replit dev URL with :5000 auto-appended)
 * 3. APP_URL env var (production URL)
 * 4. localhost:5000 fallback
 */
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
  testDir: './test/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['list'],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],
  
  use: {
    baseURL: getBaseURL(),
    trace: process.env.TRACE || 'on-first-retry',
    screenshot: process.env.SCREENSHOT || 'only-on-failure',
    video: process.env.VIDEO || 'retain-on-failure',
    actionTimeout: parseInt(process.env.ACTION_TIMEOUT || '15000'),
    navigationTimeout: parseInt(process.env.NAV_TIMEOUT || '30000'),
    storageState: process.env.STORAGE_STATE,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  expect: {
    timeout: parseInt(process.env.EXPECT_TIMEOUT || '10000'),
  },
});
