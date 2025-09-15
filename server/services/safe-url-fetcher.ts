import fetch from 'node-fetch';
import { URL } from 'url';
import { createHash } from 'crypto';

interface SafeFetchOptions {
  maxSize?: number; // Max response size in bytes
  timeout?: number; // Timeout in milliseconds
  userAgent?: string;
  allowedSchemes?: string[];
  allowedContentTypes?: string[];
  respectRobotsTxt?: boolean;
}

interface SafeFetchResult {
  content: string;
  contentType: string;
  size: number;
  url: string;
  title?: string;
  robotsAllowed: boolean;
}

export class SafeURLFetcher {
  private readonly defaultOptions: Required<SafeFetchOptions> = {
    maxSize: 10 * 1024 * 1024, // 10MB
    timeout: 30000, // 30 seconds
    userAgent: 'E-Code Web Content Fetcher 1.0',
    allowedSchemes: ['http', 'https'],
    allowedContentTypes: [
      'text/html',
      'text/plain',
      'text/markdown',
      'application/json',
      'text/xml',
      'application/xml'
    ],
    respectRobotsTxt: true,
  };
  
  private readonly blockedDomains = new Set([
    'localhost',
    '127.0.0.1',
    '::1',
    '0.0.0.0',
    '10.0.0.0/8',
    '172.16.0.0/12',
    '192.168.0.0/16',
    '169.254.0.0/16', // Link-local
    'metadata.google.internal', // Cloud metadata
    '169.254.169.254', // AWS metadata
  ]);
  
  async fetchURL(url: string, options: SafeFetchOptions = {}): Promise<SafeFetchResult> {
    const opts = { ...this.defaultOptions, ...options };
    
    // Validate and sanitize URL
    const validatedUrl = this.validateURL(url, opts);
    
    // Check robots.txt if required
    if (opts.respectRobotsTxt) {
      const robotsAllowed = await this.checkRobotsTxt(validatedUrl, opts);
      if (!robotsAllowed) {
        throw new Error('Access denied by robots.txt');
      }
    }
    
    // Fetch content with safety measures
    const response = await this.safeFetch(validatedUrl, opts);
    
    // Validate content type
    const contentType = response.headers.get('content-type') || '';
    if (!this.isAllowedContentType(contentType, opts.allowedContentTypes)) {
      throw new Error(`Content type not allowed: ${contentType}`);
    }
    
    // Read content with size limit
    const content = await this.readContentSafely(response, opts.maxSize);
    
    // Extract title if HTML
    const title = this.extractTitle(content, contentType);
    
    return {
      content,
      contentType,
      size: content.length,
      url: validatedUrl,
      title,
      robotsAllowed: true,
    };
  }
  
  private validateURL(url: string, options: SafeFetchOptions): string {
    let parsedUrl: URL;
    
    try {
      parsedUrl = new URL(url);
    } catch (error) {
      throw new Error('Invalid URL format');
    }
    
    // Check scheme
    if (!options.allowedSchemes?.includes(parsedUrl.protocol.slice(0, -1))) {
      throw new Error(`Scheme not allowed: ${parsedUrl.protocol}`);
    }
    
    // Check for SSRF attempts
    if (this.isBlockedDomain(parsedUrl.hostname)) {
      throw new Error('Access to this domain is not allowed');
    }
    
    // Check for suspicious patterns
    if (this.hasSuspiciousPatterns(parsedUrl.href)) {
      throw new Error('URL contains suspicious patterns');
    }
    
    return parsedUrl.href;
  }
  
  private isBlockedDomain(hostname: string): boolean {
    // Check exact matches
    if (this.blockedDomains.has(hostname.toLowerCase())) {
      return true;
    }
    
    // Check IP address ranges (simplified)
    if (this.isPrivateIP(hostname)) {
      return true;
    }
    
    return false;
  }
  
  private isPrivateIP(hostname: string): boolean {
    // Simple check for private IP ranges
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Regex);
    
    if (match) {
      const [, a, b, c, d] = match.map(Number);
      
      // Private ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
      if (a === 10) return true;
      if (a === 172 && b >= 16 && b <= 31) return true;
      if (a === 192 && b === 168) return true;
      if (a === 127) return true; // Loopback
      if (a === 169 && b === 254) return true; // Link-local
    }
    
    return false;
  }
  
  private hasSuspiciousPatterns(url: string): boolean {
    const suspicious = [
      /localhost/i,
      /\d+\.\d+\.\d+\.\d+/,
      /[0-9a-f:]{2,}::/i, // IPv6
      /@/, // Potential auth bypass
      /file:\/\//i,
      /ftp:\/\//i,
    ];
    
    return suspicious.some(pattern => pattern.test(url));
  }
  
  private async checkRobotsTxt(url: string, options: SafeFetchOptions): Promise<boolean> {
    try {
      const parsedUrl = new URL(url);
      const robotsUrl = `${parsedUrl.protocol}//${parsedUrl.host}/robots.txt`;
      
      const robotsResponse = await fetch(robotsUrl, {
        timeout: 5000,
        headers: {
          'User-Agent': options.userAgent || this.defaultOptions.userAgent,
        },
      });
      
      if (!robotsResponse.ok) {
        // If robots.txt doesn't exist, assume allowed
        return true;
      }
      
      const robotsContent = await robotsResponse.text();
      return this.parseRobotsTxt(robotsContent, options.userAgent || this.defaultOptions.userAgent, parsedUrl.pathname);
    } catch (error) {
      // If we can't check robots.txt, err on the side of caution
      console.warn('Could not check robots.txt:', error);
      return true; // Allow by default
    }
  }
  
  private parseRobotsTxt(content: string, userAgent: string, path: string): boolean {
    const lines = content.split('\n').map(line => line.trim());
    let currentUserAgent = '';
    let isRelevantSection = false;
    
    for (const line of lines) {
      if (line.startsWith('User-agent:')) {
        currentUserAgent = line.substring(11).trim();
        isRelevantSection = currentUserAgent === '*' || 
                           userAgent.toLowerCase().includes(currentUserAgent.toLowerCase());
      } else if (isRelevantSection && line.startsWith('Disallow:')) {
        const disallowedPath = line.substring(9).trim();
        if (disallowedPath && path.startsWith(disallowedPath)) {
          return false;
        }
      }
    }
    
    return true;
  }
  
  private async safeFetch(url: string, options: SafeFetchOptions): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout);
    
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': options.userAgent || this.defaultOptions.userAgent,
        },
        redirect: 'follow',
        follow: 5, // Max redirects
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }
  
  private async readContentSafely(response: any, maxSize: number): Promise<string> {
    const contentLength = parseInt(response.headers.get('content-length') || '0');
    
    if (contentLength > maxSize) {
      throw new Error(`Content too large: ${contentLength} bytes (max: ${maxSize})`);
    }
    
    let content = '';
    let totalSize = 0;
    
    const decoder = new TextDecoder();
    const reader = response.body.getReader();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        totalSize += value.length;
        if (totalSize > maxSize) {
          throw new Error(`Content too large: exceeded ${maxSize} bytes`);
        }
        
        content += decoder.decode(value, { stream: true });
      }
      
      content += decoder.decode(); // Flush
      return content;
    } finally {
      reader.releaseLock();
    }
  }
  
  private isAllowedContentType(contentType: string, allowedTypes: string[]): boolean {
    const type = contentType.toLowerCase().split(';')[0].trim();
    return allowedTypes.some(allowed => type.includes(allowed.toLowerCase()));
  }
  
  private extractTitle(content: string, contentType: string): string | undefined {
    if (contentType.includes('text/html')) {
      const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i);
      return titleMatch ? titleMatch[1].trim() : undefined;
    }
    return undefined;
  }
  
  // Utility method to generate content hash for caching
  generateContentHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }
}