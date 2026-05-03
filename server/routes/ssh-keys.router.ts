// @ts-nocheck
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as crypto from 'crypto';
import { RateLimiterMemory, RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible';
import Redis from 'ioredis';
import { ensureAuthenticated } from '../middleware/auth';
import { csrfProtection } from '../middleware/csrf';
import { createLogger } from '../utils/logger';
import { getStorage } from '../storage';

const router = Router();
const logger = createLogger('ssh-keys');

const MAX_KEYS_PER_USER = 20;

// ─── Dedicated brute-force limiter for SSH key write endpoints ───────────────
// Stricter than the shared API limiter: 10 write requests per 15 minutes per user.
// Falls back to per-IP keying when unauthenticated (defense-in-depth; ensureAuthenticated
// will normally have rejected the request first).
const SSH_WRITE_POINTS = 10;
const SSH_WRITE_DURATION_SEC = 15 * 60;

let sshWriteRedisClient: Redis | null = null;
const sshWriteRedisUrl = process.env.REDIS_URL || process.env.REDIS_TLS_URL;
const sshWriteRedisEnabled = process.env.RATE_LIMIT_REDIS_ENABLED !== 'false';
if (sshWriteRedisUrl && sshWriteRedisEnabled) {
  try {
    sshWriteRedisClient = new Redis(sshWriteRedisUrl.replace('rediss://', 'redis://'), {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      lazyConnect: true,
    });
    sshWriteRedisClient.on('error', (err) => {
      logger.warn('[SSH] Redis rate limiter error, falling back to memory', { error: err.message });
      sshWriteRedisClient = null;
    });
    sshWriteRedisClient.connect().catch((err) => {
      logger.warn('[SSH] Redis rate limiter connect failed, using memory fallback', {
        error: err?.message || 'unknown',
      });
      sshWriteRedisClient = null;
    });
  } catch (err: any) {
    logger.warn('[SSH] Redis rate limiter init failed, using memory fallback', {
      error: err?.message,
    });
    sshWriteRedisClient = null;
  }
}

// Always-available in-memory limiter. Used as the primary limiter when Redis is not
// configured, and as a guaranteed fail-safe fallback when Redis is configured but
// experiences a backend error at request time. This ensures brute-force protection
// remains in force on this security-critical endpoint even under degraded
// infrastructure conditions (the previous design fail-opened on Redis errors,
// effectively disabling the limiter).
const sshWriteMemoryLimiter = new RateLimiterMemory({
  keyPrefix: 'rl_ssh_write_mem',
  points: SSH_WRITE_POINTS,
  duration: SSH_WRITE_DURATION_SEC,
  blockDuration: SSH_WRITE_DURATION_SEC,
});

const sshWriteRedisLimiter: RateLimiterRedis | null = sshWriteRedisClient
  ? new RateLimiterRedis({
      storeClient: sshWriteRedisClient,
      keyPrefix: 'rl_ssh_write',
      points: SSH_WRITE_POINTS,
      duration: SSH_WRITE_DURATION_SEC,
      blockDuration: SSH_WRITE_DURATION_SEC,
      execEvenly: false,
      // ✅ rate-limiter-flexible has built-in insurance: on storeClient error it
      // transparently delegates to insuranceLimiter. We still defensively retry
      // ourselves below in case insurance is unavailable.
      insuranceLimiter: sshWriteMemoryLimiter,
    })
  : null;

function isRealLimitHit(rejRes: any): boolean {
  // A real limit-hit produces a RateLimiterRes-like object with msBeforeNext set.
  return rejRes instanceof RateLimiterRes || typeof rejRes?.msBeforeNext === 'number';
}

async function sshWriteRateLimit(req: Request, res: Response, next: NextFunction) {
  // Bypass rate limiting in test mode (unless explicitly enabled), matching project conventions.
  if (process.env.NODE_ENV === 'test' && process.env.ENABLE_RATE_LIMITING !== 'true') {
    return next();
  }
  if ((req as any)._skipRateLimit === true) {
    return next();
  }

  const userId = (req.user as any)?.id;
  const key = userId ? `user:${userId}` : `ip:${req.ip || 'unknown'}`;

  // Try Redis (distributed) first when available; on backend error fall back to
  // the in-memory limiter so we never silently disable rate limiting.
  let result: RateLimiterRes | undefined;
  let limitHit: any = null;
  let usedFallback = false;

  if (sshWriteRedisLimiter) {
    try {
      result = await sshWriteRedisLimiter.consume(key);
    } catch (err: any) {
      if (isRealLimitHit(err)) {
        limitHit = err;
      } else {
        logger.warn('[SSH] Redis write limiter backend error, using memory fallback', {
          error: err?.message || String(err),
        });
        usedFallback = true;
        try {
          result = await sshWriteMemoryLimiter.consume(key);
        } catch (memErr: any) {
          if (isRealLimitHit(memErr)) {
            limitHit = memErr;
          } else {
            // Memory limiter should not produce backend errors, but if it somehow does,
            // fail closed on this security-critical surface.
            logger.error('[SSH] memory write limiter unexpected error; failing closed', {
              error: memErr?.message || String(memErr),
            });
            res.setHeader('Retry-After', SSH_WRITE_DURATION_SEC);
            return res.status(429).json({
              error: 'Too many SSH key changes',
              message: 'SSH key write rate limiter is temporarily unavailable. Please try again later.',
              retryAfter: SSH_WRITE_DURATION_SEC,
            });
          }
        }
      }
    }
  } else {
    try {
      result = await sshWriteMemoryLimiter.consume(key);
    } catch (err: any) {
      if (isRealLimitHit(err)) {
        limitHit = err;
      } else {
        logger.error('[SSH] memory write limiter unexpected error; failing closed', {
          error: err?.message || String(err),
        });
        res.setHeader('Retry-After', SSH_WRITE_DURATION_SEC);
        return res.status(429).json({
          error: 'Too many SSH key changes',
          message: 'SSH key write rate limiter is temporarily unavailable. Please try again later.',
          retryAfter: SSH_WRITE_DURATION_SEC,
        });
      }
    }
  }

  if (!limitHit && result) {
    res.setHeader('X-RateLimit-Limit', SSH_WRITE_POINTS);
    res.setHeader('X-RateLimit-Remaining', result.remainingPoints ?? 0);
    res.setHeader(
      'X-RateLimit-Reset',
      new Date(Date.now() + (result.msBeforeNext || 0)).toISOString(),
    );
    if (usedFallback) {
      res.setHeader('X-RateLimit-Backend', 'memory-fallback');
    }
    return next();
  }

  // Real limit hit — emit 429 with Retry-After.
  {
    const rejRes = limitHit;
    const retryAfter = Math.max(1, Math.round((rejRes.msBeforeNext || SSH_WRITE_DURATION_SEC * 1000) / 1000));
    logger.warn('[SSH] write rate limit exceeded', {
      userId,
      ip: req.ip,
      method: req.method,
      path: req.path,
      retryAfter,
    });

    res.setHeader('Retry-After', retryAfter);
    res.setHeader('X-RateLimit-Limit', SSH_WRITE_POINTS);
    res.setHeader('X-RateLimit-Remaining', rejRes.remainingPoints ?? 0);
    res.setHeader(
      'X-RateLimit-Reset',
      new Date(Date.now() + (rejRes.msBeforeNext || 0)).toISOString(),
    );
    return res.status(429).json({
      error: 'Too many SSH key changes',
      message: `Please wait ${retryAfter} seconds before modifying SSH keys again. SSH key writes are limited to ${SSH_WRITE_POINTS} per ${SSH_WRITE_DURATION_SEC / 60} minutes.`,
      retryAfter,
    });
  }
}

/**
 * Constant-time check for whether a fingerprint already exists among a user's keys.
 * Always iterates over every key so the work performed is independent of which (if any)
 * key matches, preventing timing-based enumeration of stored fingerprints.
 */
function findFingerprintMatchConstantTime(
  keys: Array<{ fingerprint: string; [k: string]: any }>,
  fingerprint: string,
): { fingerprint: string; [k: string]: any } | undefined {
  const candidate = Buffer.from(fingerprint, 'utf8');
  let match: { fingerprint: string; [k: string]: any } | undefined;
  for (const k of keys) {
    const stored = Buffer.from(k.fingerprint || '', 'utf8');
    let equal = false;
    if (stored.length === candidate.length) {
      try {
        equal = crypto.timingSafeEqual(stored, candidate);
      } catch {
        equal = false;
      }
    } else {
      // Still perform a comparison of equal-length buffers to keep work uniform.
      const padded = Buffer.alloc(candidate.length);
      stored.copy(padded, 0, 0, Math.min(stored.length, candidate.length));
      try {
        crypto.timingSafeEqual(padded, candidate);
      } catch {
        /* ignore */
      }
      equal = false;
    }
    if (equal && !match) {
      match = k;
    }
  }
  return match;
}

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
router.post('/', ensureAuthenticated, sshWriteRateLimit, csrfProtection, async (req, res) => {
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

  // Reject exact duplicate by fingerprint per user.
  // Use a constant-time scan over the user's existing keys instead of a short-circuiting
  // lookup so an attacker cannot infer which fingerprints are stored from response timing.
  const userKeys = await storage.listSshKeys(userId);
  const existing = findFingerprintMatchConstantTime(userKeys, fingerprint);
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
router.delete('/:id', ensureAuthenticated, sshWriteRateLimit, csrfProtection, async (req, res) => {
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
