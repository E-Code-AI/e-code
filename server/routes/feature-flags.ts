import { Router, Request, Response } from 'express';
import { ServerFeatureFlagService } from '../services/feature-flag-service';
import { FeatureFlags } from '../../shared/feature-flags';

const router = Router();
const featureFlagService = ServerFeatureFlagService.getInstance();

// Get user feature flags
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const userFlags = await featureFlagService.getUserFlags(userId);
    const flags = userFlags.getFlags();
    
    res.json(flags);
  } catch (error) {
    console.error('Error fetching user feature flags:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user feature flags
router.put('/:userId', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    // Check if user can access labs features
    const canAccessLabs = await featureFlagService.canAccessLabsFeatures(userId);
    if (!canAccessLabs) {
      return res.status(403).json({ error: 'Insufficient permissions to modify feature flags' });
    }
    
    const newFlags: Partial<FeatureFlags> = req.body;
    
    // Validate the flags structure
    if (!isValidFeatureFlags(newFlags)) {
      return res.status(400).json({ error: 'Invalid feature flags structure' });
    }
    
    await featureFlagService.updateUserFlags(userId, newFlags);
    
    // Return updated flags
    const updatedFlags = await featureFlagService.getUserFlags(userId);
    res.json(updatedFlags.getFlags());
  } catch (error) {
    console.error('Error updating user feature flags:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check specific feature flag
router.get('/:userId/check/:flagPath(*)', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const flagPath = req.params.flagPath;
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const isEnabled = await featureFlagService.isUserFlagEnabled(userId, flagPath);
    
    res.json({ enabled: isEnabled });
  } catch (error) {
    console.error('Error checking feature flag:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get global feature flags (not user-specific)
router.get('/global/flags', async (req: Request, res: Response) => {
  try {
    const globalFlags = featureFlagService.getGlobalFlags();
    res.json(globalFlags.getFlags());
  } catch (error) {
    console.error('Error fetching global feature flags:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin endpoint to clear user cache
router.delete('/:userId/cache', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    // TODO: Add admin permission check
    
    featureFlagService.clearUserCache(userId);
    
    res.json({ message: 'User cache cleared successfully' });
  } catch (error) {
    console.error('Error clearing user cache:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Validation function for feature flags
function isValidFeatureFlags(flags: any): flags is Partial<FeatureFlags> {
  if (!flags || typeof flags !== 'object') {
    return false;
  }
  
  // Check structure - allow partial updates
  const validSections = ['aiUx', 'import', 'labs'];
  
  for (const key in flags) {
    if (!validSections.includes(key)) {
      return false;
    }
    
    if (typeof flags[key] !== 'object') {
      return false;
    }
    
    // Check that all values in sections are booleans
    for (const subKey in flags[key]) {
      if (typeof flags[key][subKey] !== 'boolean') {
        return false;
      }
    }
  }
  
  return true;
}

export default router;