// @ts-nocheck
import { AI_MODELS,type AiModel } from '@shared/schema';
import { type IStorage } from '../storage';

/**
 * Agent Preferences Service
 * Manages user preferences for AI agent (model selection, extended thinking, etc.)
 */
export class AgentPreferencesService {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Get available AI models with capabilities
   * provider values MUST match the streaming dispatcher switch cases:
   *   'openai' | 'anthropic' | 'gemini' | 'xai' | 'moonshot'
   */
  getAvailableModels(): Array<{
    id: AiModel;
    name: string;
    description: string;
    provider: 'openai' | 'anthropic' | 'gemini' | 'xai' | 'moonshot';
    tier: 'standard' | 'high-power';
    capabilities: {
      extendedThinking: boolean;
      codeGeneration: boolean;
      maxTokens: number;
      speed: 'fast' | 'medium' | 'slow';
      cost: 'low' | 'medium' | 'high';
    };
  }> {
    return [
      // ── Anthropic — Claude 4.x ────────────────────────────────────────────────
      {
        id: 'claude-opus-4-7',
        name: 'Claude Opus 4.7',
        description: 'Most powerful Claude — frontier intelligence for complex tasks',
        provider: 'anthropic',
        tier: 'high-power',
        capabilities: { extendedThinking: true, codeGeneration: true, maxTokens: 200000, speed: 'slow', cost: 'high' },
      },
      {
        id: 'claude-sonnet-4-6',
        name: 'Claude Sonnet 4.6',
        description: 'Best overall Claude — top intelligence for coding, reasoning & agentic tasks',
        provider: 'anthropic',
        tier: 'high-power',
        capabilities: { extendedThinking: true, codeGeneration: true, maxTokens: 200000, speed: 'medium', cost: 'medium' },
      },
      {
        id: 'claude-haiku-4-5-20251001',
        name: 'Claude Haiku 4.5',
        description: 'Fastest Claude — near-instant responses for everyday tasks',
        provider: 'anthropic',
        tier: 'standard',
        capabilities: { extendedThinking: false, codeGeneration: true, maxTokens: 200000, speed: 'fast', cost: 'low' },
      },

      // ── OpenAI — GPT-4.1 family ──────────────────────────────────────────────
      {
        id: 'gpt-4.1',
        name: 'GPT-4.1',
        description: 'OpenAI flagship — best coding, instruction following, and long context',
        provider: 'openai',
        tier: 'high-power',
        capabilities: { extendedThinking: false, codeGeneration: true, maxTokens: 1047576, speed: 'medium', cost: 'medium' },
      },
      {
        id: 'gpt-4.1-mini',
        name: 'GPT-4.1 Mini',
        description: 'Fast and efficient — best price-to-performance for everyday tasks',
        provider: 'openai',
        tier: 'standard',
        capabilities: { extendedThinking: false, codeGeneration: true, maxTokens: 1047576, speed: 'fast', cost: 'low' },
      },
      {
        id: 'gpt-4.1-nano',
        name: 'GPT-4.1 Nano',
        description: 'Smallest fastest OpenAI model — for latency-sensitive tasks',
        provider: 'openai',
        tier: 'standard',
        capabilities: { extendedThinking: false, codeGeneration: true, maxTokens: 1047576, speed: 'fast', cost: 'low' },
      },

      // ── OpenAI — Reasoning models ────────────────────────────────────────────
      {
        id: 'o4-mini',
        name: 'o4-mini',
        description: 'Best thinking model — fast reasoning for STEM and coding',
        provider: 'openai',
        tier: 'high-power',
        capabilities: { extendedThinking: true, codeGeneration: true, maxTokens: 200000, speed: 'medium', cost: 'medium' },
      },
      {
        id: 'o3',
        name: 'o3',
        description: 'Most powerful reasoning — frontier performance on hard benchmarks',
        provider: 'openai',
        tier: 'high-power',
        capabilities: { extendedThinking: true, codeGeneration: true, maxTokens: 200000, speed: 'slow', cost: 'high' },
      },
      {
        id: 'o3-mini',
        name: 'o3-mini',
        description: 'Efficient reasoning — strong on math, science, and code',
        provider: 'openai',
        tier: 'standard',
        capabilities: { extendedThinking: true, codeGeneration: true, maxTokens: 200000, speed: 'medium', cost: 'medium' },
      },

      // ── Google Gemini ─────────────────────────────────────────────────────────
      {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        description: 'Most powerful Gemini — state-of-the-art reasoning and 1M context window',
        provider: 'gemini',
        tier: 'high-power',
        capabilities: { extendedThinking: true, codeGeneration: true, maxTokens: 1000000, speed: 'medium', cost: 'medium' },
      },
      {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        description: 'Best price-performance — fast multimodal AI with thinking capabilities',
        provider: 'gemini',
        tier: 'high-power',
        capabilities: { extendedThinking: true, codeGeneration: true, maxTokens: 1000000, speed: 'fast', cost: 'low' },
      },

      // ── xAI / Grok ───────────────────────────────────────────────────────────
      {
        id: 'grok-3',
        name: 'Grok 3',
        description: "xAI's flagship — real-time knowledge, strong reasoning, 131K context",
        provider: 'xai',
        tier: 'high-power',
        capabilities: { extendedThinking: false, codeGeneration: true, maxTokens: 131072, speed: 'medium', cost: 'medium' },
      },
      {
        id: 'grok-3-mini',
        name: 'Grok 3 Mini',
        description: 'Efficient Grok model — fast reasoning at lower cost',
        provider: 'xai',
        tier: 'standard',
        capabilities: { extendedThinking: false, codeGeneration: true, maxTokens: 131072, speed: 'fast', cost: 'low' },
      },
      {
        id: 'grok-3-fast',
        name: 'Grok 3 Fast',
        description: 'Fastest Grok 3 variant — optimized for speed-critical workloads',
        provider: 'xai',
        tier: 'high-power',
        capabilities: { extendedThinking: false, codeGeneration: true, maxTokens: 131072, speed: 'fast', cost: 'high' },
      },

      // ── Moonshot AI / Kimi ────────────────────────────────────────────────────
      {
        id: 'moonshot-v1-8k',
        name: 'Kimi 8K',
        description: 'Fast inference for shorter contexts — ideal for quick tasks',
        provider: 'moonshot',
        tier: 'standard',
        capabilities: { extendedThinking: false, codeGeneration: true, maxTokens: 8192, speed: 'fast', cost: 'low' },
      },
      {
        id: 'moonshot-v1-32k',
        name: 'Kimi 32K',
        description: 'Balanced performance with 32K context window',
        provider: 'moonshot',
        tier: 'standard',
        capabilities: { extendedThinking: false, codeGeneration: true, maxTokens: 32768, speed: 'fast', cost: 'low' },
      },
      {
        id: 'moonshot-v1-128k',
        name: 'Kimi 128K',
        description: 'Long-context specialist — documents, codebases, long conversations',
        provider: 'moonshot',
        tier: 'high-power',
        capabilities: { extendedThinking: false, codeGeneration: true, maxTokens: 131072, speed: 'medium', cost: 'medium' },
      },
    ];
  }

  /**
   * Get high power models only (for High Power Mode toggle)
   */
  getHighPowerModels(): AiModel[] {
    return this.getAvailableModels()
      .filter(m => m.tier === 'high-power')
      .map(m => m.id);
  }

  /**
   * Get models with extended thinking capability
   */
  getExtendedThinkingModels(): AiModel[] {
    return this.getAvailableModels()
      .filter(m => m.capabilities.extendedThinking)
      .map(m => m.id);
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(userId: number) {
    return await this.storage.getDynamicIntelligenceSettings(String(userId));
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(
    userId: number,
    preferences: {
      extendedThinking?: boolean;
      highPowerMode?: boolean;
      autoWebSearch?: boolean;
      preferredModel?: AiModel;
      customInstructions?: string;
      improvePromptEnabled?: boolean;
      progressTabEnabled?: boolean;
      pauseResumeEnabled?: boolean;
      autoCheckpoints?: boolean;
    }
  ) {
    // Validate model if provided
    if (preferences.preferredModel && !AI_MODELS.includes(preferences.preferredModel)) {
      throw new Error(`Invalid model: ${preferences.preferredModel}. Must be one of: ${AI_MODELS.join(', ')}`);
    }

    return await this.storage.updateDynamicIntelligenceSettings(String(userId), preferences);
  }

  /**
   * Get model recommendation based on task complexity and user preferences
   */
  getRecommendedModel(task: {
    requiresExtendedThinking?: boolean;
    highPowerMode?: boolean;
    complexity?: 'simple' | 'medium' | 'complex';
    speedPriority?: 'fast' | 'balanced' | 'quality';
  }): AiModel {
    const { requiresExtendedThinking, highPowerMode, complexity = 'medium', speedPriority = 'balanced' } = task;

    // High power mode always uses premium models
    if (highPowerMode) {
      if (requiresExtendedThinking || complexity === 'complex') {
        return 'claude-opus-4-7';
      }
      return 'gpt-4o';
    }

    // Extended thinking required
    if (requiresExtendedThinking) {
      if (speedPriority === 'fast') return 'o4-mini';
      if (speedPriority === 'quality') return 'claude-opus-4-7';
      return 'claude-sonnet-4-6';
    }

    // Complex tasks
    if (complexity === 'complex') {
      if (speedPriority === 'quality') return 'claude-opus-4-7';
      return 'claude-sonnet-4-6';
    }

    // Simple tasks prioritizing speed
    if (complexity === 'simple') {
      if (speedPriority === 'fast') return 'claude-haiku-4-5-20251001';
      return 'gpt-4.1-mini';
    }

    // Medium complexity
    if (speedPriority === 'fast') return 'gpt-4.1-mini';
    if (speedPriority === 'quality') return 'claude-sonnet-4-6';
    return 'gpt-4.1-mini';
  }

  /**
   * Get recommended fast model for Fast Mode (10-60s targeted changes)
   * Fast Mode prioritizes speed over quality for quick single-file edits
   */
  getFastModel(): AiModel {
    // Priority order for fast models (by speed and availability)
    const fastModels: AiModel[] = [
      'claude-haiku-4-5-20251001',  // Fastest Claude model
      'gpt-4.1-mini',               // Fast GPT model
      'gemini-2.5-flash',           // Fast Gemini model
      'grok-3-mini',                // Fast xAI model
    ];
    
    // Return first available fast model
    const availableModels = this.getAvailableModels();
    const availableIds = availableModels.map(m => m.id);
    
    for (const fastModel of fastModels) {
      if (availableIds.includes(fastModel)) {
        return fastModel;
      }
    }
    
    // Fallback to first model with 'fast' speed rating
    const fastBySpeed = availableModels.find(m => m.capabilities.speed === 'fast');
    return fastBySpeed?.id || 'gpt-4.1-nano';
  }

  /**
   * Get estimated time range for Fast Mode based on model
   */
  getFastModeEstimate(model: AiModel): { min: number; max: number; label: string } {
    const modelInfo = this.getAvailableModels().find(m => m.id === model);
    
    if (modelInfo?.capabilities.speed === 'fast') {
      return { min: 10, max: 30, label: '~20s' };
    }
    if (modelInfo?.capabilities.speed === 'medium') {
      return { min: 30, max: 60, label: '~45s' };
    }
    return { min: 45, max: 90, label: '~60s' };
  }

  /**
   * Get the effective model based on user preferences and tool settings
   */
  getEffectiveModel(settings: {
    preferredModel?: AiModel;
    extendedThinking?: boolean;
    highPowerMode?: boolean;
    taskComplexity?: 'simple' | 'medium' | 'complex';
  }): AiModel {
    const { preferredModel, extendedThinking, highPowerMode, taskComplexity: _taskComplexity } = settings;

    // If high power mode is on, upgrade to a high-power model
    if (highPowerMode) {
      const highPowerModels = this.getHighPowerModels();
      if (preferredModel && highPowerModels.includes(preferredModel)) {
        return preferredModel;
      }
      // Default high power model
      return 'claude-opus-4-7';
    }

    // If extended thinking is on, ensure model supports it
    if (extendedThinking) {
      const thinkingModels = this.getExtendedThinkingModels();
      if (preferredModel && thinkingModels.includes(preferredModel)) {
        return preferredModel;
      }
      // Default extended thinking model
      return 'claude-sonnet-4-6';
    }

    // Use preferred model or default
    return preferredModel || 'gpt-4.1-mini';
  }
}
