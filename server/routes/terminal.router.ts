import { Router } from 'express';
import { ensureAuthenticated } from '../middleware/auth';
import { storage } from '../storage';

const router = Router();

// In-memory logs storage (could be moved to database or Redis for persistence)
interface TerminalLog {
  id: number;
  type: 'info' | 'error' | 'warn' | 'log' | 'debug';
  message: string;
  timestamp: Date;
  stack?: string;
}

const terminalLogs = new Map<number, TerminalLog[]>();

/**
 * GET /api/terminal/logs
 * Fetch initial console logs for a project
 */
router.get('/api/terminal/logs', ensureAuthenticated, async (req, res) => {
  try {
    const projectIdParam = req.query.projectId;
    
    if (!projectIdParam) {
      return res.status(400).json({ error: 'Project ID is required' });
    }
    
    const projectId = parseInt(projectIdParam as string);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }
    
    // Check project access
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const project = await storage.getProject(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Check access permissions
    if (project.ownerId !== userId) {
      const collaborators = await storage.getProjectCollaborators(projectId);
      const isCollaborator = collaborators.some((c: any) => c.userId === userId);
      
      if (!isCollaborator) {
        return res.status(403).json({ error: "You don't have access to this project" });
      }
    }
    
    // Get logs for the project (or return empty array if none exist)
    const logs = terminalLogs.get(projectId) || [];
    
    res.json(logs);
  } catch (error) {
    console.error('Error fetching terminal logs:', error);
    res.status(500).json({ error: 'Failed to fetch terminal logs' });
  }
});

/**
 * POST /api/terminal/logs
 * Add a log entry (called by runtime execution)
 */
router.post('/api/terminal/logs', ensureAuthenticated, async (req, res) => {
  try {
    const { projectId, type, message, stack } = req.body;
    
    if (!projectId || !type || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check project access
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const project = await storage.getProject(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Check access permissions
    if (project.ownerId !== userId) {
      const collaborators = await storage.getProjectCollaborators(projectId);
      const isCollaborator = collaborators.some((c: any) => c.userId === userId);
      
      if (!isCollaborator) {
        return res.status(403).json({ error: "You don't have access to this project" });
      }
    }
    
    // Get or create logs array for project
    if (!terminalLogs.has(projectId)) {
      terminalLogs.set(projectId, []);
    }
    
    const logs = terminalLogs.get(projectId)!;
    const newLog: TerminalLog = {
      id: Date.now(),
      type,
      message,
      timestamp: new Date(),
      stack
    };
    
    logs.push(newLog);
    
    // Keep only last 1000 logs per project to prevent memory issues
    if (logs.length > 1000) {
      logs.shift();
    }
    
    res.json({ success: true, log: newLog });
  } catch (error) {
    console.error('Error adding terminal log:', error);
    res.status(500).json({ error: 'Failed to add terminal log' });
  }
});

/**
 * DELETE /api/terminal/logs
 * Clear logs for a project
 */
router.delete('/api/terminal/logs', ensureAuthenticated, async (req, res) => {
  try {
    const projectIdParam = req.query.projectId;
    
    if (!projectIdParam) {
      return res.status(400).json({ error: 'Project ID is required' });
    }
    
    const projectId = parseInt(projectIdParam as string);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }
    
    // Check project access
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const project = await storage.getProject(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Check access permissions
    if (project.ownerId !== userId) {
      const collaborators = await storage.getProjectCollaborators(projectId);
      const isCollaborator = collaborators.some((c: any) => c.userId === userId);
      
      if (!isCollaborator) {
        return res.status(403).json({ error: "You don't have access to this project" });
      }
    }
    
    // Clear logs
    terminalLogs.delete(projectId);
    
    res.json({ success: true, message: 'Logs cleared' });
  } catch (error) {
    console.error('Error clearing terminal logs:', error);
    res.status(500).json({ error: 'Failed to clear terminal logs' });
  }
});

export default router;
export { terminalLogs };
