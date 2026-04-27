import { agentSkills,projectSlidesCollection,visitorFeedback } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { Request,Response,Router } from 'express';
import { db } from '../db';
import { ensureAuthenticated } from '../middleware/auth';
import { createLogger } from '../utils/logger';
import { redactErrorForLog } from '../utils/error-redaction';

const logger = createLogger('phantom-panels-router');
const router = Router();

// ==========================================
// Skills Panel Routes (/api/skills)
// ==========================================

router.get('/skills/:projectId', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const skills = await db.select().from(agentSkills).where(eq(agentSkills.projectId, projectId));
    res.json(skills);
  } catch (error: any) {
    logger.error('Failed to get skills', redactErrorForLog(error));
    res.status(500).json({ error: error.message });
  }
});

router.post('/skills/:projectId', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const { name, description, content } = req.body;
    
    const [newSkill] = await db.insert(agentSkills).values({
      projectId,
      name,
      description: description || '',
      content,
      isActive: true,
    }).returning();
    
    res.json(newSkill);
  } catch (error: any) {
    logger.error('Failed to create skill', redactErrorForLog(error));
    res.status(500).json({ error: error.message });
  }
});

router.put('/skills/:id', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, content, isActive } = req.body;
    
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (content !== undefined) updateData.content = content;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    const [updated] = await db.update(agentSkills)
      .set(updateData)
      .where(eq(agentSkills.id, id))
      .returning();
      
    res.json(updated);
  } catch (error: any) {
    logger.error('Failed to update skill', redactErrorForLog(error));
    res.status(500).json({ error: error.message });
  }
});

router.delete('/skills/:id', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(agentSkills).where(eq(agentSkills.id, id));
    res.json({ success: true });
  } catch (error: any) {
    logger.error('Failed to delete skill', redactErrorForLog(error));
    res.status(500).json({ error: error.message });
  }
});

router.post('/skills/:projectId/upload', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const { filename, content } = req.body;
    const name = filename.replace('.md', '');
    
    const [newSkill] = await db.insert(agentSkills).values({
      projectId,
      name,
      description: `Imported from ${filename}`,
      content,
      isActive: true,
    }).returning();
    
    res.json(newSkill);
  } catch (error: any) {
    logger.error('Failed to upload skill', redactErrorForLog(error));
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// Feedback Inbox Routes (/api/projects/:projectId/feedback)
// ==========================================

router.get('/projects/:projectId/feedback', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const { status } = req.query;
    
    let query = db.select().from(visitorFeedback).where(eq(visitorFeedback.projectId, projectId));
    
    const results = await query;
    // Client-side filtration handles the 'status' or we do it here
    const filtered = status && status !== 'all' 
      ? results.filter(f => f.status === status) 
      : results;
      
    res.json(filtered);
  } catch (error: any) {
    logger.error('Failed to get feedback', redactErrorForLog(error));
    res.status(500).json({ error: error.message });
  }
});

router.patch('/projects/:projectId/feedback/:id', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    
    const [updated] = await db.update(visitorFeedback)
      .set({ 
        status, 
        resolvedAt: status === 'resolved' ? new Date() : null 
      })
      .where(eq(visitorFeedback.id, id))
      .returning();
      
    res.json(updated);
  } catch (error: any) {
    logger.error('Failed to patch feedback', redactErrorForLog(error));
    res.status(500).json({ error: error.message });
  }
});

router.delete('/projects/:projectId/feedback/:id', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(visitorFeedback).where(eq(visitorFeedback.id, id));
    res.json({ success: true });
  } catch (error: any) {
    logger.error('Failed to delete feedback', redactErrorForLog(error));
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// Slide Editor Routes (/api/projects/:projectId/slides)
// ==========================================

router.get('/projects/:projectId/slides', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const [slides] = await db.select().from(projectSlidesCollection).where(eq(projectSlidesCollection.projectId, projectId));
    
    if (!slides) {
      return res.json({ slides: [], theme: null });
    }
    
    res.json({ slides: slides.slides, theme: slides.theme });
  } catch (error: any) {
    logger.error('Failed to get slides', redactErrorForLog(error));
    res.status(500).json({ error: error.message });
  }
});

router.put('/projects/:projectId/slides', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const { slides, theme } = req.body;
    
    const existing = await db.select().from(projectSlidesCollection).where(eq(projectSlidesCollection.projectId, projectId));
    
    if (existing.length === 0) {
      await db.insert(projectSlidesCollection).values({
        projectId,
        slides,
        theme,
      });
    } else {
      await db.update(projectSlidesCollection)
        .set({ slides, theme, updatedAt: new Date() })
        .where(eq(projectSlidesCollection.projectId, projectId));
    }
    
    res.json({ success: true });
  } catch (error: any) {
    logger.error('Failed to save slides', redactErrorForLog(error));
    res.status(500).json({ error: error.message });
  }
});

export default router;
