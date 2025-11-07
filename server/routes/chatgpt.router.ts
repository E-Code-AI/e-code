/**
 * ChatGPT Router for Admin Users
 * Provides API endpoints for ChatGPT integration
 */

import { Router, Request, Response } from 'express';
import { IStorage } from '../storage';
import { ensureAdmin } from '../middleware/admin-auth';
import { ChatGPTService } from '../services/chatgpt-service';
import { ensureAuthenticated } from '../middleware/auth';

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
    this.router.use('/api/admin/chatgpt', ensureAuthenticated, ensureAdmin);

    // Check if user is admin
    this.router.get('/api/admin/check', ensureAuthenticated, async (req: Request, res: Response) => {
      try {
        const user = await this.storage.getUser(req.user!.id);
        res.json({ isAdmin: user?.isAdmin || false });
      } catch (error) {
        res.status(500).json({ message: 'Failed to check admin status' });
      }
    });

    // Create a new chat session
    this.router.post('/api/admin/chatgpt/sessions', async (req: Request, res: Response) => {
      try {
        const { projectId } = req.body;
        const session = await this.chatgptService.createSession(req.user!.id, projectId);
        res.json(session);
      } catch (error) {
        console.error('Failed to create session:', error);
        res.status(500).json({ message: 'Failed to create chat session' });
      }
    });

    // Get all sessions for the current user
    this.router.get('/api/admin/chatgpt/sessions', async (req: Request, res: Response) => {
      try {
        const sessions = await this.chatgptService.getUserSessions(req.user!.id);
        res.json(sessions);
      } catch (error) {
        console.error('Failed to get sessions:', error);
        res.status(500).json({ message: 'Failed to retrieve sessions' });
      }
    });

    // Get a specific session
    this.router.get('/api/admin/chatgpt/sessions/:sessionId', async (req: Request, res: Response) => {
      try {
        const session = await this.chatgptService.getSession(
          req.params.sessionId,
          req.user!.id
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
    this.router.post('/api/admin/chatgpt/sessions/:sessionId/messages', async (req: Request, res: Response) => {
      try {
        const { message, includeProjectContext } = req.body;
        
        if (!message) {
          return res.status(400).json({ message: 'Message is required' });
        }

        const response = await this.chatgptService.sendMessage(
          req.params.sessionId,
          req.user!.id,
          message,
          includeProjectContext
        );
        
        res.json(response);
      } catch (error) {
        console.error('Failed to send message:', error);
        res.status(500).json({ message: error.message || 'Failed to send message' });
      }
    });

    // Generate code
    this.router.post('/api/admin/chatgpt/generate-code', async (req: Request, res: Response) => {
      try {
        const { sessionId, request, language } = req.body;
        
        if (!sessionId || !request) {
          return res.status(400).json({ message: 'Session ID and request are required' });
        }

        const result = await this.chatgptService.generateCode(
          sessionId,
          req.user!.id,
          request,
          language
        );
        
        res.json(result);
      } catch (error) {
        console.error('Failed to generate code:', error);
        res.status(500).json({ message: error.message || 'Failed to generate code' });
      }
    });

    // Clear session messages
    this.router.delete('/api/admin/chatgpt/sessions/:sessionId/messages', async (req: Request, res: Response) => {
      try {
        await this.chatgptService.clearSession(req.params.sessionId, req.user!.id);
        res.json({ message: 'Session cleared' });
      } catch (error) {
        console.error('Failed to clear session:', error);
        res.status(500).json({ message: 'Failed to clear session' });
      }
    });

    // Delete a session
    this.router.delete('/api/admin/chatgpt/sessions/:sessionId', async (req: Request, res: Response) => {
      try {
        await this.chatgptService.deleteSession(req.params.sessionId, req.user!.id);
        res.json({ message: 'Session deleted' });
      } catch (error) {
        console.error('Failed to delete session:', error);
        res.status(500).json({ message: 'Failed to delete session' });
      }
    });

    // Get projects for context selection
    this.router.get('/api/admin/chatgpt/projects', async (req: Request, res: Response) => {
      try {
        const projects = await this.storage.getProjectsByUserId(req.user!.id);
        res.json(projects);
      } catch (error) {
        console.error('Failed to get projects:', error);
        res.status(500).json({ message: 'Failed to retrieve projects' });
      }
    });

    // Send a streaming message to ChatGPT
    this.router.post('/api/admin/chatgpt/sessions/:sessionId/stream', async (req: Request, res: Response) => {
      try {
        const { message, includeProjectContext } = req.body;
        
        if (!message) {
          return res.status(400).json({ message: 'Message is required' });
        }

        // Set up Server-Sent Events
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
        
        // Send initial connection message
        res.write('data: {"type":"connected"}\n\n');

        try {
          const stream = this.chatgptService.sendStreamingMessage(
            req.params.sessionId,
            req.user!.id,
            message,
            includeProjectContext
          );

          // Stream the response
          for await (const chunk of stream) {
            res.write(`data: ${JSON.stringify({ type: 'content', content: chunk })}\n\n`);
          }

          // Send completion message
          res.write('data: {"type":"done"}\n\n');
          res.end();
        } catch (streamError) {
          console.error('Streaming error:', streamError);
          res.write(`data: ${JSON.stringify({ type: 'error', message: streamError.message })}\n\n`);
          res.end();
        }
      } catch (error) {
        console.error('Failed to setup streaming:', error);
        res.status(500).json({ message: error.message || 'Failed to setup streaming' });
      }
    });
  }

  getRouter(): Router {
    return this.router;
  }
}