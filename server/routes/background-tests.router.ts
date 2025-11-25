import { Router } from 'express';
import { backgroundTestingService } from '../services/background-testing-service';
import { ensureAuthenticated } from '../middleware/auth';
import type { Request, Response } from 'express';

const router = Router();

// Schedule a background test for a project
router.post('/schedule', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const { projectId, changedFiles } = req.body;
    
    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }
    
    if (!changedFiles || !Array.isArray(changedFiles)) {
      return res.status(400).json({ error: 'changedFiles must be an array' });
    }
    
    // Schedule the test
    await backgroundTestingService.scheduleTest(projectId, changedFiles);
    
    res.json({ 
      success: true, 
      message: 'Test scheduled successfully',
      projectId 
    });
  } catch (error: any) {
    console.error('[BackgroundTests] Error scheduling test:', error);
    res.status(500).json({ error: error.message || 'Failed to schedule test' });
  }
});

// Get test status for a project
router.get('/status/:projectId', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid projectId' });
    }
    
    const status = backgroundTestingService.getTestStatus(projectId);
    
    if (!status) {
      return res.status(404).json({ error: 'No test found for this project' });
    }
    
    res.json(status);
  } catch (error: any) {
    console.error('[BackgroundTests] Error getting test status:', error);
    res.status(500).json({ error: error.message || 'Failed to get test status' });
  }
});

// Get all tests (admin/debug endpoint)
router.get('/all', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const allTests = backgroundTestingService.getAllTests();
    res.json(allTests);
  } catch (error: any) {
    console.error('[BackgroundTests] Error getting all tests:', error);
    res.status(500).json({ error: error.message || 'Failed to get all tests' });
  }
});

export default router;
