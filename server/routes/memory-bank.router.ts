/**
 * Memory Bank API Routes
 * CRUD operations for project memory bank files
 */

import { Router, Request, Response } from 'express';
import { memoryBankService } from '../services/memory-bank.service';
import { z } from 'zod';
import path from 'path';

const router = Router();

/**
 * Helper to ensure project base path is set before any Memory Bank operation
 * This ensures each project has its Memory Bank in projects/${projectId}/.ecode/memory-bank/
 */
function ensureProjectBasePath(projectId: number): void {
  const projectBasePath = path.join(process.cwd(), 'projects', String(projectId));
  memoryBankService.setProjectBasePath(projectId, projectBasePath);
}

/**
 * GET /api/memory-bank
 * Base route - returns empty data for frontend compatibility
 */
router.get('/', async (_req: Request, res: Response) => {
  res.json({
    initialized: false,
    files: [],
    message: 'No project specified. Use /api/memory-bank/:projectId to access project memory bank.'
  });
});

// Validation schemas
const updateFileSchema = z.object({
  content: z.string().min(1).max(100000) // Max 100KB per file
});

const logChangeSchema = z.object({
  description: z.string().min(1),
  filesAffected: z.array(z.string()),
  reason: z.string().optional()
});

/**
 * GET /api/memory-bank/:projectId
 * Get entire memory bank for a project - AUTO-INITIALIZES if not exists (Replit-identical)
 * 
 * ✅ AUTO-INIT (Dec 15, 2025): Memory Bank now initializes automatically
 * when first requested, eliminating race conditions with /status endpoint.
 */
router.get('/:projectId', async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    // ✅ Ensure project-specific path is set
    ensureProjectBasePath(projectId);
    
    let memoryBank = await memoryBankService.getMemoryBank(projectId);
    
    // ✅ AUTO-INIT: Initialize automatically if not exists
    if (!memoryBank) {
      try {
        memoryBank = await memoryBankService.initialize(projectId, undefined);
        console.log(`[MemoryBank] ✅ Auto-initialized for project ${projectId} on first fetch`);
      } catch (initError) {
        console.warn(`[MemoryBank] Auto-init failed for project ${projectId}:`, initError);
        return res.status(404).json({ 
          error: 'Memory bank not initialized',
          initialized: false 
        });
      }
    }

    res.json(memoryBank);
  } catch (error) {
    console.error('[MemoryBank API] Error getting memory bank:', error);
    res.status(500).json({ error: 'Failed to get memory bank' });
  }
});

/**
 * GET /api/memory-bank/:projectId/status
 * Check if memory bank is initialized - AUTO-INITIALIZES if not (Replit-identical)
 * 
 * ✅ AUTO-INIT (Dec 15, 2025): Memory Bank now initializes automatically
 * when status is first checked for existing projects without Memory Bank.
 */
router.get('/:projectId/status', async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    ensureProjectBasePath(projectId);
    let initialized = await memoryBankService.isInitialized(projectId);
    
    // ✅ AUTO-INIT FALLBACK: Initialize automatically for existing projects
    if (!initialized) {
      try {
        await memoryBankService.initialize(projectId, undefined);
        initialized = true;
        console.log(`[MemoryBank] ✅ Auto-initialized for existing project ${projectId}`);
      } catch (initError) {
        // Non-blocking: return uninitialized status if auto-init fails
        console.warn(`[MemoryBank] Auto-init failed for project ${projectId}:`, initError);
      }
    }
    
    res.json({ initialized });
  } catch (error) {
    console.error('[MemoryBank API] Error checking status:', error);
    res.status(500).json({ error: 'Failed to check memory bank status' });
  }
});

/**
 * GET /api/memory-bank/:projectId/context
 * Get formatted context for agent prompt injection
 */
router.get('/:projectId/context', async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    ensureProjectBasePath(projectId);
    const context = await memoryBankService.getContextForAgent(projectId);
    res.json({ 
      context,
      hasContext: context.length > 0,
      tokenEstimate: Math.ceil(context.length / 4)
    });
  } catch (error) {
    console.error('[MemoryBank API] Error getting context:', error);
    res.status(500).json({ error: 'Failed to get memory bank context' });
  }
});

/**
 * GET /api/memory-bank/:projectId/files/:filename
 * Get a specific memory file
 */
router.get('/:projectId/files/:filename', async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    ensureProjectBasePath(projectId);
    const { filename } = req.params;
    const file = await memoryBankService.getFile(projectId, filename);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json(file);
  } catch (error) {
    console.error('[MemoryBank API] Error getting file:', error);
    res.status(500).json({ error: 'Failed to get file' });
  }
});

/**
 * PUT /api/memory-bank/:projectId/files/:filename
 * Update or create a memory file
 */
router.put('/:projectId/files/:filename', async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    ensureProjectBasePath(projectId);
    const validation = updateFileSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors });
    }

    const { filename } = req.params;
    
    // Ensure filename ends with .md
    const safeFilename = filename.endsWith('.md') ? filename : `${filename}.md`;
    
    const file = await memoryBankService.updateFile(
      projectId, 
      safeFilename, 
      validation.data.content
    );

    if (!file) {
      return res.status(400).json({ error: 'Invalid filename. Only alphanumeric characters, underscores, and hyphens allowed.' });
    }

    res.json({
      message: 'File updated successfully',
      file
    });
  } catch (error) {
    console.error('[MemoryBank API] Error updating file:', error);
    res.status(500).json({ error: 'Failed to update file' });
  }
});

/**
 * DELETE /api/memory-bank/:projectId/files/:filename
 * Delete a memory file
 */
router.delete('/:projectId/files/:filename', async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    ensureProjectBasePath(projectId);
    const { filename } = req.params;
    const deleted = await memoryBankService.deleteFile(projectId, filename);
    
    if (!deleted) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('[MemoryBank API] Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

/**
 * POST /api/memory-bank/:projectId/log-change
 * Log a recent change (called by agent after modifications)
 */
router.post('/:projectId/log-change', async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    ensureProjectBasePath(projectId);
    const validation = logChangeSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors });
    }

    await memoryBankService.logRecentChange(
      projectId,
      validation.data.description,
      validation.data.filesAffected,
      validation.data.reason
    );

    res.json({ message: 'Change logged successfully' });
  } catch (error) {
    console.error('[MemoryBank API] Error logging change:', error);
    res.status(500).json({ error: 'Failed to log change' });
  }
});

/**
 * GET /api/memory-bank/templates
 * Get available default templates
 */
router.get('/templates', async (_req: Request, res: Response) => {
  try {
    const templates = memoryBankService.getDefaultTemplates();
    res.json({ templates });
  } catch (error) {
    console.error('[MemoryBank API] Error getting templates:', error);
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

export default router;
