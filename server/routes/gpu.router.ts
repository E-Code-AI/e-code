/**
 * GPU scheduler endpoints — owner-scoped acquire/release/pool surface.
 *
 *   POST   /api/gpu/acquire        body: { projectId, gpuType, region?, estimatedDurationMin? }
 *   POST   /api/gpu/release/:usageId body: { gpuUtilization?, memoryUsedMb? }
 *   GET    /api/gpu/pool           returns capacity by gpuType
 *
 * Acquire requires the caller to own the target project; release verifies
 * the lease's user matches the caller.
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { ensureAuthenticated } from '../middleware/auth';
import { gpuScheduler } from '../services/gpu-scheduler.service';
import { storage } from '../storage';
import { db } from '../db';
import { gpuUsage } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { createLogger } from '../utils/logger';

const logger = createLogger('gpu-router');
const router = Router();

const AcquireSchema = z.object({
  projectId: z.number().int().positive(),
  gpuType: z.enum(['T4', 'A10G', 'A100', 'H100']),
  region: z.string().min(1).max(50).optional(),
  estimatedDurationMin: z.number().int().positive().max(24 * 60).optional(),
});

const ReleaseSchema = z.object({
  gpuUtilization: z.number().int().min(0).max(100).optional(),
  memoryUsedMb: z.number().int().min(0).optional(),
});

router.post('/acquire', ensureAuthenticated, async (req: Request, res: Response) => {
  const userId = (req.user as { id: number }).id;
  const parsed = AcquireSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid body', errors: parsed.error.errors });

  // Caller must own the project (or be a collaborator with edit rights —
  // strict ownership for now since GPU is billable).
  const project = await storage.getProject(String(parsed.data.projectId));
  if (!project) return res.status(404).json({ message: 'Project not found' });
  if (project.ownerId !== userId) {
    return res.status(403).json({ message: 'Only the project owner can acquire a GPU lease' });
  }

  try {
    const lease = await gpuScheduler.acquire({ ...parsed.data, userId });
    res.status(201).json(lease);
  } catch (err: any) {
    logger.error('acquire failed', { error: err?.message || String(err), userId });
    res.status(500).json({ message: 'Failed to acquire GPU lease', detail: err?.message });
  }
});

router.post('/release/:usageId', ensureAuthenticated, async (req: Request, res: Response) => {
  const userId = (req.user as { id: number }).id;
  const usageId = Number(req.params.usageId);
  if (!Number.isFinite(usageId)) return res.status(400).json({ message: 'Invalid usage id' });

  const [row] = await db.select().from(gpuUsage).where(eq(gpuUsage.id, usageId));
  if (!row) return res.status(404).json({ message: 'Lease not found' });
  if (row.userId !== userId) return res.status(403).json({ message: 'Lease belongs to another user' });
  if (row.endTime) return res.status(409).json({ message: 'Lease already released' });

  const parsed = ReleaseSchema.safeParse(req.body || {});
  const metrics = parsed.success ? parsed.data : {};

  try {
    await gpuScheduler.release(usageId, metrics);
    res.json({ ok: true });
  } catch (err: any) {
    logger.error('release failed', { error: err?.message || String(err), usageId });
    res.status(500).json({ message: 'Failed to release lease', detail: err?.message });
  }
});

router.get('/pool', ensureAuthenticated, async (_req: Request, res: Response) => {
  try {
    const pool = await gpuScheduler.pool();
    res.json({ pool });
  } catch (err: any) {
    logger.error('pool failed', { error: err?.message || String(err) });
    res.status(500).json({ message: 'Failed to read GPU pool' });
  }
});

export default router;
