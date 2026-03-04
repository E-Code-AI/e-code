/**
 * Runner Auth Middleware
 * Validates JWT tokens signed with RUNNER_JWT_SECRET.
 * The main E-Code platform signs these tokens; the Runner verifies them.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const SECRET = process.env.RUNNER_JWT_SECRET;

export function requireRunnerAuth(req: Request, res: Response, next: NextFunction) {
  if (!SECRET) {
    return res.status(500).json({ error: 'RUNNER_JWT_SECRET not set on Runner' });
  }

  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  try {
    const payload = jwt.verify(token, SECRET) as Record<string, unknown>;
    (req as any).runnerToken = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function verifyWsToken(token: string): Record<string, unknown> | null {
  if (!SECRET) return null;
  try {
    return jwt.verify(token, SECRET) as Record<string, unknown>;
  } catch {
    return null;
  }
}
