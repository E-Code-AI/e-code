/**
 * Autonomous Mode API Routes
 * 
 * Endpoints for controlling autonomous agent execution:
 * - Enable/disable autonomous mode
 * - Get autonomous actions
 * - Generate execution plans
 * - Configure risk thresholds
 */

import { Router, Request, Response, NextFunction } from 'express';
import { autonomousEngine } from '../services/agent-autonomous-engine.service';
import { ensureAuthenticated } from '../middleware/auth';
import { ensureAdmin } from '../middleware/admin-auth';
import { createLogger } from '../utils/logger';
import { db } from '../db';
import { agentSessions } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

const router = Router();
const logger = createLogger('AutonomousRouter');

// All routes require authentication
router.use(ensureAuthenticated);

/**
 * Middleware to verify session ownership
 * Loads the agent session and verifies it belongs to the authenticated user
 */
async function ensureSessionOwnership(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionId = req.body.sessionId || req.params.sessionId;
    const userId = req.user!.id;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    // Query session with ownership check
    const [session] = await db
      .select()
      .from(agentSessions)
      .where(and(
        eq(agentSessions.id, sessionId),
        eq(agentSessions.userId, userId)
      ))
      .limit(1);

    if (!session) {
      logger.warn(`Session ownership check failed: sessionId=${sessionId}, userId=${userId}`);
      return res.status(404).json({ error: 'Session not found or access denied' });
    }

    // Attach verified session to request for downstream use
    (req as any).agentSession = session;
    next();
  } catch (error: any) {
    logger.error('Error in session ownership check:', error);
    res.status(500).json({ error: 'Failed to verify session ownership' });
  }
}

/**
 * POST /api/agent/autonomous/enable
 * Enable autonomous mode for a session
 */
router.post('/enable', ensureSessionOwnership, async (req, res) => {
  try {
    const { sessionId, riskThreshold = 'medium' } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }
    
    const validThresholds = ['low', 'medium', 'high', 'critical'];
    if (!validThresholds.includes(riskThreshold)) {
      return res.status(400).json({ 
        error: 'Invalid risk threshold',
        validValues: validThresholds
      });
    }
    
    await autonomousEngine.enableAutonomousMode(sessionId, riskThreshold);
    
    logger.info(`Autonomous mode enabled for session ${sessionId} by user ${req.user?.id}`);
    
    res.json({
      success: true,
      sessionId,
      autonomousMode: true,
      riskThreshold,
      message: `Autonomous mode enabled with ${riskThreshold} risk threshold`
    });
  } catch (error: any) {
    logger.error('Error enabling autonomous mode:', error);
    res.status(500).json({ error: error.message || 'Failed to enable autonomous mode' });
  }
});

/**
 * POST /api/agent/autonomous/disable
 * Disable autonomous mode for a session
 */
router.post('/disable', ensureSessionOwnership, async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }
    
    await autonomousEngine.disableAutonomousMode(sessionId);
    
    logger.info(`Autonomous mode disabled for session ${sessionId} by user ${req.user?.id}`);
    
    res.json({
      success: true,
      sessionId,
      autonomousMode: false,
      message: 'Autonomous mode disabled - all actions will require approval'
    });
  } catch (error: any) {
    logger.error('Error disabling autonomous mode:', error);
    res.status(500).json({ error: error.message || 'Failed to disable autonomous mode' });
  }
});

/**
 * POST /api/agent/autonomous/assess-risk
 * Assess risk of a specific action without executing it
 */
router.post('/assess-risk', async (req, res) => {
  try {
    // Support both legacy format (actionType, actionData) and new format (action object)
    let actionType: string;
    let actionData: any;
    
    if (req.body.action) {
      // New format: { action: { tool: 'file_read', parameters: {...} } }
      actionType = req.body.action.tool;
      actionData = req.body.action.parameters || {};
    } else {
      // Legacy format: { actionType: '...', actionData: {...} }
      actionType = req.body.actionType;
      actionData = req.body.actionData || {};
    }
    
    if (!actionType) {
      return res.status(400).json({ error: 'action.tool or actionType is required' });
    }
    
    const riskAssessment = await autonomousEngine.assessRisk(
      actionType,
      actionData
    );
    
    res.json({
      riskScore: riskAssessment.score,
      autoApprove: riskAssessment.autoApprove,
      reasoning: riskAssessment.reasoning
    });
  } catch (error: any) {
    logger.error('Error assessing risk:', error);
    res.status(500).json({ error: error.message || 'Failed to assess risk' });
  }
});

/**
 * POST /api/agent/autonomous/execute
 * Execute an action with risk assessment (admin only for now)
 */
router.post('/execute', ensureAdmin, async (req, res) => {
  try {
    const { sessionId, actionType, actionData } = req.body;
    
    if (!sessionId || !actionType) {
      return res.status(400).json({ error: 'sessionId and actionType are required' });
    }
    
    const action = await autonomousEngine.executeAction(
      sessionId,
      actionType,
      actionData || {},
      req.user!.id
    );
    
    logger.info(`Action executed: ${actionType} for session ${sessionId}, risk: ${action.riskAssessment.score}`);
    
    res.json({
      success: true,
      action
    });
  } catch (error: any) {
    logger.error('Error executing action:', error);
    res.status(500).json({ error: error.message || 'Failed to execute action' });
  }
});

/**
 * GET /api/agent/autonomous/actions/:sessionId
 * Get autonomous actions for a session
 */
router.get('/actions/:sessionId', ensureSessionOwnership, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    
    const actions = await autonomousEngine.getAutonomousActions(sessionId, limit);
    
    res.json({
      sessionId,
      count: actions.length,
      actions
    });
  } catch (error: any) {
    logger.error('Error getting autonomous actions:', error);
    res.status(500).json({ error: error.message || 'Failed to get actions' });
  }
});

/**
 * GET /api/agent/autonomous/health
 * Health check for autonomous system
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Autonomous Agent System',
    features: [
      'risk_assessment',
      'autonomous_execution',
      'dependency_analysis',
      'parallel_execution'
    ]
  });
});

export default router;
