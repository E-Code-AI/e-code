import express from 'express';
import { ensureAuthenticated } from '../middleware/auth';
import { aiProviderManager } from '../ai/ai-provider-manager';
import { getStorage } from '../storage';

const router = express.Router();

/**
 * GET /api/models/health
 * Health check endpoint - returns provider status (no auth required)
 */
router.get('/health', (req, res) => {
  try {
    const models = aiProviderManager.getAvailableModels();
    const providerStats = models.reduce((acc, model) => {
      acc[model.provider] = (acc[model.provider] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      success: true,
      status: 'healthy',
      providers: Object.keys(providerStats).length,
      totalModels: models.length,
      providerStats,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[AI Models] Health check error:', error);
    res.status(500).json({ 
      success: false,
      status: 'unhealthy',
      error: error.message 
    });
  }
});

/**
 * GET /api/models
 * Get all available AI models across providers (public endpoint)
 */
router.get('/', (req, res) => {
  try {
    const models = aiProviderManager.getAvailableModels();
    res.json({
      success: true,
      models,
      count: models.length
    });
  } catch (error: any) {
    console.error('[AI Models] Error getting models:', error);
    res.status(500).json({ error: error.message || 'Failed to get models' });
  }
});

/**
 * GET /api/models/preferred
 * Get user's preferred AI model
 */
router.get('/preferred', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id.toString();
    const storage = getStorage();
    
    // Get user's preferred model from database
    const user = await storage.getUser(userId);
    
    // Smart fallback: Use first available model if user has no preference
    let preferredModel = user?.preferredAiModel;
    if (!preferredModel) {
      const availableModels = aiProviderManager.getAvailableModels();
      preferredModel = availableModels.length > 0 ? availableModels[0].id : null;
    }
    
    res.json({
      success: true,
      preferredModel,
      availableModels: aiProviderManager.getAvailableModels().length
    });
  } catch (error: any) {
    console.error('[AI Models] Error getting preferred model:', error);
    res.status(500).json({ error: error.message || 'Failed to get preferred model' });
  }
});

/**
 * POST /api/models/preferred
 * Set user's preferred AI model
 */
router.post('/preferred', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id.toString();
    const { modelId } = req.body;
    
    if (!modelId) {
      return res.status(400).json({ error: 'modelId is required' });
    }
    
    // Validate model exists
    const model = aiProviderManager.getAvailableModels().find(m => m.id === modelId);
    if (!model) {
      return res.status(400).json({ error: `Invalid model: ${modelId}` });
    }
    
    const storage = getStorage();
    
    // Update user's preferred model
    await storage.updateUser(userId, {
      preferredAiModel: modelId
    });
    
    res.json({
      success: true,
      preferredModel: modelId,
      model: {
        id: model.id,
        name: model.name,
        provider: model.provider,
        description: model.description
      }
    });
  } catch (error: any) {
    console.error('[AI Models] Error setting preferred model:', error);
    res.status(500).json({ error: error.message || 'Failed to set preferred model' });
  }
});

export default router;
