import { Router, Request, Response } from 'express';
import { PromptImprovementService } from '../services/prompt-improvement-service';
import { AIQuotaService } from '../services/ai-quota-service';
import { AgentControlService } from '../services/agent-control-service';
import WebSocket from 'ws';

const router = Router();
const promptImprovementService = new PromptImprovementService();
const quotaService = AIQuotaService.getInstance();
const agentControlService = AgentControlService.getInstance();

// Improve prompt endpoint
router.post('/improve-prompt', async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    // Get user ID from session/auth (mock for now)
    const userId = 1; // TODO: Get from auth
    
    // Check quota first
    const quotaCheck = await quotaService.checkQuota(userId, { estimatedTokens: 2000 });
    if (!quotaCheck.allowed) {
      return res.status(403).json({ 
        error: 'Quota exceeded', 
        reason: quotaCheck.reason 
      });
    }
    
    const result = await promptImprovementService.improvePrompt(prompt);
    
    // Consume credits
    await quotaService.consumeCredits(userId, { actualTokens: 1500 });
    
    res.json(result);
  } catch (error) {
    console.error('Error improving prompt:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Validate prompt endpoint
router.post('/validate-prompt', async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    const result = await promptImprovementService.validatePrompt(prompt);
    res.json(result);
  } catch (error) {
    console.error('Error validating prompt:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check quota endpoint
router.get('/quota-check', async (req: Request, res: Response) => {
  try {
    // Get user ID from session/auth (mock for now)
    const userId = 1; // TODO: Get from auth
    
    const { extendedThinking, highPowerMode } = req.query;
    
    const quotaCheck = await quotaService.checkQuota(userId, {
      extendedThinking: extendedThinking === 'true',
      highPowerMode: highPowerMode === 'true',
      estimatedTokens: 1000
    });
    
    res.json(quotaCheck);
  } catch (error) {
    console.error('Error checking quota:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Agent session management
router.post('/agent/session', async (req: Request, res: Response) => {
  try {
    // Get user ID from session/auth (mock for now)
    const userId = 1; // TODO: Get from auth
    
    const { extendedThinking, highPowerMode, projectId } = req.body;
    
    // Check quota before creating session
    const quotaCheck = await quotaService.checkQuota(userId, {
      extendedThinking: Boolean(extendedThinking),
      highPowerMode: Boolean(highPowerMode),
    });
    
    if (!quotaCheck.allowed) {
      return res.status(403).json({ 
        error: 'Quota exceeded', 
        reason: quotaCheck.reason 
      });
    }
    
    const sessionId = await agentControlService.createSession(userId, {
      extendedThinking: Boolean(extendedThinking),
      highPowerMode: Boolean(highPowerMode),
      projectId: projectId ? parseInt(projectId) : undefined,
    });
    
    res.json({ sessionId });
  } catch (error) {
    console.error('Error creating agent session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Pause agent session
router.post('/agent/:sessionId/pause', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { reason = 'user_requested' } = req.body;
    
    const result = await agentControlService.pauseSession(sessionId, reason);
    res.json(result);
  } catch (error) {
    console.error('Error pausing agent session:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
});

// Resume agent session
router.post('/agent/:sessionId/resume', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    const result = await agentControlService.resumeSession(sessionId);
    res.json(result);
  } catch (error) {
    console.error('Error resuming agent session:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
});

// Stop agent session
router.post('/agent/:sessionId/stop', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { reason = 'user_requested' } = req.body;
    
    await agentControlService.stopSession(sessionId, reason);
    res.json({ success: true });
  } catch (error) {
    console.error('Error stopping agent session:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
});

// Get agent session info
router.get('/agent/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    const session = agentControlService.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const steps = agentControlService.getSessionSteps(sessionId);
    
    res.json({ session, steps });
  } catch (error) {
    console.error('Error getting agent session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// WebSocket handler for real-time progress updates
export function setupProgressWebSocket(server: any) {
  const wss = new WebSocket.Server({ server, path: '/api/ai/progress' });
  
  wss.on('connection', (ws: WebSocket, req: any) => {
    const sessionId = req.url?.split('/').pop();
    
    if (!sessionId) {
      ws.close(1008, 'Session ID required');
      return;
    }
    
    // Send current state
    const session = agentControlService.getSession(sessionId);
    const steps = agentControlService.getSessionSteps(sessionId);
    
    if (session) {
      ws.send(JSON.stringify({
        type: 'initial_state',
        session,
        steps
      }));
    }
    
    // Listen for agent events
    const onStepStarted = (data: any) => {
      if (data.sessionId === sessionId) {
        ws.send(JSON.stringify({
          type: 'step_started',
          step: data.step
        }));
      }
    };
    
    const onStepUpdated = (data: any) => {
      if (data.sessionId === sessionId) {
        ws.send(JSON.stringify({
          type: 'step_updated',
          step: data.step
        }));
      }
    };
    
    const onStepCompleted = (data: any) => {
      if (data.sessionId === sessionId) {
        ws.send(JSON.stringify({
          type: 'step_completed',
          step: data.step
        }));
      }
    };
    
    const onProgressUpdate = (data: any) => {
      if (data.sessionId === sessionId) {
        ws.send(JSON.stringify({
          type: 'progress_update',
          progress: data.progress
        }));
      }
    };
    
    const onSessionStopped = (data: any) => {
      if (data.sessionId === sessionId) {
        ws.send(JSON.stringify({
          type: 'session_complete'
        }));
      }
    };
    
    agentControlService.on('step_started', onStepStarted);
    agentControlService.on('step_updated', onStepUpdated);
    agentControlService.on('step_completed', onStepCompleted);
    agentControlService.on('progress_update', onProgressUpdate);
    agentControlService.on('session_stopped', onSessionStopped);
    
    ws.on('close', () => {
      agentControlService.off('step_started', onStepStarted);
      agentControlService.off('step_updated', onStepUpdated);
      agentControlService.off('step_completed', onStepCompleted);
      agentControlService.off('progress_update', onProgressUpdate);
      agentControlService.off('session_stopped', onSessionStopped);
    });
  });
}

export default router;