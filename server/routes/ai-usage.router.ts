/**
 * AI Usage Metering Router - Pay-As-You-Go Billing Endpoints
 * Exposes ai_usage_metering data to users and admins
 */

import { Router } from 'express';
import { db } from '../db';
import { aiUsageMetering, users, subscriptions } from '@shared/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { createLogger } from '../utils/logger';

const logger = createLogger('ai-usage-router');
const router = Router();

/**
 * GET /api/ai/usage/monthly
 * Get current month's AI usage for authenticated user
 */
router.get('/monthly', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = req.user.id.toString();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Get all usage for current month
    const usage = await db
      .select()
      .from(aiUsageMetering)
      .where(
        and(
          eq(aiUsageMetering.userId, userId),
          gte(aiUsageMetering.createdAt, startOfMonth),
          lte(aiUsageMetering.createdAt, endOfMonth)
        )
      )
      .orderBy(desc(aiUsageMetering.createdAt));

    // Calculate summary
    const summary = {
      totalTokens: 0,
      totalCost: 0,
      requestCount: usage.length,
      modelBreakdown: {} as Record<string, {
        totalTokens: number;
        totalCost: number;
        requestCount: number;
      }>,
    };

    usage.forEach((record) => {
      summary.totalTokens += record.tokensTotal;
      summary.totalCost += parseFloat(record.costUsd);

      if (!summary.modelBreakdown[record.model]) {
        summary.modelBreakdown[record.model] = {
          totalTokens: 0,
          totalCost: 0,
          requestCount: 0,
        };
      }

      summary.modelBreakdown[record.model].totalTokens += record.tokensTotal;
      summary.modelBreakdown[record.model].totalCost += parseFloat(record.costUsd);
      summary.modelBreakdown[record.model].requestCount += 1;
    });

    res.json({
      period: {
        start: startOfMonth,
        end: endOfMonth,
      },
      summary,
      recentUsage: usage.slice(0, 20), // Last 20 requests
    });
  } catch (error) {
    logger.error('Failed to fetch AI usage', { error });
    res.status(500).json({ error: 'Failed to fetch AI usage' });
  }
});

/**
 * GET /api/ai/usage/history
 * Get AI usage history with pagination
 */
router.get('/history', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = req.user.id.toString();
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const usage = await db
      .select()
      .from(aiUsageMetering)
      .where(eq(aiUsageMetering.userId, userId))
      .orderBy(desc(aiUsageMetering.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(aiUsageMetering)
      .where(eq(aiUsageMetering.userId, userId));

    res.json({
      usage,
      pagination: {
        page,
        limit,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / limit),
      },
    });
  } catch (error) {
    logger.error('Failed to fetch AI usage history', { error });
    res.status(500).json({ error: 'Failed to fetch AI usage history' });
  }
});

/**
 * GET /api/admin/ai-usage/all
 * Admin endpoint: Get all AI usage across platform
 */
router.get('/admin/all', async (req, res) => {
  try {
    if (!req.user || !req.user.email?.includes('admin')) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = (page - 1) * limit;
    const userId = req.query.userId as string;
    const model = req.query.model as string;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    // Build WHERE conditions
    const conditions = [];
    if (userId) conditions.push(eq(aiUsageMetering.userId, userId));
    if (model) conditions.push(eq(aiUsageMetering.model, model as any));
    if (startDate) conditions.push(gte(aiUsageMetering.createdAt, startDate));
    if (endDate) conditions.push(lte(aiUsageMetering.createdAt, endDate));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get usage with user info
    const usage = await db
      .select({
        usage: aiUsageMetering,
        user: users,
      })
      .from(aiUsageMetering)
      .leftJoin(users, eq(aiUsageMetering.userId, sql`${users.id}::text`))
      .where(whereClause)
      .orderBy(desc(aiUsageMetering.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(aiUsageMetering)
      .where(whereClause);

    res.json({
      usage: usage.map(({ usage, user }) => ({
        ...usage,
        username: user?.username,
        userEmail: user?.email,
      })),
      pagination: {
        page,
        limit,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / limit),
      },
    });
  } catch (error) {
    logger.error('Failed to fetch admin AI usage', { error });
    res.status(500).json({ error: 'Failed to fetch admin AI usage' });
  }
});

/**
 * GET /api/admin/ai-usage/stats
 * Admin endpoint: Get platform-wide AI usage statistics
 */
router.get('/admin/stats', async (req, res) => {
  try {
    if (!req.user || !req.user.email?.includes('admin')) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const period = req.query.period as string || 'month'; // month, week, day
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Get all usage for period
    const usage = await db
      .select()
      .from(aiUsageMetering)
      .where(gte(aiUsageMetering.createdAt, startDate));

    // Calculate stats
    const stats = {
      period,
      startDate,
      endDate: now,
      totalRequests: usage.length,
      totalTokens: 0,
      totalCost: 0,
      byModel: {} as Record<string, { requests: number; tokens: number; cost: number }>,
      byProvider: {} as Record<string, { requests: number; tokens: number; cost: number }>,
      byTier: {} as Record<string, { requests: number; tokens: number; cost: number }>,
      byStatus: {
        success: 0,
        error: 0,
        timeout: 0,
      },
      uniqueUsers: new Set<string>(),
    };

    usage.forEach((record) => {
      stats.totalTokens += record.tokensTotal;
      stats.totalCost += parseFloat(record.costUsd);
      stats.uniqueUsers.add(record.userId);

      // By model
      if (!stats.byModel[record.model]) {
        stats.byModel[record.model] = { requests: 0, tokens: 0, cost: 0 };
      }
      stats.byModel[record.model].requests += 1;
      stats.byModel[record.model].tokens += record.tokensTotal;
      stats.byModel[record.model].cost += parseFloat(record.costUsd);

      // By provider
      if (!stats.byProvider[record.provider]) {
        stats.byProvider[record.provider] = { requests: 0, tokens: 0, cost: 0 };
      }
      stats.byProvider[record.provider].requests += 1;
      stats.byProvider[record.provider].tokens += record.tokensTotal;
      stats.byProvider[record.provider].cost += parseFloat(record.costUsd);

      // By tier
      if (!stats.byTier[record.userTier]) {
        stats.byTier[record.userTier] = { requests: 0, tokens: 0, cost: 0 };
      }
      stats.byTier[record.userTier].requests += 1;
      stats.byTier[record.userTier].tokens += record.tokensTotal;
      stats.byTier[record.userTier].cost += parseFloat(record.costUsd);

      // By status
      stats.byStatus[record.status] += 1;
    });

    res.json({
      ...stats,
      uniqueUsers: stats.uniqueUsers.size,
    });
  } catch (error) {
    logger.error('Failed to fetch admin AI stats', { error });
    res.status(500).json({ error: 'Failed to fetch admin AI stats' });
  }
});

export default router;
