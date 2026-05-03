// @ts-nocheck
import { Router } from 'express';
import { z } from 'zod';
import * as crypto from 'crypto';
import { ensureAuthenticated } from '../middleware/auth';
import { csrfProtection } from '../middleware/csrf';
import { createLogger } from '../utils/logger';
import { getStorage } from '../storage';

const router = Router();
const logger = createLogger('ssh-keys');

const MAX_KEYS_PER_USER = 20;

const VALID_KEY_TYPES = [
  'ssh-ed25519',
  'ssh-rsa',
  'ecdsa-sha2-nistp256',
  'ecdsa-sha2-nistp384',
  'ecdsa-sha2-nistp521',
];

const KEY_TYPE_DISPLAY: Record<string, string> = {
  'ssh-ed25519': 'ed25519',
  'ssh-rsa': 'rsa',
  'ecdsa-sha2-nistp256': 'ecdsa-nistp256',
  'ecdsa-sha2-nistp384': 'ecdsa-nistp384',
  'ecdsa-sha2-nistp521': 'ecdsa-nistp521',
};

const addKeySchema = z.object({
  label: z.string().min(1, 'Label is required').max(100, 'Label too long'),
  publicKey: z.string().min(20, 'Public key too short').max(8192, 'Public key too long'),
});

/**
 * Parse and validate an OpenSSH public key.
 * Returns { keyType, fingerprint } or throws an error with a user-friendly message.
 */
function parseOpenSshPublicKey(rawKey: string): { keyType: string; fingerprint: string } {
  const parts = rawKey.trim().split(/\s+/);
  if (parts.length < 2) {
    throw new Error('Invalid SSH public key: expected format "type base64data [comment]"');
  }

  const keyTypePrefix = parts[0];
  const keyBlob = parts[1];

  if (!VALID_KEY_TYPES.includes(keyTypePrefix)) {
    throw new Error(
      `Unsupported SSH key type "${keyTypePrefix}". Supported types: ed25519, rsa (≥2048 bit), ecdsa`
    );
  }

  let blobBuf: Buffer;
  try {
    blobBuf = Buffer.from(keyBlob, 'base64');
  } catch {
    throw new Error('Invalid base64 encoding in SSH public key');
  }

  if (blobBuf.length < 4) {
    throw new Error('SSH public key blob is too short');
  }

  // Validate the blob starts with the key type string
  const typeLen = blobBuf.readUInt32BE(0);
  if (typeLen > blobBuf.length - 4 || typeLen > 50) {
    throw new Error('Invalid SSH public key blob structure');
  }
  const blobKeyType = blobBuf.subarray(4, 4 + typeLen).toString('utf8');
  if (blobKeyType !== keyTypePrefix) {
    throw new Error('SSH public key type prefix does not match the embedded key type');
  }

  // For RSA keys, validate minimum 2048-bit modulus
  if (keyTypePrefix === 'ssh-rsa') {
    let offset = 4 + typeLen;
    if (offset + 4 > blobBuf.length) throw new Error('Truncated RSA key blob');
    const eLen = blobBuf.readUInt32BE(offset);
    offset += 4 + eLen;
    if (offset + 4 > blobBuf.length) throw new Error('Truncated RSA key blob');
    const nLen = blobBuf.readUInt32BE(offset);
    const leadingZero = blobBuf[offset + 4] === 0 ? 1 : 0;
    const modulusBits = (nLen - leadingZero) * 8;
    if (modulusBits < 2048) {
      throw new Error(`RSA key is only ${modulusBits} bits. Minimum 2048 bits required for security.`);
    }
  }

  // Compute canonical SHA256 fingerprint from the raw blob
  const digest = crypto.createHash('sha256').update(blobBuf).digest('base64');
  const fingerprint = `SHA256:${digest}`;
  const keyType = KEY_TYPE_DISPLAY[keyTypePrefix] || keyTypePrefix;

  return { keyType, fingerprint };
}

// GET /api/ssh-keys — list keys for the authenticated user
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const storage = getStorage();
    const keys = await storage.listSshKeys(userId);
    res.json(
      keys.map(({ id, label, fingerprint, keyType, createdAt, lastUsedAt }) => ({
        id, label, fingerprint, keyType, createdAt, lastUsedAt,
      }))
    );
  } catch (err: any) {
    logger.error('[SSH] list error:', err);
    res.status(500).json({ error: 'Failed to list SSH keys' });
  }
});

// GET /api/ssh-keys/config — return gateway configuration for the client
router.get('/config', ensureAuthenticated, (req, res) => {
  const enabled = process.env.SSH_GATEWAY_ENABLED === 'true';
  const host = process.env.SSH_GATEWAY_HOST || null;
  const port = process.env.SSH_GATEWAY_PORT ? parseInt(process.env.SSH_GATEWAY_PORT, 10) : 2222;
  const user = process.env.SSH_GATEWAY_USER || 'runner';
  const projectPath = process.env.SSH_GATEWAY_PROJECT_PATH || '/home/runner';

  res.json({ enabled, host, port, user, projectPath });
});

// POST /api/ssh-keys — add a new SSH public key
router.post('/', ensureAuthenticated, csrfProtection, async (req, res) => {
  const result = addKeySchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: 'Invalid input',
      details: result.error.errors.map((e) => e.message),
    });
  }

  const { label, publicKey } = result.data;
  const userId = (req.user as any).id;
  const storage = getStorage();

  // Enforce per-user key cap
  const count = await storage.countSshKeys(userId);
  if (count >= MAX_KEYS_PER_USER) {
    return res.status(422).json({
      error: `SSH key limit reached. You may have at most ${MAX_KEYS_PER_USER} keys.`,
    });
  }

  // Parse and validate the public key
  let keyType: string;
  let fingerprint: string;
  try {
    ({ keyType, fingerprint } = parseOpenSshPublicKey(publicKey));
  } catch (err: any) {
    return res.status(422).json({ error: err.message });
  }

  // Reject exact duplicate by fingerprint per user
  const existing = await storage.getSshKeyByFingerprint(userId, fingerprint);
  if (existing) {
    return res.status(409).json({ error: 'This SSH public key is already registered to your account.' });
  }

  try {
    const key = await storage.createSshKey({
      userId,
      label,
      publicKey,
      fingerprint,
      keyType,
    });

    logger.info({ action: 'ssh.key.added', userId, fingerprint, label });

    res.status(201).json({
      id: key.id,
      label: key.label,
      fingerprint: key.fingerprint,
      keyType: key.keyType,
      createdAt: key.createdAt,
      lastUsedAt: key.lastUsedAt,
    });
  } catch (err: any) {
    logger.error('[SSH] create error:', err);
    res.status(500).json({ error: 'Failed to add SSH key' });
  }
});

// DELETE /api/ssh-keys/:id — remove a key belonging to the authenticated user
router.delete('/:id', ensureAuthenticated, csrfProtection, async (req, res) => {
  const { id } = req.params;
  const userId = (req.user as any).id;
  const storage = getStorage();

  try {
    const deleted = await storage.deleteSshKey(userId, id);
    if (!deleted) {
      return res.status(404).json({ error: 'SSH key not found' });
    }

    logger.info({ action: 'ssh.key.deleted', userId, keyId: id });
    res.json({ success: true });
  } catch (err: any) {
    logger.error('[SSH] delete error:', err);
    res.status(500).json({ error: 'Failed to delete SSH key' });
  }
});

export default router;
