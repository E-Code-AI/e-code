import { Router } from 'express';
import { ensureAuthenticated } from '../middleware/auth';
import { WebSearchService } from '../services/web-search-service';
import { BackgroundTestingService } from '../services/background-testing-service';
import { createLogger } from '../utils/logger';
import { db } from '../db';
import { 
  webSearchHistory, 
  testingSessions,
  testVideoReplays,
  extendedThinkingSessions,
  extendedThinkingSteps
} from '@shared/schema';
import { eq, desc, and } from 'drizzle-orm';
import crypto from 'crypto';

const logger = createLogger('agent-tools');

/**
 * Agent Tools Router
 * Provides API endpoints for:
 * - Web Search functionality
 * - App Testing with video replays
 * - Extended Thinking steps
 */
export default function createAgentToolsRouter(): Router {
  const router = Router();
  const webSearchService = new WebSearchService();
  
  router.use(ensureAuthenticated);

  // ============================================
  // WEB SEARCH ENDPOINTS
  // ============================================

  /**
   * POST /api/agent/web-search
   * Perform a web search
   */
  router.post('/web-search', async (req, res) => {
    try {
      const userId = req.user!.id;
      const { query, maxResults = 10, searchType = 'web' } = req.body;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Query is required' });
      }

      logger.info(`Web search request from user ${userId}: "${query}"`);

      const searchResult = await webSearchService.search(query, {
        maxResults,
        searchType
      });

      // Save search to history
      await db.insert(webSearchHistory).values({
        userId,
        query,
        resultsCount: searchResult.totalResults,
        results: searchResult.results,
        searchTime: searchResult.searchTime,
      }).catch(err => {
        logger.warn('Failed to save search history:', err);
      });

      res.json(searchResult);
    } catch (error: any) {
      logger.error('Web search error:', error);
      res.status(500).json({ error: 'Search failed', message: error.message });
    }
  });

  /**
   * GET /api/agent/web-search/history
   * Get user's search history
   */
  router.get('/web-search/history', async (req, res) => {
    try {
      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 20;

      const history = await db.select()
        .from(webSearchHistory)
        .where(eq(webSearchHistory.userId, userId))
        .orderBy(desc(webSearchHistory.timestamp))
        .limit(limit);

      res.json({ history, count: history.length });
    } catch (error: any) {
      logger.error('Error fetching search history:', error);
      res.status(500).json({ error: 'Failed to fetch search history' });
    }
  });

  /**
   * POST /api/agent/web-search/docs
   * Search for documentation specifically
   */
  router.post('/web-search/docs', async (req, res) => {
    try {
      const { query } = req.body;

      if (!query) {
        return res.status(400).json({ error: 'Query is required' });
      }

      const results = await webSearchService.searchForDocs(query);
      res.json({ results, count: results.length });
    } catch (error: any) {
      logger.error('Doc search error:', error);
      res.status(500).json({ error: 'Doc search failed' });
    }
  });

  // ============================================
  // APP TESTING ENDPOINTS
  // ============================================

  /**
   * POST /api/agent/testing/start
   * Start a new test session
   */
  router.post('/testing/start', async (req, res) => {
    try {
      const userId = req.user!.id;
      const { projectId, testPlan, recordVideo = true } = req.body;

      if (!projectId || !testPlan) {
        return res.status(400).json({ error: 'projectId and testPlan are required' });
      }

      const sessionId = crypto.randomUUID();

      // Create test session in database
      const [session] = await db.insert(testingSessions).values({
        id: sessionId,
        userId,
        projectId,
        testPlan,
        status: 'pending',
        recordVideo,
        metadata: {
          startedBy: 'agent-tools',
          timestamp: new Date().toISOString()
        }
      }).returning();

      // Start the actual test (async - returns immediately)
      const testingService = new BackgroundTestingService();
      testingService.scheduleTest(projectId, [], {
        sessionId,
        testPlan,
        recordVideo
      }).catch(err => {
        logger.error(`Test session ${sessionId} failed to start:`, err);
      });

      logger.info(`Test session ${sessionId} started for project ${projectId}`);

      res.json({
        sessionId: session.id,
        status: session.status,
        message: 'Test session started'
      });
    } catch (error: any) {
      logger.error('Error starting test:', error);
      res.status(500).json({ error: 'Failed to start test' });
    }
  });

  /**
   * GET /api/agent/testing/sessions
   * Get test sessions for a project
   */
  router.get('/testing/sessions', async (req, res) => {
    try {
      const userId = req.user!.id;
      const projectId = parseInt(req.query.projectId as string);
      const limit = parseInt(req.query.limit as string) || 20;

      if (!projectId) {
        return res.status(400).json({ error: 'projectId is required' });
      }

      const sessions = await db.select()
        .from(testingSessions)
        .where(and(
          eq(testingSessions.userId, userId),
          eq(testingSessions.projectId, projectId)
        ))
        .orderBy(desc(testingSessions.createdAt))
        .limit(limit);

      res.json({ sessions, count: sessions.length });
    } catch (error: any) {
      logger.error('Error fetching test sessions:', error);
      res.status(500).json({ error: 'Failed to fetch test sessions' });
    }
  });

  /**
   * GET /api/agent/testing/sessions/:sessionId
   * Get a specific test session
   */
  router.get('/testing/sessions/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;

      const [session] = await db.select()
        .from(testingSessions)
        .where(eq(testingSessions.id, sessionId));

      if (!session) {
        return res.status(404).json({ error: 'Test session not found' });
      }

      res.json({ session });
    } catch (error: any) {
      logger.error('Error fetching test session:', error);
      res.status(500).json({ error: 'Failed to fetch test session' });
    }
  });

  /**
   * GET /api/agent/testing/replays
   * Get video replays for a project
   */
  router.get('/testing/replays', async (req, res) => {
    try {
      const userId = req.user!.id;
      const projectId = parseInt(req.query.projectId as string);
      const limit = parseInt(req.query.limit as string) || 20;

      if (!projectId) {
        return res.status(400).json({ error: 'projectId is required' });
      }

      const replays = await db.select()
        .from(testVideoReplays)
        .where(and(
          eq(testVideoReplays.userId, userId),
          eq(testVideoReplays.projectId, projectId)
        ))
        .orderBy(desc(testVideoReplays.createdAt))
        .limit(limit);

      res.json({ replays, count: replays.length });
    } catch (error: any) {
      logger.error('Error fetching video replays:', error);
      res.status(500).json({ error: 'Failed to fetch video replays' });
    }
  });

  /**
   * GET /api/agent/testing/replays/:replayId
   * Get a specific video replay
   */
  router.get('/testing/replays/:replayId', async (req, res) => {
    try {
      const { replayId } = req.params;

      const [replay] = await db.select()
        .from(testVideoReplays)
        .where(eq(testVideoReplays.id, replayId));

      if (!replay) {
        return res.status(404).json({ error: 'Video replay not found' });
      }

      res.json({ replay });
    } catch (error: any) {
      logger.error('Error fetching video replay:', error);
      res.status(500).json({ error: 'Failed to fetch video replay' });
    }
  });

  // ============================================
  // EXTENDED THINKING ENDPOINTS
  // ============================================

  /**
   * GET /api/agent/thinking/:sessionId
   * Get extended thinking steps for a session
   */
  router.get('/thinking/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;

      // Get the thinking session
      const [session] = await db.select()
        .from(extendedThinkingSessions)
        .where(eq(extendedThinkingSessions.id, sessionId));

      if (!session) {
        return res.json({ steps: [], isThinking: false });
      }

      // Get thinking steps
      const steps = await db.select()
        .from(extendedThinkingSteps)
        .where(eq(extendedThinkingSteps.sessionId, sessionId))
        .orderBy(extendedThinkingSteps.order);

      res.json({
        steps: steps.map(step => ({
          id: step.id,
          type: step.type,
          title: step.title,
          content: step.content,
          status: step.status,
          timestamp: step.createdAt,
          duration: step.duration,
          isStreaming: step.status === 'active'
        })),
        isThinking: session.status === 'thinking'
      });
    } catch (error: any) {
      logger.error('Error fetching thinking steps:', error);
      res.status(500).json({ error: 'Failed to fetch thinking steps' });
    }
  });

  /**
   * POST /api/agent/thinking/start
   * Start an extended thinking session
   */
  router.post('/thinking/start', async (req, res) => {
    try {
      const userId = req.user!.id;
      const { projectId, prompt, model } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      const sessionId = crypto.randomUUID();

      const [session] = await db.insert(extendedThinkingSessions).values({
        id: sessionId,
        userId,
        projectId,
        prompt,
        model: model || 'claude-sonnet-4-5-20250929',
        status: 'thinking',
        metadata: {
          startedAt: new Date().toISOString()
        }
      }).returning();

      logger.info(`Extended thinking session ${sessionId} started`);

      res.json({
        sessionId: session.id,
        status: session.status,
        message: 'Extended thinking session started'
      });
    } catch (error: any) {
      logger.error('Error starting thinking session:', error);
      res.status(500).json({ error: 'Failed to start thinking session' });
    }
  });

  /**
   * POST /api/agent/thinking/:sessionId/step
   * Add a thinking step (internal use)
   */
  router.post('/thinking/:sessionId/step', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { type, title, content, status = 'active' } = req.body;

      // Get current step count
      const existingSteps = await db.select()
        .from(extendedThinkingSteps)
        .where(eq(extendedThinkingSteps.sessionId, sessionId));

      const [step] = await db.insert(extendedThinkingSteps).values({
        id: crypto.randomUUID(),
        sessionId,
        type: type || 'reasoning',
        title: title || 'Thinking...',
        content: content || '',
        status,
        order: existingSteps.length
      }).returning();

      res.json({ step });
    } catch (error: any) {
      logger.error('Error adding thinking step:', error);
      res.status(500).json({ error: 'Failed to add thinking step' });
    }
  });

  /**
   * PATCH /api/agent/thinking/:sessionId/step/:stepId
   * Update a thinking step (for streaming)
   */
  router.patch('/thinking/:sessionId/step/:stepId', async (req, res) => {
    try {
      const { stepId } = req.params;
      const { content, status, duration } = req.body;

      const updates: any = {};
      if (content !== undefined) updates.content = content;
      if (status !== undefined) updates.status = status;
      if (duration !== undefined) updates.duration = duration;

      const [step] = await db.update(extendedThinkingSteps)
        .set(updates)
        .where(eq(extendedThinkingSteps.id, stepId))
        .returning();

      res.json({ step });
    } catch (error: any) {
      logger.error('Error updating thinking step:', error);
      res.status(500).json({ error: 'Failed to update thinking step' });
    }
  });

  /**
   * POST /api/agent/thinking/:sessionId/complete
   * Complete a thinking session
   */
  router.post('/thinking/:sessionId/complete', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { conclusion } = req.body;

      const [session] = await db.update(extendedThinkingSessions)
        .set({
          status: 'completed',
          conclusion,
          completedAt: new Date()
        })
        .where(eq(extendedThinkingSessions.id, sessionId))
        .returning();

      res.json({ session, message: 'Thinking session completed' });
    } catch (error: any) {
      logger.error('Error completing thinking session:', error);
      res.status(500).json({ error: 'Failed to complete thinking session' });
    }
  });

  return router;
}
