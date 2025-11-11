import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ensureAuthenticated } from '../middleware/auth';
import { type IStorage } from '../storage';
import { aiPlanGenerator } from '../services/ai-plan-generator.service';

/**
 * Agent Plan Router
 * REAL AI-powered plan generation with streaming
 * Uses OpenAI GPT-5 for intelligent task breakdown
 */
export class AgentPlanRouter {
  router: Router;
  storage: IStorage;

  constructor(storage: IStorage) {
    this.router = Router();
    this.storage = storage;
    this.initializeRoutes();
  }

  private initializeRoutes() {
    /**
     * POST /api/agent/plan/stream
     * Stream real-time plan generation from AI
     * Uses Server-Sent Events (SSE) for streaming
     */
    this.router.post('/stream', ensureAuthenticated, async (req: Request, res: Response) => {
      try {
        const userId = req.user!.id;
        
        // Validate request body
        const schema = z.object({
          projectId: z.string(),
          goal: z.string().min(1),
          context: z.object({
            projectType: z.string().optional(),
            existingFiles: z.array(z.string()).optional(),
            technologies: z.array(z.string()).optional(),
            constraints: z.array(z.string()).optional()
          }).optional()
        });

        const { projectId, goal, context } = schema.parse(req.body);

        // Verify project access
        const project = await this.storage.getProject(projectId);
        if (!project) {
          return res.status(404).json({ error: 'Project not found' });
        }
        if (project.ownerId !== userId) {
          return res.status(403).json({ error: 'Access denied' });
        }

        // Set SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        // Stream plan generation
        let completePlan: any = null;

        for await (const event of aiPlanGenerator.generatePlan(userId, projectId, goal, context)) {
          // Send SSE event
          res.write(`data: ${JSON.stringify(event)}\n\n`);
          
          // Save complete plan when received
          if (event.type === 'plan') {
            completePlan = event.data;
          }
        }

        // Save plan to database
        if (completePlan) {
          const conversationId = await aiPlanGenerator.savePlan(userId, projectId, completePlan);
          
          // Send final event with conversation ID
          res.write(`data: ${JSON.stringify({
            type: 'saved',
            data: {
              conversationId,
              planId: completePlan.id
            }
          })}\n\n`);
        }

        // Close connection
        res.write('data: {"type":"done"}\n\n');
        res.end();

      } catch (error: any) {
        console.error('[AgentPlanRouter] Stream error:', error);
        
        // Send error event
        res.write(`data: ${JSON.stringify({
          type: 'error',
          data: {
            message: error.message || 'Failed to generate plan',
            code: error.code
          }
        })}\n\n`);
        
        res.end();
      }
    });

    /**
     * POST /api/agent/plan/generate
     * Generate plan and return complete result (non-streaming)
     * For backward compatibility with existing frontend
     */
    this.router.post('/generate', ensureAuthenticated, async (req: Request, res: Response) => {
      try {
        const userId = req.user!.id;
        
        // Support both 'goal' and 'prompt' field names
        const goal = req.body.goal || req.body.prompt;
        const context = req.body.context || {};
        const projectId = req.body.projectId;

        if (!goal) {
          return res.status(400).json({ error: 'goal or prompt is required' });
        }

        if (!projectId) {
          return res.status(400).json({ error: 'projectId is required' });
        }

        // Verify project access
        const project = await this.storage.getProject(projectId);
        if (!project) {
          return res.status(404).json({ error: 'Project not found' });
        }
        if (project.ownerId !== userId) {
          return res.status(403).json({ error: 'Access denied' });
        }

        // Collect all streamed data
        let fullResponse = '';
        let plan: any = null;

        for await (const event of aiPlanGenerator.generatePlan(userId, projectId, goal, context)) {
          if (event.type === 'chunk') {
            fullResponse += event.data.content;
          } else if (event.type === 'plan') {
            plan = event.data;
          } else if (event.type === 'error') {
            return res.status(500).json({
              success: false,
              error: event.data.message || 'Failed to generate plan'
            });
          }
        }

        if (!plan) {
          return res.status(500).json({
            success: false,
            error: 'No plan generated'
          });
        }

        // Save plan to database
        const conversationId = await aiPlanGenerator.savePlan(userId, projectId, plan);

        res.json({
          success: true,
          plan,
          conversationId
        });

      } catch (error: any) {
        console.error('[AgentPlanRouter] Generate error:', error);
        res.status(500).json({
          success: false,
          error: error.message || 'Failed to generate plan'
        });
      }
    });

    /**
     * GET /api/agent/plan/:conversationId
     * Get a saved plan from database
     */
    this.router.get('/:conversationId', ensureAuthenticated, async (req: Request, res: Response) => {
      try {
        const userId = req.user!.id;
        const conversationId = parseInt(req.params.conversationId);

        if (isNaN(conversationId)) {
          return res.status(400).json({ error: 'Invalid conversation ID' });
        }

        const conversation = await this.storage.getAiConversation(conversationId);
        
        if (!conversation) {
          return res.status(404).json({ error: 'Plan not found' });
        }

        if (conversation.userId !== userId) {
          return res.status(403).json({ error: 'Access denied' });
        }

        res.json({
          success: true,
          conversation
        });

      } catch (error: any) {
        console.error('[AgentPlanRouter] Get plan error:', error);
        res.status(500).json({
          success: false,
          error: error.message || 'Failed to get plan'
        });
      }
    });
  }

  getRouter(): Router {
    return this.router;
  }
}

export default function createAgentPlanRouter(storage: IStorage): Router {
  const planRouter = new AgentPlanRouter(storage);
  return planRouter.getRouter();
}
