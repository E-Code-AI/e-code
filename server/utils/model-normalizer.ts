/**
 * Model Name Normalizer (Production-Critical)
 * 
 * Maps ALL possible model names (aliases, legacy, provider defaults) to valid aiModelEnum values
 * CRITICAL: Prevents DB insert failures that cause revenue loss
 */

import { createLogger } from './logger';
import { AlertService } from '../services/alert-service';

const logger = createLogger('model-normalizer');

// Comprehensive model mapping: alias → official enum value
const MODEL_NORMALIZATION_MAP: Record<string, string> = {
  // OpenAI aliases & legacy names
  'gpt-4-turbo-preview': 'gpt-5',
  'gpt-4-turbo': 'gpt-4.1',
  'gpt-4': 'gpt-4o',
  'gpt-3.5-turbo': 'gpt-5-mini',
  'gpt-3.5': 'gpt-5-nano',
  
  // Anthropic aliases & version dates
  'claude-3-5-sonnet-20241022': 'claude-sonnet-4-5-20250929',
  'claude-3-opus': 'claude-opus-4-1-20250805',
  'claude-3-haiku': 'claude-haiku-4-5-20251015',
  'claude-sonnet': 'claude-sonnet-4-5-20250929',
  'claude-opus': 'claude-opus-4-1-20250805',
  'claude-haiku': 'claude-haiku-4-5-20251015',
  
  // Gemini aliases
  'gemini-pro': 'gemini-2.5-pro',
  'gemini-flash': 'gemini-2.5-flash',
  'gemini-1.5-pro': 'gemini-2.5-pro',
  'gemini-1.5-flash': 'gemini-2.5-flash',
  
  // xAI aliases
  'grok': 'grok-4',
  'grok-fast': 'grok-4-fast',
  
  // Moonshot AI aliases
  'kimi': 'kimi-k2',
  'kimi-thinking': 'kimi-k2-thinking',
  'kimi-turbo': 'kimi-k2-turbo',
};

/**
 * Normalize model name to valid aiModelEnum value
 * @param modelName - Raw model name from API request or provider default
 * @param provider - Provider name (for fallback)
 * @returns Valid aiModelEnum value guaranteed to pass DB insert
 */
export function normalizeModelName(modelName: string | undefined, provider: string): string {
  // Step 1: Handle undefined/null model names
  if (!modelName) {
    logger.warn(`⚠️ Model name is undefined/null, using provider default for ${provider}`);
  }
  
  // Step 2: Try exact match in normalization map (aliases)
  if (modelName && MODEL_NORMALIZATION_MAP[modelName]) {
    const normalized = MODEL_NORMALIZATION_MAP[modelName];
    logger.debug(`Model alias normalized: "${modelName}" → "${normalized}"`);
    return normalized;
  }
  
  // Step 3: Try exact match (already valid enum value)
  const validEnumValues = [
    'gpt-5.1', 'gpt-5', 'gpt-5-mini', 'gpt-5-nano', 'gpt-4.1', 'gpt-4o', 'o3', 'o4-mini',
    'claude-sonnet-4-5-20250929', 'claude-opus-4-1-20250805', 'claude-haiku-4-5-20251015',
    'gemini-2.5-pro', 'gemini-2.5-flash',
    'grok-4', 'grok-4-fast',
    'kimi-k2', 'kimi-k2-thinking', 'kimi-k2-turbo'
  ];
  
  if (modelName && validEnumValues.includes(modelName)) {
    return modelName;
  }
  
  // Step 4: ⚠️ CRITICAL - Unknown model detected! Log + Alert for monitoring
  if (modelName) {
    logger.warn(`⚠️ UNKNOWN MODEL DETECTED: "${modelName}" (provider: ${provider}) - Using fallback pricing!`);
    logger.warn(`ACTION REQUIRED: Add "${modelName}" to MODEL_NORMALIZATION_MAP in server/utils/model-normalizer.ts`);
    
    // ✅ Send automated alert to Slack/Sentry
    const fallback = providerDefaults[provider.toLowerCase()] || 'gpt-4o';
    AlertService.unknownModel(modelName, provider, fallback).catch((error) => {
      logger.error('Failed to send unknown model alert', { error });
    });
  }
  
  // Step 5: Provider-specific fallback defaults
  const providerDefaults: Record<string, string> = {
    'openai': 'gpt-4o',
    'anthropic': 'claude-sonnet-4-5-20250929',
    'gemini': 'gemini-2.5-flash',
    'google': 'gemini-2.5-flash',
    'xai': 'grok-4-fast',
    'moonshot': 'kimi-k2-turbo',
  };
  
  const normalizedProvider = provider.toLowerCase();
  if (providerDefaults[normalizedProvider]) {
    const fallback = providerDefaults[normalizedProvider];
    logger.info(`Using provider fallback: ${provider} → ${fallback}`);
    return fallback;
  }
  
  // Step 6: Ultimate fallback (OpenAI GPT-4o - most common)
  logger.warn(`⚠️ Unknown provider "${provider}", using ultimate fallback: gpt-4o`);
  return 'gpt-4o';
}
