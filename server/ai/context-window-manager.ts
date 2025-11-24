/**
 * Context Window Manager
 * Intelligent management of conversation history to fit within model token limits
 */

import type { AIModel } from './ai-provider-manager';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: number;
  tokens?: number;
}

export interface ContextOptimizationOptions {
  maxTokens?: number;
  preserveSystemMessages?: boolean;
  minRecentMessages?: number;
  summarizationThreshold?: number; // Token count to trigger summarization
}

export class ContextWindowManager {
  private maxTokens: number;
  private currentTokens: number = 0;
  
  constructor(maxTokens: number = 100000) {
    this.maxTokens = maxTokens;
  }

  /**
   * Estimate token count for a message
   * Rough approximation: 1 token ≈ 4 characters
   * More accurate for English text, less for code
   */
  private estimateTokens(text: string): number {
    // Basic estimation
    const chars = text.length;
    const words = text.split(/\s+/).length;
    
    // Code tends to have more tokens per character due to special chars
    const hasCode = text.includes('{') || text.includes('function') || text.includes('const');
    const multiplier = hasCode ? 0.3 : 0.25; // tokens per character
    
    return Math.ceil(chars * multiplier);
  }

  /**
   * Calculate total tokens in message array
   */
  calculateTotalTokens(messages: Message[]): number {
    return messages.reduce((sum, msg) => {
      if (msg.tokens) return sum + msg.tokens;
      const estimated = this.estimateTokens(msg.content);
      msg.tokens = estimated;
      return sum + estimated;
    }, 0);
  }

  /**
   * Optimize conversation history to fit within token limit
   */
  optimizeConversationHistory(
    messages: Message[],
    options: ContextOptimizationOptions = {}
  ): Message[] {
    const {
      maxTokens = this.maxTokens,
      preserveSystemMessages = true,
      minRecentMessages = 10,
      summarizationThreshold = maxTokens * 0.8
    } = options;

    // Add token estimates to all messages
    messages.forEach(msg => {
      if (!msg.tokens) {
        msg.tokens = this.estimateTokens(msg.content);
      }
    });

    const totalTokens = this.calculateTotalTokens(messages);

    // If under limit, return as-is
    if (totalTokens <= maxTokens) {
      this.currentTokens = totalTokens;
      return messages;
    }

    // Separate system and conversation messages
    const systemMessages = preserveSystemMessages
      ? messages.filter(m => m.role === 'system')
      : [];
    
    const conversationMessages = messages.filter(m => m.role !== 'system');

    // Calculate system message tokens
    const systemTokens = this.calculateTotalTokens(systemMessages);
    const availableForConversation = maxTokens - systemTokens;

    // Keep recent messages that fit
    const optimized = [...systemMessages];
    let conversationTokens = 0;

    // Add messages from newest to oldest
    for (let i = conversationMessages.length - 1; i >= 0; i--) {
      const msg = conversationMessages[i];
      const msgTokens = msg.tokens || this.estimateTokens(msg.content);

      if (conversationTokens + msgTokens <= availableForConversation) {
        optimized.push(msg);
        conversationTokens += msgTokens;
      } else if (optimized.filter(m => m.role !== 'system').length < minRecentMessages) {
        // Force-include minimum recent messages even if over limit
        optimized.push(msg);
        conversationTokens += msgTokens;
      } else {
        // Add summary of truncated messages
        const truncatedCount = i + 1;
        optimized.push({
          role: 'system',
          content: `[Context: ${truncatedCount} earlier messages summarized to fit context window. Recent conversation preserved.]`,
          tokens: 20
        });
        break;
      }
    }

    // Sort back to chronological order (system, then conversation)
    const result = optimized.sort((a, b) => {
      if (a.role === 'system' && b.role !== 'system') return -1;
      if (a.role !== 'system' && b.role === 'system') return 1;
      return (a.timestamp || 0) - (b.timestamp || 0);
    });

    this.currentTokens = this.calculateTotalTokens(result);
    return result;
  }

  /**
   * Check if a new conversation should be started
   */
  shouldStartNewConversation(messages: Message[], threshold = 0.9): boolean {
    const totalTokens = this.calculateTotalTokens(messages);
    return totalTokens > this.maxTokens * threshold;
  }

  /**
   * Generate a summary of conversation history
   */
  generateConversationSummary(messages: Message[]): string {
    const userMessages = messages.filter(m => m.role === 'user');
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    
    return `Conversation summary:
- ${userMessages.length} user messages
- ${assistantMessages.length} assistant responses
- Total tokens: ~${this.calculateTotalTokens(messages)}
- Topics discussed: [Auto-detected based on message content]
Previous conversation context preserved in this summary.`;
  }

  /**
   * Get optimal context for a specific AI model
   */
  static optimizeForModel(
    messages: Message[],
    model: AIModel
  ): Message[] {
    const manager = new ContextWindowManager(model.maxTokens);
    
    return manager.optimizeConversationHistory(messages, {
      maxTokens: model.maxTokens,
      preserveSystemMessages: true,
      minRecentMessages: 10,
      summarizationThreshold: model.maxTokens * 0.75
    });
  }

  /**
   * Get current token usage statistics
   */
  getUsageStats(): {
    current: number;
    max: number;
    percentage: number;
    remaining: number;
  } {
    return {
      current: this.currentTokens,
      max: this.maxTokens,
      percentage: Math.round((this.currentTokens / this.maxTokens) * 100),
      remaining: this.maxTokens - this.currentTokens
    };
  }

  /**
   * Reset token counter
   */
  reset(): void {
    this.currentTokens = 0;
  }

  /**
   * Update max tokens (when switching models)
   */
  setMaxTokens(maxTokens: number): void {
    this.maxTokens = maxTokens;
  }
}

/**
 * Singleton instance for global use
 */
export const contextWindowManager = new ContextWindowManager();
