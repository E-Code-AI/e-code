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
 */
const PROVIDER_BUDGETS: Record<string, ContextBudget> = {
  anthropic: {
    maxBytes: 15_000_000, // 15MB (safe margin below 16MB limit)
    systemAllocation: 0.30,
    contextAllocation: 0.20,
    historyAllocation: 0.50
  },
  openai: {
    maxTokens: 120_000, // Conservative limit for GPT-4 Turbo (128k context)
    systemAllocation: 0.25,
    contextAllocation: 0.15,
    historyAllocation: 0.60
  },
  gemini: {
    maxTokens: 28_000, // Safe limit for Gemini Pro (30k context)
    systemAllocation: 0.30,
    contextAllocation: 0.20,
    historyAllocation: 0.50
  },
  xai: {
    maxTokens: 120_000, // Similar to OpenAI
    systemAllocation: 0.25,
    contextAllocation: 0.15,
    historyAllocation: 0.60
  },
  groq: {
    maxTokens: 30_000, // Conservative for Groq models
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
 */
function calculateSize(messages: Message[], provider: string): number {
  const budget = PROVIDER_BUDGETS[provider];
  
  if (budget.maxBytes) {
    // Byte-based calculation for Anthropic
    return messages.reduce((total, msg) => {
      const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
      return total + getByteSize(content);
    }, 0);
  } else {
    // Token-based calculation for others
    return messages.reduce((total, msg) => {
      const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
      return total + estimateTokens(content);
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
  const maxLimit = budget.maxBytes || budget.maxTokens || 100_000;
  
  // Separate messages by type
  const systemMessages = messages.filter(m => m.role === 'system');
  const nonSystemMessages = messages.filter(m => m.role !== 'system');
  
  // Always preserve: system prompt + last user message
  if (nonSystemMessages.length === 0) {
    return {
      messages,
      truncated: false,
      droppedCount: 0,
      originalSize: calculateSize(messages, provider),
      finalSize: calculateSize(messages, provider)
    };
  }
  
  const lastUserMessage = nonSystemMessages[nonSystemMessages.length - 1];
  const conversationHistory = nonSystemMessages.slice(0, -1);
  
  // Calculate required allocations
  const systemSize = calculateSize(systemMessages, provider);
  const lastUserSize = calculateSize([lastUserMessage], provider);
  const availableForHistory = maxLimit - systemSize - lastUserSize;
  
  // If already within budget, return as-is
  const originalSize = calculateSize(messages, provider);
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
    const msgSize = calculateSize([msg], provider);
    
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
        const chainSize = calculateSize(chainMessages, provider);
        
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
  
  const finalSize = calculateSize(finalMessages, provider);
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
 */
export function wouldExceedBudget(messages: Message[], provider: string): boolean {
  const budget = PROVIDER_BUDGETS[provider] || PROVIDER_BUDGETS.openai;
  const maxLimit = budget.maxBytes || budget.maxTokens || 100_000;
  const currentSize = calculateSize(messages, provider);
  
  return currentSize > maxLimit;
}
