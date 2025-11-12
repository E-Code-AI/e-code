import { AIProviderFactory, type AIProvider } from './ai-providers';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Model configuration with provider metadata
 */
export interface AIModel {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'gemini' | 'xai' | 'groq' | 'perplexity' | 'mixtral' | 'llama' | 'cohere' | 'deepseek' | 'mistral';
  description: string;
  maxTokens: number;
  supportsStreaming: boolean;
  costPer1kTokens?: number;
}

/**
 * Available AI models across all providers
 * Fortune 500-grade model catalog
 */
export const AI_MODELS: AIModel[] = [
  // OpenAI Models
  {
    id: 'gpt-5',
    name: 'GPT-5',
    provider: 'openai',
    description: 'Most advanced OpenAI model for complex reasoning',
    maxTokens: 128000,
    supportsStreaming: true,
    costPer1kTokens: 0.03
  },
  {
    id: 'gpt-4.1',
    name: 'GPT-4.1',
    provider: 'openai',
    description: 'Latest GPT-4 iteration with improved performance',
    maxTokens: 128000,
    supportsStreaming: true,
    costPer1kTokens: 0.01
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    description: 'Optimized GPT-4 for speed and efficiency',
    maxTokens: 128000,
    supportsStreaming: true,
    costPer1kTokens: 0.005
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    description: 'Compact GPT-4o for simple tasks',
    maxTokens: 128000,
    supportsStreaming: true,
    costPer1kTokens: 0.0001
  },
  {
    id: 'o3',
    name: 'O3',
    provider: 'openai',
    description: 'Advanced reasoning model',
    maxTokens: 128000,
    supportsStreaming: true,
    costPer1kTokens: 0.04
  },
  
  // Anthropic Models
  {
    id: 'claude-opus-4-1',
    name: 'Claude Opus 4.1',
    provider: 'anthropic',
    description: 'Most capable Claude model for complex reasoning',
    maxTokens: 200000,
    supportsStreaming: true,
    costPer1kTokens: 0.015
  },
  {
    id: 'claude-sonnet-4-5',
    name: 'Claude Sonnet 4.5',
    provider: 'anthropic',
    description: 'Balanced performance and speed',
    maxTokens: 200000,
    supportsStreaming: true,
    costPer1kTokens: 0.003
  },
  {
    id: 'claude-haiku-4-5',
    name: 'Claude Haiku 4.5',
    provider: 'anthropic',
    description: 'Fastest Claude model for simple tasks',
    maxTokens: 200000,
    supportsStreaming: true,
    costPer1kTokens: 0.0008
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku (Legacy)',
    provider: 'anthropic',
    description: 'Legacy Haiku model - validated working',
    maxTokens: 200000,
    supportsStreaming: true,
    costPer1kTokens: 0.001
  },
  
  // Google Gemini Models
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'gemini',
    description: 'Most advanced Gemini model for complex tasks',
    maxTokens: 1000000,
    supportsStreaming: true,
    costPer1kTokens: 0.0025
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'gemini',
    description: 'Fast multimodal model for general use',
    maxTokens: 1000000,
    supportsStreaming: true,
    costPer1kTokens: 0.0001
  },
  {
    id: 'gemini-2.5-flash-image',
    name: 'Gemini 2.5 Flash Image',
    provider: 'gemini',
    description: 'Optimized for image generation and analysis',
    maxTokens: 1000000,
    supportsStreaming: true,
    costPer1kTokens: 0.0001
  },
  
  // xAI Models
  {
    id: 'grok-2-1212',
    name: 'Grok 2',
    provider: 'xai',
    description: 'xAI flagship model with real-time knowledge',
    maxTokens: 32000,
    supportsStreaming: true,
    costPer1kTokens: 0.002
  },
  
  // Groq Models (via Together AI)
  {
    id: 'mixtral-8x7b',
    name: 'Mixtral 8x7B',
    provider: 'mixtral',
    description: 'Open-source mixture of experts model',
    maxTokens: 32000,
    supportsStreaming: false,
    costPer1kTokens: 0.0006
  },
  {
    id: 'llama-3-70b',
    name: 'Llama 3 70B',
    provider: 'llama',
    description: 'Meta open-source flagship model',
    maxTokens: 8192,
    supportsStreaming: false,
    costPer1kTokens: 0.0009
  }
];

/**
 * Centralized AI Provider Manager
 * Handles multi-provider model selection with Fortune 500-grade error handling
 */
export class AIProviderManager {
  private providers: Map<string, AIProvider> = new Map();
  private anthropicClient?: Anthropic;
  private openaiClient?: OpenAI;
  private geminiClient?: GoogleGenerativeAI;
  
  constructor() {
    this.initializeProviders();
  }
  
  /**
   * Initialize all available providers from environment variables
   */
  private initializeProviders() {
    // OpenAI
    if (process.env.OPENAI_API_KEY) {
      try {
        this.providers.set('openai', AIProviderFactory.create('openai', process.env.OPENAI_API_KEY));
        this.openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      } catch (error) {
        console.warn('Failed to initialize OpenAI provider:', error);
      }
    }
    
    // Anthropic
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        this.providers.set('anthropic', AIProviderFactory.create('anthropic', process.env.ANTHROPIC_API_KEY));
        this.anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      } catch (error) {
        console.warn('Failed to initialize Anthropic provider:', error);
      }
    }
    
    // Gemini
    if (process.env.GEMINI_API_KEY) {
      try {
        this.providers.set('gemini', AIProviderFactory.create('gemini', process.env.GEMINI_API_KEY));
        this.geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      } catch (error) {
        console.warn('Failed to initialize Gemini provider:', error);
      }
    }
    
    // xAI
    if (process.env.XAI_API_KEY) {
      try {
        this.providers.set('xai', AIProviderFactory.create('xai', process.env.XAI_API_KEY));
      } catch (error) {
        console.warn('Failed to initialize xAI provider:', error);
      }
    }
    
    // Other providers
    const otherProviders = ['perplexity', 'mixtral', 'llama', 'cohere', 'deepseek', 'mistral'];
    otherProviders.forEach(provider => {
      const envKey = `${provider.toUpperCase()}_API_KEY`;
      if (process.env[envKey]) {
        try {
          this.providers.set(provider, AIProviderFactory.create(provider, process.env[envKey]!));
        } catch (error) {
          console.warn(`Failed to initialize ${provider} provider:`, error);
        }
      }
    });
  }
  
  /**
   * Get available models based on initialized providers
   */
  getAvailableModels(): AIModel[] {
    return AI_MODELS.filter(model => this.providers.has(model.provider));
  }
  
  /**
   * Get model details by ID
   */
  getModel(modelId: string): AIModel | undefined {
    return AI_MODELS.find(m => m.id === modelId);
  }
  
  /**
   * Generate chat completion with streaming support
   * Routes to appropriate provider based on model ID
   */
  async *generateChatStream(
    modelId: string,
    messages: any[],
    options?: any
  ): AsyncGenerator<string> {
    const model = this.getModel(modelId);
    if (!model) {
      throw new Error(`Model not found: ${modelId}`);
    }
    
    const provider = this.providers.get(model.provider);
    if (!provider) {
      throw new Error(`Provider not initialized: ${model.provider}. Please set ${model.provider.toUpperCase()}_API_KEY environment variable.`);
    }
    
    // Use native streaming for providers that support it
    if (model.provider === 'anthropic' && this.anthropicClient) {
      yield* this.streamAnthropic(modelId, messages, options);
    } else if (model.provider === 'openai' && this.openaiClient) {
      yield* this.streamOpenAI(modelId, messages, options);
    } else if (model.provider === 'gemini' && this.geminiClient) {
      yield* this.streamGemini(modelId, messages, options);
    } else {
      // Fallback to non-streaming for providers without native streaming
      const response = await provider.generateChat(messages, { ...options, model: modelId });
      yield response;
    }
  }
  
  /**
   * Anthropic streaming implementation
   */
  private async *streamAnthropic(modelId: string, messages: any[], options?: any): AsyncGenerator<string> {
    if (!this.anthropicClient) throw new Error('Anthropic client not initialized');
    
    const anthropicMessages = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'assistant' as const : 'user' as const,
      content: m.content
    }));
    
    const systemMessage = messages.find(m => m.role === 'system')?.content;
    
    const stream = await this.anthropicClient.messages.create({
      model: modelId,
      messages: anthropicMessages,
      system: systemMessage,
      max_tokens: options?.max_tokens || 4000,
      temperature: options?.temperature || 0.7,
      stream: true,
    });
    
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        yield chunk.delta.text;
      }
    }
  }
  
  /**
   * OpenAI streaming implementation
   */
  private async *streamOpenAI(modelId: string, messages: any[], options?: any): AsyncGenerator<string> {
    if (!this.openaiClient) throw new Error('OpenAI client not initialized');
    
    // @ts-ignore - OpenAI SDK stream type inference
    const stream = await this.openaiClient.chat.completions.create({
      model: modelId,
      messages,
      stream: true,
      max_tokens: options?.max_tokens || 4000,
      temperature: options?.temperature || 0.7,
      ...options
    });
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }
  
  /**
   * Gemini streaming implementation
   */
  private async *streamGemini(modelId: string, messages: any[], options?: any): AsyncGenerator<string> {
    if (!this.geminiClient) throw new Error('Gemini client not initialized');
    
    const model = this.geminiClient.getGenerativeModel({ model: modelId });
    
    const systemMessage = messages.find(m => m.role === 'system')?.content || '';
    const chatMessages = messages.filter(m => m.role !== 'system');
    
    const chat = model.startChat({
      history: chatMessages.slice(0, -1).map(m => ({
        role: m.role === 'user' ? 'user' as const : 'model' as const,
        parts: [{ text: m.content }]
      })),
      systemInstruction: systemMessage,
    });
    
    const lastMessage = chatMessages[chatMessages.length - 1]?.content || '';
    const result = await chat.sendMessageStream(lastMessage);
    
    for await (const chunk of result.stream) {
      yield chunk.text();
    }
  }
  
  /**
   * Non-streaming generation for compatibility
   */
  async generateChat(modelId: string, messages: any[], options?: any): Promise<string> {
    let fullResponse = '';
    for await (const chunk of this.generateChatStream(modelId, messages, options)) {
      fullResponse += chunk;
    }
    return fullResponse;
  }
}

// Singleton instance
export const aiProviderManager = new AIProviderManager();
