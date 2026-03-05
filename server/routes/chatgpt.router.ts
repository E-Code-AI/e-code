/**
 * ChatGPT Router for Admin Users
 * Provides API endpoints for ChatGPT integration
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { IStorage } from '../storage';
import { ensureAdmin } from '../middleware/admin-auth';
import { ChatGPTService } from '../services/chatgpt-service';
import { ensureAuthenticated } from '../middleware/auth';
import { createLogger } from '../utils/logger';
import { validateAndSetSSEHeaders } from '../utils/sse-headers';

const logger = createLogger('chatgpt-router');

// Validation schemas
const createSessionSchema = z.object({
  projectId: z.number().int().positive().optional()
});

const sendMessageSchema = z.object({
  message: z.string().min(1, 'Message is required').max(100000, 'Message too long'),
  includeProjectContext: z.boolean().optional()
});

const generateCodeSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  request: z.string().min(1, 'Request is required').max(50000, 'Request too long'),
  language: z.string().max(50).optional()
});

export class ChatGPTRouter {
  private router: Router;
  private chatgptService: ChatGPTService;

  constructor(private storage: IStorage) {
    this.router = Router();
    this.chatgptService = new ChatGPTService();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // All routes require authentication and admin access
    this.router.use('/admin/chatgpt', ensureAuthenticated, ensureAdmin);

    // Check if user is admin
    this.router.get('/admin/check', ensureAuthenticated, async (req: Request, res: Response) => {
      try {
        const user = await this.storage.getUser(String(req.user!.id));
        res.json({ isAdmin: user?.role === 'admin' });
      } catch (error) {
        res.status(500).json({ message: 'Failed to check admin status' });
      }
    });

    // Create a new chat session
    this.router.post('/admin/chatgpt/sessions', async (req: Request, res: Response) => {
      try {
        // Validate request body
        const validation = createSessionSchema.safeParse(req.body);
        if (!validation.success) {
          return res.status(400).json({
            message: 'Invalid request data',
            errors: validation.error.errors
          });
        }
        
        const { projectId } = validation.data;
        const session = await this.chatgptService.createSession(String(req.user!.id), projectId ? String(projectId) : undefined);
        res.json(session);
      } catch (error: any) {
        logger.error('Failed to create session:', { error: error.message });
        res.status(500).json({ message: 'Failed to create chat session' });
      }
    });

    // Get all sessions for the current user
    this.router.get('/admin/chatgpt/sessions', async (req: Request, res: Response) => {
      try {
        const sessions = await this.chatgptService.getUserSessions(String(req.user!.id));
        res.json(sessions);
      } catch (error) {
        console.error('Failed to get sessions:', error);
        res.status(500).json({ message: 'Failed to retrieve sessions' });
      }
    });

    // Get a specific session
    this.router.get('/admin/chatgpt/sessions/:sessionId', async (req: Request, res: Response) => {
      try {
        const session = await this.chatgptService.getSession(
          req.params.sessionId,
          String(req.user!.id)
        );
        
        if (!session) {
          return res.status(404).json({ message: 'Session not found' });
        }
        
        res.json(session);
      } catch (error) {
        console.error('Failed to get session:', error);
        res.status(500).json({ message: 'Failed to retrieve session' });
      }
    });

    // Send a message to ChatGPT
    this.router.post('/admin/chatgpt/sessions/:sessionId/messages', async (req: Request, res: Response) => {
      try {
        // Validate request body
        const validation = sendMessageSchema.safeParse(req.body);
        if (!validation.success) {
          return res.status(400).json({
            message: 'Invalid request data',
            errors: validation.error.errors
          });
        }
        
        const { message, includeProjectContext } = validation.data;

        const response = await this.chatgptService.sendMessage(
          req.params.sessionId,
          String(req.user!.id),
          message,
          includeProjectContext
        );
        
        res.json(response);
      } catch (error: any) {
        logger.error('Failed to send message:', { error: error.message });
        res.status(500).json({ message: error.message || 'Failed to send message' });
      }
    });

    // Generate code
    this.router.post('/admin/chatgpt/generate-code', async (req: Request, res: Response) => {
      try {
        // Validate request body
        const validation = generateCodeSchema.safeParse(req.body);
        if (!validation.success) {
          return res.status(400).json({
            message: 'Invalid request data',
            errors: validation.error.errors
          });
        }
        
        const { sessionId, request, language } = validation.data;

        const result = await this.chatgptService.generateCode(
          sessionId,
          String(req.user!.id),
          request,
          language
        );
        
        res.json(result);
      } catch (error: any) {
        logger.error('Failed to generate code:', { error: error.message });
        res.status(500).json({ message: error.message || 'Failed to generate code' });
      }
    });

    // Clear session messages
    this.router.delete('/admin/chatgpt/sessions/:sessionId/messages', async (req: Request, res: Response) => {
      try {
        await this.chatgptService.clearSession(req.params.sessionId, String(req.user!.id));
        res.json({ message: 'Session cleared' });
      } catch (error) {
        console.error('Failed to clear session:', error);
        res.status(500).json({ message: 'Failed to clear session' });
      }
    });

    // Delete a session
    this.router.delete('/admin/chatgpt/sessions/:sessionId', async (req: Request, res: Response) => {
      try {
        await this.chatgptService.deleteSession(req.params.sessionId, String(req.user!.id));
        res.json({ message: 'Session deleted' });
      } catch (error) {
        console.error('Failed to delete session:', error);
        res.status(500).json({ message: 'Failed to delete session' });
      }
    });

    // Get projects for context selection
    this.router.get('/admin/chatgpt/projects', async (req: Request, res: Response) => {
      try {
        const projects = await this.storage.getProjectsByUserId(String(req.user!.id));
        res.json(projects);
      } catch (error) {
        console.error('Failed to get projects:', error);
        res.status(500).json({ message: 'Failed to retrieve projects' });
      }
    });

    // Send a streaming message to ChatGPT
    this.router.post('/admin/chatgpt/sessions/:sessionId/stream', async (req: Request, res: Response) => {
      let streamEnded = false;
      let clientDisconnected = false;
      
      // Handle client disconnect to prevent memory leaks
      req.on('close', () => {
        clientDisconnected = true;
        logger.info('[ChatGPT] Client disconnected during streaming');
      });
      
      try {
        const { message, includeProjectContext } = req.body;
        
        if (!message) {
          return res.status(400).json({ message: 'Message is required' });
        }

        // Set up Server-Sent Events with CORS security - reject invalid origins with 403
        if (!validateAndSetSSEHeaders(res, req)) {
          return;
        }
        
        // Send initial connection message
        res.write('data: {"type":"connected"}\n\n');

        try {
          const stream = this.chatgptService.sendStreamingMessage(
            req.params.sessionId,
            String(req.user!.id),
            message,
            includeProjectContext
          );

          // Stream the response with client disconnect check
          for await (const chunk of stream) {
            if (clientDisconnected) {
              logger.info('[ChatGPT] Stopping stream due to client disconnect');
              break;
            }
            res.write(`data: ${JSON.stringify({ type: 'content', content: chunk })}\n\n`);
          }

          // Send completion message only if client is still connected
          if (!clientDisconnected) {
            res.write('data: {"type":"done"}\n\n');
          }
        } catch (streamError: any) {
          logger.error('[ChatGPT] Streaming error:', streamError);
          if (!clientDisconnected && !streamEnded) {
            try {
              res.write(`data: ${JSON.stringify({ type: 'error', message: streamError.message || 'Stream error' })}\n\n`);
            } catch (writeError) {
              logger.error('[ChatGPT] Failed to write error to stream:', writeError);
            }
          }
        } finally {
          // Always end the response to prevent memory leaks
          if (!streamEnded) {
            streamEnded = true;
            res.end();
          }
        }
      } catch (error: any) {
        logger.error('[ChatGPT] Failed to setup streaming:', error);
        if (!streamEnded) {
          streamEnded = true;
          res.status(500).json({ message: error.message || 'Failed to setup streaming' });
        }
      }
    });

    // ===== ADMIN PROJECT MANAGEMENT ENDPOINTS =====
    
    // Get ALL projects (admin can see all users' projects)
    this.router.get('/admin/chatgpt/all-projects', async (req: Request, res: Response) => {
      try {
        const projects = await this.storage.getAllProjects();
        res.json(projects);
      } catch (error) {
        logger.error('Failed to get all projects:', error);
        res.status(500).json({ message: 'Failed to retrieve projects' });
      }
    });

    // Get project details with owner info
    this.router.get('/admin/chatgpt/projects/:projectId', async (req: Request, res: Response) => {
      try {
        const project = await this.storage.getProject(req.params.projectId);
        if (!project) {
          return res.status(404).json({ message: 'Project not found' });
        }
        const owner = await this.storage.getUser(String(project.ownerId));
        res.json({ 
          ...project, 
          ownerEmail: owner?.email,
          ownerUsername: owner?.username 
        });
      } catch (error) {
        logger.error('Failed to get project:', error);
        res.status(500).json({ message: 'Failed to retrieve project' });
      }
    });

    // List files in a project
    this.router.get('/admin/chatgpt/projects/:projectId/files', async (req: Request, res: Response) => {
      try {
        const files = await this.storage.getFilesByProjectId(req.params.projectId);
        res.json(files);
      } catch (error) {
        logger.error('Failed to get project files:', error);
        res.status(500).json({ message: 'Failed to retrieve files' });
      }
    });

    // Read a specific file
    this.router.get('/admin/chatgpt/projects/:projectId/files/:fileId', async (req: Request, res: Response) => {
      try {
        const file = await this.storage.getFile(parseInt(req.params.fileId));
        if (!file || String(file.projectId) !== req.params.projectId) {
          return res.status(404).json({ message: 'File not found' });
        }
        res.json(file);
      } catch (error) {
        logger.error('Failed to get file:', error);
        res.status(500).json({ message: 'Failed to retrieve file' });
      }
    });

    // Update a file (admin can modify any project's files)
    this.router.put('/admin/chatgpt/projects/:projectId/files/:fileId', async (req: Request, res: Response) => {
      try {
        const { content } = req.body;
        if (content === undefined) {
          return res.status(400).json({ message: 'Content is required' });
        }
        
        const file = await this.storage.getFile(parseInt(req.params.fileId));
        if (!file || String(file.projectId) !== req.params.projectId) {
          return res.status(404).json({ message: 'File not found' });
        }
        
        const updatedFile = await this.storage.updateFile(parseInt(req.params.fileId), { content });
        
        logger.info(`[Admin] File ${file.path} updated by admin ${req.user!.id} in project ${req.params.projectId}`);
        res.json(updatedFile);
      } catch (error) {
        logger.error('Failed to update file:', error);
        res.status(500).json({ message: 'Failed to update file' });
      }
    });

    // Get all active agent sessions across all users
    this.router.get('/admin/chatgpt/agent-sessions', async (req: Request, res: Response) => {
      try {
        const sessions = await this.storage.getActiveAgentSessions?.() || [];
        res.json(sessions);
      } catch (error) {
        logger.error('Failed to get agent sessions:', error);
        res.status(500).json({ message: 'Failed to retrieve agent sessions' });
      }
    });

    // Terminate an agent session (admin intervention)
    this.router.post('/admin/chatgpt/agent-sessions/:sessionId/terminate', async (req: Request, res: Response) => {
      try {
        const { reason } = req.body;
        logger.warn(`[Admin] Session ${req.params.sessionId} terminated by admin ${req.user!.id}. Reason: ${reason || 'No reason provided'}`);
        
        await this.storage.terminateAgentSession?.(req.params.sessionId, {
          terminatedBy: req.user!.id,
          reason: reason || 'Admin intervention'
        });
        
        res.json({ message: 'Session terminated' });
      } catch (error) {
        logger.error('Failed to terminate session:', error);
        res.status(500).json({ message: 'Failed to terminate session' });
      }
    });
  }

  getRouter(): Router {
    return this.router;
  }
}