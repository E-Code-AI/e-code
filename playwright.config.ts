import { defineConfig, devices } from '@playwright/test';

/**
 * Fortune 500-Grade Playwright E2E Test Configuration
 *
 * Optimized for enterprise-grade reliability with:
 * - Extended timeouts for complex application flows
 * - Robust retry strategies for flaky network conditions
 * - Comprehensive tracing and debugging capabilities
 * - Multi-browser and device coverage
 *
 * Timeout Tiers (Fortune 500 Standard):
 * - Critical: 120s (page loads, complex operations)
 * - Standard: 60s (navigation, form submissions)
 * - Fast: 30s (element interactions, assertions)
 *
 * URL Resolution Priority:
 * 1. BASE_URL env var (explicit override, highest priority)
 * 2. localhost:5000 (default — API-level tests must hit the local server
 *    directly; REPLIT_DEV_URL routes through the Replit proxy which does
 *    not forward all HTTP methods / upgrade headers reliably)
 * 3. APP_URL env var (production URL, when BASE_URL is set to APP_URL)
 */
function getBaseURL(): string {
  if (process.env.BASE_URL) return process.env.BASE_URL;
  return 'http://localhost:5000';
}

// Fortune 500-Grade timeout configuration
const TIMEOUT_TIERS = {
  // Critical operations: page loads, complex workflows, Vite cold starts
  CRITICAL: 120_000,      // 2 minutes
  // Standard operations: navigation, form submissions
  STANDARD: 60_000,       // 1 minute
  // Fast operations: element interactions, assertions
  FAST: 30_000,           // 30 seconds
  // Server startup: accounts for npm install + Vite bundling
  SERVER_STARTUP: 180_000, // 3 minutes
  // Global test timeout: max time per test
  TEST_GLOBAL: 300_000,   // 5 minutes
} as const;

const stableWorkers = process.env.PW_WORKERS
  ? parseInt(process.env.PW_WORKERS, 10)
  : (process.env.CI || process.env.E2E_STABILITY === '1' ? 1 : undefined);

export default defineConfig({
  testDir: './test/e2e',
  
  // Fortune 500-Grade: Global test timeout (5 minutes per test)
  timeout: parseInt(process.env.TEST_TIMEOUT || String(TIMEOUT_TIERS.TEST_GLOBAL)),
  
  // Parallel execution for faster CI runs
  fullyParallel: true,
  
  // Prevent .only() from being committed to CI
  forbidOnly: !!process.env.CI,
  
  // Fortune 500-Grade: Robust retry strategy
  // - CI: 3 retries for transient failures
  // - Local: 1 retry for quick feedback
  retries: process.env.CI ? 3 : 1,
  
  // Worker configuration
  // - CI: Single worker for stability
  // - Local: Auto-detect based on CPU cores
  workers: stableWorkers,
  
  // Comprehensive reporting for debugging
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    // Add JSON reporter for programmatic analysis
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  
  use: {
    baseURL: getBaseURL(),
    
    // Fortune 500-Grade: Trace always for debugging production issues
    trace: process.env.TRACE || 'retain-on-failure',
    
    // Capture screenshots on every failure
    screenshot: process.env.SCREENSHOT || 'only-on-failure',
    
    // Retain video for failed tests
    video: process.env.VIDEO || 'retain-on-failure',
    
    // Fortune 500-Grade: Extended action timeout (30s for complex UI)
    actionTimeout: parseInt(process.env.ACTION_TIMEOUT || String(TIMEOUT_TIERS.FAST)),
    
    // Fortune 500-Grade: Extended navigation timeout (60s for cold starts)
    navigationTimeout: parseInt(process.env.NAV_TIMEOUT || String(TIMEOUT_TIERS.STANDARD)),
    
    // Persist authentication state across tests
    storageState: process.env.STORAGE_STATE,
    
    // Fortune 500-Grade: Viewport for consistent rendering
    viewport: { width: 1280, height: 720 },
    
    // Accept downloads for file export tests
    acceptDownloads: true,
    
    // Ignore HTTPS errors in development
    ignoreHTTPSErrors: true,
    
    // Locale and timezone for consistent date handling
    locale: 'en-US',
    timezoneId: 'America/New_York',
  },

  // Multi-browser testing for Fortune 500 coverage
  projects: [
    // Primary: Chrome (most common enterprise browser)
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Fortune 500-Grade: Slow motion for debugging complex flows
        launchOptions: {
          slowMo: process.env.SLOWMO ? parseInt(process.env.SLOWMO) : 0,
          ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
            ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
            : {}),
        },
      },
    },
    // Mobile: iPhone (responsive testing)
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        launchOptions: {
          ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
            ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
            : {}),
        },
      },
    },
    // Tablet: iPad (enterprise dashboard testing)
    {
      name: 'tablet',
      use: {
        ...devices['iPad Pro 11'],
        launchOptions: {
          ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
            ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
            : {}),
        },
      },
    },
  ],

  // Fortune 500-Grade: Web server configuration
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5000',
    // Reuse an already-running server (CI pre-starts it in a separate step)
    // and start one otherwise for local iteration.
    reuseExistingServer: true,
    // Fortune 500-Grade: Extended timeout for cold start + Vite bundling
    timeout: parseInt(process.env.SERVER_TIMEOUT || String(TIMEOUT_TIERS.SERVER_STARTUP)),
    // Stdout/stderr handling
    stdout: 'pipe',
    stderr: 'pipe',
  },

  // Fortune 500-Grade: Assertion timeouts
  expect: {
    // Extended timeout for complex DOM assertions
    timeout: parseInt(process.env.EXPECT_TIMEOUT || String(TIMEOUT_TIERS.FAST)),
    // Soft assertions for comprehensive test reporting
    toHaveScreenshot: {
      maxDiffPixels: 100,
    },
    toMatchSnapshot: {
      maxDiffPixelRatio: 0.05,
    },
  },
  
  // Fortune 500-Grade: Output directory for test artifacts
  outputDir: 'test-results/artifacts',
  
  // Preserve output from last run for debugging
  preserveOutput: 'always',
});
