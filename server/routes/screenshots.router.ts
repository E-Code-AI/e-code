import { Router } from 'express';
import { z } from 'zod';
import { createLogger } from '../utils/logger';
import { db } from '../db';
import { projectScreenshots, projects } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import { ensureAuthenticated } from '../middleware/auth';
import { csrfProtection } from '../middleware/csrf';
import { screenshotService } from '../services/screenshot-service';
import { storage } from '../storage';

const router = Router();
const logger = createLogger('screenshots');

router.use(ensureAuthenticated);

router.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return csrfProtection(req, res, next);
  }
  return next();
});

const captureSchema = z.object({
  url: z.string().url().optional(),
  fullPage: z.boolean().optional().default(false),
  deviceType: z.enum(['desktop', 'tablet', 'mobile']).optional().default('desktop'),
  title: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
});

async function assertProjectAccess(userId: number, projectId: number): Promise<boolean> {
  if (!Number.isFinite(userId) || !Number.isFinite(projectId) || userId <= 0 || projectId <= 0) {
    return false;
  }
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) return false;
  if (project.ownerId === userId) return true;
  const collaborators = await storage.getProjectCollaborators(String(projectId)).catch(() => []);
  return collaborators.some((collaborator: any) => collaborator.userId === userId);
}

function toApiShape(row: typeof projectScreenshots.$inferSelect) {
  return {
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    name: row.title,
    description: row.description ?? undefined,
    imageUrl: row.imageUrl,
    thumbnailUrl: row.imageUrl,
    url: row.imageUrl,
    createdAt: row.createdAt?.toISOString?.() ?? row.createdAt,
    createdBy: row.createdBy,
  };
}

// GET /api/screenshots/:projectId — list screenshots for a project
router.get('/:projectId', async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    const userId = (req.user as any)?.id;

    if (!Number.isFinite(projectId)) {
      return res.status(400).json({ error: 'Invalid projectId' });
    }
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!(await assertProjectAccess(userId, projectId))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const rows = await db
      .select()
      .from(projectScreenshots)
      .where(eq(projectScreenshots.projectId, projectId))
      .orderBy(desc(projectScreenshots.createdAt))
      .limit(200);

    res.json(rows.map(toApiShape));
  } catch (error: any) {
    logger.error('Failed to list screenshots', { error: error?.message });
    res.status(500).json({ error: 'Failed to list screenshots' });
  }
});

// POST /api/screenshots/:projectId/capture — capture a new screenshot
router.post('/:projectId/capture', async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    const userId = (req.user as any)?.id;

    if (!Number.isFinite(projectId)) {
      return res.status(400).json({ error: 'Invalid projectId' });
    }
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!(await assertProjectAccess(userId, projectId))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const parsed = captureSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    }
    const { fullPage, deviceType, title, description } = parsed.data;

    const captured = await screenshotService.captureProjectPreview(projectId, userId, {
      deviceType,
      fullPage,
      requireRealCapture: true,
      storeAsBase64: true,
      storeInObjectStorage: true,
      metadata: {
        deviceType,
        fullPage: String(fullPage),
        capturedBy: String(userId),
      },
    });

    const imageUrl =
      (captured as any)?.storageObject?.url ||
      captured.base64Data ||
      captured.thumbnail;

    const [row] = await db
      .insert(projectScreenshots)
      .values({
        projectId,
        title: title ?? `Screenshot ${new Date().toISOString()}`,
        description: description ?? null,
        imageUrl,
        createdBy: userId,
      })
      .returning();

    res.status(201).json(toApiShape(row));
  } catch (error: any) {
    logger.error('Failed to capture screenshot', { error: error?.message, projectId: req.params.projectId });
    res.status(500).json({ error: 'Failed to capture screenshot', message: error?.message });
  }
});

// GET /api/screenshots/:id/download — stream or redirect to the image
router.get('/:id/download', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const userId = (req.user as any)?.id;
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'Invalid screenshot id' });
    }

    const [row] = await db
      .select()
      .from(projectScreenshots)
      .where(eq(projectScreenshots.id, id))
      .limit(1);
    if (!row) return res.status(404).json({ error: 'Screenshot not found' });
    if (!(await assertProjectAccess(userId, row.projectId))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (row.imageUrl?.startsWith('data:')) {
      const match = row.imageUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        res.setHeader('Content-Type', match[1]);
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="screenshot-${row.id}.${match[1].includes('svg') ? 'svg' : 'png'}"`
        );
        return res.send(Buffer.from(match[2], 'base64'));
      }
    }

    if (row.imageUrl) {
      return res.redirect(row.imageUrl);
    }

    res.status(404).json({ error: 'No image data available' });
  } catch (error: any) {
    logger.error('Failed to download screenshot', { error: error?.message });
    res.status(500).json({ error: 'Failed to download screenshot' });
  }
});

// DELETE /api/screenshots/:id — delete screenshot
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const userId = (req.user as any)?.id;

    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'Invalid screenshot id' });
    }

    const [row] = await db
      .select()
      .from(projectScreenshots)
      .where(eq(projectScreenshots.id, id))
      .limit(1);
    if (!row) return res.status(404).json({ error: 'Screenshot not found' });
    if (!(await assertProjectAccess(userId, row.projectId))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await db.delete(projectScreenshots).where(eq(projectScreenshots.id, id));

    res.json({ success: true, id });
  } catch (error: any) {
    logger.error('Failed to delete screenshot', { error: error?.message });
    res.status(500).json({ error: 'Failed to delete screenshot' });
  }
});

export default router;
