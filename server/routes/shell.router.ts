import { Router } from 'express';
import { ensureAuthenticated } from '../middleware/auth';
import { storage } from '../storage';
import { createLogger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { socketIOTerminalService } from '../terminal/socket-io-terminal';

const router = Router();
const logger = createLogger('shell-router-per-project');

async function verifyProjectAccess(userId: number, projectId: string | number): Promise<boolean> {
  try {
    const project = await storage.getProject(projectId);
    if (!project) return false;
    
    if (project.ownerId === userId) return true;
    
    const collaborators = await storage.getProjectCollaborators(projectId);
    return collaborators.some((c: any) => c.userId === userId);
  } catch (error) {
    logger.error('Failed to verify project access:', error);
    return false;
  }
}

router.post('/:projectId/shell/create', ensureAuthenticated, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const hasAccess = await verifyProjectAccess(userId, projectId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }

    const sessionId = `shell-${projectId}-${Date.now()}-${uuidv4().slice(0, 8)}`;
    
    logger.info('Created shell session', { sessionId, projectId, userId });

    res.json({ 
      sessionId,
      projectId,
      createdAt: new Date(),
    });
  } catch (error: any) {
    logger.error('Failed to create shell session:', error);
    res.status(500).json({ error: error.message || 'Failed to create shell session' });
  }
});

router.get('/:projectId/shell/sessions', ensureAuthenticated, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const hasAccess = await verifyProjectAccess(userId, projectId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }

    const sessions = socketIOTerminalService.listSessions(String(projectId), String(userId)).map((session) => ({
      id: session.sessionId,
      sessionId: session.sessionId,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      status: session.status,
      connectedClients: session.connectedClients,
      cols: session.cols,
      rows: session.rows,
    }));

    res.json({ sessions });
  } catch (error: any) {
    logger.error('Failed to get shell sessions:', error);
    res.status(500).json({ error: error.message || 'Failed to get sessions' });
  }
});

router.delete('/:projectId/shell/:sessionId', ensureAuthenticated, async (req, res) => {
  try {
    const { projectId, sessionId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const hasAccess = await verifyProjectAccess(userId, projectId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }

    const closed = socketIOTerminalService.closeSession(String(projectId), String(userId), sessionId);

    if (!closed) {
      return res.status(404).json({ error: 'Session not found' });
    }

    logger.info('Closed shell session', { sessionId, projectId, userId });

    res.json({ success: true, message: 'Session closed' });
  } catch (error: any) {
    logger.error('Failed to close shell session:', error);
    res.status(500).json({ error: error.message || 'Failed to close session' });
  }
});

router.get('/:projectId/shell/:sessionId/status', ensureAuthenticated, async (req, res) => {
  try {
    const { projectId, sessionId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const hasAccess = await verifyProjectAccess(userId, projectId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }

    const session = socketIOTerminalService.getSession(String(projectId), String(userId), sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      sessionId: session.sessionId,
      status: session.status,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      connectedClients: session.connectedClients,
      cols: session.cols,
      rows: session.rows,
    });
  } catch (error: any) {
    logger.error('Failed to get session status:', error);
    res.status(500).json({ error: error.message || 'Failed to get session status' });
  }
});

export default router;
