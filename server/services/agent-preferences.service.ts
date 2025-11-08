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
   * Get available AI models
   */
  getAvailableModels(): Array<{
    id: AiModel;
    name: string;
    description: string;
    category: 'gpt' | 'claude' | 'gemini';
    capabilities: {
      extendedThinking: boolean;
      codeGeneration: boolean;
      maxTokens: number;
      speed: 'fast' | 'medium' | 'slow';
      cost: 'low' | 'medium' | 'high';
    };
  }> {
    return [
      {
        id: 'gpt-5',
        name: 'GPT-5',
        description: 'Most advanced model with extended thinking capabilities',
        category: 'gpt',
        capabilities: {
          extendedThinking: true,
          codeGeneration: true,
          maxTokens: 128000,
          speed: 'medium',
          cost: 'high',
        },
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        description: 'Fast and efficient model for most tasks',
        category: 'gpt',
        capabilities: {
          extendedThinking: false,
          codeGeneration: true,
          maxTokens: 128000,
          speed: 'fast',
          cost: 'medium',
        },
      },
      {
        id: 'gpt-4',
        name: 'GPT-4',
        description: 'Reliable model for complex reasoning',
        category: 'gpt',
        capabilities: {
          extendedThinking: true,
          codeGeneration: true,
          maxTokens: 8192,
          speed: 'medium',
          cost: 'medium',
        },
      },
      {
        id: 'claude-3-5-sonnet',
        name: 'Claude 3.5 Sonnet',
        description: 'Best balance of intelligence and speed',
        category: 'claude',
        capabilities: {
          extendedThinking: true,
          codeGeneration: true,
          maxTokens: 200000,
          speed: 'fast',
          cost: 'medium',
        },
      },
      {
        id: 'claude-3-opus',
        name: 'Claude 3 Opus',
        description: 'Most powerful Claude model for complex tasks',
        category: 'claude',
        capabilities: {
          extendedThinking: true,
          codeGeneration: true,
          maxTokens: 200000,
          speed: 'slow',
          cost: 'high',
        },
      },
      {
        id: 'claude-3-sonnet',
        name: 'Claude 3 Sonnet',
        description: 'Balanced Claude model for general use',
        category: 'claude',
        capabilities: {
          extendedThinking: false,
          codeGeneration: true,
          maxTokens: 200000,
          speed: 'medium',
          cost: 'medium',
        },
      },
      {
        id: 'claude-3-haiku',
        name: 'Claude 3 Haiku',
        description: 'Fast and cost-effective Claude model',
        category: 'claude',
        capabilities: {
          extendedThinking: false,
          codeGeneration: true,
          maxTokens: 200000,
          speed: 'fast',
          cost: 'low',
        },
      },
      {
        id: 'gemini-ultra',
        name: 'Gemini Ultra',
        description: 'Most capable Gemini model',
        category: 'gemini',
        capabilities: {
          extendedThinking: true,
          codeGeneration: true,
          maxTokens: 32000,
          speed: 'medium',
          cost: 'high',
        },
      },
      {
        id: 'gemini-pro',
        name: 'Gemini Pro',
        description: 'Versatile Gemini model for general use',
        category: 'gemini',
        capabilities: {
          extendedThinking: false,
          codeGeneration: true,
          maxTokens: 32000,
          speed: 'fast',
          cost: 'medium',
        },
      },
    ];
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(userId: string) {
    return await this.storage.getDynamicIntelligenceSettings(userId);
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(
    userId: string,
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

    return await this.storage.updateDynamicIntelligenceSettings(userId, preferences);
  }

  /**
   * Get model recommendation based on task complexity
   */
  getRecommendedModel(task: {
    requiresExtendedThinking?: boolean;
    complexity?: 'simple' | 'medium' | 'complex';
    speedPriority?: 'fast' | 'balanced' | 'quality';
  }): AiModel {
    const { requiresExtendedThinking, complexity = 'medium', speedPriority = 'balanced' } = task;

    // Complex tasks with extended thinking
    if (requiresExtendedThinking || complexity === 'complex') {
      if (speedPriority === 'quality') return 'claude-3-opus';
      return 'claude-3-5-sonnet';
    }

    // Simple tasks prioritizing speed
    if (complexity === 'simple') {
      if (speedPriority === 'fast') return 'claude-3-haiku';
      return 'gpt-4-turbo';
    }

    // Medium complexity
    if (speedPriority === 'fast') return 'gpt-4-turbo';
    if (speedPriority === 'quality') return 'claude-3-5-sonnet';
    return 'gpt-4';
  }
}
