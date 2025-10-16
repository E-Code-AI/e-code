// @ts-nocheck
/**
 * Enhanced OpenAI Provider with all latest models and capabilities
 * Includes support for GPT-4o, o1 models, vision, and function calling
 */

import OpenAI from 'openai';
import { AIProvider, ChatMessage } from './ai-provider';
import { createLogger } from '../utils/logger';
import { aiBillingService } from '../services/ai-billing-service';

const logger = createLogger('openai-enhanced-provider');

export interface OpenAIModelConfig {
  id: string;
  name: string;
  contextWindow: number;
  maxOutput: number;
  capabilities: string[];
  pricing: {
    input: number;
    output: number;
  };
}

// Complete list of OpenAI models with configurations
export const OPENAI_MODELS: Record<string, OpenAIModelConfig> = {
  'gpt-4o': {
    id: 'gpt-4o',
    name: 'GPT-4 Omni (Latest)',
    contextWindow: 128000,
    maxOutput: 4096,
    capabilities: ['chat', 'vision', 'function_calling', 'json_mode'],
    pricing: { input: 0.0025, output: 0.01 }
  },
  'gpt-4o-2024-08-06': {
    id: 'gpt-4o-2024-08-06',
    name: 'GPT-4 Omni (Structured Outputs)',
    contextWindow: 128000,
    maxOutput: 16384,
    capabilities: ['chat', 'vision', 'function_calling', 'structured_outputs'],
    pricing: { input: 0.0025, output: 0.01 }
  },
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    name: 'GPT-4 Omni Mini',
    contextWindow: 128000,
    maxOutput: 16384,
    capabilities: ['chat', 'vision', 'function_calling'],
    pricing: { input: 0.00015, output: 0.0006 }
  },
  'o1-preview': {
    id: 'o1-preview',
    name: 'O1 Preview (Advanced Reasoning)',
    contextWindow: 128000,
    maxOutput: 32768,
    capabilities: ['chat', 'reasoning', 'complex_analysis'],
    pricing: { input: 0.015, output: 0.06 }
  },
  'o1-mini': {
    id: 'o1-mini',
    name: 'O1 Mini (Fast Reasoning)',
    contextWindow: 128000,
    maxOutput: 65536,
    capabilities: ['chat', 'reasoning'],
    pricing: { input: 0.003, output: 0.012 }
  },
  'gpt-4-turbo': {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    contextWindow: 128000,
    maxOutput: 4096,
    capabilities: ['chat', 'vision', 'function_calling'],
    pricing: { input: 0.01, output: 0.03 }
  },
  'gpt-3.5-turbo': {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    contextWindow: 16385,
    maxOutput: 4096,
    capabilities: ['chat', 'function_calling'],
    pricing: { input: 0.0005, output: 0.002 }
  },
  'gpt-3.5-turbo-1106': {
    id: 'gpt-3.5-turbo-1106',
    name: 'GPT-3.5 Turbo (Updated)',
    contextWindow: 16385,
    maxOutput: 4096,
    capabilities: ['chat', 'function_calling', 'json_mode'],
    pricing: { input: 0.0005, output: 0.002 }
  }
};

export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: any;
}

export interface OpenAIOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  responseFormat?: 'text' | 'json_object';
  functions?: FunctionDefinition[];
  functionCall?: 'auto' | 'none' | { name: string };
  stream?: boolean;
  seed?: number;
  logprobs?: boolean;
  topLogprobs?: number;
}

export class EnhancedOpenAIProvider implements AIProvider {
  name = 'OpenAI Enhanced';
  private client: OpenAI;
  private defaultModel = 'gpt-4o';
  
  constructor(apiKey?: string) {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
      maxRetries: 3,
      timeout: 60000,
    });
    
    logger.info('Enhanced OpenAI Provider initialized with all latest models');
  }
  
  /**
   * Generate completion with full model support
   */
  async generateCompletion(
    prompt: string,
    systemPrompt: string,
    maxTokens = 1024,
    temperature = 0.2,
    userId?: number,
    options?: OpenAIOptions
  ): Promise<string> {
    const model = options?.model || this.defaultModel;
    const modelConfig = OPENAI_MODELS[model];
    
    if (!modelConfig) {
      throw new Error(`Unsupported model: ${model}`);
    }
    
    try {
      const completion = await this.client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        max_tokens: Math.min(maxTokens, modelConfig.maxOutput),
        temperature,
        top_p: options?.topP,
        frequency_penalty: options?.frequencyPenalty,
        presence_penalty: options?.presencePenalty,
        response_format: options?.responseFormat ? { type: options.responseFormat } : undefined,
        seed: options?.seed,
        logprobs: options?.logprobs,
        top_logprobs: options?.topLogprobs,
      });
      
      const result = completion.choices[0].message.content?.trim() || '';
      
      // Track usage for billing
      if (userId && completion.usage) {
        await aiBillingService.trackAIUsage(userId, {
          model,
          provider: 'OpenAI',
          inputTokens: completion.usage.prompt_tokens || 0,
          outputTokens: completion.usage.completion_tokens || 0,
          totalTokens: completion.usage.total_tokens || 0,
          prompt: prompt.substring(0, 200),
          completion: result.substring(0, 200),
          purpose: 'completion',
          timestamp: new Date()
        });
      }
      
      return result;
    } catch (error) {
      logger.error(`Error generating completion with ${model}: ${error}`);
      throw error;
    }
  }
  
  /**
   * Generate chat with function calling support
   */
  async generateChatWithFunctions(
    messages: ChatMessage[],
    functions: FunctionDefinition[],
    userId?: number,
    options?: OpenAIOptions
  ): Promise<{
    content: string;
    functionCall?: {
      name: string;
      arguments: any;
    };
  }> {
    const model = options?.model || this.defaultModel;
    const modelConfig = OPENAI_MODELS[model];
    
    if (!modelConfig.capabilities.includes('function_calling')) {
      throw new Error(`Model ${model} does not support function calling`);
    }
    
    try {
      const completion = await this.client.chat.completions.create({
        model,
        messages: messages as any,
        tools: functions.map(fn => ({
          type: 'function' as const,
          function: fn
        })),
        tool_choice: options?.functionCall || 'auto',
        max_tokens: options?.maxTokens || 1024,
        temperature: options?.temperature || 0.5,
      });
      
      const message = completion.choices[0].message;
      const result = {
        content: message.content || '',
        functionCall: message.tool_calls?.[0] ? {
          name: message.tool_calls[0].function.name,
          arguments: JSON.parse(message.tool_calls[0].function.arguments)
        } : undefined
      };
      
      // Track usage
      if (userId && completion.usage) {
        await aiBillingService.trackAIUsage(userId, {
          model,
          provider: 'OpenAI',
          inputTokens: completion.usage.prompt_tokens || 0,
          outputTokens: completion.usage.completion_tokens || 0,
          totalTokens: completion.usage.total_tokens || 0,
          purpose: 'function_calling',
          timestamp: new Date()
        });
      }
      
      return result;
    } catch (error) {
      logger.error(`Error in function calling with ${model}: ${error}`);
      throw error;
    }
  }
  
  /**
   * Generate vision analysis with GPT-4o models
   */
  async analyzeImage(
    imageUrl: string,
    prompt: string,
    userId?: number,
    options?: OpenAIOptions
  ): Promise<string> {
    const model = options?.model || 'gpt-4o';
    const modelConfig = OPENAI_MODELS[model];
    
    if (!modelConfig.capabilities.includes('vision')) {
      throw new Error(`Model ${model} does not support vision`);
    }
    
    try {
      const completion = await this.client.chat.completions.create({
        model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }
        ],
        max_tokens: options?.maxTokens || 1024,
        temperature: options?.temperature || 0.5,
      });
      
      const result = completion.choices[0].message.content || '';
      
      // Track usage
      if (userId && completion.usage) {
        await aiBillingService.trackAIUsage(userId, {
          model,
          provider: 'OpenAI',
          inputTokens: completion.usage.prompt_tokens || 0,
          outputTokens: completion.usage.completion_tokens || 0,
          totalTokens: completion.usage.total_tokens || 0,
          purpose: 'vision',
          timestamp: new Date()
        });
      }
      
      return result;
    } catch (error) {
      logger.error(`Error in vision analysis with ${model}: ${error}`);
      throw error;
    }
  }
  
  /**
   * Stream chat responses for real-time interaction
   */
  async *streamChat(
    messages: ChatMessage[],
    userId?: number,
    options?: OpenAIOptions
  ): AsyncGenerator<string> {
    const model = options?.model || this.defaultModel;
    
    try {
      const stream = await this.client.chat.completions.create({
        model,
        messages: messages as any,
        max_tokens: options?.maxTokens || 1024,
        temperature: options?.temperature || 0.5,
        stream: true,
      });
      
      let totalTokens = 0;
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          totalTokens += Math.ceil(content.length / 4); // Rough token estimate
          yield content;
        }
      }
      
      // Track usage (estimated for streaming)
      if (userId) {
        const inputTokens = Math.ceil(JSON.stringify(messages).length / 4);
        await aiBillingService.trackAIUsage(userId, {
          model,
          provider: 'OpenAI',
          inputTokens,
          outputTokens: totalTokens,
          totalTokens: inputTokens + totalTokens,
          purpose: 'streaming',
          timestamp: new Date()
        });
      }
    } catch (error) {
      logger.error(`Error in streaming with ${model}: ${error}`);
      throw error;
    }
  }
  
  /**
   * Generate embeddings for vector search
   */
  async generateEmbeddings(
    texts: string[],
    userId?: number,
    model = 'text-embedding-3-small'
  ): Promise<number[][]> {
    try {
      const response = await this.client.embeddings.create({
        model,
        input: texts,
      });
      
      const embeddings = response.data.map(item => item.embedding);
      
      // Track usage
      if (userId && response.usage) {
        await aiBillingService.trackAIUsage(userId, {
          model,
          provider: 'OpenAI',
          inputTokens: response.usage.prompt_tokens || 0,
          outputTokens: 0,
          totalTokens: response.usage.total_tokens || 0,
          purpose: 'embedding',
          timestamp: new Date()
        });
      }
      
      return embeddings;
    } catch (error) {
      logger.error(`Error generating embeddings: ${error}`);
      throw error;
    }
  }
  
  /**
   * Generate chat response (standard interface)
   */
  async generateChat(
    messages: ChatMessage[],
    maxTokens = 1024,
    temperature = 0.5,
    userId?: number
  ): Promise<string> {
    return this.generateCompletion(
      messages[messages.length - 1].content,
      messages[0]?.role === 'system' ? messages[0].content : '',
      maxTokens,
      temperature,
      userId
    );
  }
  
  /**
   * Check if provider is available
   */
  isAvailable(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }
  
  /**
   * Get list of available models
   */
  getAvailableModels(): OpenAIModelConfig[] {
    return Object.values(OPENAI_MODELS);
  }
  
  /**
   * Generate code with understanding
   */
  async generateCodeWithUnderstanding(
    messages: ChatMessage[],
    codeAnalysis: any,
    options?: any
  ): Promise<string> {
    const enhancedMessages = [...messages];
    if (codeAnalysis) {
      enhancedMessages.push({
        role: 'system',
        content: `Code Analysis: ${JSON.stringify(codeAnalysis, null, 2)}`
      });
    }
    
    return this.generateChat(enhancedMessages, options?.maxTokens, options?.temperature, options?.userId);
  }
  
  /**
   * Analyze code
   */
  async analyzeCode(code: string, analysis: string): Promise<any> {
    const prompt = `Analyze the following code and provide ${analysis}:\n\n${code}`;
    const result = await this.generateCompletion(
      prompt,
      'You are an expert code analyst. Provide detailed, actionable insights.',
      2048,
      0.3
    );
    
    try {
      return JSON.parse(result);
    } catch {
      return { analysis: result };
    }
  }
}

// Export singleton instance
export const enhancedOpenAIProvider = new EnhancedOpenAIProvider();