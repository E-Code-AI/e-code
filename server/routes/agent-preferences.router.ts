import { Router } from 'express';
import { ensureAuthenticated } from '../middleware/auth';
import { AgentPreferencesService } from '../services/agent-preferences.service';
import { AI_MODELS } from '@shared/schema';
import type { IStorage } from '../storage';

/**
 * Agent Preferences Router Factory
 * User-facing routes for managing AI agent preferences
 * Mounted at /api/agent
 */
export default function createAgentPreferencesRouter(storage: IStorage): Router {
  const router = Router();

  // All routes require authentication
  router.use(ensureAuthenticated);

  // GET /api/agent/models - Get available AI models
  router.get('/models', async (req, res) => {
    try {
      const preferencesService = new AgentPreferencesService(storage);
      const models = preferencesService.getAvailableModels();
      res.json({ models });
    } catch (error: any) {
      console.error('[AgentPreferencesRouter] Error fetching models:', error);
      res.status(500).json({ error: 'Failed to fetch models' });
    }
  });

  // GET /api/agent/preferences - Get user agent preferences
  router.get('/preferences', async (req, res) => {
    try {
      const userId = req.user!.id;
      const preferencesService = new AgentPreferencesService(storage);
      
      const preferences = await preferencesService.getUserPreferences(userId);
      
      // Return defaults if no preferences found
      if (!preferences) {
        return res.json({
          extendedThinking: false,
          highPowerMode: false,
          autoWebSearch: true,
          preferredModel: 'claude-3-5-sonnet-20241022',
          customInstructions: null,
          improvePromptEnabled: false,
          progressTabEnabled: false,
          pauseResumeEnabled: false,
          autoCheckpoints: true,
        });
      }

      res.json(preferences);
    } catch (error: any) {
      console.error('[AgentPreferencesRouter] Error fetching preferences:', error);
      res.status(500).json({ error: 'Failed to fetch preferences' });
    }
  });

  // PUT /api/agent/preferences - Update user agent preferences
  router.put('/preferences', async (req, res) => {
    try {
      const userId = req.user!.id;
      const preferencesService = new AgentPreferencesService(storage);
      const updates = req.body;

      console.log('[AgentPreferencesRouter] Updating preferences for user', userId, 'with', updates);

      // Validate model if provided
      if (updates.preferredModel && !AI_MODELS.includes(updates.preferredModel)) {
        return res.status(400).json({
          error: `Invalid model: ${updates.preferredModel}`,
          validModels: AI_MODELS,
        });
      }

      const updated = await preferencesService.updateUserPreferences(userId, updates);
      console.log('[AgentPreferencesRouter] Preferences updated successfully:', updated);
      res.json(updated);
    } catch (error: any) {
      console.error('[AgentPreferencesRouter] Error updating preferences:', error);
      res.status(500).json({ error: error.message || 'Failed to update preferences' });
    }
  });

  // POST /api/agent/recommend-model - Get model recommendation
  router.post('/recommend-model', async (req, res) => {
    try {
      const preferencesService = new AgentPreferencesService(storage);
      const { requiresExtendedThinking, complexity, speedPriority } = req.body;

      const recommended = preferencesService.getRecommendedModel({
        requiresExtendedThinking,
        complexity,
        speedPriority,
      });

      const models = preferencesService.getAvailableModels();
      const modelInfo = models.find(m => m.id === recommended);

      res.json({
        recommended,
        modelInfo,
        reasoning: `Selected ${recommended} based on: complexity=${complexity || 'medium'}, speedPriority=${speedPriority || 'balanced'}, extendedThinking=${requiresExtendedThinking || false}`,
      });
    } catch (error: any) {
      console.error('[AgentPreferencesRouter] Error recommending model:', error);
      res.status(500).json({ error: 'Failed to recommend model' });
    }
  });

  // POST /api/agent/conversation - Create or get conversation for project
  router.post('/conversation', async (req, res) => {
    try {
      const { projectId, initialPrompt } = req.body;
      const userId = req.user!.id;

      const { aiConversations } = await import('@shared/schema');
      const { eq, and, desc } = await import('drizzle-orm');
      const { db } = await import('../db');

      // If projectId provided, try to find existing conversation
      if (projectId) {
        const existingConversation = await db
          .select()
          .from(aiConversations)
          .where(
            and(
              eq(aiConversations.userId, userId),
              eq(aiConversations.projectId, projectId)
            )
          )
          .orderBy(desc(aiConversations.createdAt))
          .limit(1);

        if (existingConversation.length > 0) {
          return res.json(existingConversation[0]);
        }
      }

      // Create new conversation
      const newConversation = await db
        .insert(aiConversations)
        .values({
          userId: String(userId),
          projectId: String(projectId || 0),
          messages: [],
          model: 'claude-3-5-sonnet-20241022',
          agentMode: 'build',
        })
        .returning();

      res.json(newConversation[0]);
    } catch (error: any) {
      console.error('[AgentPreferencesRouter] Error managing conversation:', error);
      res.status(500).json({ error: 'Failed to manage conversation' });
    }
  });

  return router;
}
