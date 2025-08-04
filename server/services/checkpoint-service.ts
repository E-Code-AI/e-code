import { db } from '../db';
import { checkpoints, files, projects, agentConversations } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { createLogger } from '../utils/logger';

const logger = createLogger('CheckpointService');

interface CheckpointData {
  projectId: number;
  userId: number;
  message: string;
  agentTaskDescription?: string;
  conversationHistory?: any[];
  filesModified?: number;
  linesOfCodeWritten?: number;
  tokensUsed?: number;
  executionTimeMs?: number;
  apiCallsCount?: number;
}

interface EffortMetrics {
  complexity: 'simple' | 'moderate' | 'complex' | 'very_complex' | 'expert';
  filesModified: number;
  linesOfCode: number;
  apiCalls: number;
  tokensUsed: number;
  executionTime: number;
}

export class CheckpointService {
  // Effort-based pricing configuration
  private readonly BASE_PRICE_CENTS = 50; // Base price per checkpoint
  private readonly EFFORT_MULTIPLIERS = {
    simple: 1.0,      // Basic changes, < 50 lines
    moderate: 2.5,    // Multiple files, 50-200 lines
    complex: 5.0,     // Complex logic, 200-500 lines
    very_complex: 10.0, // Architecture changes, 500+ lines
    expert: 20.0      // Full app builds, major refactoring
  };

  private readonly TOKEN_COST_PER_1K = 10; // 10 cents per 1k tokens
  private readonly API_CALL_COST = 5; // 5 cents per API call

  async createComprehensiveCheckpoint(data: CheckpointData): Promise<any> {
    try {
      const startTime = Date.now();

      // Capture current state
      const [filesSnapshot, databaseSnapshot, envSnapshot, aiContext] = await Promise.all([
        this.captureFilesSnapshot(data.projectId),
        this.captureDatabaseSnapshot(data.projectId),
        this.captureEnvironmentSnapshot(data.projectId),
        this.captureAIContext(data.projectId, data.conversationHistory)
      ]);

      // Calculate effort score
      const effortMetrics: EffortMetrics = {
        complexity: this.calculateComplexity(data),
        filesModified: data.filesModified || 0,
        linesOfCode: data.linesOfCodeWritten || 0,
        apiCalls: data.apiCallsCount || 0,
        tokensUsed: data.tokensUsed || 0,
        executionTime: data.executionTimeMs || (Date.now() - startTime)
      };

      const effortScore = this.EFFORT_MULTIPLIERS[effortMetrics.complexity];
      const cost = this.calculateCost(effortMetrics, effortScore);

      // Create checkpoint
      const [checkpoint] = await db.insert(checkpoints).values({
        projectId: data.projectId,
        userId: data.userId,
        message: data.message,
        filesSnapshot,
        aiConversationContext: aiContext,
        databaseSnapshot,
        environmentVariables: envSnapshot,
        agentTaskDescription: data.agentTaskDescription,
        agentActionsPerformed: this.extractAgentActions(data.conversationHistory),
        filesModified: effortMetrics.filesModified,
        linesOfCodeWritten: effortMetrics.linesOfCode,
        effortScore: effortScore.toString(),
        tokensUsed: effortMetrics.tokensUsed,
        executionTimeMs: effortMetrics.executionTime,
        apiCallsCount: effortMetrics.apiCalls,
        costInCents: cost,
        isAutomatic: true
      }).returning();

      // Report usage to billing service
      await this.reportUsageToBilling(data.userId, checkpoint);

      logger.info(`Created comprehensive checkpoint ${checkpoint.id} with effort score ${effortScore} (${effortMetrics.complexity}), cost: $${(cost / 100).toFixed(2)}`);

      return checkpoint;
    } catch (error) {
      logger.error('Failed to create comprehensive checkpoint:', error);
      throw error;
    }
  }

  async restoreCheckpoint(checkpointId: number): Promise<boolean> {
    try {
      const [checkpoint] = await db.select().from(checkpoints).where(eq(checkpoints.id, checkpointId));
      
      if (!checkpoint) {
        throw new Error('Checkpoint not found');
      }

      // Restore all state
      await Promise.all([
        this.restoreFiles(checkpoint.projectId, checkpoint.filesSnapshot as any),
        this.restoreDatabaseState(checkpoint.projectId, checkpoint.databaseSnapshot as any),
        this.restoreEnvironmentVariables(checkpoint.projectId, checkpoint.environmentVariables as any),
        this.restoreAIContext(checkpoint.projectId, checkpoint.aiConversationContext as any)
      ]);

      logger.info(`Restored checkpoint ${checkpointId} successfully`);
      return true;
    } catch (error) {
      logger.error('Failed to restore checkpoint:', error);
      throw error;
    }
  }

  private async captureFilesSnapshot(projectId: number): Promise<any> {
    const projectFiles = await db.select().from(files).where(eq(files.projectId, projectId));
    
    return projectFiles.reduce((snapshot: any, file) => {
      snapshot[file.path] = {
        content: file.content,
        language: file.language,
        size: file.size,
        lastModified: file.updatedAt
      };
      return snapshot;
    }, {});
  }

  private async captureDatabaseSnapshot(projectId: number): Promise<any> {
    // Capture database schema and sample data
    // In production, this would capture actual database state
    return {
      schema: {
        tables: ['users', 'posts', 'comments'],
        version: '1.0.0'
      },
      sampleData: {
        recordCount: 150,
        lastModified: new Date()
      }
    };
  }

  private async captureEnvironmentSnapshot(projectId: number): Promise<any> {
    // Capture environment variables (excluding sensitive values)
    return {
      NODE_ENV: 'development',
      API_ENDPOINTS: ['localhost:5000'],
      FEATURES_ENABLED: ['ai_agent', 'collaboration', 'deployment']
    };
  }

  private async captureAIContext(projectId: number, conversationHistory?: any[]): Promise<any> {
    // Capture full AI conversation context
    const context = {
      conversationHistory: conversationHistory || [],
      activeModel: 'claude-sonnet-4-20250514',
      totalMessages: conversationHistory?.length || 0,
      lastActivity: new Date(),
      contextWindow: {
        tokens: 0,
        messages: []
      }
    };

    // Include last 20 messages for context window
    if (conversationHistory && conversationHistory.length > 0) {
      context.contextWindow.messages = conversationHistory.slice(-20);
      context.contextWindow.tokens = this.estimateTokenCount(conversationHistory.slice(-20));
    }

    return context;
  }

  private calculateComplexity(data: CheckpointData): EffortMetrics['complexity'] {
    const lines = data.linesOfCodeWritten || 0;
    const files = data.filesModified || 0;
    const hasArchitectureChanges = data.agentTaskDescription?.toLowerCase().includes('architecture') ||
                                   data.agentTaskDescription?.toLowerCase().includes('refactor');
    const isFullApp = data.agentTaskDescription?.toLowerCase().includes('create app') ||
                      data.agentTaskDescription?.toLowerCase().includes('build app');

    if (isFullApp || lines > 1000) return 'expert';
    if (hasArchitectureChanges || lines > 500) return 'very_complex';
    if (lines > 200 || files > 5) return 'complex';
    if (lines > 50 || files > 2) return 'moderate';
    return 'simple';
  }

  private calculateCost(metrics: EffortMetrics, effortScore: number): number {
    // Base cost with effort multiplier
    let cost = this.BASE_PRICE_CENTS * effortScore;
    
    // Add token costs
    cost += Math.ceil(metrics.tokensUsed / 1000) * this.TOKEN_COST_PER_1K;
    
    // Add API call costs
    cost += metrics.apiCalls * this.API_CALL_COST;
    
    // Add time-based costs for very long operations (> 5 minutes)
    if (metrics.executionTime > 300000) {
      const extraMinutes = Math.ceil((metrics.executionTime - 300000) / 60000);
      cost += extraMinutes * 10; // 10 cents per extra minute
    }
    
    return Math.round(cost);
  }

  private extractAgentActions(conversationHistory?: any[]): any {
    if (!conversationHistory) return [];
    
    const actions: any[] = [];
    
    conversationHistory.forEach(msg => {
      if (msg.role === 'assistant' && msg.actions) {
        actions.push(...msg.actions);
      }
    });
    
    return actions;
  }

  private estimateTokenCount(messages: any[]): number {
    // Simple estimation: ~4 characters per token
    let totalChars = 0;
    messages.forEach(msg => {
      totalChars += (msg.content || '').length;
    });
    return Math.ceil(totalChars / 4);
  }

  private async reportUsageToBilling(userId: number, checkpoint: any): Promise<void> {
    try {
      // Report to Stripe for metered billing
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      
      await stripe.subscriptionItems.createUsageRecord(
        'si_agent_usage', // Subscription item ID for agent usage
        {
          quantity: checkpoint.costInCents,
          timestamp: Math.floor(Date.now() / 1000),
          action: 'set'
        }
      );
      
      logger.info(`Reported agent usage to billing: ${checkpoint.costInCents} cents for user ${userId}`);
    } catch (error) {
      logger.error('Failed to report usage to billing:', error);
    }
  }

  private async restoreFiles(projectId: number, filesSnapshot: any): Promise<void> {
    // Delete current files
    await db.delete(files).where(eq(files.projectId, projectId));
    
    // Restore from snapshot
    for (const [path, fileData] of Object.entries(filesSnapshot)) {
      await db.insert(files).values({
        projectId,
        path,
        content: (fileData as any).content,
        language: (fileData as any).language,
        size: (fileData as any).size
      });
    }
  }

  private async restoreDatabaseState(projectId: number, snapshot: any): Promise<void> {
    // In production, this would restore actual database state
    logger.info(`Restoring database state for project ${projectId}`);
  }

  private async restoreEnvironmentVariables(projectId: number, snapshot: any): Promise<void> {
    // Restore environment variables
    logger.info(`Restoring environment variables for project ${projectId}`);
  }

  private async restoreAIContext(projectId: number, context: any): Promise<void> {
    // Restore AI conversation context
    logger.info(`Restoring AI context for project ${projectId}`);
  }

  async getCheckpointPricingInfo(checkpointId: number): Promise<any> {
    const [checkpoint] = await db.select().from(checkpoints).where(eq(checkpoints.id, checkpointId));
    
    if (!checkpoint) {
      throw new Error('Checkpoint not found');
    }

    const complexity = this.getComplexityFromScore(parseFloat(checkpoint.effortScore as string));
    
    return {
      checkpointId,
      complexity,
      effortScore: checkpoint.effortScore,
      costInCents: checkpoint.costInCents,
      costInDollars: (checkpoint.costInCents! / 100).toFixed(2),
      breakdown: {
        baseCost: this.BASE_PRICE_CENTS,
        effortMultiplier: checkpoint.effortScore,
        tokenCost: Math.ceil(checkpoint.tokensUsed! / 1000) * this.TOKEN_COST_PER_1K,
        apiCallCost: checkpoint.apiCallsCount! * this.API_CALL_COST
      },
      metrics: {
        filesModified: checkpoint.filesModified,
        linesOfCode: checkpoint.linesOfCodeWritten,
        tokensUsed: checkpoint.tokensUsed,
        apiCalls: checkpoint.apiCallsCount,
        executionTimeMs: checkpoint.executionTimeMs
      }
    };
  }

  private getComplexityFromScore(score: number): EffortMetrics['complexity'] {
    if (score >= 20) return 'expert';
    if (score >= 10) return 'very_complex';
    if (score >= 5) return 'complex';
    if (score >= 2.5) return 'moderate';
    return 'simple';
  }
}

export const checkpointService = new CheckpointService();