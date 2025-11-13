/**
 * AI Optimization Router
 * Endpoints for queue management, circuit breaker, and token usage monitoring
 */

import { Router } from 'express';
import { z } from 'zod';
import { aiOptimization } from '../services/ai-optimization';
import { ensureAuthenticated } from '../middleware/auth';
import { ensureAdmin } from '../middleware/admin-auth';

const router = Router();

// All endpoints require authentication
router.use(ensureAuthenticated);

/**
 * POST /api/ai-optimization/queue/enqueue
 * Add a request to the priority queue
 */
router.post('/queue/enqueue', async (req, res) => {
  try {
    const schema = z.object({
      priority: z.enum(['critical', 'high', 'normal', 'low']).default('normal'),
      taskType: z.enum([
        'build', 'test', 'format', 'typecheck', 'lint', 'migration', 'file_operation',
        'plan_generation', 'code_suggestion', 'bug_fix', 'refactoring', 'architecture',
        'conversation', 'other'
      ] as const),
      operation: z.string(),
      parameters: z.record(z.any()),
      context: z.record(z.any()).optional(),
      metadata: z.object({
        debounced: z.boolean().optional(),
        cacheKey: z.string().optional(),
        estimatedTokens: z.number().optional(),
      }).optional(),
    });

    const data = schema.parse(req.body);

    const requestId = await aiOptimization.priorityQueue.enqueue({
      userId: req.user!.id,
      projectId: req.body.projectId,
      ...data,
    });

    res.json({ 
      success: true, 
      requestId,
      message: 'Request queued successfully'
    });
  } catch (error: any) {
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/ai-optimization/queue/dequeue
 * Dequeue next request (admin only)
 */
router.post('/queue/dequeue', ensureAdmin, async (req, res) => {
  try {
    const request = await aiOptimization.priorityQueue.dequeue();
    
    if (!request) {
      return res.json({ 
        success: true, 
        request: null,
        message: 'Queue is empty' 
      });
    }

    res.json({ 
      success: true, 
      request 
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/ai-optimization/queue/complete
 * Mark request as completed (admin only)
 */
router.post('/queue/complete', ensureAdmin, async (req, res) => {
  try {
    const schema = z.object({
      id: z.string(),
      result: z.object({
        output: z.any(),
        tokensUsed: z.number().optional(),
      }),
    });

    const data = schema.parse(req.body);
    await aiOptimization.priorityQueue.complete(data);

    res.json({ 
      success: true, 
      message: 'Request marked as completed' 
    });
  } catch (error: any) {
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/ai-optimization/queue/fail
 * Mark request as failed (admin only)
 */
router.post('/queue/fail', ensureAdmin, async (req, res) => {
  try {
    const schema = z.object({
      id: z.string(),
      error: z.string(),
      shouldRetry: z.boolean().optional(),
    });

    const data = schema.parse(req.body);
    await aiOptimization.priorityQueue.fail(data);

    res.json({ 
      success: true, 
      message: 'Request marked as failed' 
    });
  } catch (error: any) {
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/ai-optimization/queue/stats
 * Get queue statistics (admin only)
 */
router.get('/queue/stats', ensureAdmin, async (req, res) => {
  try {
    const stats = await aiOptimization.priorityQueue.getQueueStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/ai-optimization/circuit-breaker/status
 * Get all providers health status (admin only)
 */
router.get('/circuit-breaker/status', ensureAdmin, async (req, res) => {
  try {
    const statuses = await aiOptimization.circuitBreaker.getAllStatus();
    res.json(statuses);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/ai-optimization/circuit-breaker/reset
 * Manually reset circuit for a provider (admin only)
 */
router.post('/circuit-breaker/reset/:provider', ensureAdmin, async (req, res) => {
  try {
    await aiOptimization.circuitBreaker.resetCircuit(req.params.provider);
    res.json({ 
      success: true, 
      message: `Circuit reset for ${req.params.provider}` 
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/ai-optimization/token-usage/summary
 * Get token usage summary with cost analysis (admin only)
 */
router.get('/token-usage/summary', ensureAdmin, async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const summary = await aiOptimization.tokenUsageLogger.getUsageSummary(days);
    
    res.json(summary);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/ai-optimization/token-usage/by-provider
 * Get token usage breakdown by provider (admin only)
 */
router.get('/token-usage/by-provider', ensureAdmin, async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const breakdown = await aiOptimization.tokenUsageLogger.getProviderBreakdown(days);
    
    res.json(breakdown);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/ai-optimization/task-classification/stats
 * Get task classification statistics (admin only)
 */
router.get('/task-classification/stats', ensureAdmin, async (req, res) => {
  try {
    const stats = await aiOptimization.taskClassifier.getAllClassifications();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/ai-optimization/dashboard
 * Get comprehensive dashboard data (admin only)
 */
router.get('/dashboard', ensureAdmin, async (req, res) => {
  try {
    const [
      queueStats,
      circuitBreakerStatus,
      tokenUsageSummary,
      classificationStats,
    ] = await Promise.all([
      aiOptimization.priorityQueue.getQueueStats(),
      aiOptimization.circuitBreaker.getAllStatus(),
      aiOptimization.tokenUsageLogger.getUsageSummary(7),
      aiOptimization.taskClassifier.getAllClassifications(),
    ]);

    res.json({
      queue: queueStats,
      circuitBreaker: circuitBreakerStatus,
      tokenUsage: tokenUsageSummary,
      classifications: classificationStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;
