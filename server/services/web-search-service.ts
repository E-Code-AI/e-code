import { createLogger } from '../utils/logger';
import fetch from 'node-fetch';

const logger = createLogger('web-search-service');

export interface WebSearchResult {
  title: string;
  snippet: string;
  url: string;
  source: string;
}

export interface WebSearchOptions {
  numResults?: number;
  timeRange?: 'day' | 'week' | 'month' | 'year' | 'all';
  safeSearch?: boolean;
}

class WebSearchService {
  private searchProviders: Map<string, SearchProvider>;

  constructor() {
    this.searchProviders = new Map();
    this.initializeProviders();
  }

  private initializeProviders() {
    // Google Search API (requires API key)
    if (process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID) {
      this.searchProviders.set('google', new GoogleSearchProvider(
        process.env.GOOGLE_SEARCH_API_KEY,
        process.env.GOOGLE_SEARCH_ENGINE_ID
      ));
    }

    // DuckDuckGo (no API key required)
    this.searchProviders.set('duckduckgo', new DuckDuckGoProvider());

    // Serper API (requires API key)
    if (process.env.SERPER_API_KEY) {
      this.searchProviders.set('serper', new SerperProvider(process.env.SERPER_API_KEY));
    }
  }

  async search(query: string, options: WebSearchOptions = {}): Promise<WebSearchResult[]> {
    const { numResults = 5, timeRange = 'all', safeSearch = true } = options;

    // Try available providers in order of preference
    const providers = ['serper', 'google', 'duckduckgo'];
    
    for (const providerName of providers) {
      const provider = this.searchProviders.get(providerName);
      if (provider) {
        try {
          logger.info(`Searching with ${providerName}: ${query}`);
          const results = await provider.search(query, { numResults, timeRange, safeSearch });
          if (results.length > 0) {
            return results;
          }
        } catch (error) {
          logger.error(`Search failed with ${providerName}:`, error);
        }
      }
    }

    // Fallback response if all providers fail
    return [{
      title: 'Search Unavailable',
      snippet: 'Web search is temporarily unavailable. Please configure search API keys in environment variables.',
      url: '#',
      source: 'system'
    }];
  }

  async searchForDocs(query: string, domain?: string): Promise<WebSearchResult[]> {
    const searchQuery = domain ? `site:${domain} ${query}` : `${query} documentation`;
    return this.search(searchQuery, { numResults: 10 });
  }

  async searchForCode(query: string, language?: string): Promise<WebSearchResult[]> {
    const searchQuery = language ? `${query} ${language} example code` : `${query} code example`;
    return this.search(searchQuery, { numResults: 5 });
  }

  async searchForNews(query: string): Promise<WebSearchResult[]> {
    return this.search(query, { numResults: 10, timeRange: 'week' });
  }
}

// Search Provider Interface
interface SearchProvider {
  search(query: string, options: WebSearchOptions): Promise<WebSearchResult[]>;
}

// Google Search Provider
class GoogleSearchProvider implements SearchProvider {
  constructor(
    private apiKey: string,
    private engineId: string
  ) {}

  async search(query: string, options: WebSearchOptions): Promise<WebSearchResult[]> {
    const params = new URLSearchParams({
      key: this.apiKey,
      cx: this.engineId,
      q: query,
      num: options.numResults?.toString() || '5',
      safe: options.safeSearch ? 'active' : 'off'
    });

    if (options.timeRange && options.timeRange !== 'all') {
      const dateRestrict = {
        'day': 'd1',
        'week': 'w1',
        'month': 'm1',
        'year': 'y1'
      };
      params.append('dateRestrict', dateRestrict[options.timeRange]);
    }

    const response = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`);
    const data = await response.json() as any;

    if (!response.ok) {
      throw new Error(`Google Search API error: ${data.error?.message || response.statusText}`);
    }

    return (data.items || []).map((item: any) => ({
      title: item.title,
      snippet: item.snippet,
      url: item.link,
      source: 'google'
    }));
  }
}

// DuckDuckGo Provider (using HTML scraping as fallback)
class DuckDuckGoProvider implements SearchProvider {
  async search(query: string, options: WebSearchOptions): Promise<WebSearchResult[]> {
    // Use DuckDuckGo Instant Answer API (limited but no key required)
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      no_html: '1',
      skip_disambig: '1'
    });

    try {
      const response = await fetch(`https://api.duckduckgo.com/?${params}`);
      const data = await response.json() as any;

      const results: WebSearchResult[] = [];

      // Add instant answer if available
      if (data.AbstractText) {
        results.push({
          title: data.Heading || query,
          snippet: data.AbstractText,
          url: data.AbstractURL || '#',
          source: 'duckduckgo'
        });
      }

      // Add related topics
      [...(data.RelatedTopics || [])].slice(0, options.numResults || 5).forEach((topic: any) => {
        if (topic.Text) {
          results.push({
            title: topic.Text.split(' - ')[0] || query,
            snippet: topic.Text,
            url: topic.FirstURL || '#',
            source: 'duckduckgo'
          });
        }
      });

      return results;
    } catch (error) {
      logger.error('DuckDuckGo search failed:', error);
      return [];
    }
  }
}

// Serper API Provider (recommended for production)
class SerperProvider implements SearchProvider {
  constructor(private apiKey: string) {}

  async search(query: string, options: WebSearchOptions): Promise<WebSearchResult[]> {
    const body = {
      q: query,
      num: options.numResults || 5
    };

    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Serper API error: ${response.statusText}`);
    }

    const data = await response.json() as any;

    return (data.organic || []).map((result: any) => ({
      title: result.title,
      snippet: result.snippet,
      url: result.link,
      source: 'serper'
    }));
  }
}

export const webSearchService = new WebSearchService();