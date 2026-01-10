/**
 * Enhanced OpenAI Provider with all latest models and capabilities
 * Includes support for GPT-4o, o1 models, vision, and function calling
 */

import OpenAI from 'openai';

interface AIProvider {
  name: string;
  generateCompletion(prompt: string, systemPrompt: string, maxTokens?: number, temperature?: number, userId?: number): Promise<string>;
  generateChat(messages: ChatMessage[], maxTokens?: number, temperature?: number, userId?: number): Promise<string>;
  generateCodeWithUnderstanding(code: string, language: string, instruction: string, userId?: number): Promise<string>;
  analyzeCode(code: string, language: string): Promise<any>;
  isAvailable(): boolean;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | any[];
}
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
// ✅ CONSOLIDATED Jan 2026: Only gpt-5.2 is current, older versions use model-normalizer
export const OPENAI_MODELS: Record<string, OpenAIModelConfig> = {
  // GPT-5.2 models (Dec 2025) - Latest flagship with advanced reasoning
  'gpt-5.2': {
    id: 'gpt-5.2',
    name: 'GPT-5.2',
    contextWindow: 400000,
    maxOutput: 16384,
    capabilities: ['chat', 'vision', 'function_calling', 'json_mode', 'structured_outputs', 'adaptive_reasoning', 'apply_patch', 'shell'],
    pricing: { input: 0.00175, output: 0.014 }
  },
  'gpt-5.2-codex': {
    id: 'gpt-5.2-codex',
    name: 'GPT-5.2 Codex',
    contextWindow: 400000,
    maxOutput: 16384,
    capabilities: ['chat', 'vision', 'function_calling', 'json_mode', 'structured_outputs', 'reasoning', 'code_generation'],
    pricing: { input: 0.00175, output: 0.014 }
  },
  'gpt-5-mini': {
    id: 'gpt-5-mini',
    name: 'GPT-5 Mini',
    contextWindow: 400000,
    maxOutput: 16384,
    capabilities: ['chat', 'function_calling', 'json_mode', 'structured_outputs', 'reasoning'],
    pricing: { input: 0.0003, output: 0.0012 }
  },
  'gpt-5-nano': {
    id: 'gpt-5-nano',
    name: 'GPT-5 Nano',
    contextWindow: 400000,
    maxOutput: 16384,
    capabilities: ['chat', 'function_calling', 'json_mode', 'structured_outputs'],
    pricing: { input: 0.00015, output: 0.0006 }
  },
  // GPT-4.x models
  'gpt-4-turbo-preview': {
    id: 'gpt-4-turbo-preview',
    name: 'GPT-4 Turbo Preview (Latest)',
    contextWindow: 128000,
    maxOutput: 4096,
    capabilities: ['chat', 'vision', 'function_calling', 'json_mode', 'structured_outputs'],
    pricing: { input: 0.01, output: 0.03 }
  },
  'gpt-4.1': {
    id: 'gpt-4.1',
    name: 'GPT-4.1',
    contextWindow: 1000000,
    maxOutput: 16384,
    capabilities: ['chat', 'vision', 'function_calling', 'json_mode', 'structured_outputs'],
    pricing: { input: 0.002, output: 0.008 }
  },
  'gpt-4.1-mini': {
    id: 'gpt-4.1-mini',
    name: 'GPT-4.1 Mini',
    contextWindow: 1000000,
    maxOutput: 16384,
    capabilities: ['chat', 'vision', 'function_calling', 'json_mode'],
    pricing: { input: 0.0004, output: 0.0016 }
  },
  'gpt-4.1-nano': {
    id: 'gpt-4.1-nano',
    name: 'GPT-4.1 Nano',
    contextWindow: 1000000,
    maxOutput: 16384,
    capabilities: ['chat', 'function_calling', 'json_mode'],
    pricing: { input: 0.0001, output: 0.0004 }
  },
  'gpt-4': {
    id: 'gpt-4',
    name: 'GPT-4',
    contextWindow: 8192,
    maxOutput: 4096,
    capabilities: ['chat', 'function_calling', 'json_mode'],
    pricing: { input: 0.03, output: 0.06 }
  },
  'gpt-3.5-turbo': {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    contextWindow: 16384,
    maxOutput: 4096,
    capabilities: ['chat', 'function_calling', 'json_mode'],
    pricing: { input: 0.0005, output: 0.0015 }
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
  reasoningEffort?: 'none' | 'low' | 'medium' | 'high';
}

export class EnhancedOpenAIProvider implements AIProvider {
  name = 'OpenAI Enhanced';
  private client: OpenAI;
  private defaultModel = 'gpt-5.2';  // ✅ CONSOLIDATED Jan 2026
  
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
   * CRITICAL (Nov 2025): GPT-5 family uses NEW /v1/responses endpoint, GPT-4 uses legacy /v1/chat/completions
   * Docs: https://platform.openai.com/docs/guides/latest-model
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
      // GPT-5 family uses NEW Responses API endpoint (Nov 2025)
      // Docs: https://platform.openai.com/docs/api-reference/responses
      if (model.startsWith('gpt-5')) {
        // CRITICAL: input must be array of role-tagged messages with typed content parts
        // Per Responses API spec: content must be array of { type: 'input_text', text: ... }
        const inputMessages: any[] = [];
        if (systemPrompt) {
          inputMessages.push({ 
            role: 'system', 
            content: [{ type: 'input_text', text: systemPrompt }]
          });
        }
        inputMessages.push({ 
          role: 'user', 
          content: [{ type: 'input_text', text: prompt }]
        });

        const responseParams: any = {
          model,
          input: inputMessages, // Role-based array structure per official docs
          reasoning: {
            effort: options?.reasoningEffort || 'high' // none/low/medium/high (high for complex coding/agent tasks)
          },
          max_output_tokens: Math.min(maxTokens, modelConfig.maxOutput),
          temperature,
          top_p: options?.topP,
          frequency_penalty: options?.frequencyPenalty,
          presence_penalty: options?.presencePenalty,
          seed: options?.seed,
        };

        // Remove undefined values to avoid API errors
        Object.keys(responseParams).forEach(key => 
          responseParams[key] === undefined && delete responseParams[key]
        );

        // Use responses.create() for GPT-5.1 (official SDK method)
        const response = await (this.client as any).responses.create(responseParams);
        
        // Extract text from response.output array
        // CRITICAL: response.output contains reasoning items + message items
        // We need to find the message (type: "message"), not the reasoning item (type: "reasoning")
        // ALSO: aggregate ALL output_text blocks (multi-part answers)
        let result = '';
        if (response.output && response.output.length > 0) {
          // Find the message item (not the reasoning item)
          const messageItem = response.output.find((item: any) => item.type === 'message');
          if (messageItem && messageItem.content && messageItem.content.length > 0) {
            // Aggregate ALL output_text segments to avoid truncation
            const textBlocks = messageItem.content
              .filter((block: any) => block.type === 'output_text')
              .map((block: any) => block.text || '');
            result = textBlocks.join('').trim();
          }
        }
        
        // Track billing with reasoning tokens
        if (userId && response.usage) {
          const reasoningTokens = response.usage.output_tokens_details?.reasoning_tokens || 0;
          await aiBillingService.trackAIUsage(userId, {
            model,
            provider: 'OpenAI',
            inputTokens: response.usage.input_tokens || 0,
            outputTokens: response.usage.output_tokens || 0,
            totalTokens: response.usage.total_tokens || ((response.usage.input_tokens || 0) + (response.usage.output_tokens || 0)),
            prompt: prompt.substring(0, 200),
            completion: result.substring(0, 200),
            purpose: 'completion',
            timestamp: new Date()
          });
          
          logger.info(`GPT-5.1 usage: ${response.usage.input_tokens} input, ${response.usage.output_tokens} output, ${reasoningTokens} reasoning tokens`);
        }
        
        return result;
      } else {
        // GPT-4 and earlier use legacy Chat Completions API
        // Check if this is an o-series model that requires different parameters
        const isOSeriesModel = /^o[1-9]/.test(model);

        const completionParams: any = {
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          top_p: options?.topP,
          frequency_penalty: options?.frequencyPenalty,
          presence_penalty: options?.presencePenalty,
          response_format: options?.responseFormat ? { type: options.responseFormat } : undefined,
          seed: options?.seed,
          logprobs: options?.logprobs,
          top_logprobs: options?.topLogprobs,
        };

        if (isOSeriesModel) {
          completionParams.max_completion_tokens = Math.min(maxTokens, modelConfig.maxOutput);
          // Don't set temperature for o-series models
        } else {
          completionParams.max_tokens = Math.min(maxTokens, modelConfig.maxOutput);
          completionParams.temperature = temperature;
        }

        const completion = await this.client.chat.completions.create(completionParams);
        
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
      }
    } catch (error) {
      logger.error(`Error generating completion with ${model}: ${error}`);
      throw error;
    }
  }
  
  /**
   * Generate chat with function calling support
   * CRITICAL (Nov 2025): GPT-5 uses Responses API, GPT-4 uses Chat Completions
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
      // GPT-5 family uses Responses API
      if (model.startsWith('gpt-5')) {
        // Convert messages to Responses API format (typed content parts)
        const inputMessages = messages.map(msg => ({
          role: msg.role,
          content: Array.isArray(msg.content) 
            ? msg.content 
            : [{ type: 'input_text', text: msg.content }]
        }));

        // Transform tool_choice to Responses API format (idempotent)
        let toolChoice: any = options?.functionCall || 'auto';
        if (typeof toolChoice === 'object') {
          // If already in Responses format {type: 'function', function: {name}}, keep as-is
          if (toolChoice.type === 'function' && toolChoice.function?.name) {
            // Already correct format, no transformation needed
          } else if (toolChoice.name) {
            // Convert {name: 'fn'} to {type: 'function', function: {name: 'fn'}}
            toolChoice = {
              type: 'function',
              function: { name: toolChoice.name }
            };
          }
        }

        const response = await (this.client as any).responses.create({
          model,
          input: inputMessages,
          tools: functions.map(fn => ({
            type: 'function' as const,
            function: fn
          })),
          tool_choice: toolChoice,
          max_output_tokens: options?.maxTokens || 1024,
          temperature: options?.temperature || 0.5,
          reasoning: {
            effort: options?.reasoningEffort || 'medium'
          }
        });

        // Extract message and function call from response.output
        let content = '';
        let functionCall = undefined;

        for (const item of response.output || []) {
          if (item.type === 'message') {
            // Aggregate all output_text blocks
            const textBlocks = item.content
              ?.filter((block: any) => block.type === 'output_text')
              .map((block: any) => block.text || '') || [];
            content = textBlocks.join('').trim();
          } else if (item.type === 'function_call') {
            functionCall = {
              name: item.name,
              arguments: JSON.parse(item.arguments)
            };
          }
        }

        // Track usage with reasoning tokens
        if (userId && response.usage) {
          const reasoningTokens = response.usage.output_tokens_details?.reasoning_tokens || 0;
          await aiBillingService.trackAIUsage(userId, {
            model,
            provider: 'OpenAI',
            inputTokens: response.usage.input_tokens || 0,
            outputTokens: response.usage.output_tokens || 0,
            totalTokens: response.usage.total_tokens || 0,
            purpose: 'completion',
            timestamp: new Date()
          });
          logger.info(`GPT-5 function call: ${response.usage.input_tokens} input, ${response.usage.output_tokens} output, ${reasoningTokens} reasoning tokens`);
        }

        return { content, functionCall };
      } else {
        // GPT-4 and earlier use Chat Completions API
        // Check if this is an o-series model that requires different parameters
        const isOSeriesModel = /^o[1-9]/.test(model);

        const chatParams: any = {
          model,
          messages: messages as any,
          tools: functions.map(fn => ({
            type: 'function' as const,
            function: fn
          })),
          tool_choice: options?.functionCall || 'auto',
        };

        if (isOSeriesModel) {
          chatParams.max_completion_tokens = options?.maxTokens || 1024;
          // Don't set temperature for o-series models
        } else {
          chatParams.max_tokens = options?.maxTokens || 1024;
          chatParams.temperature = options?.temperature || 0.5;
        }

        const completion = await this.client.chat.completions.create(chatParams);
        
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
            purpose: 'completion',
            timestamp: new Date()
          });
        }
        
        return result;
      }
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
    const model = options?.model || 'gpt-5.2';  // ✅ CONSOLIDATED Jan 2026
    const modelConfig = OPENAI_MODELS[model];
    
    if (!modelConfig.capabilities.includes('vision')) {
      throw new Error(`Model ${model} does not support vision`);
    }
    
    try {
      // Check if this is a new-gen model (GPT-5.x or o-series) that requires different parameters
      const isNewGenModel = model.startsWith('gpt-5') || /^o[1-9]/.test(model);

      const visionParams: any = {
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
      };

      if (isNewGenModel) {
        visionParams.max_completion_tokens = options?.maxTokens || 1024;
        // Don't set temperature for new-gen models
      } else {
        visionParams.max_tokens = options?.maxTokens || 1024;
        visionParams.temperature = options?.temperature || 0.5;
      }

      const completion = await this.client.chat.completions.create(visionParams);
      
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
   * NOTE: Responses API doesn't support streaming yet, so GPT-5 models will throw error
   */
  async *streamChat(
    messages: ChatMessage[],
    userId?: number,
    options?: OpenAIOptions
  ): AsyncGenerator<string> {
    const model = options?.model || this.defaultModel;
    
    // Block GPT-5 models from streaming (Responses API doesn't support streaming yet)
    if (model.startsWith('gpt-5')) {
      throw new Error(`Streaming is not yet supported for ${model}. Please use non-streaming completion or use GPT-4 models for streaming.`);
    }
    
    try {
      // Check if this is an o-series model that requires different parameters
      const isOSeriesModel = /^o[1-9]/.test(model);

      const streamParams: any = {
        model,
        messages: messages as any,
        stream: true,
      };

      if (isOSeriesModel) {
        streamParams.max_completion_tokens = options?.maxTokens || 1024;
        // Don't set temperature for o-series models
      } else {
        streamParams.max_tokens = options?.maxTokens || 1024;
        streamParams.temperature = options?.temperature || 0.5;
      }

      const stream = await this.client.chat.completions.create(streamParams);
      
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