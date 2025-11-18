/**
 * Runtime Router for E-Code Platform
 * Handles project runtime lifecycle (start, stop, status, execute, logs)
 */

import { Router } from 'express';
import { ensureAuthenticated } from '../middleware/auth';
import {
  getRuntimeDependencies,
  startProjectRuntime,
  stopProjectRuntime,
  getProjectRuntimeStatus,
  executeProjectCommand,
  getProjectRuntimeLogs
} from '../runtimes/api';
import { storage } from '../storage';

const router = Router();

/**
 * Middleware to ensure user has access to project
 */
async function ensureProjectAccess(req: any, res: any, next: any) {
  try {
    const projectId = req.params.id || req.params.projectId;
    
    // Validate project ID format (UUID or numeric)
    if (!projectId || (typeof projectId === 'string' && projectId.trim().length === 0)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }
    
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const project = await storage.getProject(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Check if user owns the project
    if (project.ownerId === userId) {
      return next();
    }
    
    // Check if user is a collaborator
    const collaborators = await storage.getProjectCollaborators(projectId);
    const isCollaborator = collaborators.some((c: any) => c.userId === userId);
    
    if (!isCollaborator) {
      return res.status(403).json({ error: "You don't have access to this project" });
    }
    
    next();
  } catch (error) {
    console.error('Error checking project access:', error);
    res.status(500).json({ error: 'Failed to verify project access' });
  }
}

// ===============================
// Project-Scoped Runtime Routes (CANONICAL)
// ===============================

/**
 * POST /api/projects/:id/runtime/start
 * Start a project's runtime
 */
router.post('/api/projects/:id/runtime/start', ensureAuthenticated, ensureProjectAccess, startProjectRuntime);

/**
 * POST /api/projects/:id/runtime/stop
 * Stop a project's runtime
 */
router.post('/api/projects/:id/runtime/stop', ensureAuthenticated, ensureProjectAccess, stopProjectRuntime);

/**
 * GET /api/projects/:id/runtime
 * Get project runtime status
 */
router.get('/api/projects/:id/runtime', ensureAuthenticated, ensureProjectAccess, getProjectRuntimeStatus);

/**
 * POST /api/projects/:id/runtime/execute
 * Execute command in project runtime
 */
router.post('/api/projects/:id/runtime/execute', ensureAuthenticated, ensureProjectAccess, executeProjectCommand);

/**
 * GET /api/projects/:id/runtime/logs
 * Get project runtime logs
 */
router.get('/api/projects/:id/runtime/logs', ensureAuthenticated, ensureProjectAccess, getProjectRuntimeLogs);

// ===============================
// Alternative Runtime Routes (COMPATIBILITY)
// These proxy to project-scoped routes for backward compatibility
// ===============================

/**
 * POST /api/runtime/start
 * Start runtime (requires projectId in body)
 */
router.post('/api/runtime/start', ensureAuthenticated, async (req, res) => {
  const { projectId } = req.body;
  
  if (!projectId) {
    return res.status(400).json({ error: 'projectId is required in request body' });
  }
  
  // Set projectId in params for downstream handler
  req.params.id = projectId.toString();
  
  return ensureProjectAccess(req, res, () => startProjectRuntime(req, res));
});

/**
 * POST /api/runtime/stop
 * Stop runtime (requires projectId in body)
 */
router.post('/api/runtime/stop', ensureAuthenticated, async (req, res) => {
  const { projectId } = req.body;
  
  if (!projectId) {
    return res.status(400).json({ error: 'projectId is required in request body' });
  }
  
  req.params.id = projectId.toString();
  
  return ensureProjectAccess(req, res, () => stopProjectRuntime(req, res));
});

/**
 * GET /api/runtime/:projectId
 * Get runtime status (projectId in path)
 */
router.get('/api/runtime/:projectId', ensureAuthenticated, async (req, res) => {
  const { projectId } = req.params;
  
  req.params.id = projectId;
  
  return ensureProjectAccess(req, res, () => getProjectRuntimeStatus(req, res));
});

/**
 * POST /api/runtime/:projectId/start
 * Start runtime (projectId in path)
 */
router.post('/api/runtime/:projectId/start', ensureAuthenticated, async (req, res) => {
  const { projectId } = req.params;
  
  req.params.id = projectId;
  
  return ensureProjectAccess(req, res, () => startProjectRuntime(req, res));
});

/**
 * POST /api/runtime/:projectId/stop
 * Stop runtime (projectId in path)
 */
router.post('/api/runtime/:projectId/stop', ensureAuthenticated, async (req, res) => {
  const { projectId } = req.params;
  
  req.params.id = projectId;
  
  return ensureProjectAccess(req, res, () => stopProjectRuntime(req, res));
});

/**
 * POST /api/runtime/:projectId/execute
 * Execute command (projectId in path)
 */
router.post('/api/runtime/:projectId/execute', ensureAuthenticated, async (req, res) => {
  const { projectId } = req.params;
  
  req.params.id = projectId;
  
  return ensureProjectAccess(req, res, () => executeProjectCommand(req, res));
});

/**
 * GET /api/runtime/:projectId/logs
 * Get logs (projectId in path)
 */
router.get('/api/runtime/:projectId/logs', ensureAuthenticated, async (req, res) => {
  const { projectId } = req.params;
  
  req.params.id = projectId;
  
  return ensureProjectAccess(req, res, () => getProjectRuntimeLogs(req, res));
});

// ===============================
// System Runtime Routes
// ===============================

/**
 * GET /api/runtime/dependencies
 * Get runtime dependencies (Docker, Nix, languages)
 */
router.get('/api/runtime/dependencies', getRuntimeDependencies);

export default router;
