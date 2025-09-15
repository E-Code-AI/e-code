import { JSDOM } from 'jsdom';
import { marked } from 'marked';

interface ExtractedContent {
  title: string;
  content: string;
  markdown: string;
  excerpt: string;
  wordCount: number;
  language: string;
  author?: string;
  publishDate?: Date;
  imageUrl?: string;
  links: Array<{ text: string; url: string }>;
  headings: Array<{ level: number; text: string }>;
}

export class ContentExtractionService {
  private readonly minContentLength = 200;
  private readonly maxContentLength = 100000;
  
  async extractContent(html: string, baseUrl?: string): Promise<ExtractedContent> {
    const dom = new JSDOM(html, { url: baseUrl });
    const document = dom.window.document;
    
    // Clean up the document
    this.removeUnwantedElements(document);
    
    // Extract metadata
    const title = this.extractTitle(document);
    const author = this.extractAuthor(document);
    const publishDate = this.extractPublishDate(document);
    const imageUrl = this.extractFeaturedImage(document, baseUrl);
    const language = this.detectLanguage(document);
    
    // Find main content
    const contentElement = this.findMainContent(document);
    
    // Extract and clean content
    const cleanContent = this.cleanContent(contentElement);
    const textContent = this.extractTextContent(cleanContent);
    
    // Convert to markdown
    const markdown = this.htmlToMarkdown(cleanContent);
    
    // Extract additional elements
    const links = this.extractLinks(cleanContent, baseUrl);
    const headings = this.extractHeadings(cleanContent);
    
    // Generate excerpt
    const excerpt = this.generateExcerpt(textContent);
    
    // Count words
    const wordCount = this.countWords(textContent);
    
    return {
      title,
      content: textContent,
      markdown,
      excerpt,
      wordCount,
      language,
      author,
      publishDate,
      imageUrl,
      links,
      headings,
    };
  }
  
  private removeUnwantedElements(document: Document): void {
    const unwantedSelectors = [
      'script',
      'style',
      'noscript',
      'iframe',
      'embed',
      'object',
      'form',
      '.advertisement',
      '.ads',
      '.social-media',
      '.comments',
      '.footer',
      '.header',
      '.navigation',
      '.nav',
      '.sidebar',
      '.menu',
      '[role="banner"]',
      '[role="navigation"]',
      '[role="complementary"]',
      '[role="contentinfo"]',
    ];
    
    unwantedSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => element.remove());
    });
  }
  
  private extractTitle(document: Document): string {
    // Try multiple methods to find title
    const titleSources = [
      () => document.querySelector('meta[property="og:title"]')?.getAttribute('content'),
      () => document.querySelector('meta[name="twitter:title"]')?.getAttribute('content'),
      () => document.querySelector('h1')?.textContent,
      () => document.querySelector('title')?.textContent,
      () => document.querySelector('.title')?.textContent,
      () => document.querySelector('#title')?.textContent,
    ];
    
    for (const source of titleSources) {
      const title = source()?.trim();
      if (title && title.length > 0) {
        return title;
      }
    }
    
    return 'Untitled';
  }
  
  private extractAuthor(document: Document): string | undefined {
    const authorSources = [
      () => document.querySelector('meta[name="author"]')?.getAttribute('content'),
      () => document.querySelector('meta[property="article:author"]')?.getAttribute('content'),
      () => document.querySelector('.author')?.textContent,
      () => document.querySelector('.byline')?.textContent,
      () => document.querySelector('[rel="author"]')?.textContent,
    ];
    
    for (const source of authorSources) {
      const author = source()?.trim();
      if (author && author.length > 0) {
        return author;
      }
    }
    
    return undefined;
  }
  
  private extractPublishDate(document: Document): Date | undefined {
    const dateSources = [
      () => document.querySelector('meta[property="article:published_time"]')?.getAttribute('content'),
      () => document.querySelector('meta[name="date"]')?.getAttribute('content'),
      () => document.querySelector('time[datetime]')?.getAttribute('datetime'),
      () => document.querySelector('.date')?.textContent,
      () => document.querySelector('.published')?.textContent,
    ];
    
    for (const source of dateSources) {
      const dateStr = source()?.trim();
      if (dateStr) {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }
    
    return undefined;
  }
  
  private extractFeaturedImage(document: Document, baseUrl?: string): string | undefined {
    const imageSources = [
      () => document.querySelector('meta[property="og:image"]')?.getAttribute('content'),
      () => document.querySelector('meta[name="twitter:image"]')?.getAttribute('content'),
      () => document.querySelector('.featured-image img')?.getAttribute('src'),
      () => document.querySelector('article img')?.getAttribute('src'),
    ];
    
    for (const source of imageSources) {
      const imageUrl = source()?.trim();
      if (imageUrl) {
        // Convert relative URLs to absolute
        if (baseUrl && !imageUrl.startsWith('http')) {
          try {
            return new URL(imageUrl, baseUrl).href;
          } catch {
            continue;
          }
        }
        return imageUrl;
      }
    }
    
    return undefined;
  }
  
  private detectLanguage(document: Document): string {
    const lang = document.documentElement?.getAttribute('lang') ||
                document.querySelector('meta[http-equiv="Content-Language"]')?.getAttribute('content') ||
                'en';
    
    return lang.split('-')[0].toLowerCase();
  }
  
  private findMainContent(document: Document): Element {
    // Try to find main content using various strategies
    const contentSelectors = [
      'main',
      '[role="main"]',
      'article',
      '.content',
      '.main-content',
      '.post-content',
      '.entry-content',
      '#content',
      '#main',
    ];
    
    for (const selector of contentSelectors) {
      const element = document.querySelector(selector);
      if (element && this.hasSignificantContent(element)) {
        return element;
      }
    }
    
    // Fallback: find the element with the most text content
    return this.findElementWithMostText(document.body);
  }
  
  private hasSignificantContent(element: Element): boolean {
    const text = element.textContent || '';
    return text.trim().length >= this.minContentLength;
  }
  
  private findElementWithMostText(element: Element): Element {
    let bestElement = element;
    let maxTextLength = (element.textContent || '').length;
    
    const candidates = element.querySelectorAll('div, article, section, main');
    
    for (const candidate of candidates) {
      const textLength = (candidate.textContent || '').length;
      if (textLength > maxTextLength) {
        maxTextLength = textLength;
        bestElement = candidate;
      }
    }
    
    return bestElement;
  }
  
  private cleanContent(element: Element): Element {
    const clone = element.cloneNode(true) as Element;
    
    // Remove elements with low content-to-markup ratio
    const descendants = clone.querySelectorAll('*');
    descendants.forEach(descendant => {
      const text = (descendant.textContent || '').trim();
      const html = descendant.innerHTML;
      
      if (text.length < 20 && html.length > text.length * 3) {
        // High markup-to-content ratio, likely not valuable
        descendant.remove();
      }
    });
    
    return clone;
  }
  
  private extractTextContent(element: Element): string {
    // Get text content while preserving some structure
    const walker = element.ownerDocument.createTreeWalker(
      element,
      element.ownerDocument.defaultView.NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    const textParts: string[] = [];
    let node;
    
    while (node = walker.nextNode()) {
      const text = node.textContent?.trim();
      if (text) {
        textParts.push(text);
      }
    }
    
    return textParts.join(' ').replace(/\s+/g, ' ').trim();
  }
  
  private htmlToMarkdown(element: Element): string {
    // Simple HTML to Markdown conversion
    let html = element.innerHTML;
    
    // Convert headings
    html = html.replace(/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi, (match, level, text) => {
      return '\n' + '#'.repeat(parseInt(level)) + ' ' + text.trim() + '\n\n';
    });
    
    // Convert paragraphs
    html = html.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
    
    // Convert line breaks
    html = html.replace(/<br[^>]*>/gi, '\n');
    
    // Convert links
    html = html.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
    
    // Convert emphasis
    html = html.replace(/<(strong|b)[^>]*>(.*?)<\/(strong|b)>/gi, '**$2**');
    html = html.replace(/<(em|i)[^>]*>(.*?)<\/(em|i)>/gi, '*$2*');
    
    // Convert code
    html = html.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
    
    // Convert lists
    html = html.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
    html = html.replace(/<(ul|ol)[^>]*>/gi, '\n');
    html = html.replace(/<\/(ul|ol)>/gi, '\n');
    
    // Remove remaining HTML tags
    html = html.replace(/<[^>]*>/g, '');
    
    // Clean up whitespace
    html = html.replace(/\n\s*\n/g, '\n\n');
    html = html.replace(/^\s+|\s+$/g, '');
    
    return html;
  }
  
  private extractLinks(element: Element, baseUrl?: string): Array<{ text: string; url: string }> {
    const links: Array<{ text: string; url: string }> = [];
    const linkElements = element.querySelectorAll('a[href]');
    
    linkElements.forEach(link => {
      const href = link.getAttribute('href');
      const text = (link.textContent || '').trim();
      
      if (href && text) {
        let url = href;
        
        // Convert relative URLs to absolute
        if (baseUrl && !href.startsWith('http') && !href.startsWith('#')) {
          try {
            url = new URL(href, baseUrl).href;
          } catch {
            return; // Skip invalid URLs
          }
        }
        
        links.push({ text, url });
      }
    });
    
    return links;
  }
  
  private extractHeadings(element: Element): Array<{ level: number; text: string }> {
    const headings: Array<{ level: number; text: string }> = [];
    const headingElements = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
    
    headingElements.forEach(heading => {
      const level = parseInt(heading.tagName.charAt(1));
      const text = (heading.textContent || '').trim();
      
      if (text) {
        headings.push({ level, text });
      }
    });
    
    return headings;
  }
  
  private generateExcerpt(content: string, length: number = 200): string {
    if (content.length <= length) {
      return content;
    }
    
    // Find the last complete sentence within the length limit
    const truncated = content.substring(0, length);
    const lastSentence = truncated.lastIndexOf('.');
    
    if (lastSentence > length * 0.6) {
      return content.substring(0, lastSentence + 1);
    }
    
    // Fallback: truncate at word boundary
    const lastSpace = truncated.lastIndexOf(' ');
    return content.substring(0, lastSpace) + '...';
  }
  
  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }
}