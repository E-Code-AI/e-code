import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ensureAuthenticated } from '../middleware/auth';
import { csrfProtection } from '../middleware/csrf';
import { createLogger } from '../utils/logger';
import { createRateLimitMiddleware } from '../middleware/rate-limiter';
import * as crypto from 'crypto';
import { db } from '../db';
import { users as usersTable } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

const router = Router();
const logger = createLogger('ssh-keys');
const apiRateLimit = createRateLimitMiddleware('api');

interface SshKey {
  id: string;
  label: string;
  fingerprint: string;
  publicKey: string;
  createdAt: string;
}

interface UserPrefsWithKeys {
  sshKeys?: SshKey[];
  [key: string]: unknown;
}

const addKeySchema = z.object({
  label: z.string().min(1).max(100),
  publicKey: z.string().min(20).max(8192),
});

const renameKeySchema = z.object({
  label: z.string().min(1).max(100),
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

async function getKeys(userId: number): Promise<SshKey[]> {
  const rows = await db
    .select({ userPreferences: usersTable.userPreferences })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  const prefs = (rows[0]?.userPreferences ?? {}) as UserPrefsWithKeys;
  return Array.isArray(prefs.sshKeys) ? prefs.sshKeys : [];
}

async function saveKeys(userId: number, keys: SshKey[]): Promise<void> {
  await db
    .update(usersTable)
    .set({
      userPreferences: sql`COALESCE(user_preferences, '{}') || ${JSON.stringify({ sshKeys: keys })}::jsonb`,
    })
    .where(eq(usersTable.id, userId));
}

router.get('/', ensureAuthenticated, apiRateLimit, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const keys = await getKeys(userId);
    res.json(keys.map(({ id, label, fingerprint, createdAt }) => ({ id, label, fingerprint, createdAt })));
  } catch (err) {
    logger.error('Failed to fetch SSH keys', { err });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', ensureAuthenticated, csrfProtection, apiRateLimit, async (req: Request, res: Response) => {
  const result = addKeySchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid input', details: result.error.errors });
  }
  const { label, publicKey } = result.data;
  const userId = req.user!.id;
  try {
    const existing = await getKeys(userId);
    if (existing.length >= 20) {
      return res.status(400).json({ error: 'SSH key limit reached (20 max)', code: 'LIMIT_REACHED' });
    }
    const key: SshKey = {
      id: crypto.randomUUID(),
      label,
      publicKey,
      fingerprint: getFingerprint(publicKey),
      createdAt: new Date().toISOString(),
    };
    await saveKeys(userId, [...existing, key]);
    logger.info(`User ${userId} added SSH key: ${label}`);
    res.status(201).json({ id: key.id, label: key.label, fingerprint: key.fingerprint, createdAt: key.createdAt });
  } catch (err) {
    logger.error('Failed to add SSH key', { err });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id/rename', ensureAuthenticated, csrfProtection, apiRateLimit, async (req: Request, res: Response) => {
  const result = renameKeySchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid input', details: result.error.errors });
  }
  const userId = req.user!.id;
  const { id } = req.params;
  try {
    const existing = await getKeys(userId);
    const idx = existing.findIndex((k) => k.id === id);
    if (idx === -1) return res.status(404).json({ error: 'SSH key not found' });
    existing[idx] = { ...existing[idx], label: result.data.label };
    await saveKeys(userId, existing);
    logger.info(`User ${userId} renamed SSH key ${id} to "${result.data.label}"`);
    const { id: keyId, label, fingerprint, createdAt } = existing[idx];
    res.json({ id: keyId, label, fingerprint, createdAt });
  } catch (err) {
    logger.error('Failed to rename SSH key', { err });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', ensureAuthenticated, csrfProtection, apiRateLimit, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  try {
    const existing = await getKeys(userId);
    const filtered = existing.filter((k) => k.id !== id);
    if (filtered.length === existing.length) {
      return res.status(404).json({ error: 'SSH key not found' });
    }
    await saveKeys(userId, filtered);
    logger.info(`User ${userId} deleted SSH key ${id}`);
    res.json({ success: true });
  } catch (err) {
    logger.error('Failed to delete SSH key', { err });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
