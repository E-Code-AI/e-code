import { type IStorage } from '../storage';
import { AI_MODELS, type AiModel } from '@shared/schema';

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
   */
  getAvailableModels(): Array<{
    id: AiModel;
    name: string;
    description: string;
    category: 'openai' | 'anthropic' | 'google' | 'xai' | 'moonshot';
    tier: 'standard' | 'high-power';
    capabilities: {
      extendedThinking: boolean;
      codeGeneration: boolean;
      maxTokens: number;
      speed: 'fast' | 'medium' | 'slow';
      cost: 'low' | 'medium' | 'high';
    };
  }> {
    // ✅ CONSOLIDATED Jan 2026: Only gpt-5.2 is current
    return [
      // OpenAI Models
      {
        id: 'gpt-5.2',
        name: 'GPT-5.2',
        description: 'Latest and most advanced OpenAI model',
        category: 'openai',
        tier: 'high-power',
        capabilities: {
          extendedThinking: true,
          codeGeneration: true,
          maxTokens: 400000,
          speed: 'medium',
          cost: 'high',
        },
      },
      {
        id: 'gpt-5.2-codex',
        name: 'GPT-5.2 Codex',
        description: 'Coding optimized variant with enhanced code generation',
        category: 'openai',
        tier: 'high-power',
        capabilities: {
          extendedThinking: true,
          codeGeneration: true,
          maxTokens: 400000,
          speed: 'medium',
          cost: 'high',
        },
      },
      {
        id: 'gpt-5-mini',
        name: 'GPT-5 Mini',
        description: 'Fast and efficient for most tasks',
        category: 'openai',
        tier: 'standard',
        capabilities: {
          extendedThinking: false,
          codeGeneration: true,
          maxTokens: 128000,
          speed: 'fast',
          cost: 'medium',
        },
      },
      {
        id: 'gpt-4.1',
        name: 'GPT-4.1',
        description: 'Excellent for coding with 1M context (April 2025)',
        category: 'openai',
        tier: 'standard',
        capabilities: {
          extendedThinking: false,
          codeGeneration: true,
          maxTokens: 1000000,
          speed: 'fast',
          cost: 'medium',
        },
      },
      {
        id: 'o3',
        name: 'O3 Reasoning',
        description: 'Extended reasoning model',
        category: 'openai',
        tier: 'high-power',
        capabilities: {
          extendedThinking: true,
          codeGeneration: true,
          maxTokens: 200000,
          speed: 'slow',
          cost: 'high',
        },
      },
      {
        id: 'o4-mini',
        name: 'O4 Mini',
        description: 'Efficient reasoning model',
        category: 'openai',
        tier: 'standard',
        capabilities: {
          extendedThinking: true,
          codeGeneration: true,
          maxTokens: 128000,
          speed: 'medium',
          cost: 'medium',
        },
      },
      // Anthropic Models
      {
        id: 'claude-sonnet-4-5-20250929',
        name: 'Claude Sonnet 4.5',
        description: 'Best balance of speed and quality',
        category: 'anthropic',
        tier: 'standard',
        capabilities: {
          extendedThinking: true,
          codeGeneration: true,
          maxTokens: 200000,
          speed: 'fast',
          cost: 'medium',
        },
      },
      {
        id: 'claude-opus-4-5-20251101',
        name: 'Claude Opus 4.5',
        description: 'Most powerful Claude model',
        category: 'anthropic',
        tier: 'high-power',
        capabilities: {
          extendedThinking: true,
          codeGeneration: true,
          maxTokens: 200000,
          speed: 'slow',
          cost: 'high',
        },
      },
      {
        id: 'claude-haiku-4-5-20251015',
        name: 'Claude Haiku 4.5',
        description: 'Fast and cost-effective',
        category: 'anthropic',
        tier: 'standard',
        capabilities: {
          extendedThinking: false,
          codeGeneration: true,
          maxTokens: 200000,
          speed: 'fast',
          cost: 'low',
        },
      },
      // Google Gemini Models - UPDATED JAN 2026 (production-stable)
      {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        description: 'Production-stable flagship - high performance, reliable for production use',
        category: 'google',
        tier: 'high-power',
        capabilities: {
          extendedThinking: true,
          codeGeneration: true,
          maxTokens: 1000000,
          speed: 'fast',
          cost: 'low',
        },
      },
      {
        id: 'gemini-3-pro',
        name: 'Gemini 3 Pro',
        description: 'State-of-the-art reasoning and multimodal (fallback for high-complexity tasks)',
        category: 'google',
        tier: 'high-power',
        capabilities: {
          extendedThinking: true,
          codeGeneration: true,
          maxTokens: 1000000,
          speed: 'medium',
          cost: 'high',
        },
      },
      // xAI Models
      {
        id: 'grok-4',
        name: 'Grok 4',
        description: 'xAI\'s flagship reasoning model',
        category: 'xai',
        tier: 'high-power',
        capabilities: {
          extendedThinking: true,
          codeGeneration: true,
          maxTokens: 128000,
          speed: 'medium',
          cost: 'high',
        },
      },
      {
        id: 'grok-4-fast',
        name: 'Grok 4 Fast',
        description: 'Fast xAI model',
        category: 'xai',
        tier: 'standard',
        capabilities: {
          extendedThinking: false,
          codeGeneration: true,
          maxTokens: 128000,
          speed: 'fast',
          cost: 'medium',
        },
      },
      // Moonshot AI / Kimi K2 Models - UPDATED JAN 2026
      {
        id: 'kimi-k2-thinking',
        name: 'Kimi K2 Thinking',
        description: '1T params, 256K context, temp=1.0 required',
        category: 'moonshot',
        tier: 'high-power',
        capabilities: {
          extendedThinking: true,
          codeGeneration: true,
          maxTokens: 128000,
          speed: 'fast',
          cost: 'medium',
        },
      },
      {
        id: 'kimi-k2-thinking',
        name: 'Kimi K2 Thinking',
        description: 'Kimi K2 with extended reasoning',
        category: 'moonshot',
        tier: 'high-power',
        capabilities: {
          extendedThinking: true,
          codeGeneration: true,
          maxTokens: 128000,
          speed: 'slow',
          cost: 'high',
        },
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
        return 'claude-opus-4-5-20251101';  // ✅ CONSOLIDATED Jan 2026
      }
      return 'gpt-5.2';  // ✅ CONSOLIDATED Jan 2026
    }

    // Extended thinking required
    if (requiresExtendedThinking) {
      if (speedPriority === 'fast') return 'o4-mini';
      if (speedPriority === 'quality') return 'claude-opus-4-5-20251101';  // ✅ CONSOLIDATED Jan 2026
      return 'claude-sonnet-4-5-20250929';
    }

    // Complex tasks
    if (complexity === 'complex') {
      if (speedPriority === 'quality') return 'gpt-5.2';  // ✅ CONSOLIDATED Jan 2026
      return 'claude-sonnet-4-5-20250929';
    }

    // Simple tasks prioritizing speed
    if (complexity === 'simple') {
      if (speedPriority === 'fast') return 'claude-haiku-4-5-20251015';
      return 'gpt-5-mini';
    }

    // Medium complexity
    if (speedPriority === 'fast') return 'gpt-5-mini';  // ✅ UPDATED Jan 2026: gpt-4o deprecated
    if (speedPriority === 'quality') return 'claude-sonnet-4-5-20250929';
    return 'gpt-5-mini';
  }

  /**
   * Get recommended fast model for Fast Mode (10-60s targeted changes)
   * Fast Mode prioritizes speed over quality for quick single-file edits
   */
  getFastModel(): AiModel {
    // Priority order for fast models (by speed and availability)
    const fastModels: AiModel[] = [
      'claude-haiku-4-5-20251015',  // Fastest Claude model
      'gpt-5-mini',                  // Fast GPT model
      'gemini-2.5-flash',            // Fast Gemini model (production-stable)
      'grok-4-fast',                 // Fast xAI model
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
    return fastBySpeed?.id || 'gpt-5-mini';
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
    const { preferredModel, extendedThinking, highPowerMode, taskComplexity } = settings;

    // If high power mode is on, upgrade to a high-power model
    if (highPowerMode) {
      const highPowerModels = this.getHighPowerModels();
      if (preferredModel && highPowerModels.includes(preferredModel)) {
        return preferredModel;
      }
      // Default high power model
      return 'gpt-5.2';  // ✅ CONSOLIDATED Jan 2026
    }

    // If extended thinking is on, ensure model supports it
    if (extendedThinking) {
      const thinkingModels = this.getExtendedThinkingModels();
      if (preferredModel && thinkingModels.includes(preferredModel)) {
        return preferredModel;
      }
      // Default extended thinking model
      return 'claude-sonnet-4-5-20250929';
    }

    // Use preferred model or default
    return preferredModel || 'gpt-5-mini';
  }
}
