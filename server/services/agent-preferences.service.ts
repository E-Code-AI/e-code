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
    return [
      // OpenAI Models
      {
        id: 'gpt-5.1',
        name: 'GPT-5.1',
        description: 'Latest and most advanced OpenAI model',
        category: 'openai',
        tier: 'high-power',
        capabilities: {
          extendedThinking: true,
          codeGeneration: true,
          maxTokens: 256000,
          speed: 'medium',
          cost: 'high',
        },
      },
      {
        id: 'gpt-5',
        name: 'GPT-5',
        description: 'Advanced reasoning and generation',
        category: 'openai',
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
        id: 'gpt-4o',
        name: 'GPT-4o',
        description: 'Optimized GPT-4 model',
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
        id: 'claude-opus-4-1-20250805',
        name: 'Claude Opus 4.1',
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
      // Google Gemini Models
      {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        description: 'Google\'s most capable model',
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
      {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        description: 'Fast multimodal model',
        category: 'google',
        tier: 'standard',
        capabilities: {
          extendedThinking: false,
          codeGeneration: true,
          maxTokens: 1000000,
          speed: 'fast',
          cost: 'medium',
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
      // Moonshot AI Models
      {
        id: 'kimi-k2-0711-preview',
        name: 'Kimi K2 Preview',
        description: 'Moonshot AI Kimi K2 July preview',
        category: 'moonshot',
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
        return 'claude-opus-4-1-20250805';
      }
      return 'gpt-5.1';
    }

    // Extended thinking required
    if (requiresExtendedThinking) {
      if (speedPriority === 'fast') return 'o4-mini';
      if (speedPriority === 'quality') return 'claude-opus-4-1-20250805';
      return 'claude-sonnet-4-5-20250929';
    }

    // Complex tasks
    if (complexity === 'complex') {
      if (speedPriority === 'quality') return 'gpt-5';
      return 'claude-sonnet-4-5-20250929';
    }

    // Simple tasks prioritizing speed
    if (complexity === 'simple') {
      if (speedPriority === 'fast') return 'claude-haiku-4-5-20251015';
      return 'gpt-5-mini';
    }

    // Medium complexity
    if (speedPriority === 'fast') return 'gpt-4o';
    if (speedPriority === 'quality') return 'claude-sonnet-4-5-20250929';
    return 'gpt-5-mini';
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
      return 'gpt-5.1';
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
