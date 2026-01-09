import { AI_MODELS, AIModel } from '../../../shared/mobile-types';
import { API_BASE_URL } from './config';

export type AIProvider = 'openai' | 'anthropic' | 'gemini' | 'xai' | 'moonshot';

export interface AIProviderConfig {
  id: AIProvider;
  name: string;
  icon: string;
  models: AIModel[];
  color: string;
}

export const AI_PROVIDERS: AIProviderConfig[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    icon: '🤖',
    color: '#10A37F',
    // Updated Jan 2026 - Official OpenAI documentation
    models: ['gpt-5.2', 'gpt-5.2-codex', 'gpt-5.1', 'gpt-5', 'gpt-5-mini', 'gpt-5-nano', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-4o', 'gpt-4o-mini', 'o3', 'o4-mini'],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    icon: '🧠',
    color: '#D97757',
    // Updated Jan 2026 - Official Anthropic documentation
    models: ['claude-opus-4-5-20251101', 'claude-opus-4-1-20250805', 'claude-sonnet-4-5-20250929', 'claude-sonnet-4-20250514', 'claude-haiku-4-5'],
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    icon: '✨',
    color: '#4285F4',
    // Updated Jan 2026 - Official Gemini documentation
    models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'],
  },
  {
    id: 'xai',
    name: 'xAI',
    icon: '⚡',
    color: '#1DA1F2',
    // Updated Jan 2026 - Official xAI documentation
    models: ['grok-4-1-fast-reasoning', 'grok-4-1-fast-non-reasoning', 'grok-4', 'grok-3'],
  },
  {
    id: 'groq',
    name: 'Groq',
    icon: '⚡',
    color: '#FF6B35',
    models: ['mixtral-8x7b-32768', 'llama3-70b-8192'],
  },
  {
    id: 'moonshot',
    name: 'Moonshot AI',
    icon: '🌙',
    color: '#9333EA',
    // Updated Jan 2026 - Backend enforces temperature=1.0 and max_tokens>=16384 for K2
    models: ['kimi-k2-thinking', 'kimi-k2-thinking-turbo', 'kimi-k2-turbo-preview', 'kimi-k2-0905-preview'],
  },
];

export function getProviderForModel(model: AIModel): AIProvider | null {
  for (const provider of AI_PROVIDERS) {
    if (provider.models.includes(model)) {
      return provider.id;
    }
  }
  return null;
}

export function getProviderConfig(providerId: AIProvider): AIProviderConfig | undefined {
  return AI_PROVIDERS.find(p => p.id === providerId);
}

export function getModelDisplayName(model: AIModel): string {
  // Updated January 2026 - Official provider documentation
  const displayNames: Partial<Record<AIModel, string>> = {
    // OpenAI (Jan 2026)
    'gpt-5.2': 'GPT-5.2',
    'gpt-5.2-codex': 'GPT-5.2 Codex',
    'gpt-5.1': 'GPT-5.1',
    'gpt-5': 'GPT-5',
    'gpt-5-mini': 'GPT-5 Mini',
    'gpt-5-nano': 'GPT-5 Nano',
    'gpt-4.1': 'GPT-4.1',
    'gpt-4.1-mini': 'GPT-4.1 Mini',
    'gpt-4.1-nano': 'GPT-4.1 Nano',
    'gpt-4o': 'GPT-4o',
    'gpt-4o-mini': 'GPT-4o Mini',
    'o3': 'O3',
    'o4-mini': 'O4 Mini',
    // Anthropic (Jan 2026)
    'claude-opus-4-5-20251101': 'Claude Opus 4.5',
    'claude-opus-4-1-20250805': 'Claude Opus 4.1',
    'claude-sonnet-4-5-20250929': 'Claude Sonnet 4.5',
    'claude-sonnet-4-20250514': 'Claude Sonnet 4',
    'claude-haiku-4-5': 'Claude Haiku 4.5',
    // Gemini (Jan 2026)
    'gemini-2.5-pro': 'Gemini 2.5 Pro',
    'gemini-2.5-flash': 'Gemini 2.5 Flash',
    'gemini-2.0-flash': 'Gemini 2.0 Flash',
    // xAI (Jan 2026)
    'grok-4-1-fast-reasoning': 'Grok 4.1 Fast (Reasoning)',
    'grok-4-1-fast-non-reasoning': 'Grok 4.1 Fast (Non-Reasoning)',
    'grok-4': 'Grok 4',
    'grok-3': 'Grok 3',
    // Groq (Open-source hosted)
    'mixtral-8x7b-32768': 'Mixtral 8x7B',
    'llama3-70b-8192': 'Llama 3 70B',
    // Moonshot (Jan 2026)
    'kimi-k2-thinking': 'Kimi K2 Thinking',
    'kimi-k2-thinking-turbo': 'Kimi K2 Thinking Turbo',
    'kimi-k2-turbo-preview': 'Kimi K2 Turbo Preview',
    'kimi-k2-0905-preview': 'Kimi K2 (Sept 2025)',
  };
  return displayNames[model] || model;
}

export interface StreamingMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface StreamingOptions {
  model: AIModel;
  messages: StreamingMessage[];
  projectId: number;
  onToken: (token: string) => void;
  onComplete: (fullResponse: string) => void;
  onError: (error: Error) => void;
  signal?: AbortSignal;
  token: string;
}

export async function streamChatCompletion(options: StreamingOptions): Promise<void> {
  const { model, messages, projectId, onToken, onComplete, onError, signal, token } = options;
  const provider = getProviderForModel(model);
  
  if (!provider) {
    onError(new Error(`Unknown provider for model: ${model}`));
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/mobile/ai/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({
        model,
        provider,
        projectId,
        messages,
      }),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let fullResponse = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          
          if (data === '[DONE]') {
            onComplete(fullResponse);
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.content || parsed.delta?.content || parsed.choices?.[0]?.delta?.content || '';
            
            if (content) {
              fullResponse += content;
              onToken(content);
            }
          } catch (e) {
            if (data.trim() && data !== '[DONE]') {
              fullResponse += data;
              onToken(data);
            }
          }
        }
      }
    }

    if (buffer.trim()) {
      if (buffer.startsWith('data: ')) {
        const data = buffer.slice(6);
        if (data !== '[DONE]') {
          try {
            const parsed = JSON.parse(data);
            const content = parsed.content || parsed.delta?.content || '';
            if (content) {
              fullResponse += content;
              onToken(content);
            }
          } catch {
            fullResponse += data;
            onToken(data);
          }
        }
      }
    }

    onComplete(fullResponse);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      onComplete(fullResponse || '');
      return;
    }
    onError(error instanceof Error ? error : new Error(String(error)));
  }
}

export async function sendChatMessage(
  model: AIModel,
  messages: StreamingMessage[],
  projectId: number,
  token: string
): Promise<string> {
  const provider = getProviderForModel(model);
  
  if (!provider) {
    throw new Error(`Unknown provider for model: ${model}`);
  }

  const response = await fetch(`${API_BASE_URL}/mobile/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      model,
      provider,
      projectId,
      messages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.content || data.message || '';
}

export { AI_MODELS };
export type { AIModel };
