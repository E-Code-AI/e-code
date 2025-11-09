/**
 * Agent Testing Orchestrator Service
 * 
 * Manages Playwright test execution, screenshot capture, video recording,
 * and test artifact storage for the AI Agent V3 system.
 * 
 * Phase 2 - Browser Testing & Quality Infrastructure
 * Fortune 500 Engineering Standards
 */

import { chromium, firefox, webkit, Browser, Page, BrowserContext } from 'playwright';
import { EventEmitter } from 'events';
import { db } from '../db';
import { 
  browserTestExecutions, 
  testArtifacts,
  BrowserTestExecution,
  InsertBrowserTestExecution,
  InsertTestArtifact
} from '../../shared/schema';
import { eq, and, desc } from 'drizzle-orm';

export interface TestExecutionContext {
  sessionId: string;
  projectId: string;
  userId: string;
  projectPath: string;
}

export interface TestExecutionOptions {
  testType: 'e2e' | 'visual_regression' | 'performance' | 'accessibility' | 'cross_browser';
  browser: 'chromium' | 'firefox' | 'webkit';
  viewport?: { width: number; height: number; };
  headless?: boolean;
  recordVideo?: boolean;
  captureScreenshots?: boolean;
  traceEnabled?: boolean;
}

export interface TestExecutionResult {
  passed: boolean;
  errors?: Array<{ message: string; stack?: string; }>;
  assertions?: number;
  performance?: { fcp: number; lcp: number; tti: number; };
  accessibility?: { violations: number; issues: any[]; };
}

export class AgentTestingOrchestrator extends EventEmitter {
  private activeBrowsers: Map<string, Browser> = new Map();
  private activeContexts: Map<string, BrowserContext> = new Map();
  private testQueue: Array<{ id: string; priority: number; }> = [];

  constructor() {
    super();
  }

  /**
   * Execute a Playwright test
   */
  async executeTest(
    context: TestExecutionContext,
    testScript: string,
    options: TestExecutionOptions
  ): Promise<BrowserTestExecution> {
    const { sessionId, projectId } = context;

    // Create execution record
    const [execution] = await db.insert(browserTestExecutions).values({
      sessionId,
      projectId,
      testType: options.testType,
      browser: options.browser,
      viewport: options.viewport || { width: 1920, height: 1080 },
      testScript,
      status: 'running',
    }).returning();

    this.emitEvent({
      type: 'test_started',
      executionId: execution.id,
      testType: options.testType,
      browser: options.browser
    });

    let browser: Browser | null = null;
    let browserContext: BrowserContext | null = null;
    let page: Page | null = null;

    try {
      // Launch browser
      browser = await this.launchBrowser(options.browser, {
        headless: options.headless !== false,
        viewport: options.viewport
      });

      this.activeBrowsers.set(execution.id, browser);

      // Create context with video/trace recording
      browserContext = await browser.newContext({
        viewport: options.viewport || { width: 1920, height: 1080 },
        recordVideo: options.recordVideo ? {
          dir: './test-recordings',
          size: options.viewport || { width: 1920, height: 1080 }
        } : undefined,
      });

      if (options.traceEnabled) {
        await browserContext.tracing.start({ screenshots: true, snapshots: true });
      }

      this.activeContexts.set(execution.id, browserContext);

      // Execute test script
      page = await browserContext.newPage();
      const startTime = Date.now();

      const result = await this.runTestScript(page, testScript, options);
      
      const duration = Date.now() - startTime;

      // Capture artifacts
      const screenshots: string[] = [];
      let videoUrl: string | null = null;
      let traceUrl: string | null = null;

      if (options.captureScreenshots) {
        const screenshotBuffer = await page.screenshot({ fullPage: true });
        const screenshotUrl = await this.saveArtifact(execution.id, {
          type: 'screenshot',
          fileName: `screenshot-${Date.now()}.png`,
          data: screenshotBuffer,
          mimeType: 'image/png'
        });
        screenshots.push(screenshotUrl);
      }

      if (options.recordVideo) {
        const video = page.video();
        if (video) {
          const path = await video.path();
          videoUrl = await this.uploadVideo(execution.id, path);
        }
      }

      if (options.traceEnabled) {
        const tracePath = `./traces/trace-${execution.id}.zip`;
        await browserContext.tracing.stop({ path: tracePath });
        traceUrl = await this.uploadTrace(execution.id, tracePath);
      }

      // Update execution record
      const [updated] = await db.update(browserTestExecutions)
        .set({
          status: result.passed ? 'completed' : 'failed',
          result,
          screenshots,
          videoUrl,
          traceUrl,
          duration,
          completedAt: new Date()
        })
        .where(eq(browserTestExecutions.id, execution.id))
        .returning();

      this.emitEvent({
        type: 'test_completed',
        executionId: execution.id,
        passed: result.passed,
        duration
      });

      return updated;

    } catch (error: any) {
      // Handle test failure
      await db.update(browserTestExecutions)
        .set({
          status: 'failed',
          result: {
            passed: false,
            errors: [{ message: error.message, stack: error.stack }]
          },
          completedAt: new Date()
        })
        .where(eq(browserTestExecutions.id, execution.id));

      this.emitEvent({
        type: 'test_failed',
        executionId: execution.id,
        error: error.message
      });

      throw error;

    } finally {
      // CRITICAL: Always cleanup browser resources, even on error
      // This prevents memory leaks and orphaned Playwright processes
      try {
        if (page) await page.close();
      } catch (e) {
        console.error('Error closing page:', e);
      }

      try {
        if (browserContext) await browserContext.close();
      } catch (e) {
        console.error('Error closing browser context:', e);
      }

      try {
        if (browser) await browser.close();
      } catch (e) {
        console.error('Error closing browser:', e);
      }

      // Clean up tracking maps
      this.activeBrowsers.delete(execution.id);
      this.activeContexts.delete(execution.id);
    }
  }

  /**
   * Take a screenshot of current page
   * SECURITY: URL allowlist enforced to prevent SSRF attacks
   */
  async takeScreenshot(
    context: TestExecutionContext,
    url: string,
    options?: {
      fullPage?: boolean;
      selector?: string;
      viewport?: { width: number; height: number; };
    }
  ): Promise<{ screenshotUrl: string; executionId: string; }> {
    // SECURITY: URL validation to prevent SSRF
    if (!this.isAllowedUrl(url)) {
      throw new Error('URL not allowed. Only localhost and replit.app domains are permitted for security.');
    }

    const { sessionId, projectId } = context;

    // Create execution record
    const [execution] = await db.insert(browserTestExecutions).values({
      sessionId,
      projectId,
      testType: 'e2e',
      browser: 'chromium',
      viewport: options?.viewport || { width: 1920, height: 1080 },
      testScript: `Screenshot of ${url}`,
      status: 'running',
    }).returning();

    let browser: Browser | null = null;
    let page: Page | null = null;

    try {
      browser = await chromium.launch({ headless: true });
      page = await browser.newPage({
        viewport: options?.viewport || { width: 1920, height: 1080 }
      });

      await page.goto(url, { waitUntil: 'networkidle' });

      let screenshotBuffer: Buffer;
      if (options?.selector) {
        const element = await page.locator(options.selector);
        screenshotBuffer = await element.screenshot();
      } else {
        screenshotBuffer = await page.screenshot({ 
          fullPage: options?.fullPage ?? true 
        });
      }

      const screenshotUrl = await this.saveArtifact(execution.id, {
        type: 'screenshot',
        fileName: `screenshot-${Date.now()}.png`,
        data: screenshotBuffer,
        mimeType: 'image/png'
      });

      await db.update(browserTestExecutions)
        .set({
          status: 'completed',
          screenshots: [screenshotUrl],
          completedAt: new Date()
        })
        .where(eq(browserTestExecutions.id, execution.id));

      return { screenshotUrl, executionId: execution.id };

    } catch (error: any) {
      await db.update(browserTestExecutions)
        .set({ status: 'failed', completedAt: new Date() })
        .where(eq(browserTestExecutions.id, execution.id));
      
      throw error;

    } finally {
      // CRITICAL: Always cleanup browser resources, even on error
      try {
        if (page) await page.close();
      } catch (e) {
        console.error('Error closing page:', e);
      }

      try {
        if (browser) await browser.close();
      } catch (e) {
        console.error('Error closing browser:', e);
      }
    }
  }

  /**
   * Run performance analysis on a page
   */
  async analyzePerformance(
    context: TestExecutionContext,
    url: string
  ): Promise<{ fcp: number; lcp: number; tti: number; }> {
    const browser = await chromium.launch({ headless: true });
    const browserContext = await browser.newContext();
    const page = await browserContext.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle' });

      // Capture Web Vitals
      const metrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          const po = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const metrics: any = {};
            
            entries.forEach((entry: any) => {
              if (entry.name === 'first-contentful-paint') {
                metrics.fcp = entry.startTime;
              }
              if (entry.entryType === 'largest-contentful-paint') {
                metrics.lcp = entry.startTime;
              }
            });
            
            resolve(metrics);
          });
          
          po.observe({ type: 'paint', buffered: true });
          po.observe({ type: 'largest-contentful-paint', buffered: true });
          
          // Timeout after 10 seconds
          setTimeout(() => resolve({}), 10000);
        });
      });

      await browser.close();

      return metrics as { fcp: number; lcp: number; tti: number; };

    } catch (error) {
      await browser.close();
      throw error;
    }
  }

  /**
   * Get test execution history
   */
  async getExecutionHistory(
    sessionId: string,
    limit: number = 20
  ): Promise<BrowserTestExecution[]> {
    return await db.select()
      .from(browserTestExecutions)
      .where(eq(browserTestExecutions.sessionId, sessionId))
      .orderBy(desc(browserTestExecutions.startedAt))
      .limit(limit);
  }

  /**
   * Get test artifacts for an execution
   */
  async getTestArtifacts(executionId: string) {
    return await db.select()
      .from(testArtifacts)
      .where(eq(testArtifacts.executionId, executionId));
  }

  // Private helper methods

  private async launchBrowser(
    browserType: 'chromium' | 'firefox' | 'webkit',
    options: { headless: boolean; viewport?: { width: number; height: number; } }
  ): Promise<Browser> {
    const launchOptions = { 
      headless: options.headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    };

    switch (browserType) {
      case 'chromium':
        return await chromium.launch(launchOptions);
      case 'firefox':
        return await firefox.launch(launchOptions);
      case 'webkit':
        return await webkit.launch(launchOptions);
      default:
        throw new Error(`Unsupported browser type: ${browserType}`);
    }
  }

  private async runTestScript(
    page: Page,
    testScript: string,
    options: TestExecutionOptions
  ): Promise<TestExecutionResult> {
    // SECURITY: Enforce URL allowlist via Playwright route interception
    // Block all navigation attempts to non-allowlisted domains
    await page.route('**/*', (route) => {
      const url = route.request().url();
      
      if (this.isAllowedUrl(url)) {
        // Allow navigation to allowlisted URLs
        route.continue();
      } else {
        // Block navigation to non-allowlisted URLs
        route.abort('blockedbyclient');
      }
    });
    
    try {
      // Execute test script in page context
      // This is a simplified implementation - in production, you'd use Playwright's test runner
      const scriptFunction = new Function('page', testScript);
      await scriptFunction(page);

      return {
        passed: true,
        assertions: 1
      };

    } catch (error: any) {
      return {
        passed: false,
        errors: [{ message: error.message, stack: error.stack }]
      };
    }
  }

  private async saveArtifact(
    executionId: string,
    artifact: {
      type: 'screenshot' | 'video' | 'trace';
      fileName: string;
      data: Buffer;
      mimeType: string;
    }
  ): Promise<string> {
    // TODO [Phase 2 Production]: Replace with object storage abstraction (S3/R2)
    // Current implementation uses filesystem paths that require directory provisioning
    // Production should use setupObjectStorage() or equivalent cloud storage service
    const storageUrl = `/test-artifacts/${executionId}/${artifact.fileName}`;

    await db.insert(testArtifacts).values({
      executionId,
      artifactType: artifact.type,
      fileName: artifact.fileName,
      storageUrl,
      mimeType: artifact.mimeType,
      size: artifact.data.length,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });

    return storageUrl;
  }

  private async uploadVideo(executionId: string, videoPath: string): Promise<string> {
    // In production, upload to S3/object storage
    return `/test-videos/${executionId}/video.webm`;
  }

  private async uploadTrace(executionId: string, tracePath: string): Promise<string> {
    // In production, upload to S3/object storage
    return `/test-traces/${executionId}/trace.zip`;
  }

  /**
   * SECURITY: URL allowlist to prevent SSRF attacks
   * Only allows localhost and replit.app domains for testing
   */
  private isAllowedUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();
      
      // Allow localhost and 127.0.0.1
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
        return true;
      }
      
      // Allow replit.app domains
      if (hostname.endsWith('.replit.app') || hostname === 'replit.app') {
        return true;
      }
      
      // Allow replit.dev domains
      if (hostname.endsWith('.replit.dev') || hostname === 'replit.dev') {
        return true;
      }
      
      return false;
    } catch (e) {
      return false;
    }
  }

  private emitEvent(event: any) {
    this.emit('test_event', event);
  }

  /**
   * Cleanup - close all active browsers
   */
  async cleanup() {
    for (const [id, browser] of this.activeBrowsers) {
      try {
        await browser.close();
        this.activeBrowsers.delete(id);
      } catch (error) {
        console.error(`Error closing browser ${id}:`, error);
      }
    }
  }
}

// Export singleton instance
export const agentTestingOrchestrator = new AgentTestingOrchestrator();
