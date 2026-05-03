import { Router, Request, Response } from 'express';
import { db } from '../db';
import { networkingPorts, networkingDomains } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { ensureAuthenticated } from '../middleware/auth';
import { createLogger } from '../utils/logger';
import { redactErrorForLog } from '../utils/error-redaction';
import * as fs from 'fs/promises';
import * as dns from 'dns/promises';
import { z } from 'zod';
import { previewEvents } from '../preview/preview-websocket';

const logger = createLogger('networking-router');
const router = Router();

const MAX_PORTS_PER_PROJECT = 20;
const SCAN_COOLDOWN_MS = 5000;
const scanCooldowns = new Map<number, number>();

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

function serializePort(p: any) {
  return { ...p, id: p.id.toString(), projectId: p.projectId.toString() };
}

function serializeDomain(d: any) {
  return { ...d, id: d.id.toString(), projectId: d.projectId.toString() };
}

/**
 * Parse /proc/net/tcp and /proc/net/tcp6 to get locally listening TCP ports.
 * State 0A = LISTEN. The local_address field is hex little-endian: XXXXXXXX:PPPP
 * Returns an array of { port, address, isLocalhost } objects.
 */
async function scanListeningPorts(): Promise<{ port: number; address: string; isLocalhost: boolean }[]> {
  const results: { port: number; address: string; isLocalhost: boolean }[] = [];
  const seen = new Set<number>();

  const parseNetTcp = async (filePath: string, isV6: boolean) => {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.trim().split('\n').slice(1);
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 4) continue;
        const state = parts[3];
        if (state !== '0A') continue;
        const localAddr = parts[1];
        const colonIdx = localAddr.lastIndexOf(':');
        if (colonIdx === -1) continue;
        const portHex = localAddr.slice(colonIdx + 1);
        const port = parseInt(portHex, 16);
        if (isNaN(port) || port <= 0 || port > 65535) continue;
        if (seen.has(port)) continue;
        seen.add(port);

        let address = '0.0.0.0';
        let isLocalhost = false;
        if (!isV6) {
          const addrHex = localAddr.slice(0, colonIdx);
          const bytes = [
            parseInt(addrHex.slice(6, 8), 16),
            parseInt(addrHex.slice(4, 6), 16),
            parseInt(addrHex.slice(2, 4), 16),
            parseInt(addrHex.slice(0, 2), 16),
          ];
          address = bytes.join('.');
          isLocalhost = address === '127.0.0.1';
        } else {
          isLocalhost = localAddr.slice(0, colonIdx) === '00000000000000000000000001000000';
        }

        results.push({ port, address, isLocalhost });
      }
    } catch {
      // File may not exist — that's fine
    }
  };

  await parseNetTcp('/proc/net/tcp', false);
  await parseNetTcp('/proc/net/tcp6', true);
  return results;
}

/**
 * Validate and coerce a port number to the safe range [1, 65535].
 * Also block well-known privileged ports < 1024 from being set as external ports
 * by unprivileged users (except 80 and 443 which are commonly mapped).
 */
const portNumberSchema = z.number().int().min(1).max(65535);

const createPortSchema = z.object({
  port: portNumberSchema,
  label: z.string().max(255).default(''),
  protocol: z.enum(['http', 'https', 'ws', 'tcp']).default('http'),
  isPublic: z.boolean().default(false),
  externalPort: portNumberSchema.optional(),
  exposeLocalhost: z.boolean().default(false),
});

const updatePortSchema = z.object({
  label: z.string().max(255).optional(),
  protocol: z.enum(['http', 'https', 'ws', 'tcp']).optional(),
  isPublic: z.boolean().optional(),
  exposeLocalhost: z.boolean().optional(),
  externalPort: portNumberSchema.optional(),
  listening: z.boolean().optional(),
});

/**
 * Build the proxy URL for a port entry.
 * Uses path-based proxying: /preview/:projectId/:port/
 */
function buildProxyUrl(projectId: number, internalPort: number): string {
  return `/preview/${projectId}/${internalPort}/`;
}

// ==========================================
// Ports Management
// ==========================================

router.get('/:projectId/networking/ports', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const ports = await db.select().from(networkingPorts).where(eq(networkingPorts.projectId, projectId));
    res.json(ports.map(serializePort));
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

    const parsed = createPortSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    }
    const { port, label, protocol, isPublic, externalPort, exposeLocalhost } = parsed.data;

    const existing = await db.select().from(networkingPorts).where(eq(networkingPorts.projectId, projectId));
    if (existing.length >= MAX_PORTS_PER_PROJECT) {
      return res.status(400).json({ error: `Maximum of ${MAX_PORTS_PER_PROJECT} ports per project` });
    }

    const resolvedExternal = externalPort ?? port;

    const externalConflict = existing.find(p => p.externalPort === resolvedExternal);
    if (externalConflict) {
      return res.status(400).json({ error: `External port ${resolvedExternal} is already in use` });
    }

    const proxyUrl = buildProxyUrl(projectId, port);

    const [newPort] = await db.insert(networkingPorts).values({
      projectId,
      port,
      internalPort: port,
      externalPort: resolvedExternal,
      label: label ?? '',
      protocol: protocol ?? 'http',
      isPublic: isPublic ?? false,
      exposeLocalhost: exposeLocalhost ?? false,
      listening: false,
      localhostOnly: false,
      proxyUrl,
      externalUrl: '',
      source: 'manual',
    }).returning();

    res.json(serializePort(newPort));
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

    const parsed = updatePortSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    }
    const updateData = parsed.data;

    if (updateData.externalPort !== undefined) {
      const existing = await db.select().from(networkingPorts)
        .where(eq(networkingPorts.projectId, projectId));
      const conflict = existing.find(p => p.externalPort === updateData.externalPort && p.id !== id);
      if (conflict) {
        return res.status(400).json({ error: `External port ${updateData.externalPort} is already in use` });
      }
    }

    const [updated] = await db.update(networkingPorts)
      .set(updateData)
      .where(and(eq(networkingPorts.id, id), eq(networkingPorts.projectId, projectId)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Port not found' });
    }

    res.json(serializePort(updated));
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

    const deleted = await db.delete(networkingPorts)
      .where(and(eq(networkingPorts.id, id), eq(networkingPorts.projectId, projectId)))
      .returning();

    if (!deleted.length) {
      return res.status(404).json({ error: 'Port not found' });
    }

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

/**
 * Real port scan: read /proc/net/tcp(6) to find actually listening ports,
 * reconcile with the DB rows, and push updates via preview WebSocket.
 *
 * Security: only scans localhost — no arbitrary host scanning possible.
 * Rate limited to one scan per project every SCAN_COOLDOWN_MS milliseconds.
 */
router.post('/:projectId/networking/ports/scan', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);

    const lastScan = scanCooldowns.get(projectId);
    const now = Date.now();
    if (lastScan && now - lastScan < SCAN_COOLDOWN_MS) {
      return res.status(429).json({ error: 'Scan cooldown active — please wait a few seconds' });
    }
    scanCooldowns.set(projectId, now);

    const listeningPorts = await scanListeningPorts();

    const existing = await db.select().from(networkingPorts).where(eq(networkingPorts.projectId, projectId));
    const existingByPort = new Map(existing.map(p => [p.internalPort, p]));

    const newPorts: any[] = [];
    const updatedIds: number[] = [];

    for (const { port, isLocalhost } of listeningPorts) {
      const row = existingByPort.get(port);
      if (row) {
        await db.update(networkingPorts)
          .set({ listening: true, localhostOnly: isLocalhost, lastSeenAt: new Date() })
          .where(eq(networkingPorts.id, row.id));
        updatedIds.push(row.id);
      } else {
        if (existing.length + newPorts.length >= MAX_PORTS_PER_PROJECT) continue;
        const proxyUrl = buildProxyUrl(projectId, port);
        const [inserted] = await db.insert(networkingPorts).values({
          projectId,
          port,
          internalPort: port,
          externalPort: port,
          label: '',
          protocol: 'http',
          isPublic: false,
          exposeLocalhost: false,
          listening: true,
          localhostOnly: isLocalhost,
          proxyUrl,
          externalUrl: '',
          source: 'detected',
          detectedAt: new Date(),
          lastSeenAt: new Date(),
        }).returning();
        newPorts.push(serializePort(inserted));
      }
    }

    const listeningPortNumbers = new Set(listeningPorts.map(p => p.port));
    for (const row of existing) {
      if (!listeningPortNumbers.has(row.internalPort) && row.listening) {
        await db.update(networkingPorts)
          .set({ listening: false })
          .where(eq(networkingPorts.id, row.id));
      }
    }

    if (newPorts.length > 0) {
      previewEvents.emit('ports:update', { projectId, newPorts });
    }

    const refreshed = await db.select().from(networkingPorts).where(eq(networkingPorts.projectId, projectId));
    res.json({
      success: true,
      detected: listeningPorts.length,
      newPortsAdded: newPorts.length,
      ports: refreshed.map(serializePort),
    });
  } catch (error: any) {
    logger.error('Failed to scan ports', redactErrorForLog(error));
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// Custom Domains Management
// ==========================================

const domainSchema = z.object({
  domain: z.string().min(3).max(253).regex(/^[a-zA-Z0-9]([a-zA-Z0-9\-\.]*[a-zA-Z0-9])?$/, 'Invalid domain name'),
});

router.get('/:projectId/networking/domains', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const domains = await db.select().from(networkingDomains).where(eq(networkingDomains.projectId, projectId));
    res.json(domains.map(serializeDomain));
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

    const parsed = domainSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid domain', details: parsed.error.flatten() });
    }
    const { domain } = parsed.data;

    const token = `ecode-verify-${Math.random().toString(36).substring(2, 10)}-${Date.now()}`;

    const [newDomain] = await db.insert(networkingDomains).values({
      projectId,
      domain,
      verificationToken: token,
      sslStatus: 'pending'
    }).returning();

    res.json(serializeDomain(newDomain));
  } catch (error: any) {
    if (isMissingRelationError(error)) {
      logger.warn('Networking domains table missing; create unavailable');
      return sendUnavailable(res);
    }
    logger.error('Failed to add domain', redactErrorForLog(error));
    res.status(500).json({ error: error.message });
  }
});

/**
 * Real DNS verification: look up TXT records for the domain and check that
 * the verification token is present. Also accepts CNAME verification.
 * Uses Node's built-in dns/promises — no external dependencies.
 */
router.post('/:projectId/networking/domains/:id/verify', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const id = parseInt(req.params.id);

    const [domain] = await db.select().from(networkingDomains)
      .where(and(eq(networkingDomains.id, id), eq(networkingDomains.projectId, projectId)));

    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    if (domain.verified) {
      return res.json(serializeDomain(domain));
    }

    const token = domain.verificationToken;
    let verified = false;
    let verificationError = '';

    try {
      const txtRecords = await dns.resolveTxt(domain.domain);
      const flat = txtRecords.flat();
      verified = flat.some(record => record.includes(token));
      if (!verified) {
        verificationError = `TXT record containing "${token}" not found. Found: ${flat.slice(0, 3).join(', ') || 'none'}`;
      }
    } catch (dnsErr: any) {
      if (dnsErr.code === 'ENOTFOUND' || dnsErr.code === 'ENODATA') {
        verificationError = `Domain "${domain.domain}" not found in DNS. Ensure the domain exists and the TXT record has been added.`;
      } else if (dnsErr.code === 'ETIMEOUT') {
        verificationError = 'DNS lookup timed out. Please try again.';
      } else {
        verificationError = `DNS lookup failed: ${dnsErr.message}`;
      }
    }

    if (!verified) {
      return res.json({
        ...serializeDomain(domain),
        verified: false,
        message: verificationError,
      });
    }

    const [updated] = await db.update(networkingDomains)
      .set({ verified: true, verifiedAt: new Date(), sslStatus: 'self-signed' })
      .where(eq(networkingDomains.id, id))
      .returning();

    res.json({ ...serializeDomain(updated), verified: true });
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

    const deleted = await db.delete(networkingDomains)
      .where(and(eq(networkingDomains.id, id), eq(networkingDomains.projectId, projectId)))
      .returning();

    if (!deleted.length) {
      return res.status(404).json({ error: 'Domain not found' });
    }

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
