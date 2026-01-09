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
    // Updated Dec 2025 - o1/o1-mini replaced by o3/o4-mini
    models: ['gpt-5.2', 'gpt-5.2-codex', 'gpt-5.1', 'gpt-5', 'gpt-4o', 'gpt-4o-mini', 'o3', 'o4-mini'],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    icon: '🧠',
    color: '#D97757',
    // Updated Nov 2025 - Claude 4.5 series (3.5 deprecated June 2025)
    models: ['claude-opus-4-5-20251124', 'claude-sonnet-4-5-20250929', 'claude-haiku-4-5-20251015'],
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    icon: '✨',
    color: '#4285F4',
    // Updated Nov 2025 - Gemini 1.5 RETIRED April 2025, only 2.5/2.0 available
    models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'],
  },
  {
    id: 'xai',
    name: 'xAI',
    icon: '⚡',
    color: '#1DA1F2',
    // Updated Jan 2025 - grok-beta/grok-2 DEPRECATED, use Grok 4.x family
    models: ['grok-4-1-fast', 'grok-4-fast', 'grok-4'],
  },
  {
    id: 'moonshot',
    name: 'Moonshot AI',
    icon: '🌙',
    color: '#9333EA',
    // ✅ KIMI K2 MODELS: Backend enforces temperature=1.0 and max_tokens>=16384
    models: ['kimi-k2-0905-preview', 'kimi-k2-thinking', 'moonshot-v1-32k', 'moonshot-v1-128k'],
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
  // Updated January 2025 - Official provider documentation
  const displayNames: Partial<Record<AIModel, string>> = {
    // OpenAI (Dec 2025)
    'gpt-5.2': 'GPT-5.2',
    'gpt-5.2-codex': 'GPT-5.2 Codex',
    'gpt-5.1': 'GPT-5.1',
    'gpt-5': 'GPT-5',
    'gpt-4o': 'GPT-4o',
    'gpt-4o-mini': 'GPT-4o Mini',
    'o3': 'O3',
    'o4-mini': 'O4 Mini',
    // Anthropic (Nov 2025)
    'claude-opus-4-5-20251124': 'Claude Opus 4.5',
    'claude-sonnet-4-5-20250929': 'Claude Sonnet 4.5',
    'claude-haiku-4-5-20251015': 'Claude Haiku 4.5',
    // Gemini (Nov 2025)
    'gemini-2.5-pro': 'Gemini 2.5 Pro',
    'gemini-2.5-flash': 'Gemini 2.5 Flash',
    'gemini-2.0-flash': 'Gemini 2.0 Flash',
    // xAI (Jan 2025)
    'grok-4-1-fast': 'Grok 4.1 Fast',
    'grok-4-fast': 'Grok 4 Fast',
    'grok-4': 'Grok 4',
    // Moonshot (Sept 2025)
    'kimi-k2-0905-preview': 'Kimi K2 (Sept 2025)',
    'kimi-k2-thinking': 'Kimi K2 Thinking',
    'moonshot-v1-32k': 'Moonshot 32K',
    'moonshot-v1-128k': 'Moonshot 128K',
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
