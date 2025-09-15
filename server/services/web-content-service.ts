import { chromium, Browser, Page } from 'playwright';
import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';
import fetch from 'node-fetch';
import { createLogger } from '../utils/logger';
import { featureFlagsService } from './feature-flags-service';
import { storage } from '../storage';
import * as fs from 'fs/promises';
import * as path from 'path';
import { checkpointService } from './checkpoint-service';

const logger = createLogger('WebContentService');

export interface ExtractedContent {
  title: string;
  description: string;
  content: string;
  markdown: string;
  url: string;
  extractedAt: Date;
  readingTime: number;
  wordCount: number;
  images: string[];
  links: string[];
  codeBlocks: string[];
}

export interface ScreenshotResult {
  fullPageScreenshot: string; // base64
  aboveTheFoldScreenshot: string; // base64  
  metadata: {
    width: number;
    height: number;
    fullPageHeight: number;
    capturedAt: Date;
    url: string;
  };
}

export interface WebImportResult {
  content: ExtractedContent;
  screenshot?: ScreenshotResult;
  artifacts: {
    markdownPath: string;
    rawHtmlPath: string;
    screenshotPath?: string;
    thumbnailPath?: string;
  };
  metadata: {
    importId: string;
    userId: number;
    projectId?: number;
    processingTime: number;
    success: boolean;
    error?: string;
  };
}

export class WebContentService {
  private browser: Browser | null = null;
  private turndownService: TurndownService;

  constructor() {
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      fence: '```',
      emDelimiter: '*',
      strongDelimiter: '**',
      linkStyle: 'inlined'
    });

    // Configure turndown to handle common HTML elements better
    this.turndownService.addRule('removeComments', {
      filter: (node) => node.nodeType === 8, // Comment nodes
      replacement: () => ''
    });

    this.turndownService.addRule('codeBlocks', {
      filter: ['pre'],
      replacement: (content, node) => {
        const language = (node as Element).querySelector('code')?.className?.match(/language-(\w+)/)?.[1] || '';
        return `\n\`\`\`${language}\n${content}\n\`\`\`\n`;
      }
    });
  }

  async initialize(): Promise<void> {
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
          '--disable-gpu'
        ]
      });
      logger.info('Web content service initialized with Playwright');
    } catch (error) {
      logger.error('Failed to initialize web content service:', error);
      throw error;
    }
  }

  async captureScreenshot(url: string, userId: number): Promise<ScreenshotResult> {
    if (!this.browser) {
      await this.initialize();
    }

    if (!this.browser) {
      throw new Error('Browser not available for screenshot capture');
    }

    const page = await this.browser.newPage();

    try {
      // Set viewport for standard desktop size
      await page.setViewportSize({ width: 1920, height: 1080 });

      // Navigate with safety measures
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });

      // Wait for images and content to load
      await page.waitForTimeout(3000);

      // Capture above-the-fold screenshot
      const aboveTheFoldBuffer = await page.screenshot({
        type: 'png',
        fullPage: false
      });

      // Get full page height for metadata
      const fullPageHeight = await page.evaluate(() => document.body.scrollHeight);

      // Capture full page screenshot
      const fullPageBuffer = await page.screenshot({
        type: 'png',
        fullPage: true
      });

      const result: ScreenshotResult = {
        fullPageScreenshot: fullPageBuffer.toString('base64'),
        aboveTheFoldScreenshot: aboveTheFoldBuffer.toString('base64'),
        metadata: {
          width: 1920,
          height: 1080,
          fullPageHeight,
          capturedAt: new Date(),
          url
        }
      };

      logger.info(`Screenshots captured for ${url}`);
      return result;

    } finally {
      await page.close();
    }
  }

  async extractContent(url: string, userId: number): Promise<ExtractedContent> {
    const startTime = Date.now();

    try {
      // Fetch with proper headers and safety measures
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; E-Code/1.0; +https://e-code.dev)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: 30000,
        follow: 5, // Follow up to 5 redirects
        size: 10 * 1024 * 1024, // 10MB limit
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) {
        throw new Error(`Unsupported content type: ${contentType}`);
      }

      const html = await response.text();
      const dom = new JSDOM(html, { url });
      const document = dom.window.document;

      // Extract title with fallbacks
      const title = this.extractTitle(document);
      
      // Extract meta description
      const description = this.extractDescription(document);

      // Extract main content using readability algorithm
      const { content, markdown } = await this.extractMainContent(document, url, userId);

      // Extract images
      const images = this.extractImages(document, url);

      // Extract links
      const links = this.extractLinks(document, url);

      // Extract code blocks
      const codeBlocks = this.extractCodeBlocks(document);

      // Calculate reading metrics
      const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
      const readingTime = Math.ceil(wordCount / 200); // Assume 200 words per minute

      const result: ExtractedContent = {
        title,
        description,
        content,
        markdown,
        url,
        extractedAt: new Date(),
        readingTime,
        wordCount,
        images,
        links,
        codeBlocks
      };

      const processingTime = Date.now() - startTime;
      logger.info(`Content extracted from ${url} in ${processingTime}ms. Words: ${wordCount}, Reading time: ${readingTime}min`);

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error(`Failed to extract content from ${url} after ${processingTime}ms:`, error);
      throw error;
    }
  }

  async importFromUrl(
    url: string, 
    userId: number, 
    projectId?: number,
    options: {
      includeScreenshot?: boolean;
      saveArtifacts?: boolean;
    } = {}
  ): Promise<WebImportResult> {
    const startTime = Date.now();
    const importId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Check feature flags
      const canImport = await featureFlagsService.isWebImportEnabled(userId);
      if (!canImport) {
        throw new Error('Web import feature is not enabled for this user');
      }

      logger.info(`Starting web import from ${url} for user ${userId}`);

      // Extract content
      const content = await this.extractContent(url, userId);

      // Capture screenshot if enabled and requested
      let screenshot: ScreenshotResult | undefined;
      if (options.includeScreenshot) {
        const canScreenshot = await featureFlagsService.isScreenshotEnabled(userId);
        if (canScreenshot) {
          try {
            screenshot = await this.captureScreenshot(url, userId);
            logger.info(`Screenshot captured for ${url}`);
          } catch (error) {
            logger.warn(`Failed to capture screenshot for ${url}:`, error);
            // Don't fail the entire import if screenshot fails
          }
        }
      }

      // Save artifacts if requested
      const artifacts = await this.saveArtifacts(importId, content, screenshot, options.saveArtifacts);

      // Track in checkpoint if project context provided
      if (projectId) {
        await checkpointService.createComprehensiveCheckpoint({
          projectId,
          userId,
          message: `Imported web content from ${new URL(url).hostname}`,
          agentTaskDescription: `Web import: ${content.title}`,
          filesModified: options.saveArtifacts ? Object.keys(artifacts).length : 0,
          linesOfCodeWritten: content.markdown.split('\n').length,
          tokensUsed: Math.ceil(content.content.length / 4),
          executionTimeMs: Date.now() - startTime,
          apiCallsCount: 1
        });
      }

      const result: WebImportResult = {
        content,
        screenshot,
        artifacts,
        metadata: {
          importId,
          userId,
          projectId,
          processingTime: Date.now() - startTime,
          success: true
        }
      };

      logger.info(`Web import completed successfully for ${url} in ${result.metadata.processingTime}ms`);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Web import failed for ${url}:`, error);

      return {
        content: {} as ExtractedContent,
        artifacts: {
          markdownPath: '',
          rawHtmlPath: ''
        },
        metadata: {
          importId,
          userId,
          projectId,
          processingTime: Date.now() - startTime,
          success: false,
          error: errorMessage
        }
      };
    }
  }

  private extractTitle(document: Document): string {
    const titleSelectors = [
      'title',
      'h1',
      '[property="og:title"]',
      '[name="twitter:title"]',
      '.title',
      '#title'
    ];

    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const content = element.getAttribute('content') || element.textContent;
        if (content?.trim()) {
          return content.trim();
        }
      }
    }

    return 'Imported Content';
  }

  private extractDescription(document: Document): string {
    const descriptionSelectors = [
      '[name="description"]',
      '[property="og:description"]',
      '[name="twitter:description"]',
      '.description',
      '.summary'
    ];

    for (const selector of descriptionSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const content = element.getAttribute('content') || element.textContent;
        if (content?.trim()) {
          return content.trim();
        }
      }
    }

    return '';
  }

  private async extractMainContent(document: Document, url: string, userId: number): Promise<{ content: string; markdown: string }> {
    // Check if readability algorithm is enabled
    const useReadability = await featureFlagsService.getWebImportFeatureFlags(userId);
    
    let mainElement: Element | null = null;

    if (useReadability.readabilityAlgorithm) {
      // Apply readability-like algorithm
      mainElement = this.findMainContentWithReadability(document);
    }

    if (!mainElement) {
      // Fallback to content selectors
      const contentSelectors = [
        'main',
        'article', 
        '[role="main"]',
        '.content',
        '#content',
        '.post-content',
        '.entry-content',
        '.article-content',
        '.post-body'
      ];

      for (const selector of contentSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          mainElement = element;
          break;
        }
      }
    }

    // Fallback to body if no main content found
    if (!mainElement) {
      mainElement = document.querySelector('body');
    }

    if (!mainElement) {
      throw new Error('No content could be extracted from the page');
    }

    // Clean the content
    const cleanedElement = this.cleanElement(mainElement.cloneNode(true) as Element);
    
    // Extract text content
    const content = this.extractTextFromElement(cleanedElement);
    
    // Convert to markdown if enabled
    let markdown = content;
    if (useReadability.htmlToMarkdown) {
      try {
        markdown = this.turndownService.turndown(cleanedElement.innerHTML);
      } catch (error) {
        logger.warn('Failed to convert to markdown, using text content:', error);
        markdown = content;
      }
    }

    return { content, markdown };
  }

  private findMainContentWithReadability(document: Document): Element | null {
    // Simple readability algorithm implementation
    const candidates: Array<{ element: Element; score: number }> = [];

    // Look for elements that likely contain main content
    const contentElements = document.querySelectorAll('div, article, section, main');
    
    for (const element of contentElements) {
      let score = 0;
      const text = element.textContent || '';
      const textLength = text.length;

      // Score based on text length
      score += Math.min(textLength / 100, 50);

      // Score based on paragraph count
      const paragraphs = element.querySelectorAll('p');
      score += paragraphs.length * 2;

      // Bonus for semantic elements
      if (element.tagName.toLowerCase() === 'article') score += 10;
      if (element.tagName.toLowerCase() === 'main') score += 15;

      // Penalty for navigation, sidebar, footer elements
      const className = element.className.toLowerCase();
      const id = element.id.toLowerCase();
      if (className.includes('nav') || className.includes('sidebar') || 
          className.includes('footer') || className.includes('header') ||
          id.includes('nav') || id.includes('sidebar') || 
          id.includes('footer') || id.includes('header')) {
        score -= 20;
      }

      // Bonus for content-related classes
      if (className.includes('content') || className.includes('article') || 
          className.includes('post') || className.includes('body')) {
        score += 10;
      }

      // Penalty for short content
      if (textLength < 100) score -= 10;

      candidates.push({ element, score });
    }

    // Sort by score and return the best candidate
    candidates.sort((a, b) => b.score - a.score);
    return candidates.length > 0 ? candidates[0].element : null;
  }

  private cleanElement(element: Element): Element {
    // Remove unwanted elements
    const unwantedSelectors = [
      'script', 'style', 'noscript', 'iframe', 'embed', 'object',
      'nav', 'header', 'footer', 'aside',
      '.ads', '.advertisement', '.social-share', '.related-posts',
      '.comments', '.comment-form', '.sidebar', '.navigation',
      '[class*="ad-"]', '[id*="ad-"]', '[class*="promo"]'
    ];

    for (const selector of unwantedSelectors) {
      const elements = element.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    }

    // Remove elements with minimal content
    const allElements = element.querySelectorAll('*');
    allElements.forEach(el => {
      const text = el.textContent?.trim() || '';
      if (text.length < 5 && !['img', 'br', 'hr'].includes(el.tagName.toLowerCase())) {
        el.remove();
      }
    });

    return element;
  }

  private extractTextFromElement(element: Element): string {
    let text = '';
    const walker = element.ownerDocument.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      null,
      false
    );

    let node;
    while (node = walker.nextNode()) {
      if (node.nodeType === Node.TEXT_NODE) {
        const content = node.textContent?.trim();
        if (content) {
          text += content + ' ';
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = (node as Element).tagName.toLowerCase();
        if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'br'].includes(tagName)) {
          text += '\n';
        }
      }
    }

    return text
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private extractImages(document: Document, baseUrl: string): string[] {
    const images: string[] = [];
    const imgElements = document.querySelectorAll('img');

    for (const img of imgElements) {
      const src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
      if (src && !src.startsWith('data:')) {
        try {
          const absoluteUrl = new URL(src, baseUrl).href;
          images.push(absoluteUrl);
        } catch (error) {
          // Skip invalid URLs
        }
      }
    }

    return [...new Set(images)]; // Remove duplicates
  }

  private extractLinks(document: Document, baseUrl: string): string[] {
    const links: string[] = [];
    const linkElements = document.querySelectorAll('a[href]');

    for (const link of linkElements) {
      const href = link.getAttribute('href');
      if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
        try {
          const absoluteUrl = new URL(href, baseUrl).href;
          links.push(absoluteUrl);
        } catch (error) {
          // Skip invalid URLs
        }
      }
    }

    return [...new Set(links)]; // Remove duplicates
  }

  private extractCodeBlocks(document: Document): string[] {
    const codeBlocks: string[] = [];
    const codeElements = document.querySelectorAll('pre code, pre, code');

    for (const element of codeElements) {
      const code = element.textContent?.trim();
      if (code && code.length > 10) {
        codeBlocks.push(code);
      }
    }

    return codeBlocks;
  }

  private async saveArtifacts(
    importId: string,
    content: ExtractedContent,
    screenshot?: ScreenshotResult,
    saveFiles: boolean = true
  ): Promise<WebImportResult['artifacts']> {
    if (!saveFiles) {
      return {
        markdownPath: '',
        rawHtmlPath: ''
      };
    }

    try {
      // Create import directory
      const importDir = path.join(process.cwd(), 'imports', importId);
      await fs.mkdir(importDir, { recursive: true });

      // Save markdown content
      const markdownPath = path.join(importDir, 'content.md');
      await fs.writeFile(markdownPath, content.markdown);

      // Save raw HTML (if we had access to it)
      const rawHtmlPath = path.join(importDir, 'raw.html');
      await fs.writeFile(rawHtmlPath, `<!-- Original URL: ${content.url} -->\n<!-- Extracted at: ${content.extractedAt.toISOString()} -->\n\n${content.content}`);

      // Save screenshots if available
      let screenshotPath: string | undefined;
      let thumbnailPath: string | undefined;

      if (screenshot) {
        screenshotPath = path.join(importDir, 'screenshot.png');
        thumbnailPath = path.join(importDir, 'thumbnail.png');

        const fullPageBuffer = Buffer.from(screenshot.fullPageScreenshot, 'base64');
        const thumbnailBuffer = Buffer.from(screenshot.aboveTheFoldScreenshot, 'base64');

        await fs.writeFile(screenshotPath, fullPageBuffer);
        await fs.writeFile(thumbnailPath, thumbnailBuffer);
      }

      // Save metadata
      const metadataPath = path.join(importDir, 'metadata.json');
      await fs.writeFile(metadataPath, JSON.stringify({
        ...content,
        screenshot: screenshot ? {
          ...screenshot,
          fullPageScreenshot: '[base64 data]', // Don't store in metadata
          aboveTheFoldScreenshot: '[base64 data]'
        } : undefined
      }, null, 2));

      return {
        markdownPath,
        rawHtmlPath,
        screenshotPath,
        thumbnailPath
      };

    } catch (error) {
      logger.error(`Failed to save artifacts for import ${importId}:`, error);
      return {
        markdownPath: '',
        rawHtmlPath: ''
      };
    }
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

export const webContentService = new WebContentService();