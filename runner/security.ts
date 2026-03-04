/**
 * Runner Security — Rate limiting, payload validation, audit logs
 */

import { Request, Response, NextFunction } from 'express';
import { createLogger } from './logger';

const auditLogger = createLogger('audit');

// ─── Exec run registry (for /admin/runs) ─────────────────────────
export interface ExecRun {
  runId: string;
  workspaceId: string;
  userId: string;
  command: string;
  startedAt: string;
  durationMs: number | null;
  exitCode: number | null;
  error: string | null;
}

const MAX_RUNS_HISTORY = 200;
const execRuns: ExecRun[] = [];

export function recordExecRun(run: ExecRun) {
  execRuns.unshift(run);
  if (execRuns.length > MAX_RUNS_HISTORY) execRuns.length = MAX_RUNS_HISTORY;
}

export function getExecRuns(): ExecRun[] {
  return execRuns;
}

// ─── Audit log helpers ────────────────────────────────────────────
export function auditLog(
  action: string,
  details: Record<string, unknown>
) {
  auditLogger.info(JSON.stringify({ action, ...details, ts: new Date().toISOString() }));
}

// ─── In-memory rate limiter (per key: userId:ip) ──────────────────
interface RateBucket {
  count: number;
  resetAt: number;
}

const rateBuckets = new Map<string, RateBucket>();

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateBuckets) {
    if (now > bucket.resetAt) rateBuckets.delete(key);
  }
}, 60_000);

function checkRateLimit(key: string, maxPerMinute: number): boolean {
  const now = Date.now();
  let bucket = rateBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + 60_000 };
    rateBuckets.set(key, bucket);
  }
  bucket.count++;
  return bucket.count <= maxPerMinute;
}

function getRateLimitKey(req: Request): string {
  const token = (req as any).runnerToken as Record<string, unknown> | undefined;
  const userId = String(token?.userId ?? token?.sub ?? 'anon');
  const ip = req.ip ?? req.socket?.remoteAddress ?? 'unknown';
  return `${userId}:${ip}`;
}

// Rate-limit middleware factory
export function rateLimit(maxPerMinute: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = getRateLimitKey(req);
    if (!checkRateLimit(key, maxPerMinute)) {
      auditLog('rate_limit_exceeded', { key, path: req.path });
      return res.status(429).json({
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfterSeconds: 60,
      });
    }
    next();
  };
}

// ─── Exec payload validator ───────────────────────────────────────
export const EXEC_CMD_MAX_LEN = 512;
export const EXEC_TIMEOUT_MS = parseInt(process.env.EXEC_TIMEOUT_MS ?? '10000', 10);

export function validateExecPayload(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { command } = req.body;
  if (typeof command !== 'string') {
    return res.status(400).json({ error: 'command (string) required', code: 'MISSING_FIELD' });
  }
  if (command.length > EXEC_CMD_MAX_LEN) {
    return res.status(400).json({
      error: `command too long (max ${EXEC_CMD_MAX_LEN} chars)`,
      code: 'CMD_TOO_LONG',
    });
  }
  next();
}

// ─── File write size limit ────────────────────────────────────────
export const FILE_WRITE_MAX_BYTES = 1 * 1024 * 1024; // 1 MB

export function validateFileWrite(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const content: unknown = req.body?.content;
  if (typeof content === 'string' && Buffer.byteLength(content, 'utf8') > FILE_WRITE_MAX_BYTES) {
    return res.status(413).json({
      error: 'File too large (max 1 MB)',
      code: 'FILE_TOO_LARGE',
    });
  }
  next();
}

// ─── Admin key middleware ─────────────────────────────────────────
export function requireAdminKey(req: Request, res: Response, next: NextFunction) {
  const adminKey = process.env.RUNNER_ADMIN_KEY;
  if (!adminKey) {
    return res.status(503).json({ error: 'Admin endpoint not configured', code: 'ADMIN_DISABLED' });
  }
  const provided = req.headers['x-runner-admin-key'];
  if (!provided || provided !== adminKey) {
    return res.status(403).json({ error: 'Invalid admin key', code: 'FORBIDDEN' });
  }
  next();
}

// ─── Global error handler ─────────────────────────────────────────
export function globalErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const status = (err as any).status ?? 500;
  const code = (err as any).code ?? 'INTERNAL_ERROR';
  auditLog('unhandled_error', { path: req.path, error: err.message, code });
  res.status(status).json({
    error: status === 500 ? 'Internal server error' : err.message,
    code,
  });
}
