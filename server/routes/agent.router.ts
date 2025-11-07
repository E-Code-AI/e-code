import { Router } from 'express';
import { ensureAuthenticated } from '../middleware/auth';
import { ensureAdmin } from '../middleware/admin-auth';
import { agentOrchestrator } from '../services/agent-orchestrator.service';
import { agentFileOperations } from '../services/agent-file-operations.service';
import { agentCommandExecution } from '../services/agent-command-execution.service';
import { agentToolFramework } from '../services/agent-tool-framework.service';
import { agentWorkflowEngine } from '../services/agent-workflow-engine.service';
import { db } from '../db';
import { agentSessions, fileOperations, commandExecutions, toolExecutions, agentWorkflows } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';

const router = Router();

// All agent routes require admin authentication
router.use(ensureAuthenticated);
router.use(ensureAdmin);

// Create new agent session
router.post('/sessions', async (req, res) => {
  try {
    const { projectId, model } = req.body;
    const userId = req.user!.id;

    const session = await agentOrchestrator.createSession(userId, projectId, model);
    res.json({ success: true, session });
  } catch (error: any) {
    console.error('Error creating agent session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get active sessions
router.get('/sessions', async (req, res) => {
  try {
    const userId = req.user!.id;
    const sessions = await agentOrchestrator.getActiveSessions(userId);
    res.json({ sessions });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Execute agent command
router.post('/sessions/:sessionId/execute', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { messages } = req.body;
    const userId = req.user!.id;

    const result = await agentOrchestrator.executeAgent(sessionId, messages, userId);
    res.json(result);
  } catch (error: any) {
    console.error('Error executing agent:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stream agent execution
router.post('/sessions/:sessionId/stream', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { prompt } = req.body;
    const userId = req.user!.id;

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
router.post('/sessions/:sessionId/close', async (req, res) => {
  try {
    const { sessionId } = req.params;
    await agentOrchestrator.closeSession(sessionId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// File operations
router.post('/files/read', async (req, res) => {
  try {
    const { sessionId, path } = req.body;
    const userId = req.user!.id;

    const result = await agentFileOperations.readFile(sessionId, path, userId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/files/write', async (req, res) => {
  try {
    const { sessionId, path, content } = req.body;
    const userId = req.user!.id;

    const result = await agentFileOperations.createOrUpdateFile(sessionId, path, content, userId);
    res.json({ success: true, operation: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/files/delete', async (req, res) => {
  try {
    const { sessionId, path } = req.body;
    const userId = req.user!.id;

    const result = await agentFileOperations.deleteFile(sessionId, path, userId);
    res.json({ success: true, operation: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/files/list', async (req, res) => {
  try {
    const { sessionId, path, recursive } = req.body;
    
    const result = await agentFileOperations.listDirectory(sessionId, path, recursive);
    res.json({ files: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/files/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const history = await agentFileOperations.getOperationHistory(sessionId);
    res.json({ history });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Command execution
router.post('/commands/execute', async (req, res) => {
  try {
    const { sessionId, command, args, options } = req.body;
    const userId = req.user!.id;

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

router.post('/commands/kill', async (req, res) => {
  try {
    const { executionId, sessionId } = req.body;
    
    await agentCommandExecution.killCommand(executionId, sessionId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/commands/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const history = await agentCommandExecution.getExecutionHistory(sessionId);
    res.json({ history });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Tool execution
router.get('/tools', async (req, res) => {
  try {
    const { capability } = req.query;
    const tools = await agentToolFramework.getAvailableTools(capability as string);
    res.json({ tools });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/tools/execute', async (req, res) => {
  try {
    const { toolName, input, sessionId } = req.body;
    const userId = req.user!.id;

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

router.get('/tools/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const history = await agentToolFramework.getExecutionHistory(sessionId);
    res.json({ history });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Workflow execution
router.post('/workflows/create', async (req, res) => {
  try {
    const { sessionId, name, description, steps } = req.body;
    const userId = req.user!.id;

    const workflow = await agentWorkflowEngine.executeWorkflow(
      sessionId,
      name,
      description,
      steps,
      userId
    );
    res.json({ workflow });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/workflows/generate', async (req, res) => {
  try {
    const { prompt, sessionId } = req.body;
    
    const steps = await agentWorkflowEngine.generateWorkflowFromPrompt(prompt, sessionId);
    res.json({ steps });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/workflows/:workflowId/status', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const status = await agentWorkflowEngine.getWorkflowStatus(workflowId);
    res.json({ status });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/workflows/:workflowId/cancel', async (req, res) => {
  try {
    const { workflowId } = req.params;
    await agentWorkflowEngine.cancelWorkflow(workflowId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/workflows/:workflowId/restore', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { checkpointIndex } = req.body;
    const userId = req.user!.id;

    await agentWorkflowEngine.restoreFromCheckpoint(workflowId, checkpointIndex, userId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get project context
router.get('/context/:projectId', async (req, res) => {
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
    console.log('Agent WebSocket connected');

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
router.get('/stats/:sessionId', async (req, res) => {
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