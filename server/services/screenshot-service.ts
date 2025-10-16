// @ts-nocheck
import { createLogger } from '../utils/logger';
import { checkpointService } from './checkpoint-service';
import * as fs from 'fs/promises';
import * as path from 'path';

// Type definitions for playwright (when available)
type Browser = any;
type Page = any;

const logger = createLogger('ScreenshotService');

export class ScreenshotService {
  private browser: Browser | null = null;

  async initialize() {
    try {
      // Try to load playwright dynamically
      const playwright = await import('playwright').catch(() => null);
      
      if (playwright) {
        this.browser = await playwright.chromium.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        logger.info('Screenshot service initialized with Playwright');
      } else {
        logger.info('Playwright not available, running in basic mode without browser automation');
      }
    } catch (error) {
      logger.error('Failed to initialize screenshot service:', error);
      logger.info('Running in basic mode without browser automation');
    }
  }

  async captureProjectPreview(projectId: number, userId: number): Promise<{
    screenshotPath: string;
    thumbnail: string;
    metadata: {
      width: number;
      height: number;
      timestamp: Date;
      projectId: number;
    };
  }> {
    try {
      // Get the preview URL for the project
      const previewUrl = this.getProjectPreviewUrl(projectId);
      logger.info(`Capturing screenshot for project ${projectId} at ${previewUrl}`);

      if (this.browser) {
        // Use Playwright for full browser screenshots
        const page = await this.browser.newPage();
        
        try {
          // Set viewport size
          await page.setViewportSize({ width: 1920, height: 1080 });
          
          // Navigate to the preview URL
          await page.goto(previewUrl, { 
            waitUntil: 'networkidle',
            timeout: 30000 
          });

          // Wait for content to load
          await page.waitForTimeout(2000);

          // Capture screenshot
          const screenshotBuffer = await page.screenshot({
            fullPage: false,
            type: 'png'
          });

          // Generate thumbnail
          const thumbnailBuffer = await page.screenshot({
            fullPage: false,
            type: 'jpeg',
            quality: 80,
            clip: { x: 0, y: 0, width: 400, height: 300 }
          });

          // Save screenshots
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const screenshotDir = path.join(process.cwd(), 'screenshots', projectId.toString());
          await fs.mkdir(screenshotDir, { recursive: true });

          const screenshotPath = path.join(screenshotDir, `screenshot-${timestamp}.png`);
          const thumbnailPath = path.join(screenshotDir, `thumbnail-${timestamp}.jpg`);

          await fs.writeFile(screenshotPath, screenshotBuffer);
          await fs.writeFile(thumbnailPath, thumbnailBuffer);

          // Convert to base64 for immediate use
          const thumbnailBase64 = thumbnailBuffer.toString('base64');

          // Track in checkpoint
          await checkpointService.createComprehensiveCheckpoint({
            projectId,
            userId,
            message: 'Captured project screenshot',
            agentTaskDescription: 'Screenshot capture',
            filesModified: 0,
            linesOfCodeWritten: 0,
            tokensUsed: 0,
            executionTimeMs: 100,
            apiCallsCount: 1
          });

          await page.close();

          return {
            screenshotPath,
            thumbnail: `data:image/jpeg;base64,${thumbnailBase64}`,
            metadata: {
              width: 1920,
              height: 1080,
              timestamp: new Date(),
              projectId
            }
          };
        } finally {
          await page.close();
        }
      } else {
        // Fallback: Return a placeholder response
        logger.warn('Browser not available, returning placeholder screenshot');
        
        return {
          screenshotPath: '/screenshots/placeholder.png',
          thumbnail: 'data:image/svg+xml;base64,' + Buffer.from(this.getPlaceholderSvg()).toString('base64'),
          metadata: {
            width: 1920,
            height: 1080,
            timestamp: new Date(),
            projectId
          }
        };
      }
    } catch (error) {
      logger.error(`Failed to capture screenshot for project ${projectId}:`, error);
      throw error;
    }
  }

  async captureWorkflowState(projectId: number): Promise<{
    screenshots: Array<{
      workflow: string;
      status: string;
      screenshot?: string;
      error?: string;
    }>;
  }> {
    try {
      // This would capture the state of all running workflows
      const workflows = ['frontend', 'backend', 'database'];
      const screenshots = [];

      for (const workflow of workflows) {
        try {
          const previewUrl = this.getWorkflowPreviewUrl(projectId, workflow);
          
          if (this.browser) {
            const page = await this.browser.newPage();
            await page.setViewportSize({ width: 1280, height: 720 });
            await page.goto(previewUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
            
            const screenshotBuffer = await page.screenshot({ type: 'jpeg', quality: 70 });
            await page.close();

            screenshots.push({
              workflow,
              status: 'running',
              screenshot: `data:image/jpeg;base64,${screenshotBuffer.toString('base64')}`
            });
          } else {
            screenshots.push({
              workflow,
              status: 'unknown',
              error: 'Screenshot service not available'
            });
          }
        } catch (error) {
          logger.error(`Failed to capture workflow ${workflow}:`, error);
          screenshots.push({
            workflow,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return { screenshots };
    } catch (error) {
      logger.error('Failed to capture workflow states:', error);
      throw error;
    }
  }

  async captureErrorState(projectId: number, error: Error): Promise<{
    errorScreenshot: string;
    errorMessage: string;
    stackTrace?: string;
  }> {
    try {
      const errorHtml = this.generateErrorHtml(error);
      
      if (this.browser) {
        const page = await this.browser.newPage();
        await page.setContent(errorHtml);
        await page.setViewportSize({ width: 800, height: 600 });
        
        const screenshotBuffer = await page.screenshot({ type: 'png' });
        await page.close();

        return {
          errorScreenshot: `data:image/png;base64,${screenshotBuffer.toString('base64')}`,
          errorMessage: error.message,
          stackTrace: error.stack
        };
      } else {
        return {
          errorScreenshot: 'data:image/svg+xml;base64,' + Buffer.from(this.getErrorSvg(error.message)).toString('base64'),
          errorMessage: error.message,
          stackTrace: error.stack
        };
      }
    } catch (captureError) {
      logger.error('Failed to capture error state:', captureError);
      throw captureError;
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  private getProjectPreviewUrl(projectId: number): string {
    // In production, this would return the actual preview URL
    return `http://localhost:3100/preview/${projectId}`;
  }

  private getWorkflowPreviewUrl(projectId: number, workflow: string): string {
    return `http://localhost:3100/preview/${projectId}/${workflow}`;
  }

  private getPlaceholderSvg(): string {
    return `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="300" fill="#f3f4f6"/>
      <text x="200" y="150" text-anchor="middle" fill="#6b7280" font-family="Arial" font-size="16">
        Screenshot Preview
      </text>
    </svg>`;
  }

  private getErrorSvg(message: string): string {
    return `<svg width="800" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="200" fill="#fee2e2"/>
      <text x="400" y="80" text-anchor="middle" fill="#dc2626" font-family="Arial" font-size="18" font-weight="bold">
        Error Captured
      </text>
      <text x="400" y="120" text-anchor="middle" fill="#7f1d1d" font-family="Arial" font-size="14">
        ${message.substring(0, 80)}${message.length > 80 ? '...' : ''}
      </text>
    </svg>`;
  }

  private generateErrorHtml(error: Error): string {
    return `<!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #fee2e2;
          padding: 20px;
          margin: 0;
        }
        .error-container {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        h1 {
          color: #dc2626;
          margin: 0 0 10px;
          font-size: 24px;
        }
        .error-message {
          color: #7f1d1d;
          margin: 10px 0;
        }
        .stack-trace {
          background: #f3f4f6;
          padding: 10px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 12px;
          overflow-x: auto;
          white-space: pre-wrap;
        }
      </style>
    </head>
    <body>
      <div class="error-container">
        <h1>Error Captured</h1>
        <div class="error-message">${error.message}</div>
        ${error.stack ? `<pre class="stack-trace">${error.stack}</pre>` : ''}
      </div>
    </body>
    </html>`;
  }
}

export const screenshotService = new ScreenshotService();