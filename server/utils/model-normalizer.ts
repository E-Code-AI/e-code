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
// ✅ UPDATED Dec 5, 2025: Added all current provider models for complete coverage
const MODEL_NORMALIZATION_MAP: Record<string, string> = {
  // OpenAI aliases & legacy names (COMPLETE COVERAGE)
  'gpt-4-turbo-preview': 'gpt-5',
  'gpt-4-turbo': 'gpt-4.1',
  'gpt-4': 'gpt-4o',
  'gpt-4o': 'gpt-4o',  // Identity mapping
  'gpt-4o-mini': 'gpt-4o-mini',  // ✅ NEW: Production model
  'gpt-3.5-turbo': 'gpt-5-mini',
  'gpt-3.5': 'gpt-5-nano',
  'o3': 'o3',  // Identity mapping
  'o4-mini': 'o4-mini',  // Identity mapping
  
  // Anthropic aliases & version dates (COMPLETE COVERAGE)
  'claude-3-5-sonnet-20241022': 'claude-sonnet-4-5-20250929',
  'claude-3-5-sonnet': 'claude-sonnet-4-5-20250929',
  'claude-3-opus-20240229': 'claude-opus-4-1-20250805',
  'claude-3-haiku-20240307': 'claude-haiku-4-5-20251015',
  'claude-3-opus': 'claude-opus-4-1-20250805',
  'claude-3-haiku': 'claude-haiku-4-5-20251015',
  'claude-sonnet': 'claude-sonnet-4-5-20250929',
  'claude-opus': 'claude-opus-4-1-20250805',
  'claude-haiku': 'claude-haiku-4-5-20251015',
  'claude-sonnet-4-5-20250929': 'claude-sonnet-4-5-20250929',  // Identity mapping
  'claude-opus-4-1-20250805': 'claude-opus-4-1-20250805',  // Identity mapping
  'claude-haiku-4-5-20251015': 'claude-haiku-4-5-20251015',  // Identity mapping
  
  // Gemini aliases (COMPLETE COVERAGE)
  'gemini-pro': 'gemini-2.5-pro',
  'gemini-flash': 'gemini-2.5-flash',
  'gemini-1.5-pro': 'gemini-2.5-pro',
  'gemini-1.5-flash': 'gemini-2.5-flash',
  'gemini-2.0-flash': 'gemini-2.0-flash',  // ✅ NEW: Current model (identity)
  'gemini-2.0-flash-exp': 'gemini-2.0-flash',  // Experimental alias
  'gemini-2.5-pro': 'gemini-2.5-pro',  // Identity mapping
  'gemini-2.5-flash': 'gemini-2.5-flash',  // Identity mapping
  
  // xAI Grok aliases (COMPLETE COVERAGE)
  'grok': 'grok-4',
  'grok-fast': 'grok-4-fast',
  'grok-3': 'grok-4',  // Upgrade to latest
  'grok-3-fast': 'grok-4-fast',  // ✅ NEW: Upgrade to latest
  'grok-3-fast-latest': 'grok-4-fast',  // ✅ NEW: Latest alias
  'grok-4': 'grok-4',  // Identity mapping
  'grok-4-fast': 'grok-4-fast',  // Identity mapping
  
  // Moonshot AI aliases (COMPLETE COVERAGE)
  'kimi': 'kimi-k2-0711-preview',
  'kimi-thinking': 'kimi-k2-thinking',
  'kimi-k2': 'kimi-k2-0711-preview',  // Legacy fallback
  'kimi-k2-turbo': 'kimi-k2-0711-preview',  // Turbo doesn't exist
  'moonshot-v1-8k': 'kimi-k2-0711-preview',  // ✅ NEW: Moonshot model alias
  'moonshot-v1-32k': 'moonshot-v1-32k',  // ✅ NEW: Current model (identity)
  'moonshot-v1-128k': 'moonshot-v1-128k',  // ✅ NEW: Large context model
  'kimi-k2-0711-preview': 'kimi-k2-0711-preview',  // Identity mapping
  'kimi-k2-0905-preview': 'kimi-k2-0905-preview',  // Identity mapping
  'kimi-k2-thinking': 'kimi-k2-thinking',  // Identity mapping
};

/**
 * Normalize model name to valid aiModelEnum value
 * @param modelName - Raw model name from API request or provider default (can be string or model object)
 * @param provider - Provider name (for fallback)
 * @returns Valid aiModelEnum value guaranteed to pass DB insert
 */
export function normalizeModelName(modelName: string | any | undefined, provider: string): string {
  // ✅ CRITICAL FIX (Dec 2, 2025): Handle model OBJECTS being passed instead of string IDs
  // Frontend may pass full model object like {id: "kimi-k2-0711-preview", name: "KIMI K2"...}
  // Extract the ID if it's an object with an `id` property
  let normalizedInput: string | undefined = modelName;
  
  if (modelName && typeof modelName === 'object') {
    if ('id' in modelName && typeof modelName.id === 'string') {
      logger.debug(`Model object detected, extracting id: ${modelName.id}`);
      normalizedInput = modelName.id;
    } else if ('modelId' in modelName && typeof modelName.modelId === 'string') {
      logger.debug(`Model object with modelId detected, extracting: ${modelName.modelId}`);
      normalizedInput = modelName.modelId;
    } else {
      logger.warn(`⚠️ Model object has no valid id/modelId property:`, JSON.stringify(modelName));
      normalizedInput = undefined;
    }
  }
  
  // Step 1: Handle undefined/null model names
  if (!normalizedInput) {
    logger.warn(`⚠️ Model name is undefined/null, using provider default for ${provider}`);
  }
  
  // Step 2: Try exact match in normalization map (aliases)
  if (normalizedInput && MODEL_NORMALIZATION_MAP[normalizedInput]) {
    const normalized = MODEL_NORMALIZATION_MAP[normalizedInput];
    logger.debug(`Model alias normalized: "${normalizedInput}" → "${normalized}"`);
    return normalized;
  }
  
  // Step 3: Provider-specific fallback defaults (MUST be defined BEFORE use)
  // ✅ ALIGNED Dec 5, 2025: Defaults MUST match ai-streaming.ts getDefaultModel()
  const providerDefaults: Record<string, string> = {
    'openai': 'gpt-4o-mini',  // ✅ ALIGNED with ai-streaming default
    'anthropic': 'claude-sonnet-4-5-20250929',
    'gemini': 'gemini-2.0-flash',  // ✅ ALIGNED with ai-streaming default
    'google': 'gemini-2.0-flash',
    'xai': 'grok-4-fast',
    'moonshot': 'moonshot-v1-32k',  // ✅ ALIGNED with ai-streaming default
  };
  
  // Step 4: Try exact match (already valid enum value - COMPLETE LIST)
  // ✅ UPDATED Dec 5, 2025: Added all current production models
  const validEnumValues = [
    // Legacy models (backward compat)
    'gpt-4', 'gpt-4-turbo',
    'claude-3-opus', 'claude-3-sonnet', 'claude-3-5-sonnet', 'claude-3-haiku',
    'gemini-pro', 'gemini-ultra',
    
    // OpenAI current models
    'gpt-5.1', 'gpt-5', 'gpt-5-mini', 'gpt-5-nano', 'gpt-4.1', 'gpt-4o', 'gpt-4o-mini', 'o3', 'o4-mini',
    
    // Anthropic current models
    'claude-sonnet-4-5-20250929', 'claude-opus-4-1-20250805', 'claude-haiku-4-5-20251015',
    
    // Gemini current models
    'gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash',
    
    // xAI Grok current models
    'grok-4', 'grok-4-fast',
    
    // Moonshot AI current models
    'kimi-k2-0711-preview', 'kimi-k2-0905-preview', 'kimi-k2-thinking',
    'moonshot-v1-32k', 'moonshot-v1-128k'
  ];
  
  if (normalizedInput && validEnumValues.includes(normalizedInput)) {
    return normalizedInput;
  }
  
  // Step 5: ⚠️ CRITICAL - Unknown model detected! Log + Alert for monitoring
  if (normalizedInput) {
    logger.warn(`⚠️ UNKNOWN MODEL DETECTED: "${normalizedInput}" (provider: ${provider}) - Using fallback pricing!`);
    logger.warn(`ACTION REQUIRED: Add "${normalizedInput}" to MODEL_NORMALIZATION_MAP in server/utils/model-normalizer.ts`);
    
    // ✅ Send automated alert to Slack/Sentry
    const fallback = providerDefaults[provider.toLowerCase()] || 'gpt-4o';
    AlertService.unknownModel(normalizedInput, provider, fallback).catch((error) => {
      logger.error('Failed to send unknown model alert', { error });
    });
  }
  
  // Step 6: Apply provider fallback
  
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
