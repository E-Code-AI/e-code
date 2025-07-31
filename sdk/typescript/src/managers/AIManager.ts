import { AxiosInstance } from 'axios';
import { AIProviderType, AIResponse, AIRequestOptions } from '../types';

export class AIManager {
  constructor(private client: AxiosInstance) {}

  /**
   * Get available AI providers
   */
  async getProviders(): Promise<{
    provider: AIProviderType;
    name: string;
    description: string;
    capabilities: string[];
    isAvailable: boolean;
    pricing?: {
      inputTokens: number;
      outputTokens: number;
      currency: string;
    };
  }[]> {
    const response = await this.client.get('/ai/providers');
    return response.data;
  }

  /**
   * Chat with AI assistant
   */
  async chat(options: AIRequestOptions): Promise<AIResponse> {
    const response = await this.client.post('/ai/chat', options);
    return response.data;
  }

  /**
   * Generate code completion
   */
  async complete(code: string, language: string, provider?: AIProviderType): Promise<{
    completions: string[];
    provider: AIProviderType;
  }> {
    const response = await this.client.post('/ai/completion', {
      code,
      language,
      provider
    });
    return response.data;
  }

  /**
   * Explain code
   */
  async explain(code: string, language: string, provider?: AIProviderType): Promise<{
    explanation: string;
    keyPoints: string[];
    complexity: 'low' | 'medium' | 'high';
    suggestions?: string[];
    provider: AIProviderType;
  }> {
    const response = await this.client.post('/ai/explanation', {
      code,
      language,
      provider
    });
    return response.data;
  }

  /**
   * Convert code between languages
   */
  async convert(code: string, fromLanguage: string, toLanguage: string, provider?: AIProviderType): Promise<{
    convertedCode: string;
    notes: string[];
    provider: AIProviderType;
  }> {
    const response = await this.client.post('/ai/convert', {
      code,
      fromLanguage,
      toLanguage,
      provider
    });
    return response.data;
  }

  /**
   * Generate documentation
   */
  async generateDocs(code: string, language: string, style?: string, provider?: AIProviderType): Promise<{
    documentation: string;
    format: string;
    provider: AIProviderType;
  }> {
    const response = await this.client.post('/ai/document', {
      code,
      language,
      style,
      provider
    });
    return response.data;
  }

  /**
   * Generate tests
   */
  async generateTests(code: string, language: string, framework?: string, provider?: AIProviderType): Promise<{
    tests: string;
    framework: string;
    coverage: string[];
    provider: AIProviderType;
  }> {
    const response = await this.client.post('/ai/tests', {
      code,
      language,
      framework,
      provider
    });
    return response.data;
  }

  /**
   * Review code
   */
  async reviewCode(code: string, language: string, provider?: AIProviderType): Promise<{
    score: number;
    issues: {
      line: number;
      severity: 'low' | 'medium' | 'high' | 'critical';
      category: string;
      message: string;
      suggestion?: string;
    }[];
    strengths: string[];
    improvements: string[];
    provider: AIProviderType;
  }> {
    const response = await this.client.post('/ai/review', {
      code,
      language,
      provider
    });
    return response.data;
  }

  /**
   * Detect bugs
   */
  async detectBugs(code: string, language: string, provider?: AIProviderType): Promise<{
    bugs: {
      line: number;
      severity: 'low' | 'medium' | 'high' | 'critical';
      type: string;
      description: string;
      fix?: string;
    }[];
    provider: AIProviderType;
  }> {
    const response = await this.client.post('/ai/bugs', {
      code,
      language,
      provider
    });
    return response.data;
  }

  /**
   * Refactor code
   */
  async refactor(code: string, language: string, style?: string, provider?: AIProviderType): Promise<{
    refactoredCode: string;
    changes: {
      type: string;
      description: string;
      benefit: string;
    }[];
    provider: AIProviderType;
  }> {
    const response = await this.client.post('/ai/refactor', {
      code,
      language,
      style,
      provider
    });
    return response.data;
  }

  /**
   * Optimize code performance
   */
  async optimize(code: string, language: string, provider?: AIProviderType): Promise<{
    optimizedCode: string;
    improvements: {
      type: string;
      description: string;
      impact: string;
    }[];
    performanceGain: string;
    provider: AIProviderType;
  }> {
    const response = await this.client.post('/ai/optimize', {
      code,
      language,
      provider
    });
    return response.data;
  }

  /**
   * Get AI usage statistics
   */
  async getUsageStats(period?: string): Promise<{
    period: string;
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    byProvider: {
      provider: AIProviderType;
      requests: number;
      tokens: number;
      cost: number;
    }[];
    byType: {
      type: string;
      requests: number;
      tokens: number;
      cost: number;
    }[];
  }> {
    const response = await this.client.get('/ai/usage', {
      params: { period }
    });
    return response.data;
  }

  /**
   * Stream chat response
   */
  async streamChat(options: AIRequestOptions, onChunk: (chunk: string) => void): Promise<void> {
    const response = await this.client.post('/ai/chat/stream', options, {
      responseType: 'stream'
    });

    return new Promise((resolve, reject) => {
      response.data.on('data', (chunk: Buffer) => {
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.chunk) {
                onChunk(data.chunk);
              }
              if (data.done) {
                resolve();
                return;
              }
            } catch (error) {
              // Ignore malformed chunks
            }
          }
        }
      });

      response.data.on('error', reject);
      response.data.on('end', resolve);
    });
  }

  /**
   * Get AI model information
   */
  async getModelInfo(provider: AIProviderType): Promise<{
    provider: AIProviderType;
    models: {
      id: string;
      name: string;
      description: string;
      contextLength: number;
      capabilities: string[];
      pricing: {
        input: number;
        output: number;
        currency: string;
      };
    }[];
  }> {
    const response = await this.client.get(`/ai/providers/${provider}/models`);
    return response.data;
  }
}