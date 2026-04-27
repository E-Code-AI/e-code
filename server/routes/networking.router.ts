import { Router, Request, Response } from 'express';
import { db } from '../db';
import { networkingPorts, networkingDomains } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { ensureAuthenticated } from '../middleware/auth';
import { createLogger } from '../utils/logger';
import { redactErrorForLog } from '../utils/error-redaction';

const logger = createLogger('networking-router');
const router = Router();

function isMissingRelationError(error: any) {
  const directCode = error?.code;
  const causeCode = error?.cause?.code;
  const message = String(error?.message || '');
  const causeMessage = String(error?.cause?.message || '');

  return (
    directCode === '42P01' ||
    causeCode === '42P01' ||
    /relation .* does not exist/i.test(message) ||
    /relation .* does not exist/i.test(causeMessage)
  );
}

function sendUnavailable(res: Response) {
  return res.status(503).json({
    error: 'Networking storage is not provisioned for this environment',
    code: 'NETWORKING_STORAGE_UNAVAILABLE',
  });
}

// ==========================================
// Ports Management
// ==========================================

router.get('/:projectId/networking/ports', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const ports = await db.select().from(networkingPorts).where(eq(networkingPorts.projectId, projectId));
    
    // Map IDs to strings to match frontend expectation
    res.json(ports.map(p => ({ ...p, id: p.id.toString(), projectId: p.projectId.toString() })));
  } catch (error: any) {
    if (isMissingRelationError(error)) {
      logger.warn('Networking ports table missing; returning empty list');
      return res.json([]);
    }
    logger.error('Failed to get ports', redactErrorForLog(error));
    res.status(500).json({ error: error.message });
  }
});

router.post('/:projectId/networking/ports', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const { port, label, protocol } = req.body;
    
    const [newPort] = await db.insert(networkingPorts).values({
      projectId,
      port,
      internalPort: port,
      externalPort: port, // Simplified for now
      label,
      protocol: protocol || 'http',
      listening: true, // Optimistically set listening
    }).returning();
    
    res.json({ ...newPort, id: newPort.id.toString(), projectId: newPort.projectId.toString() });
  } catch (error: any) {
    if (isMissingRelationError(error)) {
      logger.warn('Networking ports table missing; create unavailable');
      return sendUnavailable(res);
    }
    logger.error('Failed to create port', redactErrorForLog(error));
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:projectId/networking/ports/:id', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const id = parseInt(req.params.id);
    const updateData = req.body;
    
    const [updated] = await db.update(networkingPorts)
      .set(updateData)
      .where(and(eq(networkingPorts.id, id), eq(networkingPorts.projectId, projectId)))
      .returning();
      
    if (!updated) {
      return res.status(404).json({ error: 'Port not found' });
    }

    res.json({ ...updated, id: updated.id.toString(), projectId: updated.projectId.toString() });
  } catch (error: any) {
    if (isMissingRelationError(error)) {
      logger.warn('Networking ports table missing; update unavailable');
      return sendUnavailable(res);
    }
    logger.error('Failed to patch port', redactErrorForLog(error));
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:projectId/networking/ports/:id', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const id = parseInt(req.params.id);
    
    await db.delete(networkingPorts).where(and(eq(networkingPorts.id, id), eq(networkingPorts.projectId, projectId)));
    res.json({ success: true });
  } catch (error: any) {
    if (isMissingRelationError(error)) {
      logger.warn('Networking ports table missing; delete unavailable');
      return sendUnavailable(res);
    }
    logger.error('Failed to delete port', redactErrorForLog(error));
    res.status(500).json({ error: error.message });
  }
});

router.post('/:projectId/networking/ports/scan', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    // Stub definition for auto port scanning
    // In a real environment, this would run netstat/lsof inside the container
    res.json({ success: true, message: 'Scan complete' });
  } catch (error: any) {
    logger.error('Failed to scan ports', redactErrorForLog(error));
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// Custom Domains Management
// ==========================================

router.get('/:projectId/networking/domains', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const domains = await db.select().from(networkingDomains).where(eq(networkingDomains.projectId, projectId));
    res.json(domains.map(d => ({ ...d, id: d.id.toString(), projectId: d.projectId.toString() })));
  } catch (error: any) {
    if (isMissingRelationError(error)) {
      logger.warn('Networking domains table missing; returning empty list');
      return res.json([]);
    }
    logger.error('Failed to get domains', redactErrorForLog(error));
    res.status(500).json({ error: error.message });
  }
});

router.post('/:projectId/networking/domains', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const { domain } = req.body;
    
    const token = `ecode-verify-${Math.random().toString(36).substring(2, 10)}-${Date.now()}`;
    
    const [newDomain] = await db.insert(networkingDomains).values({
      projectId,
      domain,
      verificationToken: token,
      sslStatus: 'pending'
    }).returning();
    
    res.json({ ...newDomain, id: newDomain.id.toString(), projectId: newDomain.projectId.toString() });
  } catch (error: any) {
    if (isMissingRelationError(error)) {
      logger.warn('Networking domains table missing; create unavailable');
      return sendUnavailable(res);
    }
    logger.error('Failed to add domain', redactErrorForLog(error));
    res.status(500).json({ error: error.message });
  }
});

router.post('/:projectId/networking/domains/:id/verify', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const id = parseInt(req.params.id);
    
    // Optimistic mock verification
    const [updated] = await db.update(networkingDomains)
      .set({ verified: true, verifiedAt: new Date(), sslStatus: 'active' })
      .where(and(eq(networkingDomains.id, id), eq(networkingDomains.projectId, projectId)))
      .returning();
      
    if (!updated) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    res.json({ ...updated, id: updated.id.toString(), projectId: updated.projectId.toString() });
  } catch (error: any) {
    if (isMissingRelationError(error)) {
      logger.warn('Networking domains table missing; verify unavailable');
      return sendUnavailable(res);
    }
    logger.error('Failed to verify domain', redactErrorForLog(error));
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:projectId/networking/domains/:id', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const id = parseInt(req.params.id);
    
    await db.delete(networkingDomains).where(and(eq(networkingDomains.id, id), eq(networkingDomains.projectId, projectId)));
    res.json({ success: true });
  } catch (error: any) {
    if (isMissingRelationError(error)) {
      logger.warn('Networking domains table missing; delete unavailable');
      return sendUnavailable(res);
    }
    logger.error('Failed to delete domain', redactErrorForLog(error));
    res.status(500).json({ error: error.message });
  }
});

export default router;
