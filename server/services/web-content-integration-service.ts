import { SafeURLFetcher } from './safe-url-fetcher';
import { ContentExtractionService } from './content-extraction-service';
import { ScreenshotService } from './screenshot-service-v2';
import { storage } from '../storage';

interface WebImportOptions {
  includeScreenshot?: boolean;
  screenshotOptions?: {
    width?: number;
    height?: number;
    fullPage?: boolean;
  };
  contentOptions?: {
    maxSize?: number;
    timeout?: number;
  };
}

interface WebImportResult {
  id: string;
  url: string;
  title: string;
  content: string;
  markdown: string;
  excerpt: string;
  wordCount: number;
  language: string;
  author?: string;
  publishDate?: Date;
  imageUrl?: string;
  screenshotPath?: string;
  links: Array<{ text: string; url: string }>;
  headings: Array<{ level: number; text: string }>;
  metadata: {
    contentType: string;
    size: number;
    fetchedAt: Date;
    robotsAllowed: boolean;
  };
}

export class WebContentIntegrationService {
  private urlFetcher: SafeURLFetcher;
  private contentExtractor: ContentExtractionService;
  private screenshotService: ScreenshotService;
  
  constructor() {
    this.urlFetcher = new SafeURLFetcher();
    this.contentExtractor = new ContentExtractionService();
    this.screenshotService = new ScreenshotService();
  }
  
  async importWebContent(
    url: string, 
    projectId: number, 
    userId: number, 
    options: WebImportOptions = {}
  ): Promise<WebImportResult> {
    const importId = `web_import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Step 1: Fetch content safely
      const fetchResult = await this.urlFetcher.fetchURL(url, {
        maxSize: options.contentOptions?.maxSize,
        timeout: options.contentOptions?.timeout,
      });
      
      // Step 2: Extract structured content
      const extractedContent = await this.contentExtractor.extractContent(
        fetchResult.content,
        url
      );
      
      // Step 3: Take screenshot if requested
      let screenshotPath: string | undefined;
      if (options.includeScreenshot) {
        try {
          const screenshot = await this.screenshotService.takeScreenshot(url, {
            width: options.screenshotOptions?.width,
            height: options.screenshotOptions?.height,
            fullPage: options.screenshotOptions?.fullPage,
          });
          screenshotPath = screenshot.path;
        } catch (error) {
          console.warn('Screenshot capture failed:', error);
          // Continue without screenshot
        }
      }
      
      // Step 4: Create import result
      const result: WebImportResult = {
        id: importId,
        url,
        title: extractedContent.title,
        content: extractedContent.content,
        markdown: extractedContent.markdown,
        excerpt: extractedContent.excerpt,
        wordCount: extractedContent.wordCount,
        language: extractedContent.language,
        author: extractedContent.author,
        publishDate: extractedContent.publishDate,
        imageUrl: extractedContent.imageUrl,
        screenshotPath,
        links: extractedContent.links,
        headings: extractedContent.headings,
        metadata: {
          contentType: fetchResult.contentType,
          size: fetchResult.size,
          fetchedAt: new Date(),
          robotsAllowed: fetchResult.robotsAllowed,
        },
      };
      
      // Step 5: Store in project workspace
      await this.storeImportResult(result, projectId, userId);
      
      return result;
    } catch (error) {
      console.error('Web content import failed:', error);
      throw new Error(`Failed to import web content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async batchImportWebContent(
    urls: string[],
    projectId: number,
    userId: number,
    options: WebImportOptions = {}
  ): Promise<Array<{ url: string; result?: WebImportResult; error?: string }>> {
    const results: Array<{ url: string; result?: WebImportResult; error?: string }> = [];
    
    // Process URLs concurrently but with a limit
    const concurrentLimit = 3;
    const chunks = this.chunkArray(urls, concurrentLimit);
    
    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (url) => {
        try {
          const result = await this.importWebContent(url, projectId, userId, options);
          return { url, result };
        } catch (error) {
          return { 
            url, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          };
        }
      });
      
      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
    }
    
    return results;
  }
  
  async extractTextFromHTML(html: string, baseUrl?: string): Promise<{
    content: string;
    markdown: string;
    wordCount: number;
  }> {
    const extracted = await this.contentExtractor.extractContent(html, baseUrl);
    
    return {
      content: extracted.content,
      markdown: extracted.markdown,
      wordCount: extracted.wordCount,
    };
  }
  
  async captureScreenshot(url: string, options: {
    width?: number;
    height?: number;
    fullPage?: boolean;
    element?: string;
  } = {}): Promise<{
    buffer: Buffer;
    path: string;
    dimensions: { width: number; height: number };
  }> {
    if (options.element) {
      const result = await this.screenshotService.captureElementScreenshot(
        url,
        options.element,
        {
          width: options.width,
          height: options.height,
          fullPage: options.fullPage,
        }
      );
      
      return {
        buffer: result.buffer,
        path: result.path,
        dimensions: result.dimensions,
      };
    } else {
      const result = await this.screenshotService.takeScreenshot(url, {
        width: options.width,
        height: options.height,
        fullPage: options.fullPage,
      });
      
      return {
        buffer: result.buffer,
        path: result.path,
        dimensions: result.dimensions,
      };
    }
  }
  
  private async storeImportResult(
    result: WebImportResult,
    projectId: number,
    userId: number
  ): Promise<void> {
    try {
      // Create a markdown file with the imported content
      const markdownContent = this.generateMarkdownFile(result);
      
      // Store as a file in the project
      const fileName = this.sanitizeFileName(`${result.title}.md`);
      const filePath = `imports/${fileName}`;
      
      await storage.createProjectFile({
        projectId,
        userId,
        name: fileName,
        content: markdownContent,
        path: filePath,
        type: 'file',
        size: markdownContent.length,
      });
      
      // Store metadata in project import records
      await storage.createProjectImport({
        projectId,
        userId,
        type: 'web_content',
        url: result.url,
        status: 'completed',
        metadata: {
          importId: result.id,
          title: result.title,
          wordCount: result.wordCount,
          language: result.language,
          filePath,
          screenshotPath: result.screenshotPath,
        },
      });
    } catch (error) {
      console.error('Failed to store import result:', error);
      throw error;
    }
  }
  
  private generateMarkdownFile(result: WebImportResult): string {
    const frontMatter = [
      '---',
      `title: "${result.title.replace(/"/g, '\\"')}"`,
      `url: "${result.url}"`,
      `imported_at: "${new Date().toISOString()}"`,
      `word_count: ${result.wordCount}`,
      `language: "${result.language}"`,
    ];
    
    if (result.author) {
      frontMatter.push(`author: "${result.author.replace(/"/g, '\\"')}"`);
    }
    
    if (result.publishDate) {
      frontMatter.push(`published: "${result.publishDate.toISOString()}"`);
    }
    
    if (result.imageUrl) {
      frontMatter.push(`featured_image: "${result.imageUrl}"`);
    }
    
    frontMatter.push('---');
    frontMatter.push('');
    
    const content = [
      ...frontMatter,
      `# ${result.title}`,
      '',
      `**Source:** [${result.url}](${result.url})`,
      '',
      result.excerpt && `**Excerpt:** ${result.excerpt}`,
      '',
      '## Content',
      '',
      result.markdown,
    ].filter(Boolean).join('\n');
    
    if (result.links.length > 0) {
      const linksSection = [
        '',
        '## Links',
        '',
        ...result.links.map(link => `- [${link.text}](${link.url})`),
      ].join('\n');
      
      return content + linksSection;
    }
    
    return content;
  }
  
  private sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9\s\-_\.]/g, '') // Remove special characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .toLowerCase()
      .substring(0, 100); // Limit length
  }
  
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
  
  async cleanup(): Promise<void> {
    await this.screenshotService.cleanup();
    await this.screenshotService.cleanupOldScreenshots();
  }
}