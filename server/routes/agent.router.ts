import { Router } from 'express';
import { ensureAuthenticated } from '../middleware/auth';
import { ensureAdmin } from '../middleware/admin-auth';
import { agentOrchestrator } from '../services/agent-orchestrator.service';
import { agentFileOperations } from '../services/agent-file-operations.service';
import { agentCommandExecution } from '../services/agent-command-execution.service';
import { agentToolFramework } from '../services/agent-tool-framework.service';
import { agentWorkflowEngine } from '../services/agent-workflow-engine.service';
import { AgentPreferencesService } from '../services/agent-preferences.service';
import { db } from '../db';
import { agentSessions, fileOperations, commandExecutions, toolExecutions, agentWorkflows, AI_MODELS } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import type { IStorage } from '../storage';

const router = Router();

// Public agent routes (require authentication only)
router.use(ensureAuthenticated);

// Model Selection & Preferences Routes (for all authenticated users)
// GET /api/agent/models - Get available AI models
router.get('/models', async (req, res) => {
  try {
    const storage: IStorage = (req.app.locals as any).storage;
    const preferencesService = new AgentPreferencesService(storage);
    const models = preferencesService.getAvailableModels();
    res.json({ models });
  } catch (error: any) {
    console.error('[AgentRouter] Error fetching models:', error);
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

// GET /api/agent/preferences - Get user agent preferences
router.get('/preferences', async (req, res) => {
  try {
    const userId = req.user!.id;
    const storage: IStorage = (req.app.locals as any).storage;
    const preferencesService = new AgentPreferencesService(storage);
    
    const preferences = await preferencesService.getUserPreferences(userId);
    
    // Return defaults if no preferences found
    if (!preferences) {
      return res.json({
        extendedThinking: false,
        highPowerMode: false,
        autoWebSearch: true,
        preferredModel: 'claude-3-5-sonnet',
        customInstructions: null,
        improvePromptEnabled: false,
        progressTabEnabled: false,
        pauseResumeEnabled: false,
        autoCheckpoints: true,
      });
    }

    res.json(preferences);
  } catch (error: any) {
    console.error('[AgentRouter] Error fetching preferences:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// PUT /api/agent/preferences - Update user agent preferences
router.put('/preferences', async (req, res) => {
  try {
    const userId = req.user!.id;
    const storage: IStorage = (req.app.locals as any).storage;
    const preferencesService = new AgentPreferencesService(storage);
    const updates = req.body;

    // Validate model if provided
    if (updates.preferredModel && !AI_MODELS.includes(updates.preferredModel)) {
      return res.status(400).json({
        error: `Invalid model: ${updates.preferredModel}`,
        validModels: AI_MODELS,
      });
    }

    const updated = await preferencesService.updateUserPreferences(userId, updates);
    res.json(updated);
  } catch (error: any) {
    console.error('[AgentRouter] Error updating preferences:', error);
    res.status(500).json({ error: error.message || 'Failed to update preferences' });
  }
});

// POST /api/agent/recommend-model - Get model recommendation
router.post('/recommend-model', async (req, res) => {
  try {
    const storage: IStorage = (req.app.locals as any).storage;
    const preferencesService = new AgentPreferencesService(storage);
    const { requiresExtendedThinking, complexity, speedPriority } = req.body;

    const recommended = preferencesService.getRecommendedModel({
      requiresExtendedThinking,
      complexity,
      speedPriority,
    });

    const models = preferencesService.getAvailableModels();
    const modelInfo = models.find(m => m.id === recommended);

    res.json({
      recommended,
      modelInfo,
      reasoning: `Selected ${recommended} based on: complexity=${complexity || 'medium'}, speedPriority=${speedPriority || 'balanced'}, extendedThinking=${requiresExtendedThinking || false}`,
    });
  } catch (error: any) {
    console.error('[AgentRouter] Error recommending model:', error);
    res.status(500).json({ error: 'Failed to recommend model' });
  }
});

// POST /api/agent/conversation - Create or get conversation for project
router.post('/conversation', async (req, res) => {
  try {
    const { projectId, initialPrompt } = req.body;
    const userId = req.user!.id;

    const { aiConversations } = await import('@shared/schema');
    const { eq, and, desc } = await import('drizzle-orm');

    // If projectId provided, try to find existing conversation
    if (projectId) {
      const [existingConversation] = await db
        .select()
        .from(aiConversations)
        .where(and(
          eq(aiConversations.projectId, projectId.toString()),
          eq(aiConversations.userId, userId)
        ))
        .orderBy(desc(aiConversations.createdAt))
        .limit(1);

      if (existingConversation) {
        return res.json({
          conversationId: existingConversation.id,
          agentMode: existingConversation.agentMode,
          existing: true,
        });
      }
    }

    // Create new conversation (projectId can be null)
    const [newConversation] = await db
      .insert(aiConversations)
      .values({
        projectId: projectId ? projectId.toString() : null,
        userId: userId,
        messages: [],
        agentMode: 'build', // Default to build mode
        model: 'claude-3-5-sonnet',
      })
      .returning();

    res.json({
      conversationId: newConversation.id,
      agentMode: newConversation.agentMode,
      existing: false,
    });
  } catch (error: any) {
    console.error('[AgentRouter] Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// POST /api/agent/conversation/:id/mode - Update conversation mode (Plan vs Build)
router.post('/conversation/:id/mode', async (req, res) => {
  try {
    const conversationIdStr = req.params.id;
    const conversationId = parseInt(conversationIdStr, 10);
    const { mode } = req.body;
    const userId = req.user!.id;

    // Validate conversation ID
    if (isNaN(conversationId)) {
      return res.status(400).json({
        error: 'Invalid conversation ID',
      });
    }

    // Validate mode
    if (!mode || (mode !== 'plan' && mode !== 'build')) {
      return res.status(400).json({
        error: 'Invalid mode. Must be "plan" or "build"',
      });
    }

    // Update conversation mode in database
    const { aiConversations } = await import('@shared/schema');
    const { eq, and } = await import('drizzle-orm');

    // Verify conversation belongs to user
    const [conversation] = await db
      .select()
      .from(aiConversations)
      .where(and(
        eq(aiConversations.id, conversationId),
        eq(aiConversations.userId, userId)
      ))
      .limit(1);

    if (!conversation) {
      return res.status(404).json({
        error: 'Conversation not found or access denied',
      });
    }

    // Update mode
    await db
      .update(aiConversations)
      .set({ agentMode: mode })
      .where(eq(aiConversations.id, conversationId));

    res.json({
      success: true,
      conversationId,
      mode,
      message: `Conversation mode updated to ${mode.toUpperCase()}`,
    });
  } catch (error: any) {
    console.error('[AgentRouter] Error updating conversation mode:', error);
    res.status(500).json({ error: 'Failed to update conversation mode' });
  }
});

// ====== ADMIN-ONLY ROUTES ======
// These routes require admin authentication
// Create new agent session
router.post('/sessions', ensureAdmin, async (req, res) => {
  try {
    const { projectId, model } = req.body;
    const userId = String(req.user!.id);

    const session = await agentOrchestrator.createSession(userId, projectId, model);
    res.json({ success: true, session });
  } catch (error: any) {
    console.error('Error creating agent session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get active sessions
router.get('/sessions', ensureAdmin, async (req, res) => {
  try {
    const userId = String(req.user!.id);
    const sessions = await agentOrchestrator.getActiveSessions(userId);
    res.json({ sessions });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Execute agent command
router.post('/sessions/:sessionId/execute', ensureAdmin, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { messages } = req.body;
    const userId = String(req.user!.id);

    const result = await agentOrchestrator.executeAgent(sessionId, messages, userId);
    res.json(result);
  } catch (error: any) {
    console.error('Error executing agent:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stream agent execution
router.post('/sessions/:sessionId/stream', ensureAdmin, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { prompt } = req.body;
    const userId = String(req.user!.id);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = agentOrchestrator.streamAgentExecution(sessionId, prompt, userId);

    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    console.error('Error streaming agent execution:', error);
    res.status(500).json({ error: error.message });
  }
});

// Close session
router.post('/sessions/:sessionId/close', ensureAdmin, async (req, res) => {
  try {
    const { sessionId } = req.params;
    await agentOrchestrator.closeSession(sessionId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// File operations
router.post('/files/read', ensureAdmin, async (req, res) => {
  try {
    const { sessionId, path } = req.body;
    const userId = String(req.user!.id);

    const result = await agentFileOperations.readFile(sessionId, path, userId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/files/write', ensureAdmin, async (req, res) => {
  try {
    const { sessionId, path, content } = req.body;
    const userId = String(req.user!.id);

    const result = await agentFileOperations.createOrUpdateFile(sessionId, path, content, userId);
    res.json({ success: true, operation: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/files/delete', ensureAdmin, async (req, res) => {
  try {
    const { sessionId, path } = req.body;
    const userId = String(req.user!.id);

    const result = await agentFileOperations.deleteFile(sessionId, path, userId);
    res.json({ success: true, operation: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/files/list', ensureAdmin, async (req, res) => {
  try {
    const { sessionId, path, recursive } = req.body;
    
    const result = await agentFileOperations.listDirectory(sessionId, path, recursive);
    res.json({ files: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/files/history/:sessionId', ensureAdmin, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const history = await agentFileOperations.getOperationHistory(sessionId);
    res.json({ history });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Command execution
router.post('/commands/execute', ensureAdmin, async (req, res) => {
  try {
    const { sessionId, command, args, options } = req.body;
    const userId = String(req.user!.id);

    const result = await agentCommandExecution.executeCommand(
      sessionId,
      command,
      args,
      options,
      userId
    );
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/commands/kill', ensureAdmin, async (req, res) => {
  try {
    const { executionId, sessionId } = req.body;
    
    await agentCommandExecution.killCommand(executionId, sessionId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/commands/history/:sessionId', ensureAdmin, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const history = await agentCommandExecution.getExecutionHistory(sessionId);
    res.json({ history });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Tool execution
router.get('/tools', ensureAdmin, async (req, res) => {
  try {
    const { capability } = req.query;
    const tools = await agentToolFramework.getAvailableTools(capability as string);
    res.json({ tools });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/tools/execute', ensureAdmin, async (req, res) => {
  try {
    const { toolName, input, sessionId } = req.body;
    const userId = String(req.user!.id);

    const context = {
      sessionId,
      userId,
      projectPath: process.cwd(),
      environment: {}
    };

    const result = await agentToolFramework.executeTool(toolName, input, context);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/tools/history/:sessionId', ensureAdmin, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const history = await agentToolFramework.getExecutionHistory(sessionId);
    res.json({ history });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Workflow execution
router.post('/workflows/create', ensureAdmin, async (req, res) => {
  try {
    const { sessionId, projectId, name, description, steps, initialVariables } = req.body;
    const userId = String(req.user!.id);

    const workflow = await agentWorkflowEngine.executeWorkflow(
      sessionId,
      projectId,
      name,
      description,
      steps,
      userId,
      initialVariables || {}
    );
    res.json({ workflow });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/workflows/generate', ensureAdmin, async (req, res) => {
  try {
    const { prompt, sessionId } = req.body;
    
    const steps = await agentWorkflowEngine.generateWorkflowFromPrompt(prompt, sessionId);
    res.json({ steps });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/workflows/:workflowId/status', ensureAdmin, async (req, res) => {
  try {
    const { workflowId } = req.params;
    const status = await agentWorkflowEngine.getWorkflowStatus(workflowId);
    res.json({ status });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/workflows/:workflowId/cancel', ensureAdmin, async (req, res) => {
  try {
    const { workflowId } = req.params;
    await agentWorkflowEngine.cancelWorkflow(workflowId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/workflows/:workflowId/restore', ensureAdmin, async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { checkpointIndex } = req.body;
    const userId = String(req.user!.id);

    await agentWorkflowEngine.restoreFromCheckpoint(workflowId, checkpointIndex, userId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get project context
router.get('/context/:projectId', ensureAdmin, async (req, res) => {
  try {
    const { projectId } = req.params;
    const projectPath = projectId ? 
      `./projects/${projectId}` : 
      process.cwd();

    const context = await agentOrchestrator.getProjectContext(projectPath);
    res.json({ context });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// WebSocket events for real-time updates
import { Server as SocketIOServer } from 'socket.io';

export function setupAgentWebSocket(io: SocketIOServer) {
  const agentNamespace = io.of('/agent');

  agentNamespace.use((socket, next) => {
    // Authenticate socket connection
    const token = socket.handshake.auth.token;
    // Verify admin token here
    next();
  });

  agentNamespace.on('connection', (socket) => {
    // Subscribe to agent events
    const handlers = {
      fileOperation: (event: any) => socket.emit('file:operation', event),
      commandEvent: (event: any) => socket.emit('command:event', event),
      toolEvent: (event: any) => socket.emit('tool:event', event),
      workflowEvent: (event: any) => socket.emit('workflow:event', event),
      agentFunction: (event: any) => socket.emit('agent:function', event)
    };

    agentFileOperations.on('operation:progress', handlers.fileOperation);
    agentCommandExecution.on('command:event', handlers.commandEvent);
    agentToolFramework.on('tool:event', handlers.toolEvent);
    agentWorkflowEngine.on('workflow:event', handlers.workflowEvent);
    agentOrchestrator.on('agent:function_start', handlers.agentFunction);
    agentOrchestrator.on('agent:function_complete', handlers.agentFunction);
    agentOrchestrator.on('agent:function_error', handlers.agentFunction);

    socket.on('disconnect', () => {
      // Cleanup event listeners
      agentFileOperations.off('operation:progress', handlers.fileOperation);
      agentCommandExecution.off('command:event', handlers.commandEvent);
      agentToolFramework.off('tool:event', handlers.toolEvent);
      agentWorkflowEngine.off('workflow:event', handlers.workflowEvent);
      agentOrchestrator.off('agent:function_start', handlers.agentFunction);
      agentOrchestrator.off('agent:function_complete', handlers.agentFunction);
      agentOrchestrator.off('agent:function_error', handlers.agentFunction);
    });
  });
}

// Dashboard stats
router.get('/stats/:sessionId', ensureAdmin, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Get session info
    const [session] = await db.select()
      .from(agentSessions)
      .where(eq(agentSessions.id, sessionId));
    
    // Get operation counts
    const fileOps = await db.select()
      .from(fileOperations)
      .where(eq(fileOperations.sessionId, sessionId));
    
    const commands = await db.select()
      .from(commandExecutions)
      .where(eq(commandExecutions.sessionId, sessionId));
    
    const tools = await db.select()
      .from(toolExecutions)
      .where(eq(toolExecutions.sessionId, sessionId));
    
    const workflows = await db.select()
      .from(agentWorkflows)
      .where(eq(agentWorkflows.sessionId, sessionId));
    
    res.json({
      session,
      stats: {
        fileOperations: fileOps.length,
        commandExecutions: commands.length,
        toolExecutions: tools.length,
        workflows: workflows.length,
        tokensUsed: session?.totalTokensUsed || 0,
        totalOperations: session?.totalOperations || 0
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;