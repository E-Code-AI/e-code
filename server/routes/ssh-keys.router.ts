// @ts-nocheck
import { Router } from 'express';
import { z } from 'zod';
import { ensureAuthenticated } from '../middleware/auth';
import { csrfProtection } from '../middleware/csrf';
import { createLogger } from '../utils/logger';
import * as crypto from 'crypto';

const router = Router();
const logger = createLogger('ssh-keys');

// In-memory store: userId → SshKey[]
// (Persisted per-process; consider moving to DB for production persistence)
const keyStore = new Map<number, SshKey[]>();

interface SshKey {
  id: string;
  label: string;
  fingerprint: string;
  publicKey: string;
  createdAt: string;
}

const addKeySchema = z.object({
  label: z.string().min(1).max(100),
  publicKey: z.string().min(20).max(8192),
});

function getFingerprint(publicKey: string): string {
  try {
    const parts = publicKey.trim().split(/\s+/);
    const keyData = parts[1] || parts[0];
    const buf = Buffer.from(keyData, 'base64');
    const hash = crypto.createHash('sha256').update(buf).digest('base64');
    return `SHA256:${hash}`;
  } catch {
    return 'SHA256:unknown';
  }
}

router.get('/', ensureAuthenticated, (req, res) => {
  const userId = (req.user as any).id;
  const keys = keyStore.get(userId) || [];
  // Don't expose raw public key content in list
  res.json(keys.map(({ id, label, fingerprint, createdAt }) => ({ id, label, fingerprint, createdAt })));
});

router.post('/', ensureAuthenticated, csrfProtection, (req, res) => {
  const result = addKeySchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid input', details: result.error.errors });
  }
  const { label, publicKey } = result.data;
  const userId = (req.user as any).id;
  const key: SshKey = {
    id: crypto.randomUUID(),
    label,
    publicKey,
    fingerprint: getFingerprint(publicKey),
    createdAt: new Date().toISOString(),
  };
  const existing = keyStore.get(userId) || [];
  keyStore.set(userId, [...existing, key]);
  logger.info(`[SSH] User ${userId} added SSH key: ${label}`);
  res.status(201).json({ id: key.id, label: key.label, fingerprint: key.fingerprint, createdAt: key.createdAt });
});

router.delete('/:id', ensureAuthenticated, csrfProtection, (req, res) => {
  const userId = (req.user as any).id;
  const { id } = req.params;
  const existing = keyStore.get(userId) || [];
  const filtered = existing.filter(k => k.id !== id);
  if (filtered.length === existing.length) {
    return res.status(404).json({ error: 'SSH key not found' });
  }
  keyStore.set(userId, filtered);
  logger.info(`[SSH] User ${userId} deleted SSH key ${id}`);
  res.json({ success: true });
});

export default router;
