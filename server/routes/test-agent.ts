import { Router } from 'express';
import { agentOrchestrator } from '../services/agent-orchestrator.service';

const router = Router();

// Test endpoint for agent functionality (no auth required for testing)
router.post('/api/test/agent', async (req, res) => {
  try {
    // Create a test session
    const testUserId = '30711e48-281e-4dcd-9372-d0941ddf8a1e'; // Admin user ID from database
    const session = await agentOrchestrator.createSession(testUserId, undefined, 'gpt-5');
    
    // Execute agent with test message
    const messages = req.body.messages || [{
      role: 'user',
      content: 'Hello GPT-5! Confirm you are working on the E-Code Platform.'
    }];
    
    const result = await agentOrchestrator.executeAgent(
      session.id,
      messages,
      testUserId
    );
    
    res.json({
      success: true,
      sessionId: session.id,
      response: result.message,
      functionCalls: result.functionCalls
    });
  } catch (error: any) {
    console.error('[Test Agent] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// Health check for agent service
router.get('/api/test/agent/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Agent test endpoint is available',
    aiIntegrations: {
      baseUrl: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || 'not set',
      apiKeySet: !!process.env.AI_INTEGRATIONS_OPENAI_API_KEY
    }
  });
});

export default router;