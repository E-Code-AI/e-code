import { Router } from 'express';
import { ensureAuthenticated } from '../middleware/auth';
import { WebSearchService } from '../services/web-search-service';
import { BackgroundTestingService } from '../services/background-testing-service';
import { createLogger } from '../utils/logger';
import { db } from '../db';
import { 
  testingSessionRecordings,
  agentMessages,
  aiConversations,
  projects
} from '@shared/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
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

      res.json(searchResult);
    } catch (error: any) {
      logger.error('Web search error:', error);
      res.status(500).json({ error: 'Search failed', message: error.message });
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

  /**
   * POST /api/agent/web-search/ai
   * Search formatted for AI consumption
   */
  router.post('/web-search/ai', async (req, res) => {
    try {
      const { query } = req.body;

      if (!query) {
        return res.status(400).json({ error: 'Query is required' });
      }

      const formattedResults = await webSearchService.searchForAI(query);
      res.json({ result: formattedResults });
    } catch (error: any) {
      logger.error('AI search error:', error);
      res.status(500).json({ error: 'AI search failed' });
    }
  });

  // ============================================
  // APP TESTING ENDPOINTS
  // ============================================

  /**
   * POST /api/agent/testing/start
   * Start a new test session with video recording
   */
  router.post('/testing/start', async (req, res) => {
    try {
      const userId = req.user!.id;
      const { projectId, testPlan, testName, recordVideo = true } = req.body;

      if (!projectId || !testPlan) {
        return res.status(400).json({ error: 'projectId and testPlan are required' });
      }

      const sessionId = crypto.randomUUID();

      // Create test recording entry in database
      const [recording] = await db.insert(testingSessionRecordings).values({
        projectId,
        sessionId,
        testName: testName || `Test ${new Date().toISOString()}`,
        testPlan,
        status: 'pending',
        createdBy: userId,
        metadata: {
          recordVideo,
          startedBy: 'agent-tools',
          timestamp: new Date().toISOString()
        }
      }).returning();

      // Start the actual test asynchronously
      const testingService = new BackgroundTestingService();
      testingService.scheduleTest(projectId, []).catch(err => {
        logger.error(`Test session ${sessionId} failed to start:`, err);
        // Update status to failed
        db.update(testingSessionRecordings)
          .set({ status: 'failed' })
          .where(eq(testingSessionRecordings.id, recording.id))
          .catch(() => {});
      });

      logger.info(`Test session ${sessionId} started for project ${projectId}`);

      res.json({
        sessionId,
        recordingId: recording.id,
        status: recording.status,
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

      // Verify user has access to project
      const [project] = await db.select()
        .from(projects)
        .where(and(
          eq(projects.id, projectId),
          eq(projects.ownerId, userId)
        ));

      if (!project) {
        return res.status(403).json({ error: 'Access denied to project' });
      }

      const sessions = await db.select()
        .from(testingSessionRecordings)
        .where(eq(testingSessionRecordings.projectId, projectId))
        .orderBy(desc(testingSessionRecordings.createdAt))
        .limit(limit);

      res.json({ 
        sessions: sessions.map(s => ({
          id: s.sessionId,
          recordingId: s.id,
          projectId: s.projectId,
          testName: s.testName,
          testPlan: s.testPlan,
          status: s.status,
          videoUrl: s.videoUrl,
          thumbnailUrl: s.thumbnailUrl,
          duration: s.duration,
          steps: s.steps,
          summary: s.summary,
          createdAt: s.createdAt,
          completedAt: s.completedAt,
        })),
        count: sessions.length 
      });
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
        .from(testingSessionRecordings)
        .where(eq(testingSessionRecordings.sessionId, sessionId));

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

      // Get recordings with video URLs
      const replays = await db.select()
        .from(testingSessionRecordings)
        .where(and(
          eq(testingSessionRecordings.projectId, projectId),
          sql`${testingSessionRecordings.videoUrl} IS NOT NULL`
        ))
        .orderBy(desc(testingSessionRecordings.createdAt))
        .limit(limit);

      res.json({ 
        replays: replays.map(r => ({
          id: r.id.toString(),
          testSessionId: r.sessionId,
          projectId: r.projectId,
          filename: r.testName,
          url: r.videoUrl,
          thumbnailUrl: r.thumbnailUrl,
          duration: r.duration || 0,
          status: r.status === 'completed' ? 'ready' : r.status,
          createdAt: r.createdAt?.toISOString(),
        })),
        count: replays.length 
      });
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
      const replayId = parseInt(req.params.replayId);

      const [replay] = await db.select()
        .from(testingSessionRecordings)
        .where(eq(testingSessionRecordings.id, replayId));

      if (!replay) {
        return res.status(404).json({ error: 'Video replay not found' });
      }

      res.json({ 
        replay: {
          id: replay.id.toString(),
          testSessionId: replay.sessionId,
          projectId: replay.projectId,
          filename: replay.testName,
          url: replay.videoUrl,
          thumbnailUrl: replay.thumbnailUrl,
          duration: replay.duration || 0,
          status: replay.status === 'completed' ? 'ready' : replay.status,
          steps: replay.steps,
          summary: replay.summary,
          createdAt: replay.createdAt?.toISOString(),
          completedAt: replay.completedAt?.toISOString(),
        }
      });
    } catch (error: any) {
      logger.error('Error fetching video replay:', error);
      res.status(500).json({ error: 'Failed to fetch video replay' });
    }
  });

  // ============================================
  // EXTENDED THINKING ENDPOINTS
  // ============================================

  /**
   * GET /api/agent/thinking/:conversationId
   * Get extended thinking data for a conversation
   */
  router.get('/thinking/:conversationId', async (req, res) => {
    try {
      const conversationId = parseInt(req.params.conversationId);

      if (!conversationId) {
        return res.json({ steps: [], isThinking: false });
      }

      // Get messages with extended thinking for this conversation
      const messages = await db.select()
        .from(agentMessages)
        .where(eq(agentMessages.conversationId, conversationId))
        .orderBy(desc(agentMessages.createdAt))
        .limit(10);

      // Extract thinking steps from messages with extended thinking
      const steps: Array<{
        id: string;
        type: 'reasoning' | 'analysis' | 'planning';
        title: string;
        content: string;
        status: 'active' | 'completed' | 'error';
        timestamp: Date;
        duration?: number;
      }> = [];

      let isThinking = false;

      for (const message of messages) {
        const thinking = message.extendedThinking as {
          enabled: boolean;
          reasoning: string;
          steps: Array<{
            step: number;
            thought: string;
            conclusion: string;
          }>;
          confidence: number;
        } | null;

        if (thinking?.enabled && thinking.steps) {
          for (const step of thinking.steps) {
            steps.push({
              id: `${message.id}-step-${step.step}`,
              type: step.step === 1 ? 'reasoning' : step.step === 2 ? 'analysis' : 'planning',
              title: `Step ${step.step}: ${step.thought.substring(0, 50)}...`,
              content: `${step.thought}\n\nConclusion: ${step.conclusion}`,
              status: 'completed',
              timestamp: message.createdAt,
              duration: (message.metadata as any)?.processingTimeMs || undefined
            });
          }
        }
      }

      res.json({
        steps: steps.slice(0, 20), // Limit to last 20 steps
        isThinking
      });
    } catch (error: any) {
      logger.error('Error fetching thinking steps:', error);
      res.status(500).json({ error: 'Failed to fetch thinking steps' });
    }
  });

  /**
   * POST /api/agent/thinking/analyze
   * Perform extended thinking analysis on a prompt
   */
  router.post('/thinking/analyze', async (req, res) => {
    try {
      const userId = req.user!.id;
      const { prompt, conversationId, model } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      // This endpoint would trigger extended thinking mode on the AI
      // For now, return a structure that the frontend can use
      res.json({
        sessionId: crypto.randomUUID(),
        status: 'started',
        message: 'Extended thinking analysis started',
        settings: {
          model: model || 'claude-sonnet-4-5-20250929',
          extendedThinking: true,
        }
      });
    } catch (error: any) {
      logger.error('Error starting thinking analysis:', error);
      res.status(500).json({ error: 'Failed to start thinking analysis' });
    }
  });

  // ============================================
  // TOOL STATUS ENDPOINT
  // ============================================

  /**
   * GET /api/agent/tools/status
   * Get status of all agent tools
   */
  router.get('/tools/status', async (req, res) => {
    try {
      res.json({
        webSearch: {
          enabled: true,
          status: 'operational',
          provider: 'DuckDuckGo'
        },
        appTesting: {
          enabled: true,
          status: 'operational',
          videoRecording: true,
          provider: 'Playwright'
        },
        extendedThinking: {
          enabled: true,
          status: 'operational',
          models: ['claude-sonnet-4-5-20250929', 'claude-opus-4-1-20250805', 'o3', 'gpt-5.1']
        },
        highPowerModels: {
          enabled: true,
          status: 'operational',
          models: ['gpt-5.1', 'claude-opus-4-1-20250805', 'gemini-2.5-pro', 'grok-4']
        },
        maxAutonomy: {
          enabled: true,
          status: 'operational',
          maxDuration: 240 // minutes
        }
      });
    } catch (error: any) {
      logger.error('Error fetching tools status:', error);
      res.status(500).json({ error: 'Failed to fetch tools status' });
    }
  });

  return router;
}
