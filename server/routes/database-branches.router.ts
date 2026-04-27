import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { projects, type User } from '@shared/schema';
import { ensureAuthenticated } from '../middleware/auth';
import {
  projectDatabaseBranchService,
  projectDatabaseService,
} from '../services/project-database-provisioning.service';
import { createLogger } from '../utils/logger';
import { redactErrorForLog } from '../utils/error-redaction';

const logger = createLogger('DatabaseBranchesRouter');
const router = Router({ mergeParams: true });

async function ensureProjectOwner(req: Request, res: Response): Promise<{ projectId: number; userId: number } | null> {
  const projectIdStr = req.params.projectId;
  const projectId = Number(projectIdStr);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    res.status(400).json({ message: 'Invalid project ID' });
    return null;
  }

  const userId = (req.user as User).id;

  const [project] = await db
    .select({ id: projects.id, ownerId: projects.ownerId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) {
    res.status(404).json({ message: 'Project not found' });
    return null;
  }

  if (project.ownerId !== userId) {
    res.status(403).json({ message: 'Forbidden — not your project' });
    return null;
  }

  return { projectId, userId };
}

// GET /api/projects/:projectId/database/branches
router.get('/', ensureAuthenticated, async (req: Request, res: Response) => {
  const ctx = await ensureProjectOwner(req, res);
  if (!ctx) return;

  try {
    const db = await projectDatabaseService.getProjectDatabase(ctx.projectId);
    if (!db) return res.json({ database: null, branches: [] });

    const branches = await projectDatabaseBranchService.listBranches(ctx.projectId);
    return res.json({
      database: {
        id: db.id,
        provider: db.provider,
        status: db.status,
        host: db.host,
        database: db.database,
        mainBranchId: db.providerBranchId,
      },
      branches,
    });
  } catch (err: any) {
    logger.error('Failed to list branches', redactErrorForLog(err));
    return res.status(500).json({ message: err.message || 'Internal error' });
  }
});

// POST /api/projects/:projectId/database/branches
const createBranchSchema = z.object({
  name: z.string().min(1).max(40).regex(/^[a-zA-Z0-9_-]+$/),
  fromBranchId: z.string().optional(),
});

router.post('/', ensureAuthenticated, async (req: Request, res: Response) => {
  const ctx = await ensureProjectOwner(req, res);
  if (!ctx) return;

  const parsed = createBranchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid input', errors: parsed.error.flatten() });
  }

  try {
    const branch = await projectDatabaseBranchService.createBranch(
      ctx.projectId,
      parsed.data.name,
      parsed.data.fromBranchId,
      ctx.userId
    );
    return res.status(201).json(branch);
  } catch (err: any) {
    logger.error('Failed to create branch', redactErrorForLog(err));
    return res.status(400).json({ message: err.message || 'Failed to create branch' });
  }
});

// DELETE /api/projects/:projectId/database/branches/:branchId
router.delete('/:branchId', ensureAuthenticated, async (req: Request, res: Response) => {
  const ctx = await ensureProjectOwner(req, res);
  if (!ctx) return;

  const branchId = Number(req.params.branchId);
  if (!Number.isInteger(branchId) || branchId <= 0) {
    return res.status(400).json({ message: 'Invalid branch ID' });
  }

  try {
    await projectDatabaseBranchService.deleteBranch(ctx.projectId, branchId);
    return res.status(204).send();
  } catch (err: any) {
    logger.error('Failed to delete branch', redactErrorForLog(err));
    return res.status(400).json({ message: err.message || 'Failed to delete branch' });
  }
});

// GET /api/projects/:projectId/database/branches/:branchId/connection-url
router.get('/:branchId/connection-url', ensureAuthenticated, async (req: Request, res: Response) => {
  const ctx = await ensureProjectOwner(req, res);
  if (!ctx) return;

  const branchId = Number(req.params.branchId);
  if (!Number.isInteger(branchId) || branchId <= 0) {
    return res.status(400).json({ message: 'Invalid branch ID' });
  }

  try {
    const url = await projectDatabaseBranchService.getBranchConnectionUrl(ctx.projectId, branchId);
    return res.json({ connectionUrl: url });
  } catch (err: any) {
    logger.error('Failed to get connection URL', redactErrorForLog(err));
    return res.status(400).json({ message: err.message || 'Failed to get connection URL' });
  }
});

// ─── Replit-style Production / Development environments ──────────────

// GET /api/projects/:projectId/database/environments
// Returns { production, development } where development may be null if not yet created
router.get('/environments', ensureAuthenticated, async (req: Request, res: Response) => {
  const ctx = await ensureProjectOwner(req, res);
  if (!ctx) return;

  try {
    const envs = await projectDatabaseBranchService.getEnvironments(ctx.projectId);
    if (!envs) return res.json({ production: null, development: null });
    return res.json(envs);
  } catch (err: any) {
    logger.error('Failed to get environments', err);
    return res.status(500).json({ message: err.message || 'Internal error' });
  }
});

// POST /api/projects/:projectId/database/environments/development
// Creates the development branch if it does not exist (idempotent)
router.post('/environments/development', ensureAuthenticated, async (req: Request, res: Response) => {
  const ctx = await ensureProjectOwner(req, res);
  if (!ctx) return;

  try {
    const dev = await projectDatabaseBranchService.ensureDevelopmentBranch(ctx.projectId, ctx.userId);
    return res.status(201).json(dev);
  } catch (err: any) {
    logger.error('Failed to ensure development branch', err);
    return res.status(400).json({ message: err.message || 'Failed to create development branch' });
  }
});

// POST /api/projects/:projectId/database/environments/development/reset
// Deletes (if present) and recreates the development branch from production
router.post('/environments/development/reset', ensureAuthenticated, async (req: Request, res: Response) => {
  const ctx = await ensureProjectOwner(req, res);
  if (!ctx) return;

  try {
    const dev = await projectDatabaseBranchService.resetDevelopmentBranch(ctx.projectId, ctx.userId);
    return res.status(200).json(dev);
  } catch (err: any) {
    logger.error('Failed to reset development branch', err);
    return res.status(400).json({ message: err.message || 'Failed to reset development branch' });
  }
});

// GET /api/projects/:projectId/database/environments/production/connection-url
router.get('/environments/production/connection-url', ensureAuthenticated, async (req: Request, res: Response) => {
  const ctx = await ensureProjectOwner(req, res);
  if (!ctx) return;

  try {
    const url = await projectDatabaseBranchService.getProductionConnectionUrl(ctx.projectId);
    return res.json({ connectionUrl: url });
  } catch (err: any) {
    logger.error('Failed to get production connection URL', err);
    return res.status(400).json({ message: err.message || 'Failed to get production connection URL' });
  }
});

export default router;
