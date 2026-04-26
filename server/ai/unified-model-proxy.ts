import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { calculateRequestCost } from '../config/ai-pricing';

export type UnifiedProvider = 'openai' | 'anthropic' | 'gemini' | 'moonshot';
export type UnifiedRole = 'system' | 'user' | 'assistant' | 'tool';

export interface UnifiedContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

export interface UnifiedMessage {
  role: UnifiedRole;
  content: string | UnifiedContentPart[];
  name?: string;
  tool_call_id?: string;
}

export interface UnifiedTool {
  name: string;
  description?: string;
  parameters: Record<string, any>;
}

export interface UnifiedModelRequest {
  model?: string;
  provider?: UnifiedProvider;
  messages: UnifiedMessage[];
  tools?: UnifiedTool[];
  temperature?: number;
  maxTokens?: number;
  providerApiKeys?: Partial<Record<UnifiedProvider, string>>;
  fallbackModels?: string[];
  userId?: number;
  metadata?: Record<string, any>;
}

export interface UnifiedUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
}

export interface UnifiedModelResponse {
  id: string;
  provider: UnifiedProvider;
  model: string;
  content: string;
  toolCalls: Array<{ id: string; name: string; arguments: Record<string, any> }>;
  usage: UnifiedUsage;
  fallbackTrail: Array<{ provider: UnifiedProvider; model: string; error?: string }>;
}

export type UnifiedStreamChunk =
  | { type: 'start'; provider: UnifiedProvider; model: string }
  | { type: 'delta'; content: string }
  | { type: 'tool_call'; id: string; name: string; arguments: Record<string, any> }
  | { type: 'usage'; usage: UnifiedUsage }
  | { type: 'error'; error: string; provider: UnifiedProvider; model: string }
  | { type: 'done'; response: Omit<UnifiedModelResponse, 'content'> & { content?: string } };

export interface UnifiedModelInfo {
  id: string;
  provider: UnifiedProvider;
  label: string;
  contextWindow: number;
  supportsTools: boolean;
  supportsVision: boolean;
  supportsStreaming: boolean;
}

export const UNIFIED_MODEL_REGISTRY: Record<string, UnifiedModelInfo> = {
  'claude-sonnet-4': {
    id: 'claude-sonnet-4-6',
    provider: 'anthropic',
    label: 'Claude Sonnet 4',
    contextWindow: 200000,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
  },
  'claude-sonnet-4-6': {
    id: 'claude-sonnet-4-6',
    provider: 'anthropic',
    label: 'Claude Sonnet 4.6',
    contextWindow: 200000,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
  },
  'claude-opus-4-7': {
    id: 'claude-opus-4-7',
    provider: 'anthropic',
    label: 'Claude Opus 4.7',
    contextWindow: 200000,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
  },
  'gpt-4o': {
    id: 'gpt-4o',
    provider: 'openai',
    label: 'GPT-4o',
    contextWindow: 128000,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
  },
  'gemini-2.5-flash': {
    id: 'gemini-2.5-flash',
    provider: 'gemini',
    label: 'Gemini 2.5 Flash',
    contextWindow: 1000000,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
  },
  'gemini-2.5-pro': {
    id: 'gemini-2.5-pro',
    provider: 'gemini',
    label: 'Gemini 2.5 Pro',
    contextWindow: 1000000,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
  },
  kimi: {
    id: 'moonshot-v1-32k',
    provider: 'moonshot',
    label: 'Moonshot Kimi',
    contextWindow: 32000,
    supportsTools: true,
    supportsVision: false,
    supportsStreaming: true,
  },
  'moonshot-v1-32k': {
    id: 'moonshot-v1-32k',
    provider: 'moonshot',
    label: 'Moonshot v1 32K',
    contextWindow: 32000,
    supportsTools: true,
    supportsVision: false,
    supportsStreaming: true,
  },
};

function estimateTokens(value: unknown): number {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return Math.max(1, Math.ceil((text || '').length / 4));
}

function resolveModel(model?: string, provider?: UnifiedProvider): UnifiedModelInfo {
  if (model && UNIFIED_MODEL_REGISTRY[model]) return UNIFIED_MODEL_REGISTRY[model];
  if (model) {
    if (model.includes('claude')) return { ...UNIFIED_MODEL_REGISTRY['claude-sonnet-4-6'], id: model };
    if (model.includes('gemini')) return { ...UNIFIED_MODEL_REGISTRY['gemini-2.5-flash'], id: model };
    if (model.includes('moonshot') || model.includes('kimi')) return { ...UNIFIED_MODEL_REGISTRY['moonshot-v1-32k'], id: model };
    return { ...UNIFIED_MODEL_REGISTRY['gpt-4o'], id: model };
  }
  if (provider === 'anthropic') return UNIFIED_MODEL_REGISTRY['claude-sonnet-4-6'];
  if (provider === 'gemini') return UNIFIED_MODEL_REGISTRY['gemini-2.5-flash'];
  if (provider === 'moonshot') return UNIFIED_MODEL_REGISTRY['moonshot-v1-32k'];
  return UNIFIED_MODEL_REGISTRY['gpt-4o'];
}

function getApiKey(provider: UnifiedProvider, request: UnifiedModelRequest): string | undefined {
  if (request.providerApiKeys?.[provider]) return request.providerApiKeys[provider];
  if (provider === 'openai') return process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (provider === 'anthropic') return process.env.ANTHROPIC_API_KEY;
  if (provider === 'gemini') return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (provider === 'moonshot') return process.env.MOONSHOT_API_KEY || process.env.KIMI_API_KEY;
  return undefined;
}

function buildFallbackChain(request: UnifiedModelRequest): UnifiedModelInfo[] {
  const primary = resolveModel(request.model, request.provider);
  const requested = request.fallbackModels?.map((model) => resolveModel(model)) || [];
  const defaults = [
    UNIFIED_MODEL_REGISTRY['gpt-4o'],
    UNIFIED_MODEL_REGISTRY['claude-sonnet-4-6'],
    UNIFIED_MODEL_REGISTRY['gemini-2.5-flash'],
    UNIFIED_MODEL_REGISTRY['moonshot-v1-32k'],
  ];
  const seen = new Set<string>();
  return [primary, ...requested, ...defaults].filter((info) => {
    const key = `${info.provider}:${info.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function openAiMessages(messages: UnifiedMessage[]): any[] {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
    name: message.name,
    tool_call_id: message.tool_call_id,
  }));
}

function openAiTools(tools?: UnifiedTool[]): any[] | undefined {
  return tools?.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description || '',
      parameters: tool.parameters,
    },
  }));
}

function anthropicTools(tools?: UnifiedTool[]): any[] | undefined {
  return tools?.map((tool) => ({
    name: tool.name,
    description: tool.description || '',
    input_schema: tool.parameters,
  }));
}

function textFromContent(content: UnifiedMessage['content']): string {
  if (typeof content === 'string') return content;
  return content.map((part) => part.type === 'text' ? part.text || '' : `[image:${part.image_url?.url || 'inline'}]`).join('\n');
}

function usageFor(model: string, prompt: unknown, completion: unknown): UnifiedUsage {
  const promptTokens = estimateTokens(prompt);
  const completionTokens = estimateTokens(completion);
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    costUsd: calculateRequestCost(model, promptTokens, completionTokens),
  };
}

export class UnifiedModelProxy {
  getModels(): UnifiedModelInfo[] {
    return Object.values(UNIFIED_MODEL_REGISTRY);
  }

  async complete(request: UnifiedModelRequest): Promise<UnifiedModelResponse> {
    const fallbackTrail: UnifiedModelResponse['fallbackTrail'] = [];

    for (const modelInfo of buildFallbackChain(request)) {
      try {
        const response = await this.completeWithProvider(request, modelInfo);
        return { ...response, fallbackTrail };
      } catch (error: any) {
        fallbackTrail.push({ provider: modelInfo.provider, model: modelInfo.id, error: error.message });
      }
    }

    throw new Error(`All model providers failed: ${fallbackTrail.map((item) => `${item.model}: ${item.error}`).join('; ')}`);
  }

  async *stream(request: UnifiedModelRequest): AsyncGenerator<UnifiedStreamChunk> {
    const fallbackTrail: UnifiedModelResponse['fallbackTrail'] = [];

    for (const modelInfo of buildFallbackChain(request)) {
      try {
        yield { type: 'start', provider: modelInfo.provider, model: modelInfo.id };
        const response = await this.completeWithProvider(request, modelInfo);
        if (response.content) yield { type: 'delta', content: response.content };
        for (const toolCall of response.toolCalls) yield { type: 'tool_call', ...toolCall };
        yield { type: 'usage', usage: response.usage };
        yield { type: 'done', response: { ...response, content: undefined, fallbackTrail } };
        return;
      } catch (error: any) {
        fallbackTrail.push({ provider: modelInfo.provider, model: modelInfo.id, error: error.message });
        yield { type: 'error', provider: modelInfo.provider, model: modelInfo.id, error: error.message };
      }
    }
  }

  private async completeWithProvider(request: UnifiedModelRequest, modelInfo: UnifiedModelInfo): Promise<Omit<UnifiedModelResponse, 'fallbackTrail'>> {
    const key = getApiKey(modelInfo.provider, request);
    if (!key) throw new Error(`Missing API key for ${modelInfo.provider}`);

    if (modelInfo.provider === 'anthropic') return await this.completeAnthropic(request, modelInfo, key);
    if (modelInfo.provider === 'gemini') return await this.completeGemini(request, modelInfo, key);
    return await this.completeOpenAiCompatible(request, modelInfo, key);
  }

  private async completeOpenAiCompatible(
    request: UnifiedModelRequest,
    modelInfo: UnifiedModelInfo,
    key: string
  ): Promise<Omit<UnifiedModelResponse, 'fallbackTrail'>> {
    const client = new OpenAI({
      apiKey: key,
      baseURL: modelInfo.provider === 'moonshot' ? 'https://api.moonshot.ai/v1' : process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });
    const completion = await client.chat.completions.create({
      model: modelInfo.id,
      messages: openAiMessages(request.messages),
      tools: openAiTools(request.tools),
      temperature: request.temperature,
      max_tokens: request.maxTokens,
    } as any);
    const choice = completion.choices[0]?.message as any;
    const content = choice?.content || '';
    const toolCalls = (choice?.tool_calls || []).map((call: any) => ({
      id: call.id,
      name: call.function?.name,
      arguments: JSON.parse(call.function?.arguments || '{}'),
    }));
    const usage = completion.usage ? {
      promptTokens: completion.usage.prompt_tokens || 0,
      completionTokens: completion.usage.completion_tokens || 0,
      totalTokens: completion.usage.total_tokens || 0,
      costUsd: calculateRequestCost(modelInfo.id, completion.usage.prompt_tokens || 0, completion.usage.completion_tokens || 0),
    } : usageFor(modelInfo.id, request.messages, content);

    return { id: completion.id, provider: modelInfo.provider, model: modelInfo.id, content, toolCalls, usage };
  }

  private async completeAnthropic(
    request: UnifiedModelRequest,
    modelInfo: UnifiedModelInfo,
    key: string
  ): Promise<Omit<UnifiedModelResponse, 'fallbackTrail'>> {
    const client = new Anthropic({ apiKey: key });
    const system = request.messages.find((message) => message.role === 'system')?.content;
    const messages = request.messages
      .filter((message) => message.role !== 'system')
      .map((message) => ({
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: textFromContent(message.content),
      }));
    const completion = await client.messages.create({
      model: modelInfo.id,
      max_tokens: request.maxTokens || 4096,
      temperature: request.temperature,
      system: system ? textFromContent(system) : undefined,
      messages: messages as any,
      tools: anthropicTools(request.tools),
    });
    const content = completion.content
      .filter((part: any) => part.type === 'text')
      .map((part: any) => part.text)
      .join('');
    const toolCalls = completion.content
      .filter((part: any) => part.type === 'tool_use')
      .map((part: any) => ({ id: part.id, name: part.name, arguments: part.input || {} }));
    const usage = {
      promptTokens: completion.usage.input_tokens,
      completionTokens: completion.usage.output_tokens,
      totalTokens: completion.usage.input_tokens + completion.usage.output_tokens,
      costUsd: calculateRequestCost(modelInfo.id, completion.usage.input_tokens, completion.usage.output_tokens),
    };

    return { id: completion.id, provider: modelInfo.provider, model: modelInfo.id, content, toolCalls, usage };
  }

  private async completeGemini(
    request: UnifiedModelRequest,
    modelInfo: UnifiedModelInfo,
    key: string
  ): Promise<Omit<UnifiedModelResponse, 'fallbackTrail'>> {
    const client = new GoogleGenerativeAI(key);
    const model = client.getGenerativeModel({
      model: modelInfo.id,
      tools: request.tools?.length ? [{
        functionDeclarations: request.tools.map((tool) => ({
          name: tool.name,
          description: tool.description || '',
          parameters: tool.parameters,
        })),
      }] : undefined,
    } as any);
    const prompt = request.messages.map((message) => `${message.role}: ${textFromContent(message.content)}`).join('\n\n');
    const result = await model.generateContent(prompt);
    const response = result.response;
    const content = response.text();
    const usage = usageFor(modelInfo.id, prompt, content);

    return {
      id: `gemini-${Date.now()}`,
      provider: 'gemini',
      model: modelInfo.id,
      content,
      toolCalls: [],
      usage,
    };
  }
}

export const unifiedModelProxy = new UnifiedModelProxy();
