/**
 * shell.router.ts — per-project shell REST API.
 *
 * Uses the UNIFIED shellSessions Map exported from shell.ts as the single
 * source of truth. No separate session store or Socket.IO transport is used.
 */
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { bootstrapAuth, getBootstrapContext } from '../middleware/bootstrap-auth';
import { storage } from '../storage';
import { shellSessions, destroySession } from './shell';
import { createLogger } from '../utils/logger';
import { redactErrorForLog } from '../utils/error-redaction';

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
    logger.error('Failed to verify project access:', redactErrorForLog(error));
    return false;
  }
}

function getEffectiveUserId(req: any): number | null {
  const sessionUserId = req.user?.id;
  if (Number.isInteger(sessionUserId)) return sessionUserId;
  const bootstrapUserId = getBootstrapContext(req)?.userId;
  return Number.isInteger(bootstrapUserId) ? bootstrapUserId : null;
}

function hasValidBootstrapProject(req: any, projectId: string | number): boolean {
  const bootstrapProjectId = getBootstrapContext(req)?.projectId;
  return bootstrapProjectId == null || String(bootstrapProjectId) === String(projectId);
}

// POST /:projectId/shell/create — issue a backend-generated session ID.
// The actual PTY is spawned lazily on the first WebSocket connection (shell.ts).
router.post('/:projectId/shell/create', bootstrapAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = getEffectiveUserId(req);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication or bootstrap token required' });
    }

    if (!hasValidBootstrapProject(req, projectId)) {
      return res.status(403).json({ error: 'Bootstrap token invalid for this project' });
    }

    const hasAccess = await verifyProjectAccess(userId, projectId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }

    // Server-issued ID — never accepts or generates client-side random IDs
    const sessionId = `shell-${projectId}-${Date.now()}-${uuidv4().slice(0, 8)}`;

    logger.info('Created shell session token', { sessionId, projectId, userId });

    res.json({
      sessionId,
      projectId,
      createdAt: new Date(),
    });
  } catch (error: any) {
    logger.error('Failed to create shell session:', redactErrorForLog(error));
    res.status(500).json({ error: error.message || 'Failed to create shell session' });
  }
});

// GET /:projectId/shell/sessions — list active sessions from unified store.
router.get('/:projectId/shell/sessions', bootstrapAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = getEffectiveUserId(req);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication or bootstrap token required' });
    }

    if (!hasValidBootstrapProject(req, projectId)) {
      return res.status(403).json({ error: 'Bootstrap token invalid for this project' });
    }

    const hasAccess = await verifyProjectAccess(userId, projectId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }

    const sessions = Array.from(shellSessions.values())
      .filter(s => s.userId === userId && s.projectId === String(projectId))
      .map(s => ({
        id: s.id,
        sessionId: s.id,
        createdAt: s.created,
        lastActivity: s.lastActivity,
        status: s.clients.size > 0 ? 'connected' : 'idle',
        connectedClients: s.clients.size,
        cwd: s.cwd,
      }));

    res.json({ sessions });
  } catch (error: any) {
    logger.error('Failed to get shell sessions:', redactErrorForLog(error));
    res.status(500).json({ error: error.message || 'Failed to get sessions' });
  }
});

// DELETE /:projectId/shell/:sessionId — destroy session from unified store.
router.delete('/:projectId/shell/:sessionId', bootstrapAuth, async (req, res) => {
  try {
    const { projectId, sessionId } = req.params;
    const userId = getEffectiveUserId(req);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication or bootstrap token required' });
    }

    if (!hasValidBootstrapProject(req, projectId)) {
      return res.status(403).json({ error: 'Bootstrap token invalid for this project' });
    }

    const hasAccess = await verifyProjectAccess(userId, projectId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }

    const session = shellSessions.get(sessionId);
    if (!session || session.userId !== userId) {
      return res.status(404).json({ error: 'Session not found' });
    }
    if (session.projectId !== null && session.projectId !== String(projectId)) {
      return res.status(403).json({ error: 'Session does not belong to this project' });
    }

    destroySession(sessionId);
    logger.info('Closed shell session', { sessionId, projectId, userId });

    res.json({ success: true, message: 'Session closed' });
  } catch (error: any) {
    logger.error('Failed to close shell session:', redactErrorForLog(error));
    res.status(500).json({ error: error.message || 'Failed to close session' });
  }
});

// GET /:projectId/shell/:sessionId/status — live status from unified store.
router.get('/:projectId/shell/:sessionId/status', bootstrapAuth, async (req, res) => {
  try {
    const { projectId, sessionId } = req.params;
    const userId = getEffectiveUserId(req);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication or bootstrap token required' });
    }

    if (!hasValidBootstrapProject(req, projectId)) {
      return res.status(403).json({ error: 'Bootstrap token invalid for this project' });
    }

    const hasAccess = await verifyProjectAccess(userId, projectId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }

    const session = shellSessions.get(sessionId);
    if (!session || session.userId !== userId) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      sessionId: session.id,
      status: session.clients.size > 0 ? 'connected' : 'idle',
      createdAt: session.created,
      lastActivity: session.lastActivity,
      connectedClients: session.clients.size,
      cwd: session.cwd,
      projectId: session.projectId,
    });
  } catch (error: any) {
    logger.error('Failed to get session status:', redactErrorForLog(error));
    res.status(500).json({ error: error.message || 'Failed to get session status' });
  }
});

export default router;
