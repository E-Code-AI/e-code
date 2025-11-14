/**
 * Feature Flags Router
 * Provides runtime feature toggles for AI Agent functionality
 */

import { Router, Request, Response } from 'express';
import { createLogger } from '../utils/logger';

const logger = createLogger('FeatureFlagsRouter');
const router = Router();

/**
 * GET /api/feature-flags
 * Returns enabled feature flags for the current session
 * 
 * Note: These are runtime flags for gradual rollout of experimental features.
 * All flags default to 'false' unless explicitly enabled.
 */
router.get('/api/feature-flags', async (req: Request, res: Response) => {
  try {
    // Default feature flags (all disabled for stability)
    const flags = {
      // Agent AI Features
      extendedThinkingEnabled: false,  // Multi-step reasoning (experimental)
      highPowerModeEnabled: false,     // Use most powerful models (higher cost)
      autoCheckpointsEnabled: true,    // Auto-save checkpoints during builds
      autoApprovePlansEnabled: false,  // Skip manual plan approval (risky)
      
      // UI Features
      improvePromptEnabled: false,     // AI-powered prompt enhancement
      progressTabEnabled: true,        // Show detailed build progress
      pauseResumeEnabled: true,        // Pause/resume agent builds
      
      // Integration Features
      webImportEnabled: true,          // Import designs from URLs
      screenshotToolEnabled: true,     // Generate screenshots
      
      // Experimental Features
      voiceInputEnabled: false,        // Voice-to-text (browser support varies)
      collaborationEnabled: false,     // Multi-user real-time editing
      aiModelSwitchingEnabled: true,   // Switch AI models mid-session
      
      // Performance Features
      streamingResponsesEnabled: true, // SSE streaming for real-time feedback
      parallelTasksEnabled: false,     // Execute multiple tasks concurrently (experimental)
    };

    res.json(flags);
  } catch (error: any) {
    logger.error('Error fetching feature flags', { error: error.message });
    
    // Return safe defaults even on error
    res.json({
      extendedThinkingEnabled: false,
      highPowerModeEnabled: false,
      autoCheckpointsEnabled: true,
      streamingResponsesEnabled: true,
    });
  }
});

export default router;
