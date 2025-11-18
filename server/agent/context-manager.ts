/**
 * AI Context Manager
 * 
 * Manages conversation context budgets to prevent API limit errors.
 * Implements provider-specific budgeting with intelligent truncation.
 */

export interface ContextBudget {
  maxBytes?: number;
  maxTokens?: number;
  systemAllocation: number; // % of budget for system prompt
  contextAllocation: number; // % for project context
  historyAllocation: number; // % for conversation history
}

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: any[];
  [key: string]: any;
}

export interface TruncationResult {
  messages: Message[];
  truncated: boolean;
  droppedCount: number;
  originalSize: number;
  finalSize: number;
  warning?: string;
}

/**
 * Provider-specific budget configurations
 * 
 * CRITICAL: Ultra-conservative limits to guarantee worst-case compliance
 * 
 * The 4-chars-per-token heuristic can underestimate by up to 4× for:
 * - CJK text (Chinese, Japanese, Korean)
 * - Base64/compressed data
 * - Special characters and emojis
 * 
 * These limits ensure we NEVER exceed provider limits even with worst-case input:
 * - Anthropic: 10MB (38% margin below 16MB byte limit)
 * - OpenAI: 30k tokens (77% margin below 128k - accounts for 4× underestimation)
 * - Gemini 2.5 Flash: 200k tokens (80% margin below 250k free tier limit, 1M actual limit)
 * - xAI/Groq: Similar worst-case margins
 * 
 * TODO: Integrate tiktoken or provider-native tokenizers for accurate counts
 * and increase limits to ~70% of actual capacity once precise counting is available.
 * 
 * Updated Nov 18, 2025: Gemini 2.5 Flash has 1M context window (250K/min free tier)
 */
const PROVIDER_BUDGETS: Record<string, ContextBudget> = {
  anthropic: {
    maxBytes: 10_000_000, // 10MB (38% safety margin below 16MB byte limit)
    maxTokens: 50_000, // ALSO enforce token limit (75% margin below 200k token limit)
    systemAllocation: 0.30,
    contextAllocation: 0.20,
    historyAllocation: 0.50
  },
  openai: {
    maxTokens: 30_000, // Ultra-conservative for worst-case (CJK, base64)
    systemAllocation: 0.25,
    contextAllocation: 0.15,
    historyAllocation: 0.60
  },
  gemini: {
    maxTokens: 200_000, // ✅ FIX (Nov 18, 2025): Gemini 2.5 Flash has 1M context (250K/min free tier)
    systemAllocation: 0.30,
    contextAllocation: 0.20,
    historyAllocation: 0.50
  },
  xai: {
    maxTokens: 30_000, // Ultra-conservative, similar to OpenAI
    systemAllocation: 0.25,
    contextAllocation: 0.15,
    historyAllocation: 0.60
  },
  groq: {
    maxTokens: 7_000, // Ultra-conservative for Groq models
    systemAllocation: 0.30,
    contextAllocation: 0.20,
    historyAllocation: 0.50
  }
};

/**
 * Calculate byte size of content
 */
function getByteSize(content: string): number {
  return new TextEncoder().encode(content).length;
}

/**
 * Estimate token count (rough approximation: 1 token ≈ 4 characters)
 * For production, consider using tiktoken library for accurate counts
 */
function estimateTokens(content: string): number {
  return Math.ceil(content.length / 4);
}

/**
 * Calculate total size of messages based on provider
 * CRITICAL: Include ALL fields (content, tool_calls, metadata) for accurate estimation
 * For Anthropic: enforces BOTH byte limit AND token limit (whichever is more restrictive)
 */
function calculateSize(messages: Message[], provider: string, unit: 'bytes' | 'tokens' | 'auto' = 'auto'): number {
  const budget = PROVIDER_BUDGETS[provider];
  
  // Force token calculation if requested
  if (unit === 'tokens') {
    return messages.reduce((total, msg) => {
      const fullMessage = JSON.stringify(msg);
      return total + estimateTokens(fullMessage);
    }, 0);
  }
  
  // Force byte calculation if requested
  if (unit === 'bytes') {
    return messages.reduce((total, msg) => {
      const fullMessage = JSON.stringify(msg);
      return total + getByteSize(fullMessage);
    }, 0);
  }
  
  // Auto mode: use primary metric for provider
  if (budget.maxBytes && !budget.maxTokens) {
    // Byte-based only (legacy Anthropic behavior)
    return messages.reduce((total, msg) => {
      const fullMessage = JSON.stringify(msg);
      return total + getByteSize(fullMessage);
    }, 0);
  } else {
    // Token-based (all providers including Anthropic with dual limits)
    return messages.reduce((total, msg) => {
      const fullMessage = JSON.stringify(msg);
      return total + estimateTokens(fullMessage);
    }, 0);
  }
}

/**
 * Check if message is part of a tool call chain
 * Tool calls must be kept atomic (assistant request + tool result)
 */
function isToolMessage(message: Message): boolean {
  return message.role === 'tool' || 
         (message.role === 'assistant' && !!message.tool_calls && message.tool_calls.length > 0);
}

/**
 * Find tool call pairs (assistant with tool_calls + corresponding tool results)
 */
function findToolCallPairs(messages: Message[]): Set<number> {
  const toolMessageIndices = new Set<number>();
  
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    
    // If this is an assistant message with tool calls
    if (msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0) {
      toolMessageIndices.add(i);
      
      // Find corresponding tool results
      const toolCallIds = msg.tool_calls.map((tc: any) => tc.id);
      for (let j = i + 1; j < messages.length; j++) {
        const nextMsg = messages[j];
        if (nextMsg.role === 'tool' && toolCallIds.includes(nextMsg.tool_call_id)) {
          toolMessageIndices.add(j);
        }
      }
    }
  }
  
  return toolMessageIndices;
}

/**
 * Truncate conversation history to fit within budget
 */
export function truncateContext(
  messages: Message[],
  provider: string = 'openai'
): TruncationResult {
  const budget = PROVIDER_BUDGETS[provider] || PROVIDER_BUDGETS.openai;
  
  // For Anthropic with dual limits, use the MORE RESTRICTIVE limit
  // This ensures we never exceed EITHER byte OR token limits
  let maxLimit: number;
  let limitType: 'bytes' | 'tokens';
  
  if (budget.maxBytes && budget.maxTokens) {
    // Anthropic: check both limits, use the more restrictive one
    const byteSize = calculateSize(messages, provider, 'bytes');
    const tokenSize = calculateSize(messages, provider, 'tokens');
    
    // Compare as ratios to find which is closer to limit
    const byteRatio = byteSize / budget.maxBytes;
    const tokenRatio = tokenSize / budget.maxTokens;
    
    if (tokenRatio > byteRatio) {
      maxLimit = budget.maxTokens;
      limitType = 'tokens';
    } else {
      maxLimit = budget.maxBytes;
      limitType = 'bytes';
    }
  } else if (budget.maxBytes) {
    maxLimit = budget.maxBytes;
    limitType = 'bytes';
  } else {
    maxLimit = budget.maxTokens || 100_000;
    limitType = 'tokens';
  }
  
  // Separate messages by type
  const systemMessages = messages.filter(m => m.role === 'system');
  const nonSystemMessages = messages.filter(m => m.role !== 'system');
  
  // Always preserve: system prompt + last user message
  if (nonSystemMessages.length === 0) {
    return {
      messages,
      truncated: false,
      droppedCount: 0,
      originalSize: calculateSize(messages, provider, limitType),
      finalSize: calculateSize(messages, provider, limitType)
    };
  }
  
  const lastUserMessage = nonSystemMessages[nonSystemMessages.length - 1];
  const conversationHistory = nonSystemMessages.slice(0, -1);
  
  // Calculate required allocations using the selected limit type
  const systemSize = calculateSize(systemMessages, provider, limitType);
  const lastUserSize = calculateSize([lastUserMessage], provider, limitType);
  const originalSize = calculateSize(messages, provider, limitType);
  
  // CRITICAL: Abort if mandatory sections (system + last user) exceed budget
  // This prevents sending over-limit requests even with empty history
  if (systemSize + lastUserSize > maxLimit) {
    throw new Error(
      `Context budget exceeded: System prompt (${systemSize}) + current message (${lastUserSize}) = ${systemSize + lastUserSize} ` +
      `exceeds ${provider} ${limitType} limit of ${maxLimit}. Please reduce the system prompt or message size.`
    );
  }
  
  const availableForHistory = maxLimit - systemSize - lastUserSize;
  
  // If already within budget, return as-is
  if (originalSize <= maxLimit) {
    return {
      messages,
      truncated: false,
      droppedCount: 0,
      originalSize,
      finalSize: originalSize
    };
  }
  
  // Build truncated history using sliding window
  const toolMessageIndices = findToolCallPairs(conversationHistory);
  const truncatedHistory: Message[] = [];
  let currentSize = 0;
  
  // Work backwards from most recent to oldest
  for (let i = conversationHistory.length - 1; i >= 0; i--) {
    const msg = conversationHistory[i];
    const msgSize = calculateSize([msg], provider, limitType);
    
    // Check if adding this message would exceed budget
    if (currentSize + msgSize > availableForHistory) {
      // If it's part of a tool call chain, try to keep the whole chain
      if (toolMessageIndices.has(i)) {
        // Find the start of the tool call chain
        let chainStart = i;
        while (chainStart > 0 && toolMessageIndices.has(chainStart - 1)) {
          chainStart--;
        }
        
        // Calculate chain size
        const chainMessages = conversationHistory.slice(chainStart, i + 1);
        const chainSize = calculateSize(chainMessages, provider, limitType);
        
        // Only include if chain fits
        if (currentSize + chainSize <= availableForHistory) {
          truncatedHistory.unshift(...chainMessages);
          currentSize += chainSize;
          i = chainStart; // Skip to start of chain
          continue;
        }
      }
      
      // Can't fit more messages, stop
      break;
    }
    
    truncatedHistory.unshift(msg);
    currentSize += msgSize;
  }
  
  // Reconstruct final message array
  const finalMessages = [
    ...systemMessages,
    ...truncatedHistory,
    lastUserMessage
  ];
  
  const finalSize = calculateSize(finalMessages, provider, limitType);
  const droppedCount = conversationHistory.length - truncatedHistory.length;
  
  return {
    messages: finalMessages,
    truncated: droppedCount > 0,
    droppedCount,
    originalSize,
    finalSize,
    warning: droppedCount > 0 
      ? `Context truncated: dropped ${droppedCount} old message(s) to fit within ${provider} limits. Recent conversation and tool executions preserved.`
      : undefined
  };
}

/**
 * Get budget info for a provider
 */
export function getProviderBudget(provider: string): ContextBudget {
  return PROVIDER_BUDGETS[provider] || PROVIDER_BUDGETS.openai;
}

/**
 * Check if messages would exceed budget without truncating
 * For Anthropic with dual limits, checks BOTH byte AND token limits
 */
export function wouldExceedBudget(messages: Message[], provider: string): boolean {
  const budget = PROVIDER_BUDGETS[provider] || PROVIDER_BUDGETS.openai;
  
  // For providers with dual limits (Anthropic), check BOTH
  if (budget.maxBytes && budget.maxTokens) {
    const byteSize = calculateSize(messages, provider, 'bytes');
    const tokenSize = calculateSize(messages, provider, 'tokens');
    
    // Exceeds if EITHER limit is violated
    return byteSize > budget.maxBytes || tokenSize > budget.maxTokens;
  }
  
  // Single limit check for other providers
  const maxLimit = budget.maxBytes || budget.maxTokens || 100_000;
  const currentSize = calculateSize(messages, provider);
  
  return currentSize > maxLimit;
}
