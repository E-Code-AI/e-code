/**
 * Centralized AI Model Pricing Configuration
 * 
 * ✅ Issue #36 FIX: Extracted pricing from ai-metering-service.ts to centralized config
 * 
 * All pricing is in USD per 1 million tokens.
 * Source: Official pricing from OpenAI, Anthropic, Google, xAI, Moonshot (Dec 2025)
 * 
 * Usage:
 *   import { MODEL_PRICING, getModelPricing } from './config/ai-pricing';
 *   const pricing = getModelPricing('gpt-5.1');
 *   const cost = (tokensInput / 1_000_000) * pricing.input + (tokensOutput / 1_000_000) * pricing.output;
 */

export interface ModelPricing {
  input: number;   // USD per 1M input tokens
  output: number;  // USD per 1M output tokens
}

export interface ModelPricingEntry extends ModelPricing {
  provider: string;
  name: string;
}

/**
 * Centralized model pricing (USD per 1M tokens)
 * Keep in sync with AI_MODELS in ai-provider-manager.ts
 */
export const MODEL_PRICING: Record<string, ModelPricingEntry> = {
  // OpenAI - 8 models (Dec 2025)
  'gpt-5.1': { input: 15.0, output: 60.0, provider: 'openai', name: 'GPT-5.1' },
  'gpt-5.1-thinking': { input: 15.0, output: 60.0, provider: 'openai', name: 'GPT-5.1 Thinking' },
  'gpt-5': { input: 10.0, output: 40.0, provider: 'openai', name: 'GPT-5' },
  'gpt-5-mini': { input: 0.3, output: 1.2, provider: 'openai', name: 'GPT-5 Mini' },
  'gpt-5-nano': { input: 0.15, output: 0.6, provider: 'openai', name: 'GPT-5 Nano' },
  'gpt-4.1': { input: 2.0, output: 8.0, provider: 'openai', name: 'GPT-4.1' },
  'gpt-4.1-mini': { input: 0.4, output: 1.6, provider: 'openai', name: 'GPT-4.1 Mini' },
  'gpt-4.1-nano': { input: 0.1, output: 0.4, provider: 'openai', name: 'GPT-4.1 Nano' },
  'o3': { input: 20.0, output: 80.0, provider: 'openai', name: 'o3' },
  'o4-mini': { input: 0.4, output: 1.6, provider: 'openai', name: 'o4 Mini' },
  
  // Anthropic - Claude 4.5 family (Dec 2025)
  'claude-opus-4-5-20251124': { input: 15.0, output: 75.0, provider: 'anthropic', name: 'Claude Opus 4.5' },
  'claude-sonnet-4-5-20250929': { input: 3.0, output: 15.0, provider: 'anthropic', name: 'Claude Sonnet 4.5' },
  'claude-haiku-4-5-20251015': { input: 0.25, output: 1.25, provider: 'anthropic', name: 'Claude Haiku 4.5' },
  
  // Google Gemini
  'gemini-2.5-pro': { input: 1.25, output: 5.0, provider: 'gemini', name: 'Gemini 2.5 Pro' },
  'gemini-2.5-flash': { input: 0.075, output: 0.3, provider: 'gemini', name: 'Gemini 2.5 Flash' },
  
  // xAI Grok
  'grok-4': { input: 5.0, output: 15.0, provider: 'xai', name: 'Grok 4' },
  'grok-4-fast': { input: 0.5, output: 1.5, provider: 'xai', name: 'Grok 4 Fast' },
  
  // Moonshot AI (Kimi K2) - Verified Dec 2025
  'kimi-k2-0711-preview': { input: 0.6, output: 2.5, provider: 'moonshot', name: 'Kimi K2' },
  'kimi-k2-thinking': { input: 0.6, output: 2.5, provider: 'moonshot', name: 'Kimi K2 Thinking' },
  'moonshot-v1-32k': { input: 0.12, output: 0.12, provider: 'moonshot', name: 'Moonshot v1 32K' },
  'moonshot-v1-128k': { input: 0.24, output: 0.24, provider: 'moonshot', name: 'Moonshot v1 128K' },
  
  // Groq (inference provider)
  'mixtral-8x7b-32768': { input: 0.27, output: 0.27, provider: 'groq', name: 'Mixtral 8x7B' },
  'llama3-70b-8192': { input: 0.59, output: 0.79, provider: 'groq', name: 'Llama 3 70B' },
};

/**
 * Default pricing for unknown models
 */
export const DEFAULT_PRICING: ModelPricing = {
  input: 2.0,   // Conservative default: $2 per 1M tokens
  output: 2.0
};

/**
 * Get pricing for a model with fallback to default
 */
export function getModelPricing(modelId: string): ModelPricing {
  const pricing = MODEL_PRICING[modelId];
  if (pricing) {
    return { input: pricing.input, output: pricing.output };
  }
  return DEFAULT_PRICING;
}

/**
 * Calculate cost for a request
 * @param modelId The model used
 * @param tokensInput Number of input tokens
 * @param tokensOutput Number of output tokens
 * @returns Cost in USD
 */
export function calculateRequestCost(
  modelId: string,
  tokensInput: number,
  tokensOutput: number
): number {
  const pricing = getModelPricing(modelId);
  const inputCost = (tokensInput / 1_000_000) * pricing.input;
  const outputCost = (tokensOutput / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}

/**
 * Get all pricing entries grouped by provider
 */
export function getPricingByProvider(): Record<string, Record<string, ModelPricing>> {
  const result: Record<string, Record<string, ModelPricing>> = {};
  
  for (const [modelId, entry] of Object.entries(MODEL_PRICING)) {
    if (!result[entry.provider]) {
      result[entry.provider] = {};
    }
    result[entry.provider][modelId] = {
      input: entry.input,
      output: entry.output
    };
  }
  
  return result;
}
