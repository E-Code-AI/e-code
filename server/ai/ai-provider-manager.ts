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
 * ONLY REAL, CURRENTLY SUPPORTED MODELS (November 2025)
 * Fortune 500-grade model catalog
 */
export const AI_MODELS: AIModel[] = [
  // OpenAI Models - VERIFIED REAL MODELS ONLY (as of November 2025)
  // Source: https://platform.openai.com/docs/models
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    description: 'Latest multimodal GPT-4 optimized model',
    maxTokens: 128000,
    supportsStreaming: true,
    costPer1kTokens: 0.005
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    description: 'Compact GPT-4o for cost-effective tasks',
    maxTokens: 128000,
    supportsStreaming: true,
    costPer1kTokens: 0.00015
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    description: 'Enhanced GPT-4 with 128K context window',
    maxTokens: 128000,
    supportsStreaming: true,
    costPer1kTokens: 0.01
  },
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'openai',
    description: 'Standard GPT-4 model',
    maxTokens: 8192,
    supportsStreaming: true,
    costPer1kTokens: 0.03
  },
  
  // Anthropic Models - REAL models only
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    description: 'Latest Claude model - balanced performance',
    maxTokens: 200000,
    supportsStreaming: true,
    costPer1kTokens: 0.003
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    description: 'Fast Claude model for simple tasks - validated working',
    maxTokens: 200000,
    supportsStreaming: true,
    costPer1kTokens: 0.001
  },
  {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    description: 'Most capable Claude 3 model for complex reasoning',
    maxTokens: 200000,
    supportsStreaming: true,
    costPer1kTokens: 0.015
  },
  
  // Google Gemini Models - REAL models only
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'gemini',
    description: 'Advanced Gemini model with 1M context window',
    maxTokens: 1000000,
    supportsStreaming: true,
    costPer1kTokens: 0.00125
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'gemini',
    description: 'Fast multimodal model for general use',
    maxTokens: 1000000,
    supportsStreaming: true,
    costPer1kTokens: 0.000075
  },
  
  // xAI Models - REAL models only
  {
    id: 'grok-2-1212',
    name: 'Grok 2',
    provider: 'xai',
    description: 'xAI flagship model with real-time knowledge',
    maxTokens: 32000,
    supportsStreaming: true,
    costPer1kTokens: 0.002
  },
  
  // Groq Models - REAL models only
  // Note: provider='groq' indicates the serving infrastructure (Groq API)
  // Model IDs follow Groq's API naming convention
  {
    id: 'mixtral-8x7b-32768',
    name: 'Mixtral 8x7B',
    provider: 'groq',
    description: 'Open-source mixture of experts model served by Groq',
    maxTokens: 32768,
    supportsStreaming: false,
    costPer1kTokens: 0.0006
  },
  {
    id: 'llama3-70b-8192',
    name: 'Llama 3 70B',
    provider: 'groq',
    description: 'Meta open-source model served by Groq',
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
    // DEBUG: Log environment variable state
    console.log('[AI Provider Manager] Initializing providers...');
    console.log('[AI Provider Manager] OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
    console.log('[AI Provider Manager] ANTHROPIC_API_KEY exists:', !!process.env.ANTHROPIC_API_KEY);
    console.log('[AI Provider Manager] GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
    console.log('[AI Provider Manager] XAI_API_KEY exists:', !!process.env.XAI_API_KEY);
    
    // OpenAI
    if (process.env.OPENAI_API_KEY) {
      try {
        this.providers.set('openai', AIProviderFactory.create('openai', process.env.OPENAI_API_KEY));
        this.openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        console.log('[AI Provider Manager] ✓ OpenAI provider initialized');
      } catch (error) {
        console.warn('[AI Provider Manager] Failed to initialize OpenAI provider:', error);
      }
    } else {
      console.warn('[AI Provider Manager] OpenAI API key not found in environment');
    }
    
    // Anthropic
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        this.providers.set('anthropic', AIProviderFactory.create('anthropic', process.env.ANTHROPIC_API_KEY));
        this.anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        console.log('[AI Provider Manager] ✓ Anthropic provider initialized');
      } catch (error) {
        console.warn('[AI Provider Manager] Failed to initialize Anthropic provider:', error);
      }
    } else {
      console.warn('[AI Provider Manager] Anthropic API key not found in environment');
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
    
    // xAI (Grok)
    if (process.env.XAI_API_KEY) {
      try {
        this.providers.set('xai', AIProviderFactory.create('xai', process.env.XAI_API_KEY));
        console.log('[AI Provider Manager] ✓ xAI provider initialized');
      } catch (error) {
        console.warn('[AI Provider Manager] Failed to initialize xAI provider:', error);
      }
    } else {
      console.warn('[AI Provider Manager] xAI API key not found in environment');
    }
    
    // Groq (Mixtral, Llama)
    if (process.env.GROQ_API_KEY) {
      try {
        this.providers.set('groq', AIProviderFactory.create('groq', process.env.GROQ_API_KEY));
        console.log('[AI Provider Manager] ✓ Groq provider initialized');
      } catch (error) {
        console.warn('[AI Provider Manager] Failed to initialize Groq provider:', error);
      }
    } else {
      console.warn('[AI Provider Manager] Groq API key not found in environment');
    }
    
    // Other providers (for future expansion)
    const otherProviders = ['perplexity', 'cohere', 'deepseek', 'mistral'];
    otherProviders.forEach(provider => {
      const envKey = `${provider.toUpperCase()}_API_KEY`;
      if (process.env[envKey]) {
        try {
          this.providers.set(provider, AIProviderFactory.create(provider, process.env[envKey]!));
          console.log(`[AI Provider Manager] ✓ ${provider} provider initialized`);
        } catch (error) {
          console.warn(`[AI Provider Manager] Failed to initialize ${provider} provider:`, error);
        }
      }
    });
    
    // Log summary
    const providerCount = this.providers.size;
    console.log(`[AI Provider Manager] Initialization complete: ${providerCount} provider(s) initialized`);
    if (providerCount === 0) {
      console.error('[AI Provider Manager] ⚠️  NO PROVIDERS INITIALIZED! Please configure API keys in Replit Secrets.');
    }
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
   * Get model details by ID (alias for getModel)
   */
  getModelById(modelId: string): AIModel | undefined {
    return this.getModel(modelId);
  }
  
  /**
   * Stream chat completion with the selected model
   * Routes to appropriate provider based on model ID
   * 
   * @param modelId The model ID to use (e.g., "gpt-4o", "claude-3-5-sonnet-20241022")
   * @param messages Array of chat messages with role and content
   * @param options Additional options like system prompt, max_tokens, temperature
   */
  async *streamChat(
    modelId: string,
    messages: any[],
    options?: { system?: string; max_tokens?: number; temperature?: number }
  ): AsyncGenerator<string> {
    // Add system message to messages array if provided
    const messagesWithSystem = options?.system 
      ? [{ role: 'system', content: options.system }, ...messages]
      : messages;
    
    yield* this.generateChatStream(modelId, messagesWithSystem, options);
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
    // ✅ CRITICAL FIX: Removed internal Anthropic→GPT fallback that was breaking external fallback chain
    // Now errors propagate cleanly to ai-plan-generator.service.ts which handles full fallback logic
    if (model.provider === 'anthropic' && this.anthropicClient) {
      // Log provider errors for debugging but let them propagate
      try {
        yield* this.streamAnthropic(modelId, messages, options);
      } catch (error: any) {
        console.error(`[AIProviderManager] Anthropic streaming failed for ${modelId}:`, error.status, error.message || JSON.stringify(error));
        throw error; // Propagate to outer fallback loop
      }
    } else if (model.provider === 'openai' && this.openaiClient) {
      try {
        yield* this.streamOpenAI(modelId, messages, options);
      } catch (error: any) {
        console.error(`[AIProviderManager] OpenAI streaming failed for ${modelId}:`, error.status, error.message || JSON.stringify(error));
        throw error; // Propagate to outer fallback loop
      }
    } else if (model.provider === 'gemini' && this.geminiClient) {
      try {
        yield* this.streamGemini(modelId, messages, options);
      } catch (error: any) {
        console.error(`[AIProviderManager] Gemini streaming failed for ${modelId}:`, error.status, error.message || JSON.stringify(error));
        throw error; // Propagate to outer fallback loop
      }
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
    
    // ✅ FIX: OpenAI expects system message in messages array, not as separate parameter
    let openaiMessages = [...messages];
    if (options?.system && !messages.find(m => m.role === 'system')) {
      openaiMessages = [
        { role: 'system', content: options.system },
        ...messages
      ];
    }
    
    // OpenAI SDK returns Stream<ChatCompletionChunk> when stream: true
    // TypeScript can't infer the return type, so we need to cast it
    const stream = await this.openaiClient.chat.completions.create({
      model: modelId,
      messages: openaiMessages,
      stream: true,
      max_tokens: options?.max_tokens || 4000,
      temperature: options?.temperature || 0.7,
      // ✅ FIX: Don't spread options to avoid passing unsupported parameters like 'system'
    }) as unknown as AsyncIterable<any>;
    
    for await (const chunk of stream) {
      const content = chunk.choices?.[0]?.delta?.content;
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
