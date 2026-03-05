/**
 * Model Name Normalizer (Production-Critical)
 * 
 * Maps ALL possible model names (aliases, legacy, fake names) to valid aiModelEnum values
 * that actually work with the respective provider APIs.
 * 
 * CRITICAL RULE: Real model names stay as-is. Fake/deprecated names map to real equivalents.
 */

import { createLogger } from './logger';
import { AlertService } from '../services/alert-service';

const logger = createLogger('model-normalizer');

// Maps model alias/fake → real model name that works with the actual provider API
const MODEL_NORMALIZATION_MAP: Record<string, string> = {
  // ── OpenAI: fake/deprecated → real ──────────────────────────────────────────
  'gpt-5': 'gpt-4o',
  'gpt-5.1': 'gpt-4o',
  'gpt-5.2': 'gpt-4o',
  'gpt-5.2-codex': 'gpt-4o',
  'gpt-5-mini': 'gpt-4o-mini',
  'gpt-5-nano': 'gpt-4o-mini',
  'gpt-4.1': 'gpt-4o',
  'gpt-4.1-mini': 'gpt-4o-mini',
  'gpt-4.1-nano': 'gpt-4o-mini',
  'o4-mini': 'o1-mini',
  // Real OpenAI models — identity mappings
  'gpt-4o': 'gpt-4o',
  'gpt-4o-mini': 'gpt-4o-mini',
  'gpt-4-turbo': 'gpt-4-turbo',
  'gpt-4-turbo-preview': 'gpt-4-turbo',
  'gpt-4': 'gpt-4',
  'o1': 'o1',
  'o1-mini': 'o1-mini',
  'o3': 'o3',

  // ── Anthropic: fake/deprecated → real ───────────────────────────────────────
  'claude-haiku-4-5-20251015': 'claude-3-5-haiku-20241022',
  'claude-sonnet-4-5-20250929': 'claude-3-5-sonnet-20241022',
  'claude-opus-4-5-20251101': 'claude-3-5-sonnet-20241022',
  'claude-opus-4-5-20251124': 'claude-3-5-sonnet-20241022',
  'claude-opus-4-1-20250805': 'claude-3-5-sonnet-20241022',
  'claude-sonnet-4-20250514': 'claude-3-5-sonnet-20241022',
  // Real Anthropic models — identity mappings
  'claude-3-5-sonnet-20241022': 'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022': 'claude-3-5-haiku-20241022',
  'claude-3-opus-20240229': 'claude-3-opus-20240229',
  'claude-3-haiku-20240307': 'claude-3-haiku-20240307',
  // Short alias → real
  'claude-sonnet': 'claude-3-5-sonnet-20241022',
  'claude-opus': 'claude-3-opus-20240229',
  'claude-haiku': 'claude-3-5-haiku-20241022',
  'claude-3-5-sonnet': 'claude-3-5-sonnet-20241022',
  'claude-3-opus': 'claude-3-opus-20240229',
  'claude-3-haiku': 'claude-3-haiku-20240307',
  'claude-opus-4-5': 'claude-3-5-sonnet-20241022',
  'claude-opus-4.5': 'claude-3-5-sonnet-20241022',
  'claude-sonnet-4': 'claude-3-5-sonnet-20241022',

  // ── Google Gemini: fake/deprecated → real ────────────────────────────────────
  'gemini-3-flash': 'gemini-2.5-flash',
  'gemini-3-pro': 'gemini-1.5-pro',
  'gemini-2.5-pro': 'gemini-1.5-pro',
  'gemini-2.0-flash-exp': 'gemini-2.0-flash',
  // Real Gemini models — identity mappings
  'gemini-2.5-flash': 'gemini-2.5-flash',
  'gemini-2.0-flash': 'gemini-2.0-flash',
  'gemini-1.5-pro': 'gemini-1.5-pro',
  'gemini-1.5-flash': 'gemini-1.5-flash',
  // Short aliases
  'gemini-pro': 'gemini-1.5-pro',
  'gemini-flash': 'gemini-1.5-flash',

  // ── xAI: fake/deprecated → real ─────────────────────────────────────────────
  'grok': 'grok-2-1212',
  'grok-3': 'grok-2-1212',
  'grok-3-fast': 'grok-2-1212',
  'grok-3-fast-latest': 'grok-2-1212',
  'grok-4': 'grok-2-1212',
  'grok-4-fast': 'grok-2-1212',
  'grok-fast': 'grok-2-1212',
  'grok-4-1-fast': 'grok-2-1212',
  'grok-4-1-fast-reasoning': 'grok-2-1212',
  // Real xAI models — identity mappings
  'grok-2-1212': 'grok-2-1212',
  'grok-2-vision-1212': 'grok-2-vision-1212',

  // ── Moonshot AI: fake/aliases → real ─────────────────────────────────────────
  'kimi': 'moonshot-v1-32k',
  'kimi-k2': 'moonshot-v1-32k',
  'kimi-thinking': 'moonshot-v1-128k',
  'kimi-k2-thinking': 'moonshot-v1-128k',
  'kimi-k2-thinking-turbo': 'moonshot-v1-128k',
  'kimi-k2-turbo-preview': 'moonshot-v1-32k',
  'kimi-k2-0905-preview': 'moonshot-v1-128k',
  'kimi-k2-0711-preview': 'moonshot-v1-128k',
  // Real Moonshot models — identity mappings
  'moonshot-v1-8k': 'moonshot-v1-8k',
  'moonshot-v1-32k': 'moonshot-v1-32k',
  'moonshot-v1-128k': 'moonshot-v1-128k',
};

/**
 * Normalize model name to a valid aiModelEnum value that actually works with the provider API.
 * @param modelName - Raw model name from API request or provider default
 * @param provider - Provider name (for fallback)
 * @returns Valid model name for both API calls and DB inserts
 */
export function normalizeModelName(modelName: string | any | undefined, provider: string): string {
  let normalizedInput: string | undefined = modelName;
  
  // Handle model OBJECTS being passed instead of string IDs
  if (modelName && typeof modelName === 'object') {
    if ('id' in modelName && typeof modelName.id === 'string') {
      normalizedInput = modelName.id;
    } else if ('modelId' in modelName && typeof modelName.modelId === 'string') {
      normalizedInput = modelName.modelId;
    } else {
      logger.warn(`Model object has no valid id/modelId:`, JSON.stringify(modelName));
      normalizedInput = undefined;
    }
  }
  
  // Provider-specific fallback defaults (real model names)
  const providerDefaults: Record<string, string> = {
    'openai': 'gpt-4o',
    'anthropic': 'claude-3-5-sonnet-20241022',
    'gemini': 'gemini-1.5-pro',
    'google': 'gemini-1.5-pro',
    'xai': 'grok-2-1212',
    'moonshot': 'moonshot-v1-32k',
  };

  // Handle undefined/null
  if (!normalizedInput) {
    const fallback = providerDefaults[provider.toLowerCase()] || 'gpt-4o';
    logger.warn(`Model name is undefined/null, using provider default: ${fallback}`);
    return fallback;
  }
  
  // Exact match in normalization map
  if (MODEL_NORMALIZATION_MAP[normalizedInput]) {
    const normalized = MODEL_NORMALIZATION_MAP[normalizedInput];
    if (normalized !== normalizedInput) {
      logger.debug(`Model normalized: "${normalizedInput}" → "${normalized}"`);
    }
    return normalized;
  }
  
  // Unknown model — log warning and use provider default
  logger.warn(`Unknown model: "${normalizedInput}" (provider: ${provider}) — using provider default`);
  AlertService.unknownModel(normalizedInput, provider, providerDefaults[provider.toLowerCase()] || 'gpt-4o').catch(() => {});
  
  const normalizedProvider = provider.toLowerCase();
  return providerDefaults[normalizedProvider] || 'gpt-4o';
}
