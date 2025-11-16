/**
 * AI Usage Tracking Middleware (Pay-As-You-Go)
 * 
 * PHILOSOPHY: Never block AI requests - ALWAYS allow them and bill via Stripe
 * - Free tier: 100 AI requests/month included at $0/month
 * - Pro tier: 10,000 AI requests/month included at $20/month
 * - Enterprise tier: 100,000 AI requests/month included at $500/month
 * - Overage: Charged per token at official model pricing
 * 
 * This middleware:
 * 1. Captures AI request (model, tokens)
 * 2. Calculates cost based on official pricing
 * 3. Records to ai_usage_metering table
 * 4. Reports to Stripe metered billing (async)
 * 5. NEVER blocks - user pays for what they use
 */

import { Request, Response, NextFunction } from 'express';
import { aiMeteringService } from '../services/ai-metering-service';
import { createLogger } from '../utils/logger';

const logger = createLogger('ai-usage-tracker');

type SubscriptionTier = 'free' | 'pro' | 'enterprise';

// Monthly included quotas (requests)
const MONTHLY_INCLUDED_REQUESTS: Record<SubscriptionTier, number> = {
  free: 100,
  pro: 10_000,
  enterprise: 100_000,
};

interface AiUsageContext {
  model?: string;
  provider?: string;
  tokensInput?: number;
  tokensOutput?: number;
  status?: 'success' | 'error' | 'timeout';
  errorMessage?: string;
  startTime?: number;
}

/**
 * Middleware to track AI usage WITHOUT blocking
 * Attaches tracking context to res.locals for post-request tracking
 */
export function aiUsageTracker(req: Request, res: Response, next: NextFunction) {
  const user = req.user as any;
  
  if (!user?.id) {
    logger.debug('No authenticated user - skipping AI tracking');
    return next();
  }

  // Initialize tracking context
  const trackingContext: AiUsageContext = {
    startTime: Date.now(),
    status: 'success',
  };
  res.locals.aiTracking = trackingContext;

  // Intercept response to capture usage data
  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    // Capture AI usage from response body (if present)
    if (body?.usage || body?.model) {
      trackingContext.model = body.model;
      trackingContext.tokensInput = body.usage?.prompt_tokens || body.usage?.input_tokens || 0;
      trackingContext.tokensOutput = body.usage?.completion_tokens || body.usage?.output_tokens || 0;
      trackingContext.provider = extractProvider(body.model);
      
      // Track usage asynchronously (don't block response)
      trackAiUsage(req, trackingContext).catch((error) => {
        logger.error('Failed to track AI usage', { error });
      });
    }
    
    return originalJson(body);
  };

  next();
}

/**
 * Extract provider from model name
 */
function extractProvider(model: string | undefined): string {
  if (!model) return 'unknown';
  
  if (model.startsWith('gpt-') || model.startsWith('o3') || model.startsWith('o4')) return 'openai';
  if (model.startsWith('claude-')) return 'anthropic';
  if (model.startsWith('gemini-')) return 'gemini';
  if (model.startsWith('grok-')) return 'xai';
  if (model.startsWith('kimi-')) return 'moonshot';
  
  return 'unknown';
}

/**
 * Track AI usage to database and Stripe
 */
async function trackAiUsage(req: Request, context: AiUsageContext) {
  const user = req.user as any;
  
  // ✅ CRITICAL FIX: Track even if tokens are 0 (input-only requests still cost money)
  if (!context.model || context.tokensInput === undefined || context.tokensOutput === undefined) {
    logger.debug('Incomplete AI usage data - skipping tracking', { context });
    return;
  }

  const tier: SubscriptionTier = user.subscriptionTier || 'free';
  const requestDurationMs = context.startTime ? Date.now() - context.startTime : undefined;

  try {
    await aiMeteringService.trackUsage({
      userId: user.id,
      endpoint: req.path,
      model: context.model,
      provider: context.provider || 'unknown',
      tokensInput: context.tokensInput,
      tokensOutput: context.tokensOutput,
      userTier: tier,
      subscriptionId: user.stripeSubscriptionId,
      requestDurationMs,
      status: context.status || 'success',
      errorMessage: context.errorMessage,
      metadata: {
        method: req.method,
        userAgent: req.get('user-agent'),
        ip: req.ip,
      },
    });
    
    logger.info(`AI usage tracked: user=${user.id}, model=${context.model}, tokens=${context.tokensInput + context.tokensOutput}`);
  } catch (error) {
    logger.error('Failed to track AI usage', { error, userId: user.id, model: context.model });
  }
}

/**
 * Helper to manually track AI usage (for SSE streams where response interception won't work)
 */
export async function trackAiUsageManually(params: {
  userId: string;
  endpoint: string;
  model: string;
  provider: string;
  tokensInput: number;
  tokensOutput: number;
  userTier: SubscriptionTier;
  subscriptionId?: string;
  requestDurationMs?: number;
  status?: 'success' | 'error' | 'timeout';
  errorMessage?: string;
  metadata?: Record<string, any>;
}) {
  try {
    await aiMeteringService.trackUsage(params);
    logger.info(`AI usage tracked manually: user=${params.userId}, model=${params.model}, tokens=${params.tokensInput + params.tokensOutput}`);
  } catch (error) {
    logger.error('Failed to track AI usage manually', { error, params });
  }
}
