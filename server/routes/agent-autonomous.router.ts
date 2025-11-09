/**
 * Autonomous Mode API Routes
 * 
 * Endpoints for controlling autonomous agent execution:
 * - Enable/disable autonomous mode
 * - Get autonomous actions
 * - Generate execution plans
 * - Configure risk thresholds
 */

import { Router } from 'express';
import { autonomousEngine } from '../services/agent-autonomous-engine.service';
import { planGenerator } from '../services/agent-plan-generator.service';
import { ensureAuthenticated } from '../middleware/auth';
import { ensureAdmin } from '../middleware/admin-auth';
import { createLogger } from '../utils/logger';

const router = Router();
const logger = createLogger('AutonomousRouter');

// All routes require authentication
router.use(ensureAuthenticated);

/**
 * POST /api/agent/autonomous/enable
 * Enable autonomous mode for a session
 */
router.post('/enable', async (req, res) => {
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
router.post('/disable', async (req, res) => {
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
    const { actionType, actionData } = req.body;
    
    if (!actionType) {
      return res.status(400).json({ error: 'actionType is required' });
    }
    
    const riskAssessment = await autonomousEngine.assessRisk(
      actionType,
      actionData || {}
    );
    
    res.json({
      actionType,
      riskAssessment
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
router.get('/actions/:sessionId', async (req, res) => {
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
 * POST /api/agent/plan/generate
 * Generate an execution plan from a goal
 */
router.post('/plan/generate', async (req, res) => {
  try {
    const { goal, context = {} } = req.body;
    
    if (!goal) {
      return res.status(400).json({ error: 'goal is required' });
    }
    
    const plan = await planGenerator.generatePlan(goal, context);
    
    logger.info(`Plan generated: ${plan.id} with ${plan.tasks.length} tasks for user ${req.user?.id}`);
    
    res.json({
      success: true,
      plan
    });
  } catch (error: any) {
    logger.error('Error generating plan:', error);
    res.status(500).json({ error: error.message || 'Failed to generate plan' });
  }
});

/**
 * GET /api/agent/plan/:planId
 * Get a specific execution plan
 */
router.get('/plan/:planId', async (req, res) => {
  try {
    const { planId } = req.params;
    
    const plan = planGenerator.getPlan(planId);
    
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    
    res.json({ plan });
  } catch (error: any) {
    logger.error('Error getting plan:', error);
    res.status(500).json({ error: error.message || 'Failed to get plan' });
  }
});

/**
 * POST /api/agent/plan/:planId/task/:taskId/status
 * Update task status in a plan
 */
router.post('/plan/:planId/task/:taskId/status', async (req, res) => {
  try {
    const { planId, taskId } = req.params;
    const { status } = req.body;
    
    if (!['completed', 'failed', 'in_progress'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    planGenerator.updateTaskStatus(planId, taskId, status);
    
    res.json({
      success: true,
      planId,
      taskId,
      status
    });
  } catch (error: any) {
    logger.error('Error updating task status:', error);
    res.status(500).json({ error: error.message || 'Failed to update task status' });
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
      'plan_generation',
      'dependency_analysis',
      'parallel_execution'
    ]
  });
});

export default router;
