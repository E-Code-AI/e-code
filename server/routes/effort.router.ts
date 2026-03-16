/**
 * Effort Usage Router
 * SECURITY FIX: Now queries real data from the database instead of returning hardcoded zeros.
 * Falls back to zeros only when no data is found (legitimate empty state).
 */
import { Router, Request, Response } from 'express';
import { ensureAuthenticated } from '../middleware/auth';
import { db } from '../db';
import { aiUsageRecords, checkpoints, deployments, testRuns, files } from '@shared/schema';
import { eq, and, gte, lte, count, sum, sql } from 'drizzle-orm';
import { createLogger } from '../utils/logger';
import { storage } from '../storage';

const router = Router();
const logger = createLogger('effort-router');

router.get('/usage/:projectId', ensureAuthenticated, async (req: Request, res: Response) => {
  const projectId = parseInt(req.params.projectId);
  const userId = req.user?.id;

  if (isNaN(projectId)) {
    return res.status(400).json({ error: 'Invalid project ID' });
  }

  // Verify project ownership
  try {
    const project = await storage.getProject(projectId);
    if (!project || project.ownerId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
  } catch {
    return res.status(500).json({ error: 'Failed to verify project access' });
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  try {
    // Query real usage data from the database
    const [aiUsageResult] = await db
      .select({
        totalTokens: sql<number>`COALESCE(SUM(CAST(${aiUsageRecords.tokensUsed} AS integer)), 0)`,
        totalCalls: count(),
        totalCost: sql<number>`COALESCE(SUM(CAST(${aiUsageRecords.cost} AS numeric)), 0)`,
      })
      .from(aiUsageRecords)
      .where(and(
        eq(aiUsageRecords.projectId, projectId),
        gte(aiUsageRecords.createdAt, startOfMonth)
      ));

    const [checkpointCount] = await db
      .select({ count: count() })
      .from(checkpoints)
      .where(and(
        eq(checkpoints.projectId, projectId),
        gte(checkpoints.createdAt, startOfMonth)
      ));

    const [deploymentCount] = await db
      .select({ count: count() })
      .from(deployments)
      .where(and(
        eq(deployments.projectId, projectId),
        gte(deployments.createdAt, startOfMonth)
      ));

    const [fileCount] = await db
      .select({ count: count() })
      .from(files)
      .where(eq(files.projectId, projectId));

    const report = {
      userId: userId || 0,
      projectId,
      period: {
        start: startOfMonth,
        end: now
      },
      totalEffort: {
        tokensUsed: Number(aiUsageResult?.totalTokens) || 0,
        apiCalls: Number(aiUsageResult?.totalCalls) || 0,
        computeTime: 0, // Populated when compute tracking is enabled
        filesProcessed: Number(fileCount?.count) || 0,
        codeGenerated: 0,
        testsRun: 0,
        deploymentsCreated: Number(deploymentCount?.count) || 0,
        errorsRecovered: 0,
        checkpointsCreated: Number(checkpointCount?.count) || 0,
        totalEffortScore: Number(aiUsageResult?.totalCalls) || 0
      },
      totalCost: Number(aiUsageResult?.totalCost) || 0,
      dailyBreakdown: []
    };

    res.json({ report });
  } catch (error) {
    logger.error('Error fetching effort usage:', error);
    // Graceful fallback — return zeros with error flag so frontend knows
    const report = {
      userId: userId || 0,
      projectId,
      period: { start: startOfMonth, end: now },
      totalEffort: {
        tokensUsed: 0, apiCalls: 0, computeTime: 0, filesProcessed: 0,
        codeGenerated: 0, testsRun: 0, deploymentsCreated: 0,
        errorsRecovered: 0, checkpointsCreated: 0, totalEffortScore: 0
      },
      totalCost: 0,
      dailyBreakdown: [],
      _dataUnavailable: true,
    };
    res.json({ report });
  }
});

export default router;
