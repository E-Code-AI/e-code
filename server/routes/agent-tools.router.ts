import {
agentMessages,
projects,
testingSessionRecordings,
webSearchHistory
} from '@shared/schema';
import crypto from 'crypto';
import { and,desc,eq,sql } from 'drizzle-orm';
import { Router } from 'express';
import { db } from '../db';
import { ensureAuthenticated } from '../middleware/auth';
import { AgentPreferencesService } from '../services/agent-preferences.service';
import { BackgroundTestingService } from '../services/background-testing-service';
import { WebSearchService } from '../services/web-search-service';
import type { IStorage } from '../storage';
import { createLogger } from '../utils/logger';
import { redactErrorForLog } from '../utils/error-redaction';

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
  
  router.use(
    ['/tools', '/web-search', '/testing', '/thinking', '/workflows'],
    ensureAuthenticated,
  );

  // ============================================
  // WEB SEARCH ENDPOINTS
  // ============================================

  /**
   * GET /api/agent/tools/web-search
   * Get web search history for the user
   */
  router.get('/tools/web-search', async (req, res) => {
    try {
      const _userId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 20;
      const conversationId = req.query.conversationId ? parseInt(req.query.conversationId as string) : undefined;

      // Récupérer l'historique de recherche réel depuis la base de données
      let query = db.select({
        id: webSearchHistory.id,
        conversationId: webSearchHistory.conversationId,
        query: webSearchHistory.query,
        results: webSearchHistory.results,
        selectedUrls: webSearchHistory.selectedUrls,
        timestamp: webSearchHistory.timestamp,
      }).from(webSearchHistory).$dynamic();

      if (conversationId) {
        query = query.where(eq(webSearchHistory.conversationId, conversationId));
      }

      const searches = await query
        .orderBy(desc(webSearchHistory.timestamp))
        .limit(limit);

      res.json({
        searches: searches.map(s => ({
          id: s.id,
          conversationId: s.conversationId,
          query: s.query,
          resultCount: Array.isArray(s.results) ? (s.results as any[]).length : 0,
          selectedUrls: s.selectedUrls || [],
          timestamp: s.timestamp,
        })),
        count: searches.length,
      });
    } catch (error: any) {
      logger.error('Error fetching search history:', redactErrorForLog(error));
      res.status(500).json({ error: 'Failed to fetch search history' });
    }
  });

  /**
   * POST /api/agent/tools/web-search
   * Perform a web search (alias for /web-search)
   */
  router.post('/tools/web-search', async (req, res) => {
    try {
      const userId = req.user!.id;
      const { query, maxResults = 10, searchType = 'web', conversationId } = req.body;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Query is required' });
      }

      logger.info(`Web search request from user ${userId}: "${query}"`);

      const searchResult = await webSearchService.search(query, {
        maxResults,
        searchType
      });

      // Sauvegarder dans l'historique si conversationId fourni
      if (conversationId && typeof conversationId === 'number') {
        try {
          await db.insert(webSearchHistory).values({
            conversationId,
            query,
            results: searchResult.results || [],
            selectedUrls: [],
          });
          logger.info(`Search history saved for conversation ${conversationId}`);
        } catch (historyError) {
          logger.warn('Failed to save search history:', historyError);
        }
      }

      res.json(searchResult);
    } catch (error: any) {
      logger.error('Web search error:', redactErrorForLog(error));
      res.status(500).json({ error: 'Search failed', message: error.message });
    }
  });

  /**
   * POST /api/agent/web-search
   * Perform a web search (legacy endpoint)
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
      logger.error('Web search error:', redactErrorForLog(error));
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
      logger.error('Doc search error:', redactErrorForLog(error));
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
      logger.error('AI search error:', redactErrorForLog(error));
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

      if (!await checkAgentProjectAccess(req, res, projectId)) {
        return;
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
        logger.error(`Test session ${sessionId} failed to start:`, { error: err.message, projectId, sessionId });
        // Update status to failed
        db.update(testingSessionRecordings)
          .set({ status: 'failed' })
          .where(eq(testingSessionRecordings.id, recording.id))
          .catch((dbErr: any) => {
            logger.error(`Failed to update test recording status to failed:`, { 
              error: dbErr.message, 
              recordingId: recording.id, 
              sessionId 
            });
          });
      });

      logger.info(`Test session ${sessionId} started for project ${projectId}`);

      res.json({
        sessionId,
        recordingId: recording.id,
        status: recording.status,
        message: 'Test session started'
      });
    } catch (error: any) {
      logger.error('Error starting test:', redactErrorForLog(error));
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
      logger.error('Error fetching test sessions:', redactErrorForLog(error));
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
      logger.error('Error fetching test session:', redactErrorForLog(error));
      res.status(500).json({ error: 'Failed to fetch test session' });
    }
  });

  /**
   * GET /api/agent/testing/replays
   * Get video replays for a project
   */
  router.get('/testing/replays', async (req, res) => {
    try {
      const projectId = parseInt(req.query.projectId as string);
      const limit = parseInt(req.query.limit as string) || 20;

      if (!projectId) {
        return res.status(400).json({ error: 'projectId is required' });
      }

      if (!await checkAgentProjectAccess(req, res, projectId)) {
        return;
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
          steps: r.steps || [],
          createdAt: r.createdAt?.toISOString(),
        })),
        count: replays.length 
      });
    } catch (error: any) {
      logger.error('Error fetching video replays:', redactErrorForLog(error));
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
      logger.error('Error fetching video replay:', redactErrorForLog(error));
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
      logger.error('Error fetching thinking steps:', redactErrorForLog(error));
      res.status(500).json({ error: 'Failed to fetch thinking steps' });
    }
  });

  /**
   * POST /api/agent/thinking/analyze
   * Perform extended thinking analysis on a prompt
   */
  router.post('/thinking/analyze', async (req, res) => {
    try {
      const _userId = req.user!.id;
      const { prompt, conversationId: _conversationId, model } = req.body;

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
          model: model || 'claude-sonnet-4-6',
          extendedThinking: true,
        }
      });
    } catch (error: any) {
      logger.error('Error starting thinking analysis:', redactErrorForLog(error));
      res.status(500).json({ error: 'Failed to start thinking analysis' });
    }
  });

  // ============================================
  // TOOLS/ ALIASED ENDPOINTS (for /api/agent/tools/... paths)
  // ============================================

  /**
   * GET /api/agent/tools/testing/replays
   * Get video replays (alias)
   */
  router.get('/tools/testing/replays', async (req, res) => {
    try {
      const projectId = parseInt(req.query.projectId as string);
      const limit = parseInt(req.query.limit as string) || 20;

      if (!projectId) {
        return res.status(400).json({ error: 'projectId is required' });
      }

      if (!await checkAgentProjectAccess(req, res, projectId)) {
        return;
      }

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
          steps: r.steps || [],
          createdAt: r.createdAt?.toISOString(),
        })),
        count: replays.length 
      });
    } catch (error: any) {
      logger.error('Error fetching video replays:', redactErrorForLog(error));
      res.status(500).json({ error: 'Failed to fetch video replays' });
    }
  });

  /**
   * POST /api/agent/tools/testing/start
   * Start a test session (alias)
   */
  router.post('/tools/testing/start', async (req, res) => {
    try {
      const userId = req.user!.id;
      const { projectId, testPlan, testName, recordVideo = true } = req.body;

      if (!projectId || !testPlan) {
        return res.status(400).json({ error: 'projectId and testPlan are required' });
      }

      if (!await checkAgentProjectAccess(req, res, projectId)) {
        return;
      }

      const sessionId = crypto.randomUUID();

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

      const testingService = new BackgroundTestingService();
      testingService.scheduleTest(projectId, []).catch(err => {
        logger.error(`Test session ${sessionId} failed to start:`, { error: err.message, projectId, sessionId });
        db.update(testingSessionRecordings)
          .set({ status: 'failed' })
          .where(eq(testingSessionRecordings.id, recording.id))
          .catch((dbErr: any) => {
            logger.error(`Failed to update test recording status to failed:`, { 
              error: dbErr.message, 
              recordingId: recording.id, 
              sessionId 
            });
          });
      });

      logger.info(`Test session ${sessionId} started for project ${projectId}`);

      res.json({
        sessionId,
        recordingId: recording.id,
        status: recording.status,
        message: 'Test session started'
      });
    } catch (error: any) {
      logger.error('Error starting test:', redactErrorForLog(error));
      res.status(500).json({ error: 'Failed to start test' });
    }
  });

  /**
   * GET /api/agent/tools/thinking/:conversationId
   * Get extended thinking steps (alias)
   */
  router.get('/tools/thinking/:conversationId', async (req, res) => {
    try {
      const conversationId = parseInt(req.params.conversationId);

      if (!conversationId) {
        return res.json({ steps: [], isThinking: false });
      }

      const messages = await db.select()
        .from(agentMessages)
        .where(eq(agentMessages.conversationId, conversationId))
        .orderBy(desc(agentMessages.createdAt))
        .limit(10);

      const steps: Array<{
        id: string;
        type: 'reasoning' | 'analysis' | 'planning';
        title: string;
        content: string;
        status: 'active' | 'completed' | 'error';
        timestamp: Date;
        duration?: number;
      }> = [];

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
        steps: steps.slice(0, 20),
        isThinking: false
      });
    } catch (error: any) {
      logger.error('Error fetching thinking steps:', redactErrorForLog(error));
      res.status(500).json({ error: 'Failed to fetch thinking steps' });
    }
  });

  // ============================================
  // WORKFLOW STATUS ENDPOINTS
  // ============================================

  /**
   * GET /api/agent/workflows
   * Get active and recent workflows with their progress
   */
  router.get('/workflows', async (req, res) => {
    try {
      const _userId = req.user!.id;
      const { projectId, status, limit = 20 } = req.query;
      
      const { agentWorkflows } = await import('@shared/schema');
      
      let query = db.select().from(agentWorkflows).$dynamic();
      
      if (projectId) {
        query = query.where(eq(agentWorkflows.projectId, parseInt(projectId as string)));
      }
      
      if (status) {
        query = query.where(eq(agentWorkflows.status, status as any));
      }
      
      const workflows = await query
        .orderBy(desc(agentWorkflows.startedAt))
        .limit(parseInt(limit as string));
      
      res.json({
        workflows: workflows.map(w => ({
          id: w.id,
          name: w.name,
          description: w.description,
          status: w.status,
          progress: w.progress,
          currentStep: w.currentStep,
          steps: w.steps,
          error: w.error,
          sessionId: w.sessionId,
          projectId: w.projectId,
          startedAt: w.startedAt,
          completedAt: w.completedAt,
          metadata: w.metadata
        })),
        total: workflows.length
      });
    } catch (error: any) {
      logger.error('Error fetching workflows:', redactErrorForLog(error));
      res.status(500).json({ error: 'Failed to fetch workflows' });
    }
  });

  /**
   * GET /api/agent/workflows/:workflowId
   * Get detailed workflow status including step progress
   */
  router.get('/workflows/:workflowId', async (req, res) => {
    try {
      const { workflowId } = req.params;
      const { agentWorkflows } = await import('@shared/schema');
      
      const [workflow] = await db.select()
        .from(agentWorkflows)
        .where(eq(agentWorkflows.id, workflowId));
      
      if (!workflow) {
        return res.status(404).json({ error: 'Workflow not found' });
      }
      
      const steps = (workflow.steps as any[]) || [];
      const completedSteps = steps.filter((s: any) => s.status === 'completed');
      const failedSteps = steps.filter((s: any) => s.status === 'failed');
      const runningSteps = steps.filter((s: any) => s.status === 'running');
      
      res.json({
        workflow: {
          id: workflow.id,
          name: workflow.name,
          description: workflow.description,
          status: workflow.status,
          progress: workflow.progress,
          currentStep: workflow.currentStep,
          steps: steps.map((step: any, idx: number) => ({
            id: step.id || `step-${idx}`,
            name: step.name,
            type: step.type,
            status: step.status || 'pending',
            error: step.error,
            output: step.output,
            startedAt: step.startedAt,
            completedAt: step.completedAt,
            duration: step.completedAt && step.startedAt 
              ? new Date(step.completedAt).getTime() - new Date(step.startedAt).getTime()
              : null
          })),
          error: workflow.error,
          sessionId: workflow.sessionId,
          projectId: workflow.projectId,
          startedAt: workflow.startedAt,
          completedAt: workflow.completedAt,
          duration: workflow.completedAt && workflow.startedAt
            ? new Date(workflow.completedAt).getTime() - new Date(workflow.startedAt).getTime()
            : null,
          stats: {
            totalSteps: steps.length,
            completed: completedSteps.length,
            failed: failedSteps.length,
            running: runningSteps.length,
            pending: steps.length - completedSteps.length - failedSteps.length - runningSteps.length
          }
        }
      });
    } catch (error: any) {
      logger.error('Error fetching workflow details:', redactErrorForLog(error));
      res.status(500).json({ error: 'Failed to fetch workflow details' });
    }
  });

  // ============================================
  // TOOL STATUS ENDPOINT
  // ============================================

  /**
   * GET /api/agent/tools
   * List all available agent tools with their details
   */
  router.get('/tools', async (req, res) => {
    try {
      const { capability, search } = req.query;
      
      // Import tool framework service
      const { agentToolFramework } = await import('../services/agent-tool-framework.service');
      
      // Get tools from the framework (lazy init ensures they're registered)
      let tools = await agentToolFramework.getAvailableTools(
        capability as string | undefined
      );
      
      // Apply search filter if provided
      if (search && typeof search === 'string') {
        const searchLower = search.toLowerCase();
        tools = tools.filter(tool => 
          tool.name.toLowerCase().includes(searchLower) ||
          tool.displayName?.toLowerCase().includes(searchLower) ||
          tool.description?.toLowerCase().includes(searchLower)
        );
      }
      
      // Group tools by capability for organized display
      const grouped: Record<string, typeof tools> = {};
      for (const tool of tools) {
        const cap = tool.capability || 'other';
        if (!grouped[cap]) {
          grouped[cap] = [];
        }
        grouped[cap].push(tool);
      }
      
      // Category metadata for display
      const categoryMeta: Record<string, { label: string; description: string }> = {
        file_system: { label: 'File Operations', description: 'Read, write, and manage files' },
        command_execution: { label: 'Shell Commands', description: 'Execute shell commands and scripts' },
        database: { label: 'Database', description: 'SQL queries and database operations' },
        git_operations: { label: 'Git', description: 'Version control operations' },
        package_management: { label: 'Package Management', description: 'NPM and dependency management' },
        testing: { label: 'Testing & Browser', description: 'Automated testing and browser automation' },
        deployment: { label: 'Deployment', description: 'Build and deploy applications' },
        monitoring: { label: 'Monitoring', description: 'Health checks and performance monitoring' },
        security: { label: 'Security', description: 'Security scans and vulnerability analysis' },
        api_integration: { label: 'API Integration', description: 'HTTP requests and web scraping' },
        ai_analysis: { label: 'AI Analysis', description: 'AI-powered code analysis' },
        ide_integration: { label: 'IDE Integration', description: 'Environment and IDE operations' }
      };
      
      res.json({
        tools: tools.map(t => ({
          id: t.id,
          name: t.name,
          displayName: t.displayName,
          description: t.description,
          capability: t.capability,
          version: t.version,
          isEnabled: t.isEnabled,
          requiresAuth: t.requiresAuth,
          inputSchema: t.inputSchema,
          configuration: t.configuration
        })),
        grouped,
        categories: categoryMeta,
        total: tools.length
      });
    } catch (error: any) {
      logger.error('Error fetching agent tools:', redactErrorForLog(error));
      res.status(500).json({ error: 'Failed to fetch agent tools' });
    }
  });

  /**
   * GET /api/agent/tools/status
   * Get status of all agent tools
   */
  router.get('/tools/status', async (req, res) => {
    try {
      const storage: IStorage = (req.app.locals as any).storage;
      const preferencesService = new AgentPreferencesService(storage);
      const userId = req.user!.id;
      const preferences = await preferencesService.getUserPreferences(userId);
      const highPowerModels = preferencesService.getHighPowerModels();
      const extendedThinkingModels = preferencesService.getExtendedThinkingModels();

      res.json({
        webSearch: {
          enabled: preferences?.autoWebSearch ?? true,
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
          enabled: preferences?.extendedThinking ?? false,
          status: 'operational',
          models: extendedThinkingModels
        },
        highPowerModels: {
          enabled: preferences?.highPowerMode ?? false,
          status: 'operational',
          models: highPowerModels
        },
        maxAutonomy: {
          enabled: true,
          status: 'operational',
          maxDuration: 240 // minutes
        },
        databaseProvisioning: {
          enabled: true,
          status: 'operational',
          types: ['postgresql']
        }
      });
    } catch (error: any) {
      logger.error('Error fetching tools status:', redactErrorForLog(error));
      res.status(500).json({ error: 'Failed to fetch tools status' });
    }
  });

  // ============================================
  // DATABASE PROVISIONING TOOL ENDPOINTS
  // ============================================

  // Helper for project ownership in agent tools
  async function checkAgentProjectAccess(req: any, res: any, projectId: number): Promise<boolean> {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return false;
    }
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return false;
    }
    const userId = typeof req.user.id === 'string' ? parseInt(req.user.id) : req.user.id;
    if (project.ownerId !== userId && !req.user.isAdmin) {
      res.status(403).json({ error: 'Not authorized' });
      return false;
    }
    return true;
  }

  /**
   * GET /api/agent/tools/database/:projectId
   * Get project database info for AI agent
   * REQUIRES: Authentication + Project ownership
   */
  router.get('/tools/database/:projectId', async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: 'Invalid project ID' });
      }

      if (!await checkAgentProjectAccess(req, res, projectId)) {
        return;
      }

      const { projectDatabaseService } = await import('../services/project-database-provisioning.service');
      const database = await projectDatabaseService.getProjectDatabase(projectId);

      if (!database) {
        return res.json({
          provisioned: false,
          message: 'No database provisioned. Use the provision-database tool to create one.'
        });
      }

      const stats = await projectDatabaseService.getDatabaseStats(projectId);

      res.json({
        provisioned: true,
        database: {
          name: database.name,
          type: database.type,
          status: database.status,
          plan: database.plan,
          region: database.region,
          host: database.host,
          port: database.port,
          databaseName: database.database,
          username: database.username,
          sslEnabled: database.sslEnabled,
          storageUsedMb: database.storageUsedMb,
          storageLimitMb: database.storageLimitMb
        },
        stats
      });
    } catch (error: any) {
      logger.error('Error fetching project database:', redactErrorForLog(error));
      res.status(500).json({ error: 'Failed to fetch project database' });
    }
  });

  /**
   * POST /api/agent/tools/database/:projectId/provision
   * Provision a new database for the project
   * REQUIRES: Authentication + Project ownership
   */
  router.post('/tools/database/:projectId/provision', async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: 'Invalid project ID' });
      }

      if (!await checkAgentProjectAccess(req, res, projectId)) {
        return;
      }

      const { plan = 'free', region = 'us-east-1' } = req.body;
      const { projectDatabaseService } = await import('../services/project-database-provisioning.service');
      
      const database = await projectDatabaseService.provisionDatabase(projectId, {
        plan,
        region
      });

      logger.info(`Agent provisioned database for project ${projectId}`);

      res.json({
        success: true,
        message: `Database provisioned successfully on ${plan} plan`,
        database: {
          name: database.name,
          type: database.type,
          status: database.status,
          host: database.host,
          port: database.port,
          databaseName: database.database,
          username: database.username
        }
      });
    } catch (error: any) {
      logger.error('Error provisioning database:', redactErrorForLog(error));
      res.status(500).json({ error: error.message || 'Failed to provision database' });
    }
  });

  /**
   * GET /api/agent/tools/database/:projectId/credentials
   * Get database credentials for agent to inject into code
   * REQUIRES: Authentication + Project ownership
   */
  router.get('/tools/database/:projectId/credentials', async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: 'Invalid project ID' });
      }

      if (!await checkAgentProjectAccess(req, res, projectId)) {
        return;
      }

      const { projectDatabaseService } = await import('../services/project-database-provisioning.service');
      const credentials = await projectDatabaseService.getCredentials(projectId);

      if (!credentials) {
        return res.status(404).json({ 
          error: 'No database provisioned',
          hint: 'Use the provision-database tool first'
        });
      }

      res.json({
        credentials: {
          connectionUrl: credentials.connectionUrl,
          host: credentials.host,
          port: credentials.port,
          database: credentials.database,
          databaseName: credentials.database,
          username: credentials.username,
          password: credentials.password,
          sslEnabled: credentials.sslEnabled
        },
        envVarName: 'DATABASE_URL',
        usage: 'Set DATABASE_URL environment variable or use the connection URL directly'
      });
    } catch (error: any) {
      logger.error('Error fetching database credentials:', redactErrorForLog(error));
      res.status(500).json({ error: 'Failed to fetch database credentials' });
    }
  });

  // ============================================
  // IMAGE GENERATION ENDPOINT
  // ============================================

  /**
   * Typed capability interface for providers that support image generation.
   * Using a type predicate avoids unsafe `any` casts in production route code.
   */
  interface ImageCapableProvider {
    generateImage(params: { prompt: string; width: number; height: number; style: string }): Promise<Record<string, unknown>>;
  }

  function hasImageGeneration(p: unknown): p is ImageCapableProvider {
    return (
      typeof p === 'object' &&
      p !== null &&
      'generateImage' in p &&
      typeof (p as Record<string, unknown>).generateImage === 'function'
    );
  }

  /**
   * POST /api/agent/tools/image-generation
   * Generate an image from a text prompt using the available AI provider.
   * Falls back gracefully when no vision-capable provider is configured.
   */
  router.post('/tools/image-generation', async (req, res) => {
    try {
      const { ImageGenerationRequestSchema } = await import('@shared/agent-types');
      const parsed = ImageGenerationRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: 'Invalid request', details: parsed.error.flatten() });
      }
      const { prompt, projectId: _projectId, conversationId: _conversationId, width = 1024, height = 1024, style = 'natural' } = parsed.data;

      // Attempt image generation via the AI provider manager
      const { aiProviderManager } = await import('../ai/ai-provider-manager');
      const provider = aiProviderManager.getProvider('openai') || aiProviderManager.getDefaultProvider();

      if (!hasImageGeneration(provider)) {
        return res.status(501).json({
          success: false,
          error: 'Image generation not available — configure an OpenAI provider with DALL-E access.',
        });
      }

      const result = await provider.generateImage({ prompt, width, height, style });
      res.json({ success: true, ...result });
    } catch (error: any) {
      logger.error('Image generation error:', redactErrorForLog(error));
      res.status(500).json({ success: false, error: 'Image generation failed' });
    }
  });

  // ============================================
  // REPLIT.MD UPDATE ENDPOINT
  // ============================================

  /**
   * POST /api/agent/tools/replit-md
   * Update the project's replit.md file.
   * The Agent calls this when it learns something new about the project
   * that should persist across sessions (architecture, preferences, etc.).
   * REQUIRES: Authentication + Project ownership enforced by checkAgentProjectAccess.
   */
  router.post('/tools/replit-md', async (req, res) => {
    try {
      const { UpdateReplitMdRequestSchema } = await import('@shared/agent-types');
      const parsed = UpdateReplitMdRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: 'Invalid request', details: parsed.error.flatten() });
      }
      const { projectId, content, reason } = parsed.data;
      const projectIdNum = Number(projectId);
      if (isNaN(projectIdNum) || !Number.isFinite(projectIdNum) || projectIdNum <= 0) {
        return res.status(400).json({ success: false, error: 'Invalid project ID — must be a positive integer' });
      }

      if (!await checkAgentProjectAccess(req, res, projectIdNum)) {
        return;
      }

      const { getProjectWorkspacePath } = await import('../utils/project-fs-sync');
      const workspacePath = await getProjectWorkspacePath(projectIdNum);
      if (!workspacePath) {
        return res.status(404).json({ success: false, error: 'Project workspace not found' });
      }

      const { promises: fs } = await import('fs');
      const path = await import('path');
      const replitMdPath = path.join(workspacePath, 'replit.md');

      await fs.writeFile(replitMdPath, content, 'utf-8');
      logger.info(`[AgentTools] replit.md updated for project ${projectIdNum}${reason ? ` (reason: ${reason})` : ''}`);

      res.json({ success: true, path: 'replit.md', bytesWritten: Buffer.byteLength(content) });
    } catch (error: any) {
      logger.error('replit.md update error:', redactErrorForLog(error));
      res.status(500).json({ success: false, error: 'Failed to update replit.md' });
    }
  });

  /**
   * GET /api/agent/tools/replit-md/:projectId
   * Read the current replit.md content so the agent can include it in context.
   * REQUIRES: Authentication + Project ownership enforced by checkAgentProjectAccess.
   */
  router.get('/tools/replit-md/:projectId', async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      if (isNaN(projectId)) {
        return res.status(400).json({ success: false, error: 'Invalid project ID' });
      }

      if (!await checkAgentProjectAccess(req, res, projectId)) {
        return;
      }

      const { getProjectWorkspacePath } = await import('../utils/project-fs-sync');
      const workspacePath = await getProjectWorkspacePath(projectId);
      if (!workspacePath) {
        return res.status(404).json({ success: false, error: 'Project workspace not found' });
      }

      const { promises: fs } = await import('fs');
      const path = await import('path');
      const replitMdPath = path.join(workspacePath, 'replit.md');

      try {
        const content = await fs.readFile(replitMdPath, 'utf-8');
        res.json({ success: true, content, path: 'replit.md', size: Buffer.byteLength(content) });
      } catch {
        res.json({ success: true, content: '', path: 'replit.md', size: 0, exists: false });
      }
    } catch (error: any) {
      logger.error('replit.md read error:', redactErrorForLog(error));
      res.status(500).json({ success: false, error: 'Failed to read replit.md' });
    }
  });

  return router;
}
