/**
 * Runner Auth Middleware
 * Validates JWT tokens signed with RUNNER_JWT_SECRET.
 * Enforces exp ≤ 15 minutes on all tokens.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const SECRET = process.env.RUNNER_JWT_SECRET;
const MAX_TOKEN_TTL_SEC = 15 * 60; // 15 minutes hard cap

function extractToken(req: Request): string | null {
  const header = req.headers.authorization ?? '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  const query = (req.query as Record<string, string>).token;
  return query ?? null;
}

function validateExpiry(payload: Record<string, unknown>): string | null {
  const now = Math.floor(Date.now() / 1000);
  const exp = payload.exp as number | undefined;
  const iat = payload.iat as number | undefined;

  if (!exp) return 'Token has no expiry (exp claim required)';
  if (exp < now) return 'Token has expired';
  if (iat && (exp - iat) > MAX_TOKEN_TTL_SEC) {
    return `Token TTL too long (max ${MAX_TOKEN_TTL_SEC}s)`;
  }
  return null;
}

export function requireRunnerAuth(req: Request, res: Response, next: NextFunction) {
  if (!SECRET) {
    return res.status(500).json({
      error: 'Runner misconfigured: RUNNER_JWT_SECRET not set',
      code: 'CONFIG_ERROR',
    });
  }

  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({
      error: 'Missing Authorization header or token query param',
      code: 'MISSING_TOKEN',
    });
  }

  try {
    const payload = jwt.verify(token, SECRET) as Record<string, unknown>;
    const expiryError = validateExpiry(payload);
    if (expiryError) {
      return res.status(401).json({ error: expiryError, code: 'TOKEN_EXPIRY_VIOLATION' });
    }
    (req as any).runnerToken = payload;
    next();
  } catch (err: any) {
    const message = err.name === 'TokenExpiredError'
      ? 'Token has expired'
      : err.name === 'JsonWebTokenError'
      ? 'Invalid token signature'
      : 'Token verification failed';
    return res.status(401).json({ error: message, code: 'INVALID_TOKEN' });
  }
}

export function verifyWsToken(token: string): Record<string, unknown> | null {
  if (!SECRET) return null;
  try {
    const payload = jwt.verify(token, SECRET) as Record<string, unknown>;
    if (validateExpiry(payload)) return null;
    return payload;
  } catch {
    return null;
  }
}
