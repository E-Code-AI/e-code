import { Router, Request, Response, NextFunction } from "express";
import { insertProjectSchema } from "@shared/schema";
import { type IStorage } from "../storage";
import { devAuthBypass, isAuthBypassEnabled } from "../dev-auth-bypass";
import { csrfProtection } from "../middleware/csrf";
import type { User, Project } from "@shared/schema";
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { getProjectAIAgent } from '../services/project-ai-agent.service';
import { aiApprovalQueue } from '../services/ai-approval-queue.service';
import { aiSecurityService } from '../services/ai-security.service';
import { createRateLimitMiddleware } from '../middleware/rate-limiter';

export class ProjectsRouter {
  private router: Router;
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.router = Router();
    this.storage = storage;
    this.initializeRoutes();
  }

  private restoreSessionUser(req: Request): boolean {
    // Standard Passport authentication check (production path)
    if (req.isAuthenticated()) {
      return true;
    }
    
    // Development fallback: Passport deserializeUser populates req.user
    // but isAuthenticated() may return false due to timing or session state
    // This allows tests with valid session cookies to proceed
    if ((process.env.NODE_ENV === 'development' || isAuthBypassEnabled()) && req.user) {
      return true;
    }
    
    return false;
  }

  private ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (this.restoreSessionUser(req)) {
      return next();
    }
    
    res.status(401).json({ 
      message: "Unauthorized",
      code: "AUTH_REQUIRED",
      path: req.path 
    });
  };

  private ensureProjectAccess = async (req: Request, res: Response, next: NextFunction) => {
    // ✅ FIX (Nov 24, 2025): Allow anonymous access with bootstrap token for autonomous workspace creation
    const hasSession = this.restoreSessionUser(req);
    const bootstrapToken = req.query.bootstrap || req.headers['x-bootstrap-token'];
    
    // Require either session OR bootstrap token
    if (!hasSession && !bootstrapToken) {
      return res.status(401).json({ 
        message: "Unauthorized - authentication or bootstrap token required",
        code: "AUTH_REQUIRED" 
      });
    }
    
    // For authenticated users, use their user ID
    // For anonymous users with bootstrap token, skip ownership check (token itself provides auth)
    const userId = hasSession ? (req.user as User).id : null;
    const projectId = (req.params.projectId || req.params.id || '').toString();

    if (!projectId) {
      return res.status(400).json({
        message: "Invalid project ID",
        code: "INVALID_PROJECT_ID"
      });
    }

    // Silently ignore known non-project identifiers (prevents log spam)
    const nonProjectIdentifiers = ['recent', 'new', 'templates', 'search'];
    if (nonProjectIdentifiers.includes(projectId.toLowerCase())) {
      return res.status(404).json({
        message: "Project not found",
        code: "PROJECT_NOT_FOUND",
        projectId
      });
    }

    // Get the project - try by UUID first, then by slug
    let project = await this.storage.getProject(projectId);
    
    if (!project) {
      // If not found by UUID, try by slug (for frontend routing compatibility)
      const projectBySlug = await this.storage.getProjectBySlug(projectId);
      project = projectBySlug || undefined;
    }
    
    if (!project) {
      return res.status(404).json({
        message: "Project not found",
        code: "PROJECT_NOT_FOUND",
        projectId
      });
    }
    
    // Store the actual project ID for downstream use
    req.params.projectId = project.id;
    req.params.id = project.id;
    
    // ✅ FIX (Nov 24, 2025): Validate bootstrap token and enforce project-specific access
    if (bootstrapToken) {
      try {
        // Decode and verify JWT token with shared secret
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
          console.error('[ensureProjectAccess] JWT_SECRET not configured');
          return res.status(500).json({
            message: "Server configuration error",
            code: "JWT_SECRET_MISSING"
          });
        }
        
        const decoded = jwt.verify(bootstrapToken as string, jwtSecret) as {
          projectId: string;
          userId: number;
          type: string;
        };
        
        // Enforce token is project-specific: payload.projectId must match requested project
        // Normalize both to strings for comparison (token may have string ID, project has number)
        const tokenProjectId = String(decoded.projectId);
        const actualProjectId = String(project.id);
        
        if (tokenProjectId !== actualProjectId) {
          console.warn('[ensureProjectAccess] Bootstrap token project mismatch:', {
            tokenProjectId,
            actualProjectId,
            tokenProjectIdType: typeof decoded.projectId,
            actualProjectIdType: typeof project.id
          });
          return res.status(403).json({
            message: "Bootstrap token invalid for this project",
            code: "BOOTSTRAP_TOKEN_MISMATCH"
          });
        }
        
        // Token is valid and project-specific - grant access
        console.log('[ensureProjectAccess] Bootstrap token validated for project:', project.id);
        return next();
        
      } catch (error) {
        // Invalid or expired token
        console.error('[ensureProjectAccess] Bootstrap token validation failed:', error);
        return res.status(401).json({
          message: "Invalid or expired bootstrap token",
          code: "BOOTSTRAP_TOKEN_INVALID",
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    // For authenticated users, check ownership/collaboration/visibility
    if (!userId) {
      // Should not reach here (would have failed earlier auth check)
      return res.status(401).json({
        message: "Unauthorized",
        code: "AUTH_REQUIRED"
      });
    }
    
    // Check if user is owner
    if (project.ownerId === userId) {
      return next();
    }
    
    // Check if user is collaborator
    const collaborators = await this.storage.getProjectCollaborators(projectId);
    const isCollaborator = collaborators.some(c => c.userId === userId);
    
    if (isCollaborator) {
      return next();
    }
    
    // Check if project is public
    if (project.visibility === 'public') {
      return next();
    }
    return res.status(403).json({
      message: "Access denied",
      code: "ACCESS_DENIED",
      projectId,
      userId
    });
  };

  private generateSlug(title: string): string {
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    const randomSuffix = crypto.randomBytes(2).toString('hex');
    return `${baseSlug}-${randomSuffix}`;
  }

  private initializeRoutes() {
    // Get user's projects
    this.router.get("/api/projects", this.ensureAuthenticated, async (req: Request, res: Response) => {
      try {
        const userId = (req.user as User).id;
        const projects = await this.storage.getProjectsByUserId(userId);
        
        // Enrich projects with owner info
        const enrichedProjects = await Promise.all(projects.map(async (project) => {
          const owner = await this.storage.getUser(project.ownerId);
          return { ...project, owner };
        }));
        
        res.json(enrichedProjects);
      } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ 
          message: "Failed to fetch projects",
          code: "FETCH_ERROR"
        });
      }
    });

    // Create a new project
    this.router.post("/api/projects", this.ensureAuthenticated, csrfProtection, async (req: Request, res: Response) => {
      try {
        const userId = (req.user as User).id;
        
        // Add ownerId before validation (required by schema)
        const requestWithOwner = {
          ...req.body,
          ownerId: userId,
        };
        
        const validatedData = insertProjectSchema.parse(requestWithOwner);
        
        // Generate slug if not provided (use name field from schema)
        const slug = validatedData.slug || this.generateSlug(validatedData.name);
        
        // Check if slug is already taken for this user
        const existingProject = await this.storage.getProjectBySlug(slug, userId);
        if (existingProject) {
          return res.status(400).json({
            message: "Project with this slug already exists",
            code: "SLUG_EXISTS"
          });
        }
        
        const project = await this.storage.createProject({
          ...validatedData,
          slug,
          visibility: validatedData.visibility || 'private'
        });
        
        // Include owner info in response for URL construction
        const owner = await this.storage.getUser(userId);
        
        res.json({ ...project, owner });
      } catch (error: any) {
        console.error('Error creating project:', error);
        if (error.name === 'ZodError') {
          return res.status(400).json({ 
            message: "Invalid project data",
            code: "INVALID_INPUT",
            errors: error.errors
          });
        }
        res.status(500).json({ 
          message: "Failed to create project",
          code: "CREATE_ERROR"
        });
      }
    });

    // Get a specific project
    this.router.get("/api/projects/:projectId", this.ensureProjectAccess, async (req: Request, res: Response) => {
      try {
        const projectId = req.params.projectId;
        const project = await this.storage.getProject(projectId);
        
        if (!project) {
          return res.status(404).json({
            message: "Project not found",
            code: "PROJECT_NOT_FOUND"
          });
        }
        
        // Get owner info
        const owner = await this.storage.getUser(project.ownerId);
        
        res.json({ ...project, owner });
      } catch (error) {
        console.error('Error fetching project:', error);
        res.status(500).json({ 
          message: "Failed to fetch project",
          code: "FETCH_ERROR"
        });
      }
    });

    // Update a project
    this.router.put("/api/projects/:projectId", this.ensureProjectAccess, csrfProtection, async (req: Request, res: Response) => {
      try {
        const projectId = req.params.projectId;
        const updates = req.body;
        
        // Don't allow changing owner or id
        delete updates.ownerId;
        delete updates.id;
        
        const project = await this.storage.updateProject(projectId, updates);
        
        if (!project) {
          return res.status(404).json({
            message: "Project not found",
            code: "PROJECT_NOT_FOUND"
          });
        }
        
        res.json(project);
      } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({ 
          message: "Failed to update project",
          code: "UPDATE_ERROR"
        });
      }
    });

    // Delete a project
    this.router.delete("/api/projects/:projectId", this.ensureProjectAccess, csrfProtection, async (req: Request, res: Response) => {
      try {
        const projectId = req.params.projectId;
        const project = await this.storage.getProject(projectId);
        
        if (!project) {
          return res.status(404).json({
            message: "Project not found",
            code: "PROJECT_NOT_FOUND"
          });
        }
        
        // Only owner can delete
        if (project.ownerId !== (req.user as User).id) {
          return res.status(403).json({
            message: "Only project owner can delete",
            code: "NOT_OWNER"
          });
        }
        
        await this.storage.deleteProject(projectId);
        res.json({ message: "Project deleted successfully" });
      } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ 
          message: "Failed to delete project",
          code: "DELETE_ERROR"
        });
      }
    });

    // Get project by slug (for username/slug routes)
    this.router.get("/api/u/:username/:slug", async (req: Request, res: Response) => {
      try {
        const { username, slug } = req.params;
        
        // Get user by username
        const user = await this.storage.getUserByUsername(username);
        if (!user) {
          console.error('[Projects] User not found');
          return res.status(404).json({ 
            error: 'User not found',
            code: 'USER_NOT_FOUND',
            username 
          });
        }
        
        // Get project by slug belonging to the user
        const project = await this.storage.getProjectBySlug(slug, user.id);
        if (!project) {
          console.error('[Projects] Project not found');
          return res.status(404).json({ 
            error: 'Project not found',
            code: 'PROJECT_NOT_FOUND',
            slug,
            username 
          });
        }
        
        // WORKAROUND: If request wants to open workspace, redirect to editor
        // This fixes the "Workspace unavailable" error when Dashboard sends users to /u/:username/:slug
        const wantsWorkspace = req.query.workspace === 'true' || req.query.open === 'true' || req.header('X-Open-Workspace') === 'true';
        if (wantsWorkspace && project?.id) {
          return res.json({
            ...project,
            redirectTo: `/editor/${project.id}`,
            owner: await this.storage.getUser(project.ownerId)
          });
        }
        
        // Restore session user (session-aware auth)
        this.restoreSessionUser(req);
        
        // Check access for private projects
        if (project.visibility === 'private') {
          // Private projects require authentication
          if (!req.user) {
            return res.status(401).json({ 
              error: 'Authentication required for private project',
              code: 'AUTH_REQUIRED' 
            });
          }
          
          // Check if user has access
          if ((req.user as User).id !== project.ownerId) {
            const isCollaborator = await this.storage.isProjectCollaborator(project.id, (req.user as User).id);
            if (!isCollaborator) {
              return res.status(403).json({ 
                error: 'Access denied',
                code: 'ACCESS_DENIED' 
              });
            }
          }
        }
        
        // Get additional project info including owner
        const owner = await this.storage.getUser(project.ownerId);
        res.json({
          ...project,
          owner
        });
      } catch (error) {
        console.error('[Projects] Error accessing project:', error);
        res.status(500).json({ 
          error: 'Failed to access project',
          code: 'SERVER_ERROR' 
        });
      }
    });

    // AI Chat endpoint - Stream AI-generated code responses
    this.router.post('/api/projects/:id/ai/chat', this.ensureProjectAccess, async (req: Request, res: Response) => {
      try {
        const projectId = req.params.id;
        const { message, context } = req.body;

        if (!message || typeof message !== 'string') {
          return res.status(400).json({ 
            error: 'Message is required',
            code: 'INVALID_MESSAGE' 
          });
        }

        // Set up Server-Sent Events (SSE) for streaming
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

        // Get AI agent instance
        const aiAgent = getProjectAIAgent(this.storage);

        // Get user ID for security controls
        const userId = (req.user as any)?.id;
        if (!userId) {
          return res.status(401).json({ error: 'Unauthorized', code: 'NO_USER' });
        }

        // Stream the response with security controls (rate limiting + audit logging)
        try {
          for await (const chunk of aiAgent.processChat(userId, projectId, message, context)) {
            // Check if chunk is already a structured event (JSON object)
            let eventData;
            try {
              const parsed = JSON.parse(chunk);
              // If it's already a structured event with a type, send it directly
              if (parsed.type) {
                eventData = parsed;
              } else {
                // Otherwise wrap as content
                eventData = { content: chunk };
              }
            } catch {
              // Not JSON, wrap as text content
              eventData = { content: chunk };
            }
            
            res.write(`data: ${JSON.stringify(eventData)}\n\n`);
          }

          // Send completion event
          res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
          res.end();
        } catch (streamError: any) {
          console.error('[ProjectAI] Streaming error:', streamError);
          res.write(`data: ${JSON.stringify({ 
            type: 'error', 
            content: streamError.message || 'Streaming failed' 
          })}\n\n`);
          res.end();
        }
      } catch (error: any) {
        console.error('[ProjectAI] Error in AI chat:', error);
        
        // If headers not sent yet, send JSON error
        if (!res.headersSent) {
          res.status(500).json({ 
            error: error.message || 'Failed to process AI request',
            code: 'AI_ERROR' 
          });
        } else {
          // If streaming already started, send error event
          res.write(`data: ${JSON.stringify({ 
            type: 'error', 
            content: error.message || 'AI processing failed' 
          })}\n\n`);
          res.end();
        }
      }
    });

    // POST /api/projects/:id/ai/approve/:actionId - Approve and execute AI action
    this.router.post('/:id/ai/approve/:actionId', this.ensureAuthenticated, createRateLimitMiddleware('ai'), async (req: Request, res: Response) => {
      try {
        const projectId = req.params.id;
        const actionId = req.params.actionId;
        const userId = (req.user as any)?.id;

        if (!userId) {
          return res.status(401).json({ error: 'Unauthorized', code: 'NO_USER' });
        }

        // Get action from approval queue
        const action = await aiApprovalQueue.approve(actionId, userId);

        if (!action) {
          return res.status(404).json({ 
            error: 'Action not found or expired',
            code: 'ACTION_NOT_FOUND' 
          });
        }

        // Execute the action based on type
        if (action.type === 'create_file') {
          try {
            // Validate path again (defense in depth)
            const pathValidation = aiSecurityService.validatePath(action.path);
            if (!pathValidation.valid) {
              // Log security violation
              await aiSecurityService.logAction(userId, projectId, action, {
                success: false,
                error: `Path validation failed: ${pathValidation.reason}`
              });

              return res.status(403).json({ 
                error: pathValidation.reason,
                code: 'SECURITY_BLOCKED' 
              });
            }

            // Create the file using storage
            const file = await this.storage.createFile({
              projectId,
              path: pathValidation.sanitized || action.path,
              content: action.content || ''
            });

            // Log successful action with approval ID
            await aiSecurityService.logAction(userId, projectId, action, {
              success: true,
              fileId: String(file.id)
            }, actionId);

            return res.json({ 
              success: true,
              file,
              message: `Created ${action.path}` 
            });

          } catch (error: any) {
            console.error(`[ProjectAI] Failed to create file:`, error);

            // Log failed action
            await aiSecurityService.logAction(userId, projectId, action, {
              success: false,
              error: error.message
            });

            return res.status(500).json({ 
              error: error.message || 'Failed to create file',
              code: 'EXECUTION_FAILED' 
            });
          }
        } else if (action.type === 'edit_file') {
          // Handle edit_file action
          return res.status(501).json({ 
            error: 'Edit file action not yet implemented',
            code: 'NOT_IMPLEMENTED' 
          });
        } else {
          // TypeScript ensures this is unreachable, but keeping for safety
          return res.status(400).json({ 
            error: `Unsupported action type`,
            code: 'UNSUPPORTED_ACTION' 
          });
        }

      } catch (error: any) {
        console.error('[ProjectAI] Error in approval endpoint:', error);
        return res.status(500).json({ 
          error: error.message || 'Failed to approve action',
          code: 'APPROVAL_ERROR' 
        });
      }
    });

    // POST /api/projects/:id/ai/reject/:actionId - Reject AI action
    this.router.post('/:id/ai/reject/:actionId', this.ensureAuthenticated, createRateLimitMiddleware('ai'), async (req: Request, res: Response) => {
      try {
        const actionId = req.params.actionId;
        const userId = (req.user as any)?.id;
        const { reason } = req.body;

        if (!userId) {
          return res.status(401).json({ error: 'Unauthorized', code: 'NO_USER' });
        }

        const success = aiApprovalQueue.reject(actionId, userId, reason);

        if (!success) {
          return res.status(404).json({ 
            error: 'Action not found or unauthorized',
            code: 'ACTION_NOT_FOUND' 
          });
        }

        return res.json({ 
          success: true,
          message: 'Action rejected' 
        });

      } catch (error: any) {
        console.error('[ProjectAI] Error in reject endpoint:', error);
        return res.status(500).json({ 
          error: error.message || 'Failed to reject action',
          code: 'REJECTION_ERROR' 
        });
      }
    });

    // GET /api/projects/:id/ai/pending - Get pending actions for approval
    this.router.get('/:id/ai/pending', this.ensureAuthenticated, async (req: Request, res: Response) => {
      try {
        const projectId = req.params.id;
        const userId = (req.user as any)?.id;

        if (!userId) {
          return res.status(401).json({ error: 'Unauthorized', code: 'NO_USER' });
        }

        const pending = await aiApprovalQueue.getPendingActions(userId, projectId);

        return res.json({ 
          actions: pending.map(p => ({
            id: p.id,
            action: p.action,
            createdAt: p.createdAt,
            expiresAt: p.expiresAt
          }))
        });

      } catch (error: any) {
        console.error('[ProjectAI] Error getting pending actions:', error);
        return res.status(500).json({ 
          error: error.message || 'Failed to get pending actions',
          code: 'PENDING_ERROR' 
        });
      }
    });
  }

  getRouter(): Router {
    return this.router;
  }
}