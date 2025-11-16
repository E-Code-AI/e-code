/**
 * AI Usage Metering Service (Pay-As-You-Go)
 * Tracks every AI request and calculates costs for Stripe metered billing
 * 
 * Flow:
 * 1. AI request made → trackUsage() called
 * 2. Calculate cost based on model + tokens
 * 3. Insert into ai_usage_metering table
 * 4. Report to Stripe metered billing (async)
 */

import { db } from '../db';
import { aiUsageMetering } from '@shared/schema';
import { createLogger } from '../utils/logger';
import { normalizeModelName } from '../utils/model-normalizer';
import Stripe from 'stripe';

const logger = createLogger('ai-metering');

// Model pricing (USD per 1M tokens)
// Source: Official pricing from OpenAI, Anthropic, Google, xAI, Moonshot (Nov 2025)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI
  'gpt-5.1': { input: 15.0, output: 60.0 },
  'gpt-5': { input: 10.0, output: 40.0 },
  'gpt-5-mini': { input: 0.3, output: 1.2 },
  'gpt-5-nano': { input: 0.15, output: 0.6 },
  'gpt-4.1': { input: 10.0, output: 30.0 },
  'gpt-4o': { input: 5.0, output: 15.0 },
  'o3': { input: 20.0, output: 80.0 },
  'o4-mini': { input: 0.4, output: 1.6 },
  
  // Anthropic
  'claude-sonnet-4-5-20250929': { input: 3.0, output: 15.0 },
  'claude-opus-4-1-20250805': { input: 15.0, output: 75.0 },
  'claude-haiku-4-5-20251015': { input: 0.25, output: 1.25 },
  
  // Google Gemini
  'gemini-2.5-pro': { input: 1.25, output: 5.0 },
  'gemini-2.5-flash': { input: 0.075, output: 0.3 },
  
  // xAI
  'grok-4': { input: 5.0, output: 15.0 },
  'grok-4-fast': { input: 0.5, output: 1.5 },
  
  // Moonshot AI
  'kimi-k2': { input: 1.0, output: 2.0 },
  'kimi-k2-thinking': { input: 8.0, output: 8.0 },
  'kimi-k2-turbo': { input: 0.3, output: 0.6 },
};

interface TrackUsageParams {
  userId: string;
  endpoint: string;
  model: string;
  provider: string;
  tokensInput: number;
  tokensOutput: number;
  userTier: 'free' | 'pro' | 'enterprise';
  subscriptionId?: string;
  requestDurationMs?: number;
  status: 'success' | 'error' | 'timeout';
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export class AiMeteringService {
  private stripe: Stripe | null = null;

  constructor() {
    if (process.env.STRIPE_SECRET_KEY) {
      this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2025-07-30.basil',
      });
    } else {
      logger.warn('STRIPE_SECRET_KEY not found - Stripe metering disabled');
    }
  }

  /**
   * Calculate cost in USD based on model and token usage
   */
  private calculateCost(model: string, tokensInput: number, tokensOutput: number): number {
    const pricing = MODEL_PRICING[model];
    if (!pricing) {
      logger.warn(`No pricing found for model ${model}, using default`);
      return ((tokensInput + tokensOutput) / 1_000_000) * 2.0; // Default: $2 per 1M tokens
    }

    const inputCost = (tokensInput / 1_000_000) * pricing.input;
    const outputCost = (tokensOutput / 1_000_000) * pricing.output;
    return inputCost + outputCost;
  }

  /**
   * Track AI usage and insert into database
   * Returns the metering record ID
   */
  async trackUsage(params: TrackUsageParams): Promise<number> {
    try {
      // ✅ CRITICAL: Normalize model to prevent DB insert failures
      const originalModel = params.model;
      const normalizedModel = normalizeModelName(params.model, params.provider);
      
      if (originalModel !== normalizedModel) {
        logger.debug(`Model normalized: "${originalModel}" → "${normalizedModel}"`);
      }
      
      const tokensTotal = params.tokensInput + params.tokensOutput;
      const costUsd = this.calculateCost(normalizedModel, params.tokensInput, params.tokensOutput);

      // Insert into metering table
      const [record] = await db.insert(aiUsageMetering).values({
        userId: params.userId,
        endpoint: params.endpoint,
        model: normalizedModel as any, // Now guaranteed to be valid enum
        provider: params.provider,
        tokensInput: params.tokensInput,
        tokensOutput: params.tokensOutput,
        tokensTotal,
        costUsd: costUsd.toFixed(6), // Store with 6 decimal precision
        billed: false,
        userTier: params.userTier,
        subscriptionId: params.subscriptionId || null,
        requestDurationMs: params.requestDurationMs || null,
        status: params.status,
        errorMessage: params.errorMessage || null,
        metadata: params.metadata || null,
      }).returning({ id: aiUsageMetering.id });

      logger.info(`Tracked AI usage: user=${params.userId}, model=${params.model}, tokens=${tokensTotal}, cost=$${costUsd.toFixed(6)}`);

      // Report to Stripe metered billing (async, don't block)
      this.reportToStripe(params.userId, params.subscriptionId, costUsd, record.id).catch((error) => {
        logger.error('Failed to report to Stripe', { error, meteringId: record.id });
      });

      return record.id;
    } catch (error) {
      logger.error('Failed to track AI usage', { error, params });
      throw error;
    }
  }

  /**
   * Report usage to Stripe metered billing
   * Creates a usage record on the customer's subscription
   */
  private async reportToStripe(
    userId: string,
    subscriptionId: string | undefined,
    costUsd: number,
    meteringId: number
  ): Promise<void> {
    if (!this.stripe || !subscriptionId) {
      logger.debug('Stripe not configured or no subscription - skipping metered billing');
      return;
    }

    try {
      // Get the subscription item ID for AI usage
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      const aiUsageItem = subscription.items.data.find(item => 
        item.price.id === process.env.STRIPE_PRICE_ID_AGENT_USAGE
      );

      if (!aiUsageItem) {
        logger.warn(`No AI usage price item found for subscription ${subscriptionId}`);
        return;
      }

      // Create usage record (Stripe accepts integer quantity, we send cents)
      const quantityCents = Math.ceil(costUsd * 100); // $0.025 → 3 cents
      const usageRecord = await this.stripe.subscriptionItems.createUsageRecord(
        aiUsageItem.id,
        {
          quantity: quantityCents,
          timestamp: Math.floor(Date.now() / 1000),
          action: 'increment',
        }
      );

      // Update metering record with Stripe ID
      await db.update(aiUsageMetering)
        .set({
          stripeUsageRecordId: usageRecord.id,
          billed: true,
          billedAt: new Date(),
        })
        .where({ id: meteringId });

      logger.info(`Reported to Stripe: $${costUsd.toFixed(6)} → ${quantityCents} cents, record=${usageRecord.id}`);
    } catch (error) {
      logger.error('Failed to report to Stripe', { error, userId, subscriptionId });
      throw error;
    }
  }

  /**
   * Get user's monthly usage summary
   */
  async getMonthlyUsage(userId: string): Promise<{
    totalTokens: number;
    totalCost: number;
    requestCount: number;
    billedCost: number;
    unbilledCost: number;
  }> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const usage = await db
      .select()
      .from(aiUsageMetering)
      .where(({ userId: dbUserId, createdAt }) => {
        return dbUserId === userId && createdAt >= startOfMonth;
      });

    const totalTokens = usage.reduce((sum, r) => sum + r.tokensTotal, 0);
    const totalCost = usage.reduce((sum, r) => sum + parseFloat(r.costUsd), 0);
    const requestCount = usage.length;
    const billedCost = usage.filter(r => r.billed).reduce((sum, r) => sum + parseFloat(r.costUsd), 0);
    const unbilledCost = totalCost - billedCost;

    return {
      totalTokens,
      totalCost,
      requestCount,
      billedCost,
      unbilledCost,
    };
  }
}

// Export singleton instance
export const aiMeteringService = new AiMeteringService();
