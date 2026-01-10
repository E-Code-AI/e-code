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
  // OpenAI aliases & legacy names (COMPLETE COVERAGE - Jan 2026)
  // ✅ CONSOLIDATED: Only gpt-5.2 family is current - older versions mapped for backward compatibility
  'gpt-5': 'gpt-5.2',  // ❌ DEPRECATED Jan 2026 → upgrade to GPT-5.2
  'gpt-5.1': 'gpt-5.2',  // ❌ DEPRECATED Jan 2026 → upgrade to GPT-5.2
  'gpt-5.2': 'gpt-5.2',  // Identity mapping (current)
  'gpt-5.2-codex': 'gpt-5.2-codex',  // Identity mapping (current)
  'gpt-4-turbo-preview': 'gpt-5.2',
  'gpt-4-turbo': 'gpt-4.1',
  'gpt-4': 'gpt-5.2',  // Upgrade to GPT-5.2
  'gpt-4o': 'gpt-5.2',  // ❌ DEPRECATED Feb 2026 → upgrade to GPT-5.2
  'gpt-4o-mini': 'gpt-5-mini',  // ❌ DEPRECATED Feb 2026 → upgrade to GPT-5-mini
  'gpt-3.5-turbo': 'gpt-5-mini',
  'gpt-3.5': 'gpt-5-nano',
  'o3': 'o3',  // Identity mapping
  'o4-mini': 'o4-mini',  // Identity mapping
  
  // Anthropic aliases & version dates (COMPLETE COVERAGE - Jan 2026 Consolidated to 4.5)
  // ✅ UPDATED Jan 2026: Only Claude 4.5 family (opus, sonnet, haiku)
  'claude-3-5-sonnet-20241022': 'claude-sonnet-4-5-20250929',
  'claude-3-5-sonnet': 'claude-sonnet-4-5-20250929',
  'claude-3-opus-20240229': 'claude-opus-4-5-20251101',  // Upgrade to Opus 4.5
  'claude-3-haiku-20240307': 'claude-haiku-4-5-20251015',
  'claude-3-opus': 'claude-opus-4-5-20251101',  // Upgrade to Opus 4.5
  'claude-3-haiku': 'claude-haiku-4-5-20251015',
  'claude-sonnet': 'claude-sonnet-4-5-20250929',
  'claude-opus': 'claude-opus-4-5-20251101',  // Points to Opus 4.5
  'claude-haiku': 'claude-haiku-4-5-20251015',
  'claude-opus-4-5': 'claude-opus-4-5-20251101',  // Short alias
  'claude-opus-4.5': 'claude-opus-4-5-20251101',  // Dot notation alias
  'claude-opus-4-5-20251101': 'claude-opus-4-5-20251101',  // Identity mapping (current)
  'claude-opus-4-5-20251124': 'claude-opus-4-5-20251101',  // ❌ DEPRECATED → upgrade to Nov 01
  'claude-sonnet-4-5-20250929': 'claude-sonnet-4-5-20250929',  // Identity mapping (current)
  'claude-opus-4-1-20250805': 'claude-opus-4-5-20251101',  // ❌ DEPRECATED → upgrade to Opus 4.5
  'claude-sonnet-4-20250514': 'claude-sonnet-4-5-20250929',  // ❌ DEPRECATED → upgrade to Sonnet 4.5
  'claude-haiku-4-5-20251015': 'claude-haiku-4-5-20251015',  // Identity mapping (current)
  
  // Gemini aliases (COMPLETE COVERAGE - Jan 2026 Consolidated to Gemini 3)
  'gemini-pro': 'gemini-3-pro',
  'gemini-flash': 'gemini-3-flash',
  'gemini-1.5-pro': 'gemini-3-pro',
  'gemini-1.5-flash': 'gemini-3-flash',
  'gemini-2.0-flash': 'gemini-3-flash',  // ❌ DEPRECATED → upgrade to Gemini 3
  'gemini-2.0-flash-exp': 'gemini-3-flash',  // ❌ DEPRECATED → upgrade to Gemini 3
  'gemini-2.5-pro': 'gemini-3-pro',  // ❌ DEPRECATED Jan 2026 → upgrade to Gemini 3
  'gemini-2.5-flash': 'gemini-3-flash',  // ❌ DEPRECATED Jan 2026 → upgrade to Gemini 3
  'gemini-3-flash': 'gemini-3-flash',  // Identity mapping (current)
  'gemini-3-pro': 'gemini-3-pro',  // Identity mapping (current)
  
  // xAI Grok aliases (COMPLETE COVERAGE)
  'grok': 'grok-4',
  'grok-fast': 'grok-4-fast',
  'grok-3': 'grok-4',  // Upgrade to latest
  'grok-3-fast': 'grok-4-fast',  // ✅ NEW: Upgrade to latest
  'grok-3-fast-latest': 'grok-4-fast',  // ✅ NEW: Latest alias
  'grok-4': 'grok-4',  // Identity mapping
  'grok-4-fast': 'grok-4-fast',  // Identity mapping
  
  // Moonshot AI / Kimi K2 aliases (Jan 2026 - 4 models)
  'kimi': 'kimi-k2-thinking',
  'kimi-thinking': 'kimi-k2-thinking',
  'kimi-k2': 'kimi-k2-thinking',
  'moonshot-v1-8k': 'kimi-k2-turbo-preview',  // ✅ Legacy → new turbo
  'moonshot-v1-32k': 'kimi-k2-turbo-preview',  // ✅ Legacy → new turbo
  'moonshot-v1-128k': 'kimi-k2-thinking',  // ✅ Legacy → new thinking (large context)
  'kimi-k2-thinking': 'kimi-k2-thinking',  // Identity mapping
  'kimi-k2-thinking-turbo': 'kimi-k2-thinking-turbo',  // Identity mapping
  'kimi-k2-turbo-preview': 'kimi-k2-turbo-preview',  // Identity mapping
  'kimi-k2-0905-preview': 'kimi-k2-0905-preview',  // Identity mapping
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
  // ✅ UPDATED Jan 2026: All defaults aligned with current production models
  const providerDefaults: Record<string, string> = {
    'openai': 'gpt-5-mini',
    'anthropic': 'claude-sonnet-4-5-20250929',
    'gemini': 'gemini-3-flash',  // ✅ UPDATED Jan 2026: New flagship
    'google': 'gemini-3-flash',
    'xai': 'grok-4',
    'moonshot': 'kimi-k2-thinking',  // ✅ UPDATED Jan 2026: Kimi K2 default
  };
  
  // Step 4: Try exact match (already valid enum value - COMPLETE LIST)
  // ✅ UPDATED Jan 2026: All production models
  const validEnumValues = [
    // Legacy models (backward compat - kept in DB enum)
    'gpt-4', 'gpt-4-turbo',
    'claude-3-opus', 'claude-3-sonnet', 'claude-3-5-sonnet', 'claude-3-haiku',
    'gemini-pro', 'gemini-ultra', 'gpt-5.1', 'gpt-5',
    
    // OpenAI (Jan 2026 - 10 models)
    'gpt-5.2', 'gpt-5.2-codex', 'gpt-5-mini', 'gpt-5-nano', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-4o', 'gpt-4o-mini', 'o3', 'o4-mini',
    
    // Anthropic (Jan 2026 - 5 models)
    'claude-opus-4-5-20251101', 'claude-opus-4-1-20250805', 'claude-sonnet-4-5-20250929', 'claude-sonnet-4-20250514', 'claude-haiku-4-5-20251015',
    
    // Google Gemini (Jan 2026 - 5 models with Gemini 3)
    'gemini-3-flash', 'gemini-3-pro', 'gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash',
    
    // xAI Grok (Jan 2026 - 4 models)
    'grok-4-1-fast-reasoning', 'grok-4-1-fast', 'grok-4', 'grok-3',
    
    // Moonshot AI / Kimi K2 (Jan 2026 - 4 models)
    'kimi-k2-thinking', 'kimi-k2-thinking-turbo', 'kimi-k2-turbo-preview', 'kimi-k2-0905-preview'
  ];
  
  if (normalizedInput && validEnumValues.includes(normalizedInput)) {
    return normalizedInput;
  }
  
  // Step 5: ⚠️ CRITICAL - Unknown model detected! Log + Alert for monitoring
  if (normalizedInput) {
    logger.warn(`⚠️ UNKNOWN MODEL DETECTED: "${normalizedInput}" (provider: ${provider}) - Using fallback pricing!`);
    logger.warn(`ACTION REQUIRED: Add "${normalizedInput}" to MODEL_NORMALIZATION_MAP in server/utils/model-normalizer.ts`);
    
    // ✅ Send automated alert to Slack/Sentry
    const fallback = providerDefaults[provider.toLowerCase()] || 'gpt-5-mini';
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
  
  // Step 6: Ultimate fallback (OpenAI GPT-5-mini - most common, gpt-4o deprecated)
  logger.warn(`⚠️ Unknown provider "${provider}", using ultimate fallback: gpt-5-mini`);
  return 'gpt-5-mini';
}
