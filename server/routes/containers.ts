import { Router } from 'express';
import { orchestrator } from '../kubernetes/orchestrator';
import { createLogger } from '../utils/logger';
import { ensureAuthenticated } from '../middleware/auth';

const router = Router();
const logger = createLogger('container-routes');

/**
 * Create isolated container environment for a project
 */
router.post('/api/projects/:projectId/container', ensureAuthenticated, async (req, res) => {
  const { projectId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    logger.info(`Creating container environment for project ${projectId} by user ${userId}`);
    
    const environment = await orchestrator.createProjectEnvironment(userId, projectId);
    
    res.json({
      success: true,
      environment: {
        namespace: environment.namespace,
        url: `https://${projectId}.e-code.app`,
        resources: environment.resources,
        status: 'creating'
      }
    });
  } catch (error: any) {
    logger.error(`Failed to create container for project ${projectId}:`, error);
    res.status(500).json({ 
      error: 'Failed to create container environment',
      details: error.message 
    });
  }
});

/**
 * Get container status for a project
 */
router.get('/api/projects/:projectId/container/status', ensureAuthenticated, async (req, res) => {
  const { projectId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const status = await orchestrator.getProjectStatus(userId, projectId);
    
    res.json({
      success: true,
      status: {
        ...status,
        url: `https://${projectId}.e-code.app`,
        accessible: status.deployment.ready
      }
    });
  } catch (error: any) {
    logger.error(`Failed to get container status for project ${projectId}:`, error);
    
    if (error.response?.statusCode === 404) {
      res.status(404).json({ 
        error: 'Container environment not found',
        needsCreation: true 
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to get container status',
        details: error.message 
      });
    }
  }
});

/**
 * Delete container environment for a project
 */
router.delete('/api/projects/:projectId/container', ensureAuthenticated, async (req, res) => {
  const { projectId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    logger.info(`Deleting container environment for project ${projectId}`);
    
    await orchestrator.deleteProjectEnvironment(userId, projectId);
    
    res.json({
      success: true,
      message: 'Container environment deleted successfully'
    });
  } catch (error: any) {
    logger.error(`Failed to delete container for project ${projectId}:`, error);
    res.status(500).json({ 
      error: 'Failed to delete container environment',
      details: error.message 
    });
  }
});

/**
 * Execute command in project container
 */
router.post('/api/projects/:projectId/container/exec', ensureAuthenticated, async (req, res) => {
  const { projectId } = req.params;
  const { command } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!command || !Array.isArray(command)) {
    return res.status(400).json({ error: 'Invalid command format' });
  }

  try {
    const output = await orchestrator.executeInContainer(userId, projectId, command);
    
    res.json({
      success: true,
      output
    });
  } catch (error: any) {
    logger.error(`Failed to execute command in project ${projectId}:`, error);
    res.status(500).json({ 
      error: 'Failed to execute command',
      details: error.message 
    });
  }
});

/**
 * Stop container for a project
 */
router.post('/api/projects/:projectId/container/stop', ensureAuthenticated, async (req, res) => {
  const { projectId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    logger.info(`Stopping container for project ${projectId}`);
    
    // Scale down deployment to 0 replicas
    await orchestrator.scaleDeployment(userId, projectId, 0);
    
    res.json({
      success: true,
      message: 'Container stopped successfully'
    });
  } catch (error: any) {
    logger.error(`Failed to stop container for project ${projectId}:`, error);
    res.status(500).json({ 
      error: 'Failed to stop container',
      details: error.message 
    });
  }
});

/**
 * Get container logs
 */
router.get('/api/projects/:projectId/container/logs', ensureAuthenticated, async (req, res) => {
  const { projectId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const logs = await orchestrator.getContainerLogs(userId, projectId);
    
    res.json({
      success: true,
      logs: logs.split('\n').filter(line => line.trim())
    });
  } catch (error: any) {
    logger.error(`Failed to get container logs for project ${projectId}:`, error);
    res.status(500).json({ 
      error: 'Failed to get container logs',
      details: error.message 
    });
  }
});

/**
 * Restart container for a project
 */
router.post('/api/projects/:projectId/container/restart', ensureAuthenticated, async (req, res) => {
  const { projectId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    logger.info(`Restarting container for project ${projectId}`);
    
    // Delete and recreate for a full restart
    await orchestrator.deleteProjectEnvironment(userId, projectId);
    const environment = await orchestrator.createProjectEnvironment(userId, projectId);
    
    res.json({
      success: true,
      message: 'Container restarted successfully',
      environment: {
        namespace: environment.namespace,
        url: `https://${projectId}.e-code.app`,
        resources: environment.resources
      }
    });
  } catch (error: any) {
    logger.error(`Failed to restart container for project ${projectId}:`, error);
    res.status(500).json({ 
      error: 'Failed to restart container',
      details: error.message 
    });
  }
});

export default router;