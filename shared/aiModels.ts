/**
 * Centralized AI Models Registry - November 2025
 * Single source of truth for all AI models across backend and frontend
 * 
 * Key Capabilities tracked:
 * 1. Extended Thinking - Raisonnement approfondi
 * 2. Tool Use (MCP) - Exécution d'outils natifs
 * 3. Context Window - Taille du contexte en tokens
 * 4. Code Generation - Optimisation pour le développement
 */

export interface AIModelCapabilities {
  extendedThinking: boolean;        // Raisonnement approfondi
  toolUse: boolean;                 // Support MCP/Tool calling
  contextWindow: number;            // Context window size in tokens
  codeGeneration: boolean;          // Optimisé pour le code
  multimodal?: boolean;             // Support vision/audio
  computerUse?: boolean;            // Support computer control (Claude)
}

export interface AIModel {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'gemini' | 'xai' | 'moonshot' | 'groq';
  description: string;
  capabilities: AIModelCapabilities;
  pricing: {
    input: number;    // USD per 1M tokens
    output: number;   // USD per 1M tokens
  };
  releaseDate: string;  // YYYY-MM-DD
  available: boolean;
}

/**
 * All available AI models - Latest November 2025
 */
export const AI_MODELS_REGISTRY: Record<string, AIModel> = {
  // ========================================
  // OpenAI Models (VRAIS modèles Nov 2025)
  // Source: https://platform.openai.com/docs/models
  // ========================================
  'gpt-5.1': {
    id: 'gpt-5.1',
    name: 'GPT-5.1',
    provider: 'openai',
    description: 'Current flagship - warmer, more intelligent with adaptive reasoning (Nov 12, 2025)',
    capabilities: {
      extendedThinking: true,  // reasoning.effort: none/minimal/medium/high
      toolUse: true,           // apply_patch, shell tools
      contextWindow: 400000,
      codeGeneration: true,
      multimodal: true
    },
    pricing: { input: 5, output: 15 },  // Prix approximatifs
    releaseDate: '2025-11-12',
    available: true
  },
  'gpt-5': {
    id: 'gpt-5',
    name: 'GPT-5',
    provider: 'openai',
    description: 'Previous flagship - still available as legacy model (Aug 2025)',
    capabilities: {
      extendedThinking: true,
      toolUse: true,
      contextWindow: 400000,
      codeGeneration: true,
      multimodal: true
    },
    pricing: { input: 5, output: 15 },
    releaseDate: '2025-08-07',
    available: true
  },
  'gpt-5-mini': {
    id: 'gpt-5-mini',
    name: 'GPT-5 Mini',
    provider: 'openai',
    description: 'Cost-optimized reasoning - balances speed, cost, and capability',
    capabilities: {
      extendedThinking: true,
      toolUse: true,
      contextWindow: 400000,
      codeGeneration: true,
      multimodal: true
    },
    pricing: { input: 1, output: 3 },  // Estimation
    releaseDate: '2025-08-07',
    available: true
  },
  'gpt-5-nano': {
    id: 'gpt-5-nano',
    name: 'GPT-5 Nano',
    provider: 'openai',
    description: 'High-throughput - simple instruction-following and classification',
    capabilities: {
      extendedThinking: false,
      toolUse: true,
      contextWindow: 400000,
      codeGeneration: true,
      multimodal: false
    },
    pricing: { input: 0.5, output: 1.5 },  // Très économique
    releaseDate: '2025-08-07',
    available: true
  },
  'gpt-4.1': {
    id: 'gpt-4.1',
    name: 'GPT-4.1',
    provider: 'openai',
    description: 'Smartest non-reasoning multimodal LLM - Swiss Army knife',
    capabilities: {
      extendedThinking: false,
      toolUse: true,
      contextWindow: 1000000,  // 1M context
      codeGeneration: true,
      multimodal: true
    },
    pricing: { input: 2.5, output: 10 },
    releaseDate: '2025-04-14',
    available: true
  },
  'gpt-4o': {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    description: 'Multimodal flagship - text, vision, audio',
    capabilities: {
      extendedThinking: false,
      toolUse: true,
      contextWindow: 128000,
      codeGeneration: true,
      multimodal: true
    },
    pricing: { input: 2.5, output: 10 },
    releaseDate: '2024-08-06',
    available: true
  },
  'o3': {
    id: 'o3',
    name: 'o3',
    provider: 'openai',
    description: 'Advanced reasoning model - complex problem solving',
    capabilities: {
      extendedThinking: true,
      toolUse: true,
      contextWindow: 128000,
      codeGeneration: true,
      multimodal: false
    },
    pricing: { input: 15, output: 60 },  // Reasoning premium
    releaseDate: '2025-04-16',
    available: true
  },
  'o4-mini': {
    id: 'o4-mini',
    name: 'o4 Mini',
    provider: 'openai',
    description: 'Budget-friendly reasoning for STEM tasks',
    capabilities: {
      extendedThinking: true,
      toolUse: true,
      contextWindow: 128000,
      codeGeneration: true,
      multimodal: false
    },
    pricing: { input: 3, output: 12 },
    releaseDate: '2025-04-16',
    available: true
  },

  // ========================================
  // Anthropic Models (Sept-Oct 2025)
  // ========================================
  'claude-sonnet-4-5-20250929': {
    id: 'claude-sonnet-4-5-20250929',
    name: 'Claude Sonnet 4.5',
    provider: 'anthropic',
    description: 'Best coding model in the world - strongest at agents & computer use',
    capabilities: {
      extendedThinking: true,
      toolUse: true,
      contextWindow: 200000,
      codeGeneration: true,
      multimodal: true,
      computerUse: true
    },
    pricing: { input: 3, output: 15 },
    releaseDate: '2025-09-29',
    available: true
  },
  'claude-opus-4-1-20250805': {
    id: 'claude-opus-4-1-20250805',
    name: 'Claude Opus 4.1',
    provider: 'anthropic',
    description: 'Upgraded for agentic tasks - 74.5% on SWE-bench',
    capabilities: {
      extendedThinking: true,
      toolUse: true,
      contextWindow: 200000,
      codeGeneration: true,
      multimodal: true
    },
    pricing: { input: 15, output: 75 },
    releaseDate: '2025-08-05',
    available: true
  },
  'claude-haiku-4-5-20251015': {
    id: 'claude-haiku-4-5-20251015',
    name: 'Claude Haiku 4.5',
    provider: 'anthropic',
    description: 'Fastest - matches Sonnet 4 on coding at 1/3 cost',
    capabilities: {
      extendedThinking: false,
      toolUse: true,
      contextWindow: 200000,
      codeGeneration: true,
      multimodal: false
    },
    pricing: { input: 1, output: 5 },
    releaseDate: '2025-10-15',
    available: true
  },

  // ========================================
  // Google Gemini Models (Nov 2025)
  // ========================================
  'gemini-2.5-pro': {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'gemini',
    description: 'Stable with adaptive thinking - 2M token context coming soon',
    capabilities: {
      extendedThinking: true,
      toolUse: true,
      contextWindow: 1000000,
      codeGeneration: true,
      multimodal: true
    },
    pricing: { input: 1.25, output: 5 },
    releaseDate: '2025-11-01',
    available: true
  },
  'gemini-2.5-flash': {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'gemini',
    description: 'Hybrid reasoning - thinks before it speaks with low latency',
    capabilities: {
      extendedThinking: true,
      toolUse: true,
      contextWindow: 1000000,
      codeGeneration: true,
      multimodal: true
    },
    pricing: { input: 0.075, output: 0.3 },
    releaseDate: '2025-11-01',
    available: true
  },

  // ========================================
  // xAI Models (July-Sept 2025)
  // ========================================
  'grok-4': {
    id: 'grok-4',
    name: 'Grok 4',
    provider: 'xai',
    description: 'Current flagship - post-graduate reasoning with 256K context',
    capabilities: {
      extendedThinking: true,
      toolUse: true,
      contextWindow: 256000,
      codeGeneration: true,
      multimodal: true
    },
    pricing: { input: 2, output: 6 },
    releaseDate: '2025-07-01',
    available: true
  },
  'grok-4-fast': {
    id: 'grok-4-fast',
    name: 'Grok 4 Fast',
    provider: 'xai',
    description: 'Enterprise - 40% fewer tokens, 2M context, 64× cheaper than o3',
    capabilities: {
      extendedThinking: true,
      toolUse: true,
      contextWindow: 2000000,
      codeGeneration: true,
      multimodal: true
    },
    pricing: { input: 0.5, output: 1.5 },
    releaseDate: '2025-09-01',
    available: true
  },

  // ========================================
  // Moonshot AI Models (Nov 2025)
  // ========================================
  'kimi-k2': {
    id: 'kimi-k2',
    name: 'Kimi K2',
    provider: 'moonshot',
    description: 'Cost-effective with excellent agentic capabilities - 10× cheaper than GPT-4',
    capabilities: {
      extendedThinking: true,
      toolUse: true,
      contextWindow: 128000,
      codeGeneration: true,
      multimodal: false
    },
    pricing: { input: 0.6, output: 2.5 },
    releaseDate: '2025-11-01',
    available: true
  },
  'kimi-k2-thinking': {
    id: 'kimi-k2-thinking',
    name: 'Kimi K2 Thinking',
    provider: 'moonshot',
    description: 'Enhanced reasoning and complex problem-solving capabilities',
    capabilities: {
      extendedThinking: true,
      toolUse: true,
      contextWindow: 128000,
      codeGeneration: true,
      multimodal: false
    },
    pricing: { input: 0.8, output: 3.0 },
    releaseDate: '2025-11-01',
    available: true
  },
  'kimi-k2-turbo': {
    id: 'kimi-k2-turbo',
    name: 'Kimi K2 Turbo',
    provider: 'moonshot',
    description: 'Fastest Kimi model - 100× cheaper than GPT-4',
    capabilities: {
      extendedThinking: false,
      toolUse: true,
      contextWindow: 128000,
      codeGeneration: true,
      multimodal: false
    },
    pricing: { input: 0.3, output: 1.0 },
    releaseDate: '2025-11-01',
    available: true
  }
};

/**
 * Get all available models
 */
export function getAllModels(): AIModel[] {
  return Object.values(AI_MODELS_REGISTRY);
}

/**
 * Get models by provider
 */
export function getModelsByProvider(provider: AIModel['provider']): AIModel[] {
  return getAllModels().filter(m => m.provider === provider);
}

/**
 * Get model by ID
 */
export function getModelById(id: string): AIModel | undefined {
  return AI_MODELS_REGISTRY[id];
}

/**
 * Get all model IDs
 */
export function getAllModelIds(): string[] {
  return Object.keys(AI_MODELS_REGISTRY);
}

/**
 * Format context window for display
 */
export function formatContextWindow(tokens: number): string {
  if (tokens >= 1000000) return `${tokens / 1000000}M`;
  if (tokens >= 1000) return `${tokens / 1000}K`;
  return `${tokens}`;
}

/**
 * Get capability badges for a model
 */
export function getCapabilityBadges(modelId: string): string[] {
  const model = getModelById(modelId);
  if (!model) return [];
  
  const badges: string[] = [];
  if (model.capabilities.extendedThinking) badges.push('Extended Thinking');
  if (model.capabilities.toolUse) badges.push('Tool Use (MCP)');
  if (model.capabilities.codeGeneration) badges.push('Code Generation');
  if (model.capabilities.multimodal) badges.push('Multimodal');
  if (model.capabilities.computerUse) badges.push('Computer Use');
  
  return badges;
}
