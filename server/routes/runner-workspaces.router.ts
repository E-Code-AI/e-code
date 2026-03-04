/**
 * Runner Workspaces Router
 * 
 * Manages live workspace sessions on an optional external Runner service.
 * When RUNNER_BASE_URL is not configured, returns 503 with a clear message.
 * When configured, creates/gets/stops workspaces and issues short-lived access tokens.
 */

import { Router } from 'express';
import { z } from 'zod';
import { ensureAuthenticated } from '../middleware/auth';
import { db } from '../db';
import { runnerWorkspaces, projects } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { createLogger } from '../utils/logger';
import {
  isRunnerEnabled,
  createRunnerWorkspace,
  getRunnerWorkspace,
  stopRunnerWorkspace,
  generateRunnerToken,
} from '../services/runner.service';

const logger = createLogger('runner-workspaces');
const router = Router();

router.use(ensureAuthenticated);

// GET /api/runner/status — check if Runner is enabled
router.get('/status', (_req, res) => {
  res.json({ enabled: isRunnerEnabled() });
});

// GET /api/runner/workspaces/:projectId — get current workspace state
router.get('/workspaces/:projectId', async (req, res) => {
  const projectId = parseInt(req.params.projectId, 10);
  if (isNaN(projectId)) return res.status(400).json({ error: 'Invalid projectId' });

  const [row] = await db
    .select()
    .from(runnerWorkspaces)
    .where(eq(runnerWorkspaces.projectId, projectId))
    .limit(1);

  if (!row) return res.json({ exists: false });

  if (isRunnerEnabled()) {
    try {
      const live = await getRunnerWorkspace(row.workspaceId);
      await db
        .update(runnerWorkspaces)
        .set({ status: live.status, updatedAt: new Date() })
        .where(eq(runnerWorkspaces.projectId, projectId));
      return res.json({ exists: true, ...row, status: live.status, previewUrl: live.previewUrl ?? row.previewUrl });
    } catch (err) {
      logger.warn(`[Runner] Could not refresh workspace ${row.workspaceId}: ${err}`);
    }
  }

  res.json({ exists: true, ...row });
});

// POST /api/runner/workspaces/:projectId — create or return existing workspace
router.post('/workspaces/:projectId', async (req, res) => {
  const projectId = parseInt(req.params.projectId, 10);
  if (isNaN(projectId)) return res.status(400).json({ error: 'Invalid projectId' });

  if (!isRunnerEnabled()) {
    return res.status(503).json({
      error: 'Runner service not configured',
      hint: 'Set RUNNER_BASE_URL and RUNNER_JWT_SECRET environment variables to enable external Runner.',
    });
  }

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) return res.status(404).json({ error: 'Project not found' });

  const [existing] = await db
    .select()
    .from(runnerWorkspaces)
    .where(eq(runnerWorkspaces.projectId, projectId))
    .limit(1);

  if (existing) {
    logger.info(`[Runner] Returning existing workspace ${existing.workspaceId} for project ${projectId}`);
    return res.json(existing);
  }

  try {
    const info = await createRunnerWorkspace(projectId, project.name);

    const [created] = await db
      .insert(runnerWorkspaces)
      .values({
        projectId,
        workspaceId: info.workspaceId,
        status: info.status ?? 'starting',
        previewUrl: info.previewUrl ?? null,
        runnerUrl: process.env.RUNNER_BASE_URL ?? null,
      })
      .returning();

    res.status(201).json(created);
  } catch (err: any) {
    logger.error(`[Runner] Failed to create workspace for project ${projectId}: ${err.message}`);
    res.status(502).json({ error: 'Runner error', detail: err.message });
  }
});

// DELETE /api/runner/workspaces/:projectId — stop and remove workspace
router.delete('/workspaces/:projectId', async (req, res) => {
  const projectId = parseInt(req.params.projectId, 10);
  if (isNaN(projectId)) return res.status(400).json({ error: 'Invalid projectId' });

  const [row] = await db
    .select()
    .from(runnerWorkspaces)
    .where(eq(runnerWorkspaces.projectId, projectId))
    .limit(1);

  if (!row) return res.status(404).json({ error: 'No workspace found for this project' });

  if (isRunnerEnabled()) {
    try {
      await stopRunnerWorkspace(row.workspaceId);
    } catch (err) {
      logger.warn(`[Runner] Stop workspace returned error (ignoring): ${err}`);
    }
  }

  await db.delete(runnerWorkspaces).where(eq(runnerWorkspaces.projectId, projectId));

  res.json({ stopped: true });
});

// GET /api/runner/workspaces/:projectId/token — short-lived JWT for direct Runner access
router.get('/workspaces/:projectId/token', async (req, res) => {
  const projectId = parseInt(req.params.projectId, 10);
  if (isNaN(projectId)) return res.status(400).json({ error: 'Invalid projectId' });

  if (!isRunnerEnabled()) {
    return res.status(503).json({ error: 'Runner service not configured' });
  }

  const [row] = await db
    .select()
    .from(runnerWorkspaces)
    .where(eq(runnerWorkspaces.projectId, projectId))
    .limit(1);

  if (!row) return res.status(404).json({ error: 'No workspace found — start one first' });

  const userId = (req.user as any)?.id ?? 0;
  const token = generateRunnerToken(row.workspaceId, userId);

  res.json({
    token,
    workspaceId: row.workspaceId,
    runnerUrl: row.runnerUrl,
    previewUrl: row.previewUrl,
  });
});

export default router;
