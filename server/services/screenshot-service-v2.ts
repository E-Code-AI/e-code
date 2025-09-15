import { chromium, Browser, Page } from 'playwright';
import { createHash } from 'crypto';
import path from 'path';
import fs from 'fs/promises';

interface ScreenshotOptions {
  width?: number;
  height?: number;
  fullPage?: boolean;
  timeout?: number;
  waitFor?: 'load' | 'domcontentloaded' | 'networkidle';
  delay?: number;
  quality?: number;
  format?: 'png' | 'jpeg';
}

interface ScreenshotResult {
  buffer: Buffer;
  path: string;
  url: string;
  timestamp: Date;
  dimensions: { width: number; height: number };
  fileSize: number;
}

export class ScreenshotService {
  private browser: Browser | null = null;
  private readonly screenshotDir = path.join(process.cwd(), 'temp', 'screenshots');
  
  private readonly defaultOptions: Required<ScreenshotOptions> = {
    width: 1920,
    height: 1080,
    fullPage: false,
    timeout: 30000,
    waitFor: 'load',
    delay: 1000,
    quality: 80,
    format: 'png',
  };
  
  async initialize(): Promise<void> {
    if (this.browser) return;
    
    try {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
        ]
      });
      
      // Ensure screenshot directory exists
      await fs.mkdir(this.screenshotDir, { recursive: true });
    } catch (error) {
      console.error('Failed to initialize browser for screenshots:', error);
      throw new Error('Screenshot service initialization failed');
    }
  }
  
  async takeScreenshot(url: string, options: ScreenshotOptions = {}): Promise<ScreenshotResult> {
    if (!this.browser) {
      await this.initialize();
    }
    
    const opts = { ...this.defaultOptions, ...options };
    let page: Page | null = null;
    
    try {
      // Create new page with configured viewport
      page = await this.browser!.newPage({
        viewport: {
          width: opts.width,
          height: opts.height,
        },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
      
      // Set timeout
      page.setDefaultTimeout(opts.timeout);
      
      // Navigate to URL
      await page.goto(url, { 
        waitUntil: opts.waitFor,
        timeout: opts.timeout 
      });
      
      // Additional delay if specified
      if (opts.delay > 0) {
        await page.waitForTimeout(opts.delay);
      }
      
      // Remove unwanted elements that might interfere
      await this.removeUnwantedElements(page);
      
      // Take screenshot
      const screenshotOptions: any = {
        fullPage: opts.fullPage,
        type: opts.format,
      };
      
      if (opts.format === 'jpeg') {
        screenshotOptions.quality = opts.quality;
      }
      
      const buffer = await page.screenshot(screenshotOptions);
      
      // Generate filename and save
      const filename = this.generateFilename(url, opts);
      const filePath = path.join(this.screenshotDir, filename);
      
      await fs.writeFile(filePath, buffer);
      
      // Get actual dimensions
      const dimensions = await this.getImageDimensions(buffer);
      
      return {
        buffer,
        path: filePath,
        url,
        timestamp: new Date(),
        dimensions,
        fileSize: buffer.length,
      };
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      throw new Error(`Failed to capture screenshot: ${error}`);
    } finally {
      if (page) {
        await page.close();
      }
    }
  }
  
  async takeMultipleScreenshots(
    urls: string[], 
    options: ScreenshotOptions = {}
  ): Promise<ScreenshotResult[]> {
    const results: ScreenshotResult[] = [];
    
    for (const url of urls) {
      try {
        const result = await this.takeScreenshot(url, options);
        results.push(result);
      } catch (error) {
        console.error(`Failed to screenshot ${url}:`, error);
        // Continue with other URLs
      }
    }
    
    return results;
  }
  
  async captureElementScreenshot(
    url: string, 
    selector: string, 
    options: ScreenshotOptions = {}
  ): Promise<ScreenshotResult> {
    if (!this.browser) {
      await this.initialize();
    }
    
    const opts = { ...this.defaultOptions, ...options };
    let page: Page | null = null;
    
    try {
      page = await this.browser!.newPage({
        viewport: {
          width: opts.width,
          height: opts.height,
        }
      });
      
      await page.goto(url, { 
        waitUntil: opts.waitFor,
        timeout: opts.timeout 
      });
      
      // Wait for element to be visible
      await page.waitForSelector(selector, { timeout: opts.timeout });
      
      if (opts.delay > 0) {
        await page.waitForTimeout(opts.delay);
      }
      
      // Take screenshot of specific element
      const element = await page.locator(selector);
      const buffer = await element.screenshot({
        type: opts.format,
        quality: opts.format === 'jpeg' ? opts.quality : undefined,
      });
      
      const filename = this.generateFilename(url, opts, selector);
      const filePath = path.join(this.screenshotDir, filename);
      
      await fs.writeFile(filePath, buffer);
      
      const dimensions = await this.getImageDimensions(buffer);
      
      return {
        buffer,
        path: filePath,
        url,
        timestamp: new Date(),
        dimensions,
        fileSize: buffer.length,
      };
    } catch (error) {
      console.error('Element screenshot capture failed:', error);
      throw new Error(`Failed to capture element screenshot: ${error}`);
    } finally {
      if (page) {
        await page.close();
      }
    }
  }
  
  private async removeUnwantedElements(page: Page): Promise<void> {
    try {
      // Remove common overlays and popups that might interfere
      await page.evaluate(() => {
        const selectors = [
          '.cookie-banner',
          '.cookie-notice',
          '.gdpr-banner',
          '.popup-overlay',
          '.modal-overlay',
          '.newsletter-popup',
          '.ad-overlay',
          '[id*="cookie"]',
          '[class*="cookie"]',
          '[id*="popup"]',
          '[class*="popup"]',
        ];
        
        selectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(element => {
            if (element.parentNode) {
              element.parentNode.removeChild(element);
            }
          });
        });
      });
    } catch (error) {
      // Don't fail if we can't remove elements
      console.warn('Could not remove unwanted elements:', error);
    }
  }
  
  private generateFilename(url: string, options: ScreenshotOptions, selector?: string): string {
    const urlHash = createHash('md5').update(url).digest('hex').substring(0, 8);
    const timestamp = Date.now();
    const optionsHash = createHash('md5')
      .update(JSON.stringify({ ...options, url: undefined }))
      .digest('hex')
      .substring(0, 6);
    
    let filename = `screenshot_${urlHash}_${timestamp}_${optionsHash}`;
    
    if (selector) {
      const selectorHash = createHash('md5').update(selector).digest('hex').substring(0, 4);
      filename += `_${selectorHash}`;
    }
    
    filename += `.${options.format || 'png'}`;
    
    return filename;
  }
  
  private async getImageDimensions(buffer: Buffer): Promise<{ width: number; height: number }> {
    // Simple PNG dimension reading (first 24 bytes contain dimensions)
    if (buffer.length >= 24) {
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      return { width, height };
    }
    
    // Fallback for other formats or if reading fails
    return { width: 0, height: 0 };
  }
  
  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
  
  async cleanupOldScreenshots(maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const files = await fs.readdir(this.screenshotDir);
      const now = Date.now();
      
      for (const file of files) {
        const filePath = path.join(this.screenshotDir, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old screenshots:', error);
    }
  }
  
  async getScreenshotInfo(filePath: string): Promise<{
    exists: boolean;
    size: number;
    created: Date;
  } | null> {
    try {
      const stats = await fs.stat(filePath);
      return {
        exists: true,
        size: stats.size,
        created: stats.birthtime,
      };
    } catch {
      return null;
    }
  }
}