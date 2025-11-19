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
  provider: 'openai' | 'anthropic' | 'gemini' | 'xai' | 'groq' | 'perplexity' | 'mixtral' | 'llama' | 'cohere' | 'deepseek' | 'mistral' | 'moonshot';
  description: string;
  maxTokens: number;
  supportsStreaming: boolean;
  costPer1kTokens?: number;
  available?: boolean; // Flag to indicate if provider is configured/initialized
}

/**
 * Available AI models across all providers
 * ONLY REAL, CURRENTLY SUPPORTED MODELS (November 2025)
 * Fortune 500-grade model catalog
 */
export const AI_MODELS: AIModel[] = [
  // OpenAI Models - VRAIS modèles selon https://platform.openai.com/docs/models
  {
    id: 'gpt-5.1',
    name: 'GPT-5.1',
    provider: 'openai',
    description: 'Current flagship - adaptive reasoning with apply_patch & shell tools (Nov 12, 2025)',
    maxTokens: 400000,
    supportsStreaming: true,
    costPer1kTokens: 0.005
  },
  {
    id: 'gpt-5',
    name: 'GPT-5',
    provider: 'openai',
    description: 'Previous flagship - legacy but available (Aug 2025)',
    maxTokens: 400000,
    supportsStreaming: true,
    costPer1kTokens: 0.005
  },
  {
    id: 'gpt-5-mini',
    name: 'GPT-5 Mini',
    provider: 'openai',
    description: 'Cost-optimized reasoning - balances speed, cost, capability',
    maxTokens: 400000,
    supportsStreaming: true,
    costPer1kTokens: 0.001
  },
  {
    id: 'gpt-5-nano',
    name: 'GPT-5 Nano',
    provider: 'openai',
    description: 'High-throughput for simple tasks - most affordable',
    maxTokens: 400000,
    supportsStreaming: true,
    costPer1kTokens: 0.0005
  },
  // ✅ GPT-4.1 REMOVED (Nov 17, 2025): Deprecated in favor of GPT-5.1
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    description: 'Multimodal flagship - text, vision, audio',
    maxTokens: 128000,
    supportsStreaming: true,
    costPer1kTokens: 0.0025
  },
  {
    id: 'o3',
    name: 'o3',
    provider: 'openai',
    description: 'Advanced reasoning for complex problem solving',
    maxTokens: 128000,
    supportsStreaming: true,
    costPer1kTokens: 0.015
  },
  {
    id: 'o4-mini',
    name: 'o4 Mini',
    provider: 'openai',
    description: 'Budget-friendly reasoning for STEM tasks',
    maxTokens: 128000,
    supportsStreaming: true,
    costPer1kTokens: 0.003
  },
  
  // Anthropic Models - LATEST NOVEMBER 2025
  // Source: https://docs.claude.com/en/docs/about-claude/models
  {
    id: 'claude-sonnet-4-5-20250929',
    name: 'Claude Sonnet 4.5',
    provider: 'anthropic',
    description: 'Best coding model in the world - strongest at agents & computer use (Sept 29, 2025)',
    maxTokens: 200000,
    supportsStreaming: true,
    costPer1kTokens: 0.003
  },
  {
    id: 'claude-opus-4-1-20250805',
    name: 'Claude Opus 4.1',
    provider: 'anthropic',
    description: 'Upgraded for agentic tasks & real-world coding - 74.5% on SWE-bench (Aug 5, 2025)',
    maxTokens: 200000,
    supportsStreaming: true,
    costPer1kTokens: 0.015
  },
  {
    id: 'claude-haiku-4-5-20251015',
    name: 'Claude Haiku 4.5',
    provider: 'anthropic',
    description: 'Fastest model - matches Sonnet 4 on coding at 1/3 the cost (Oct 15, 2025)',
    maxTokens: 200000,
    supportsStreaming: true,
    costPer1kTokens: 0.001
  },
  
  // Google Gemini Models - LATEST NOVEMBER 2025
  // Source: https://ai.google.dev/gemini-api/docs/models
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'gemini',
    description: 'Stable release with adaptive thinking - 2M token context coming soon (Nov 2025)',
    maxTokens: 1000000,
    supportsStreaming: true,
    costPer1kTokens: 0.00125
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'gemini',
    description: 'Hybrid reasoning - thinks before it speaks with low latency (Nov 2025)',
    maxTokens: 1000000,
    supportsStreaming: true,
    costPer1kTokens: 0.000075
  },
  
  // Moonshot AI Kimi-K2 Models - VERIFIED REAL MODELS (November 2025)
  // Source: https://platform.moonshot.ai/docs
  {
    id: 'kimi-k2',
    name: 'Kimi K2',
    provider: 'moonshot',
    description: '1T param MoE model optimized for agentic tasks - 10-100× cheaper than GPT-4',
    maxTokens: 256000, // ✅ FIX (Nov 18, 2025): Updated from 128k → 256k (Sept 2025 upgrade)
    supportsStreaming: true,
    costPer1kTokens: 0.0025  // $0.60 input (cache miss), $2.50 output → avg $0.0025
  },
  {
    id: 'kimi-k2-thinking',
    name: 'Kimi K2 Thinking',
    provider: 'moonshot',
    description: 'Kimi K2 with extended reasoning for complex problems',
    maxTokens: 256000, // ✅ FIX (Nov 18, 2025): Updated from 128k → 256k (Sept 2025 upgrade)
    supportsStreaming: true,
    costPer1kTokens: 0.0025
  },
  {
    id: 'kimi-k2-turbo',
    name: 'Kimi K2 Turbo',
    provider: 'moonshot',
    description: 'Fastest Kimi K2 variant for low-latency tasks',
    maxTokens: 256000, // ✅ FIX (Nov 18, 2025): Updated from 128k → 256k (Sept 2025 upgrade)
    supportsStreaming: true,
    costPer1kTokens: 0.0006  // Ultra-low cost for turbo variant
  },
  
  // xAI Models - LATEST NOVEMBER 2025
  // Source: https://x.ai/ and https://docs.x.ai/
  {
    id: 'grok-4',
    name: 'Grok 4',
    provider: 'xai',
    description: 'Current flagship - post-graduate reasoning with 256K context (July 2025)',
    maxTokens: 256000,
    supportsStreaming: true,
    costPer1kTokens: 0.002
  },
  {
    id: 'grok-4-fast',
    name: 'Grok 4 Fast',
    provider: 'xai',
    description: 'Enterprise model - 40% fewer tokens, 2M context, 64× cheaper than o3 (Sept 2025)',
    maxTokens: 2000000,
    supportsStreaming: true,
    costPer1kTokens: 0.0005
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
  private moonshotClient?: OpenAI;  // Moonshot uses OpenAI-compatible API
  
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
    console.log('[AI Provider Manager] MOONSHOT_API_KEY exists:', !!process.env.MOONSHOT_API_KEY);
    
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
    
    // Moonshot AI (Kimi-K2) - OpenAI-compatible API
    if (process.env.MOONSHOT_API_KEY) {
      try {
        // Use AIProviderFactory to create proper provider with generateChat support
        this.providers.set('moonshot', AIProviderFactory.create('moonshot', process.env.MOONSHOT_API_KEY));
        
        // Also keep direct OpenAI client for advanced streaming features
        this.moonshotClient = new OpenAI({
          apiKey: process.env.MOONSHOT_API_KEY,
          baseURL: 'https://api.moonshot.ai/v1'
        });
        console.log('[AI Provider Manager] ✓ Moonshot AI provider initialized');
      } catch (error) {
        console.warn('[AI Provider Manager] Failed to initialize Moonshot AI provider:', error);
      }
    } else {
      console.warn('[AI Provider Manager] Moonshot AI API key not found in environment');
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
    // Return all configured models with availability flag
    // This allows frontend to show unavailable models (grayed out) to encourage configuration
    return AI_MODELS.map(model => ({
      ...model,
      available: this.providers.has(model.provider)
    }));
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
    options?: { system?: string; max_tokens?: number; temperature?: number; reasoning_effort?: 'none' | 'low' | 'medium' | 'high' }
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
    } else if (model.provider === 'moonshot' && this.moonshotClient) {
      try {
        yield* this.streamMoonshot(modelId, messages, options);
      } catch (error: any) {
        console.error(`[AIProviderManager] Moonshot streaming failed for ${modelId}:`, error.status, error.message || JSON.stringify(error));
        throw error; // Propagate to outer fallback loop
      }
    } else {
      // Fallback to non-streaming for providers without native streaming
      const response = await provider.generateChat(messages, { ...options, model: modelId });
      yield response;
    }
  }
  
  /**
   * Anthropic streaming implementation with robust error handling
   * ✅ ROBUST PARSING: Handle stream errors and JSON parsing failures
   */
  private async *streamAnthropic(modelId: string, messages: any[], options?: any): AsyncGenerator<string> {
    if (!this.anthropicClient) throw new Error('Anthropic client not initialized');
    
    const anthropicMessages = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'assistant' as const : 'user' as const,
      content: m.content
    }));
    
    const systemMessage = messages.find(m => m.role === 'system')?.content;
    
    try {
      const stream = await this.anthropicClient.messages.create({
        model: modelId,
        messages: anthropicMessages,
        system: systemMessage,
        max_tokens: options?.max_tokens || 4000,
        temperature: options?.temperature || 0.7,
        stream: true,
      });
      
      let buffer = '';
      for await (const chunk of stream) {
        try {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            const text = chunk.delta.text;
            if (text) {
              buffer += text;
              yield text;
            }
          }
        } catch (chunkError: any) {
          console.warn(`[Anthropic] Chunk parsing error: ${chunkError.message}`);
          continue;
        }
      }
      
      if (!buffer) {
        throw new Error('Anthropic stream produced no content');
      }
    } catch (error: any) {
      console.error(`[Anthropic] Stream error: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * OpenAI streaming implementation with robust error handling
   * ✅ ROBUST PARSING: Handle stream errors and JSON parsing failures
   */
  private async *streamOpenAI(modelId: string, messages: any[], options?: any): AsyncGenerator<string> {
    if (!this.openaiClient) throw new Error('OpenAI client not initialized');
    
    let openaiMessages = [...messages];
    if (options?.system && !messages.find(m => m.role === 'system')) {
      openaiMessages = [
        { role: 'system', content: options.system },
        ...messages
      ];
    }
    
    const completionParams: any = {
      model: modelId,
      messages: openaiMessages,
      stream: true,
      max_tokens: options?.max_tokens || 4000,
      temperature: options?.temperature || 0.7,
    };

    if (options?.reasoning_effort && modelId.startsWith('gpt-5')) {
      completionParams.reasoning_effort = options.reasoning_effort;
    }

    try {
      const stream = await this.openaiClient.chat.completions.create(completionParams) as unknown as AsyncIterable<any>;
      
      let buffer = '';
      for await (const chunk of stream) {
        try {
          const content = chunk.choices?.[0]?.delta?.content;
          if (content) {
            buffer += content;
            yield content;
          }
        } catch (chunkError: any) {
          console.warn(`[OpenAI] Chunk parsing error: ${chunkError.message}`);
          continue;
        }
      }
      
      if (!buffer) {
        throw new Error('OpenAI stream produced no content');
      }
    } catch (error: any) {
      console.error(`[OpenAI] Stream error: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Moonshot AI (Kimi-K2) streaming implementation with robust error handling
   * ✅ ROBUST PARSING: Handle stream errors and JSON parsing failures
   */
  private async *streamMoonshot(modelId: string, messages: any[], options?: any): AsyncGenerator<string> {
    if (!this.moonshotClient) throw new Error('Moonshot AI client not initialized');
    
    let moonshotMessages = [...messages];
    if (options?.system && !messages.find(m => m.role === 'system')) {
      moonshotMessages = [
        { role: 'system', content: options.system },
        ...messages
      ];
    }
    
    try {
      const stream = await this.moonshotClient.chat.completions.create({
        model: modelId,
        messages: moonshotMessages,
        stream: true,
        max_tokens: options?.max_tokens || 4000,
        temperature: options?.temperature || 0.7,
      }) as unknown as AsyncIterable<any>;
      
      let buffer = '';
      for await (const chunk of stream) {
        try {
          const content = chunk.choices?.[0]?.delta?.content;
          if (content) {
            buffer += content;
            yield content;
          }
        } catch (chunkError: any) {
          console.warn(`[Moonshot] Chunk parsing error: ${chunkError.message}`);
          continue;
        }
      }
      
      if (!buffer) {
        throw new Error('Moonshot stream produced no content');
      }
    } catch (error: any) {
      console.error(`[Moonshot] Stream error: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Gemini streaming implementation with robust error handling
   * ✅ NEW APPROACH: Add system message as first chat message instead of systemInstruction
   * ✅ ROBUST PARSING: Handle stream errors, JSON parsing, and fallback mechanisms
   */
  private async *streamGemini(modelId: string, messages: any[], options?: any): AsyncGenerator<string> {
    if (!this.geminiClient) throw new Error('Gemini client not initialized');
    
    const systemMessage = messages.find(m => m.role === 'system')?.content;
    const chatMessages = messages.filter(m => m.role !== 'system');
    
    // Create model WITHOUT systemInstruction to avoid SDK issues
    const model = this.geminiClient.getGenerativeModel({ 
      model: modelId,
      generationConfig: {
        temperature: options?.temperature || 0.7,
        maxOutputTokens: options?.max_tokens || 8192,
      }
    });
    
    // Build history: prepend system message as model response if present
    const history = chatMessages.slice(0, -1).map(m => ({
      role: m.role === 'user' ? 'user' as const : 'model' as const,
      parts: [{ text: m.content }]
    }));
    
    // WORKAROUND: Add system message as first model message in history
    if (systemMessage && systemMessage.trim()) {
      history.unshift({
        role: 'model' as const,
        parts: [{ text: `System context: ${systemMessage}` }]
      });
      history.unshift({
        role: 'user' as const,
        parts: [{ text: 'Understood. I will follow the system instructions.' }]
      });
    }
    
    const chat = model.startChat({ history });
    const lastMessage = chatMessages[chatMessages.length - 1]?.content || '';
    
    try {
      const result = await chat.sendMessageStream(lastMessage);
      
      // ✅ ROBUST PARSING: Accumulate chunks and handle errors gracefully
      let buffer = '';
      for await (const chunk of result.stream) {
        try {
          const text = chunk.text();
          if (text) {
            buffer += text;
            yield text;
          }
        } catch (chunkError: any) {
          console.warn(`[Gemini] Chunk parsing error: ${chunkError.message}`);
          // Continue to next chunk instead of failing completely
          continue;
        }
      }
      
      // If we got nothing, try to get the full response as fallback
      if (!buffer) {
        const response = await result.response;
        const fullText = response.text();
        if (fullText) yield fullText;
      }
    } catch (error: any) {
      console.error(`[Gemini] Stream error: ${error.message}`);
      throw new Error(`Gemini streaming failed: ${error.message}`);
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
