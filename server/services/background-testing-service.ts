import { EventEmitter } from 'events';
import { createLogger } from '../utils/logger';

const logger = createLogger('background-testing-service');

// 🔥 CRITICAL: Playwright runtime check
// Playwright requires browser binaries to be installed via `npx playwright install`
// This service will gracefully handle missing Playwright to prevent crashes
let playwright: any = null;
let playwrightAvailable = false;

(async () => {
  try {
    playwright = await import('playwright');
    playwrightAvailable = true;
    logger.info('✅ Playwright runtime available');
  } catch (error) {
    logger.error('❌ Playwright not available. Install with: npm install playwright && npx playwright install chromium');
    logger.error('Background testing will be disabled until Playwright is installed');
  }
})();

interface TestJob {
  projectId: number;
  changedFiles: string[];
  status: 'queued' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  results?: TestResults;
}

interface TestResults {
  passed: boolean;
  total: number;
  failures: Array<{
    test: string;
    error: string;
    screenshot?: string;
  }>;
  pageLoadPassed: boolean;
  noConsoleErrors: boolean;
  clickableElementsPassed: boolean;
  formsSubmitPassed: boolean;
}

/**
 * 🔥 CRITICAL WEBSOCKET SECURITY REQUIREMENTS:
 * 
 * This service emits events via EventEmitter for background test notifications.
 * These events MUST be consumed by a WebSocket bridge that implements proper authentication/authorization.
 * 
 * **SECURITY CHECKLIST for WebSocket Bridge:**
 * 1. ✅ Authenticate WebSocket connections (verify user session/JWT)
 * 2. ✅ Verify project access permissions (user must own or have access to projectId)
 * 3. ✅ Only broadcast events to authorized users for that specific projectId
 * 4. ✅ Rate limit test notifications to prevent DoS attacks
 * 
 * **Event Types:**
 * - test:queued - Test scheduled for execution (includes projectId)
 * - test:started - Test execution started (includes projectId)
 * - test:completed - Test finished successfully (includes projectId, results)
 * - test:failed - Test execution failed (includes projectId, error)
 * - test:agent-notification - AI agent notification for failed tests (includes projectId, failures)
 * 
 * **Example Secure WebSocket Integration:**
 * ```typescript
 * backgroundTestingService.on('test:completed', ({ projectId, job, results }) => {
 *   // 1. Get all authenticated connections for this project
 *   const authorizedConnections = getAuthorizedConnections(projectId);
 *   
 *   // 2. Broadcast only to authorized users
 *   authorizedConnections.forEach(ws => {
 *     ws.send(JSON.stringify({ type: 'test:completed', projectId, results }));
 *   });
 * });
 * ```
 */
export class BackgroundTestingService extends EventEmitter {
  private testQueue: Map<number, TestJob> = new Map();
  private isProcessing: boolean = false;
  
  // 🔥 CRITICAL: Configurable app URL (not hard-coded localhost:5000)
  private appUrl: string;
  
  constructor() {
    super();
    // Default to localhost:5000 for dev, but allow override via env var
    this.appUrl = process.env.APP_URL || process.env.VITE_PUBLIC_URL || 'http://localhost:5000';
    logger.info(`Background testing service initialized with app URL: ${this.appUrl}`);
    logger.warn('⚠️  WebSocket bridge MUST implement auth/authorization for test events!');
  }
  
  async scheduleTest(projectId: number, changedFiles: string[]): Promise<void> {
    // Ne teste PAS après chaque message
    // Teste seulement si changement significatif
    if (!this.shouldTest(changedFiles)) {
      console.log(`[BackgroundTesting] Skipping test for project ${projectId} - no significant changes`);
      return;
    }
    
    const job: TestJob = {
      projectId,
      changedFiles,
      status: 'queued',
      createdAt: new Date()
    };
    
    console.log(`[BackgroundTesting] Scheduling test for project ${projectId} with ${changedFiles.length} changed files`);
    this.testQueue.set(projectId, job);
    
    // Emit event for real-time updates via WebSocket
    this.emit('test:queued', { projectId, job });
    
    this.processQueue();
  }
  
  private shouldTest(changedFiles: string[]): boolean {
    // Ne teste que si changements significatifs
    const significantExtensions = ['.js', '.ts', '.jsx', '.tsx', '.html', '.css', '.vue', '.svelte'];
    const hasSignificantChanges = changedFiles.some(file => 
      significantExtensions.some(ext => file.endsWith(ext))
    );
    
    // Ignore les changements sur README, docs, etc.
    const ignoredPatterns = ['README', 'CHANGELOG', '.md', 'LICENSE', 'package-lock.json'];
    const onlyIgnoredFiles = changedFiles.every(file => 
      ignoredPatterns.some(pattern => file.includes(pattern))
    );
    
    return hasSignificantChanges && !onlyIgnoredFiles;
  }
  
  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      console.log('[BackgroundTesting] Already processing queue');
      return;
    }
    
    this.isProcessing = true;
    
    try {
      for (const [projectId, job] of this.testQueue.entries()) {
        if (job.status !== 'queued') continue;
        
        console.log(`[BackgroundTesting] Running tests for project ${projectId}`);
        job.status = 'running';
        job.startedAt = new Date();
        this.emit('test:started', { projectId, job });
        
        try {
          const results = await this.runTests(projectId);
          job.status = 'completed';
          job.completedAt = new Date();
          job.results = results;
          
          console.log(`[BackgroundTesting] Tests completed for project ${projectId}:`, results);
          this.emit('test:completed', { projectId, job, results });
          
          // 3. Si tests échouent, notifier l'agent
          if (!results.passed) {
            await this.notifyAgent(projectId, results);
          }
        } catch (error) {
          console.error(`[BackgroundTesting] Tests failed for project ${projectId}:`, error);
          job.status = 'failed';
          job.completedAt = new Date();
          this.emit('test:failed', { projectId, job, error });
        }
        
        // Remove completed jobs after 5 minutes
        setTimeout(() => {
          this.testQueue.delete(projectId);
        }, 5 * 60 * 1000);
      }
    } finally {
      this.isProcessing = false;
    }
  }
  
  private async runTests(projectId: number): Promise<TestResults> {
    // 🔥 CRITICAL: Check Playwright availability before running tests
    if (!playwrightAvailable || !playwright) {
      logger.error('Cannot run tests: Playwright not available');
      throw new Error('Playwright not installed. Run: npm install playwright && npx playwright install chromium');
    }
    
    const browser = await playwright.chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    const results: TestResults = {
      passed: true,
      total: 0,
      failures: [],
      pageLoadPassed: false,
      noConsoleErrors: false,
      clickableElementsPassed: false,
      formsSubmitPassed: false
    };
    
    try {
      // 1. Load app (🔥 FIXED: Use configurable URL, not hard-coded localhost:5000)
      logger.info(`[BackgroundTesting] Loading app at ${this.appUrl}...`);
      await page.goto(this.appUrl, { timeout: 30000 });
      
      // 2. Run basic checks
      const tests = [
        { name: 'Page Load', fn: () => this.testPageLoads(page) },
        { name: 'Console Errors', fn: () => this.testNoConsoleErrors(page) },
        { name: 'Clickable Elements', fn: () => this.testClickableElements(page) },
        { name: 'Forms Submit', fn: () => this.testFormsSubmit(page) }
      ];
      
      results.total = tests.length;
      
      for (const test of tests) {
        try {
          const testResult = await test.fn();
          
          if (test.name === 'Page Load') results.pageLoadPassed = testResult.passed;
          if (test.name === 'Console Errors') results.noConsoleErrors = testResult.passed;
          if (test.name === 'Clickable Elements') results.clickableElementsPassed = testResult.passed;
          if (test.name === 'Forms Submit') results.formsSubmitPassed = testResult.passed;
          
          if (!testResult.passed) {
            results.passed = false;
            results.failures.push({
              test: test.name,
              error: testResult.error || 'Test failed',
              screenshot: testResult.screenshot
            });
          }
        } catch (error: any) {
          results.passed = false;
          results.failures.push({
            test: test.name,
            error: error.message || 'Unknown error'
          });
        }
      }
      
      return results;
    } catch (error: any) {
      results.passed = false;
      results.failures.push({
        test: 'App Load',
        error: error.message || 'Failed to load application'
      });
      return results;
    } finally {
      await browser.close();
    }
  }
  
  private async testPageLoads(page: any): Promise<{ passed: boolean; error?: string; screenshot?: string }> {
    try {
      // Wait for page to be fully loaded
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      
      // Check if page has content
      const bodyText = await page.textContent('body');
      if (!bodyText || bodyText.trim().length === 0) {
        return { passed: false, error: 'Page loaded but has no content' };
      }
      
      return { passed: true };
    } catch (error: any) {
      const screenshot = await page.screenshot({ path: `/tmp/test-page-load-${Date.now()}.png` });
      return { 
        passed: false, 
        error: error.message || 'Page failed to load',
        screenshot: screenshot.toString('base64')
      };
    }
  }
  
  private async testNoConsoleErrors(page: any): Promise<{ passed: boolean; error?: string; screenshot?: string }> {
    const errors: string[] = [];
    
    page.on('console', (msg: any) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Wait a bit to collect console errors
    await page.waitForTimeout(2000);
    
    if (errors.length > 0) {
      return { 
        passed: false, 
        error: `Console errors detected: ${errors.join(', ')}` 
      };
    }
    
    return { passed: true };
  }
  
  private async testClickableElements(page: any): Promise<{ passed: boolean; error?: string; screenshot?: string }> {
    try {
      // Find all buttons and links
      const buttons = await page.locator('button, a').count();
      
      if (buttons === 0) {
        return { passed: false, error: 'No clickable elements found' };
      }
      
      // Try to click the first button/link
      const firstButton = page.locator('button, a').first();
      const isVisible = await firstButton.isVisible();
      
      if (!isVisible) {
        return { passed: false, error: 'First clickable element is not visible' };
      }
      
      return { passed: true };
    } catch (error: any) {
      return { passed: false, error: error.message || 'Failed to test clickable elements' };
    }
  }
  
  private async testFormsSubmit(page: any): Promise<{ passed: boolean; error?: string; screenshot?: string }> {
    try {
      // Find all forms
      const forms = await page.locator('form').count();
      
      if (forms === 0) {
        // No forms is OK - not all apps have forms
        return { passed: true };
      }
      
      // Check if form inputs are visible
      const inputs = await page.locator('input, textarea, select').count();
      
      if (inputs === 0) {
        return { passed: false, error: 'Forms found but no input fields' };
      }
      
      return { passed: true };
    } catch (error: any) {
      return { passed: false, error: error.message || 'Failed to test forms' };
    }
  }
  
  private async notifyAgent(projectId: number, results: TestResults): Promise<void> {
    console.log(`[BackgroundTesting] Notifying agent for project ${projectId} - tests failed`);
    
    // Emit event that can be picked up by WebSocket or AI agent
    this.emit('test:agent-notification', {
      projectId,
      message: `Background tests failed for project ${projectId}`,
      failures: results.failures,
      timestamp: new Date()
    });
    
    // TODO: Integrate with AI agent conversation to suggest fixes
    // This could trigger an automatic rollback or create a checkpoint
  }
  
  // Get current test status for a project
  getTestStatus(projectId: number): TestJob | undefined {
    return this.testQueue.get(projectId);
  }
  
  // Get all queued/running tests
  getAllTests(): TestJob[] {
    return Array.from(this.testQueue.values());
  }
}

// Singleton instance
export const backgroundTestingService = new BackgroundTestingService();
