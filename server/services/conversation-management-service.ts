// @ts-nocheck
import { createLogger } from '../utils/logger';
// import { db } from '../db';
// import { agentConversations, agentMessages } from '@shared/schema';
// import { eq, desc, and } from 'drizzle-orm';
import { checkpointService } from './checkpoint-service';

const logger = createLogger('ConversationManagementService');

export interface ConversationMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    model?: string;
    tokensUsed?: number;
    processingTime?: number;
    error?: string;
    attachments?: Array<{
      type: 'code' | 'image' | 'file';
      name: string;
      content?: string;
      url?: string;
    }>;
  };
}

export interface Conversation {
  id: string;
  projectId: number;
  userId: number;
  title: string;
  status: 'active' | 'paused' | 'completed' | 'archived';
  context: {
    projectType?: string;
    technology?: string[];
    goals?: string[];
    preferences?: Record<string, any>;
  };
  messages: ConversationMessage[];
  summary?: string;
  totalTokensUsed: number;
  estimatedCost: number;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt?: Date;
}

export class ConversationManagementService {
  private activeConversations: Map<string, Conversation> = new Map();
  private messageBuffer: Map<string, ConversationMessage[]> = new Map();

  async createConversation(params: {
    projectId: number;
    userId: number;
    title: string;
    initialContext?: Conversation['context'];
  }): Promise<Conversation> {
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const conversation: Conversation = {
      id: conversationId,
      projectId: params.projectId,
      userId: params.userId,
      title: params.title,
      status: 'active',
      context: params.initialContext || {},
      messages: [],
      totalTokensUsed: 0,
      estimatedCost: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // In-memory storage only for now
    this.activeConversations.set(conversationId, conversation);
    logger.info(`Created new conversation: ${conversationId}`);

    return conversation;
  }

  async addMessage(conversationId: string, message: {
    role: 'user' | 'assistant' | 'system';
    content: string;
    metadata?: ConversationMessage['metadata'];
  }): Promise<ConversationMessage> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newMessage: ConversationMessage = {
      id: messageId,
      conversationId,
      role: message.role,
      content: message.content,
      timestamp: new Date(),
      metadata: message.metadata
    };

    // Add to conversation
    conversation.messages.push(newMessage);
    conversation.lastMessageAt = newMessage.timestamp;
    conversation.updatedAt = new Date();

    // Update token count and cost
    if (message.metadata?.tokensUsed) {
      conversation.totalTokensUsed += message.metadata.tokensUsed;
      conversation.estimatedCost = Math.ceil(conversation.totalTokensUsed * 0.00003 * 100); // cents
    }

    // In-memory storage only
    // Add to buffer for batching
    if (!this.messageBuffer.has(conversationId)) {
      this.messageBuffer.set(conversationId, []);
    }
    this.messageBuffer.get(conversationId)!.push(newMessage);

    logger.info(`Added message to conversation ${conversationId}`);

    return newMessage;
  }

  async getConversation(conversationId: string): Promise<Conversation | null> {
    // Check cache first
    if (this.activeConversations.has(conversationId)) {
      return this.activeConversations.get(conversationId)!;
    }

    // In-memory only for now
    return null;
  }

  async getProjectConversations(projectId: number, options?: {
    status?: Conversation['status'];
    limit?: number;
    offset?: number;
  }): Promise<Conversation[]> {
    // Return from in-memory cache
    const conversations: Conversation[] = [];
    
    for (const [_, conv] of this.activeConversations) {
      if (conv.projectId === projectId && 
          (!options?.status || conv.status === options.status)) {
        conversations.push({
          ...conv,
          messages: [] // Empty for list view
        });
      }
    }
    
    // Sort by updated date
    conversations.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    
    // Apply limit and offset
    const start = options?.offset || 0;
    const end = start + (options?.limit || 50);
    
    return conversations.slice(start, end);
  }

  async updateConversationContext(conversationId: string, context: Partial<Conversation['context']>): Promise<void> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    // Merge context
    conversation.context = { ...conversation.context, ...context };
    conversation.updatedAt = new Date();

    // In-memory update only
    logger.info(`Updated context for conversation ${conversationId}`);
  }

  async generateSummary(conversationId: string): Promise<string> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    try {
      // Simple summary generation (in production, use AI)
      const messageCount = conversation.messages.length;
      const userMessages = conversation.messages.filter(m => m.role === 'user').length;
      const assistantMessages = conversation.messages.filter(m => m.role === 'assistant').length;
      
      const topics = this.extractTopics(conversation.messages);
      const summary = `Conversation with ${messageCount} messages (${userMessages} user, ${assistantMessages} assistant). Topics: ${topics.join(', ')}. Total tokens: ${conversation.totalTokensUsed}.`;

      // Update conversation
      conversation.summary = summary;

      // In-memory update only

      logger.info(`Generated summary for conversation ${conversationId}`);
      return summary;
    } catch (error) {
      logger.error('Failed to generate summary:', error);
      throw error;
    }
  }

  async pauseConversation(conversationId: string): Promise<void> {
    await this.updateConversationStatus(conversationId, 'paused');
  }

  async resumeConversation(conversationId: string): Promise<void> {
    await this.updateConversationStatus(conversationId, 'active');
  }

  async completeConversation(conversationId: string): Promise<void> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    await this.updateConversationStatus(conversationId, 'completed');

    // Create checkpoint for billing
    await checkpointService.createComprehensiveCheckpoint({
      projectId: conversation.projectId,
      userId: conversation.userId,
      message: `Completed agent conversation: ${conversation.title}`,
      agentTaskDescription: `Conversation with ${conversation.messages.length} messages`,
      filesModified: 0,
      linesOfCodeWritten: 0,
      tokensUsed: conversation.totalTokensUsed,
      executionTimeMs: conversation.updatedAt.getTime() - conversation.createdAt.getTime(),
      apiCallsCount: conversation.messages.filter(m => m.role === 'assistant').length
    });

    // Remove from active cache
    this.activeConversations.delete(conversationId);
  }

  async archiveConversation(conversationId: string): Promise<void> {
    await this.updateConversationStatus(conversationId, 'archived');
    
    // Remove from active cache
    this.activeConversations.delete(conversationId);
  }

  async deleteConversation(conversationId: string): Promise<void> {
    // Remove from cache
    this.activeConversations.delete(conversationId);
    this.messageBuffer.delete(conversationId);

    logger.info(`Deleted conversation ${conversationId}`);
  }

  async exportConversation(conversationId: string): Promise<{
    conversation: Conversation;
    exportFormat: 'json' | 'markdown';
    content: string;
  }> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    // Export as markdown
    const markdown = this.conversationToMarkdown(conversation);

    return {
      conversation,
      exportFormat: 'markdown',
      content: markdown
    };
  }

  async searchConversations(params: {
    projectId?: number;
    userId?: number;
    query: string;
    limit?: number;
  }): Promise<Conversation[]> {
    // In production, implement full-text search
    const conversations = await this.getProjectConversations(
      params.projectId || 0,
      { limit: params.limit || 50 }
    );

    // Simple text search
    return conversations.filter(conv => 
      conv.title.toLowerCase().includes(params.query.toLowerCase()) ||
      conv.summary?.toLowerCase().includes(params.query.toLowerCase())
    );
  }

  private async updateConversationStatus(conversationId: string, status: Conversation['status']): Promise<void> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    conversation.status = status;
    conversation.updatedAt = new Date();

    // In-memory update only
    logger.info(`Updated conversation ${conversationId} status to ${status}`);
  }

  private extractTopics(messages: ConversationMessage[]): string[] {
    // Simple topic extraction (in production, use NLP)
    const keywords = new Set<string>();
    
    messages.forEach(msg => {
      if (msg.role === 'user') {
        // Extract key terms (simplified)
        const words = msg.content.toLowerCase().split(/\s+/);
        const importantWords = words.filter(w => 
          w.length > 4 && !['what', 'when', 'where', 'which', 'that', 'this'].includes(w)
        );
        importantWords.slice(0, 3).forEach(w => keywords.add(w));
      }
    });

    return Array.from(keywords).slice(0, 5);
  }

  private conversationToMarkdown(conversation: Conversation): string {
    let markdown = `# ${conversation.title}\n\n`;
    markdown += `**Created:** ${conversation.createdAt.toISOString()}\n`;
    markdown += `**Status:** ${conversation.status}\n`;
    markdown += `**Total Messages:** ${conversation.messages.length}\n`;
    markdown += `**Tokens Used:** ${conversation.totalTokensUsed}\n`;
    markdown += `**Estimated Cost:** $${(conversation.estimatedCost / 100).toFixed(2)}\n\n`;

    if (conversation.summary) {
      markdown += `## Summary\n${conversation.summary}\n\n`;
    }

    markdown += `## Messages\n\n`;

    conversation.messages.forEach(msg => {
      const role = msg.role.charAt(0).toUpperCase() + msg.role.slice(1);
      markdown += `### ${role} (${msg.timestamp.toISOString()})\n`;
      markdown += `${msg.content}\n\n`;
      
      if (msg.metadata?.attachments) {
        markdown += `**Attachments:**\n`;
        msg.metadata.attachments.forEach(att => {
          markdown += `- ${att.name} (${att.type})\n`;
        });
        markdown += '\n';
      }
    });

    return markdown;
  }
}

export const conversationManagementService = new ConversationManagementService();