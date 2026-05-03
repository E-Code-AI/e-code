import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ensureAuthenticated } from '../middleware/auth';
import { csrfProtection } from '../middleware/csrf';
import { createLogger } from '../utils/logger';
import { createRateLimitMiddleware } from '../middleware/rate-limiter';
import { db } from '../db';
import {
  sessions as sessionsTable,
  users as usersTable,
  auditLogs,
} from '@shared/schema';
import { eq, and, sql, desc, ne } from 'drizzle-orm';

const router = Router();
const logger = createLogger('user-prefs');

const apiRateLimit = createRateLimitMiddleware('api');
const authRateLimit = createRateLimitMiddleware('auth');

interface StoredPreferences {
  aiMemoryEnabled?: boolean;
  aiTrainingOptOut?: boolean;
  editorFontSize?: string;
  editorTabSize?: string;
  editorWordWrap?: boolean;
  editorLineNumbers?: boolean;
  editorMinimap?: boolean;
  editorAutoSave?: boolean;
  editorFormatOnSave?: boolean;
  editorTheme?: string;
}

async function getUserPrefs(userId: number): Promise<StoredPreferences> {
  const rows = await db
    .select({ userPreferences: usersTable.userPreferences })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  return (rows[0]?.userPreferences as StoredPreferences) ?? {};
}

async function setUserPrefs(userId: number, updates: Partial<StoredPreferences>): Promise<void> {
  await db
    .update(usersTable)
    .set({
      userPreferences: sql`COALESCE(user_preferences, '{}') || ${JSON.stringify(updates)}::jsonb`,
    })
    .where(eq(usersTable.id, userId));
}

async function writeAudit(
  userId: number,
  action: string,
  ip: string,
  ua: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId: String(userId),
      action,
      resource: 'user',
      resourceId: String(userId),
      ipAddress: ip,
      userAgent: ua,
      metadata,
    });
  } catch (err) {
    logger.warn('Failed to write audit log', { userId, action, err });
  }
}

// AI and editor preferences are stored as a jsonb blob inside users.user_preferences;
// there is no separate SQL table to derive from via drizzle-zod, so explicit Zod
// schemas are used here and kept in sync with StoredPreferences above.
const aiPrefsSchema = z.object({
  agentMemoryEnabled: z.boolean().optional(),
  trainingOptOut: z.boolean().optional(),
});

const editorPrefsSchema = z.object({
  fontSize: z.enum(['12', '13', '14', '15', '16', '18', '20']).optional(),
  tabSize: z.enum(['2', '4', '8']).optional(),
  wordWrap: z.boolean().optional(),
  lineNumbers: z.boolean().optional(),
  minimap: z.boolean().optional(),
  autoSave: z.boolean().optional(),
  formatOnSave: z.boolean().optional(),
  editorTheme: z.enum(['vs-light', 'vs-dark', 'hc-black']).optional(),
});

router.get('/ai-preferences', ensureAuthenticated, apiRateLimit, async (req: Request, res: Response) => {
  try {
    const prefs = await getUserPrefs(req.user!.id);
    res.json({
      agentMemoryEnabled: prefs.aiMemoryEnabled ?? true,
      trainingOptOut: prefs.aiTrainingOptOut ?? false,
    });
  } catch (err) {
    logger.error('Failed to fetch AI preferences', { err });
    res.status(500).json({ error: 'Internal server error', code: 'FETCH_ERROR' });
  }
});

router.put('/ai-preferences', ensureAuthenticated, csrfProtection, apiRateLimit, async (req: Request, res: Response) => {
  const parsed = aiPrefsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.errors });
  }
  try {
    const userId = req.user!.id;
    const updates: Partial<StoredPreferences> = {};
    if (parsed.data.agentMemoryEnabled !== undefined) updates.aiMemoryEnabled = parsed.data.agentMemoryEnabled;
    if (parsed.data.trainingOptOut !== undefined) updates.aiTrainingOptOut = parsed.data.trainingOptOut;
    await setUserPrefs(userId, updates);
    const prefs = await getUserPrefs(userId);
    await writeAudit(userId, 'ai_preferences_updated', req.ip ?? '', req.headers['user-agent'] ?? '');
    res.json({
      agentMemoryEnabled: prefs.aiMemoryEnabled ?? true,
      trainingOptOut: prefs.aiTrainingOptOut ?? false,
    });
  } catch (err) {
    logger.error('Failed to update AI preferences', { err });
    res.status(500).json({ error: 'Internal server error', code: 'UPDATE_ERROR' });
  }
});

router.get('/editor-preferences', ensureAuthenticated, apiRateLimit, async (req: Request, res: Response) => {
  try {
    const prefs = await getUserPrefs(req.user!.id);
    res.json({
      fontSize: prefs.editorFontSize ?? '14',
      tabSize: prefs.editorTabSize ?? '2',
      wordWrap: prefs.editorWordWrap ?? true,
      lineNumbers: prefs.editorLineNumbers ?? true,
      minimap: prefs.editorMinimap ?? true,
      autoSave: prefs.editorAutoSave ?? true,
      formatOnSave: prefs.editorFormatOnSave ?? true,
      editorTheme: prefs.editorTheme ?? 'vs-light',
    });
  } catch (err) {
    logger.error('Failed to fetch editor preferences', { err });
    res.status(500).json({ error: 'Internal server error', code: 'FETCH_ERROR' });
  }
});

router.put('/editor-preferences', ensureAuthenticated, csrfProtection, apiRateLimit, async (req: Request, res: Response) => {
  const parsed = editorPrefsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.errors });
  }
  try {
    const userId = req.user!.id;
    const updates: Partial<StoredPreferences> = {};
    if (parsed.data.fontSize !== undefined) updates.editorFontSize = parsed.data.fontSize;
    if (parsed.data.tabSize !== undefined) updates.editorTabSize = parsed.data.tabSize;
    if (parsed.data.wordWrap !== undefined) updates.editorWordWrap = parsed.data.wordWrap;
    if (parsed.data.lineNumbers !== undefined) updates.editorLineNumbers = parsed.data.lineNumbers;
    if (parsed.data.minimap !== undefined) updates.editorMinimap = parsed.data.minimap;
    if (parsed.data.autoSave !== undefined) updates.editorAutoSave = parsed.data.autoSave;
    if (parsed.data.formatOnSave !== undefined) updates.editorFormatOnSave = parsed.data.formatOnSave;
    if (parsed.data.editorTheme !== undefined) updates.editorTheme = parsed.data.editorTheme;
    await setUserPrefs(userId, updates);
    const prefs = await getUserPrefs(userId);
    res.json({
      fontSize: prefs.editorFontSize ?? '14',
      tabSize: prefs.editorTabSize ?? '2',
      wordWrap: prefs.editorWordWrap ?? true,
      lineNumbers: prefs.editorLineNumbers ?? true,
      minimap: prefs.editorMinimap ?? true,
      autoSave: prefs.editorAutoSave ?? true,
      formatOnSave: prefs.editorFormatOnSave ?? true,
      editorTheme: prefs.editorTheme ?? 'vs-light',
    });
  } catch (err) {
    logger.error('Failed to update editor preferences', { err });
    res.status(500).json({ error: 'Internal server error', code: 'UPDATE_ERROR' });
  }
});

router.get('/sessions', ensureAuthenticated, apiRateLimit, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const currentSid = req.sessionID;
    const rows = await db
      .select({ sid: sessionsTable.sid, sess: sessionsTable.sess, expire: sessionsTable.expire })
      .from(sessionsTable)
      .where(
        and(
          sql`(${sessionsTable.sess}->'passport'->>'user')::text = ${String(userId)}`,
          sql`${sessionsTable.expire} > NOW()`,
        ),
      )
      .orderBy(desc(sessionsTable.expire));

    const sessions = rows.map((row) => {
      const sess = row.sess as Record<string, unknown>;
      const ua = (sess.userAgent as string | undefined)
        ?? req.headers['user-agent']
        ?? 'Unknown device';
      const ip = (sess.ip as string | undefined) ?? 'Unknown';
      const createdAt = new Date(
        (row.expire instanceof Date ? row.expire.getTime() : Date.now()) - 30 * 24 * 60 * 60 * 1000,
      ).toISOString();
      return {
        id: row.sid,
        isCurrent: row.sid === currentSid,
        device: ua,
        ip,
        lastActive: row.expire instanceof Date
          ? new Date(row.expire.getTime() - 30 * 60 * 1000).toISOString()
          : new Date().toISOString(),
        createdAt,
      };
    });

    if (sessions.length === 0) {
      sessions.push({
        id: currentSid,
        isCurrent: true,
        device: req.headers['user-agent'] ?? 'Unknown device',
        ip: req.ip ?? 'Unknown',
        lastActive: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    }

    res.json({ sessions });
  } catch (err) {
    logger.error('Failed to fetch sessions', { err });
    res.status(500).json({ error: 'Internal server error', code: 'FETCH_ERROR' });
  }
});

router.delete('/sessions/revoke-all', ensureAuthenticated, csrfProtection, authRateLimit, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const currentSid = req.sessionID;
    await db
      .delete(sessionsTable)
      .where(
        and(
          sql`(${sessionsTable.sess}->'passport'->>'user')::text = ${String(userId)}`,
          ne(sessionsTable.sid, currentSid),
        ),
      );
    await writeAudit(userId, 'sessions_revoked_all', req.ip ?? '', req.headers['user-agent'] ?? '', { keptSid: currentSid });
    res.json({ message: 'All other sessions have been signed out.' });
  } catch (err) {
    logger.error('Failed to revoke all sessions', { err });
    res.status(500).json({ error: 'Internal server error', code: 'REVOKE_ERROR' });
  }
});

router.delete('/sessions/:sid', ensureAuthenticated, csrfProtection, authRateLimit, async (req: Request, res: Response) => {
  const { sid } = req.params;
  try {
    const userId = req.user!.id;
    const currentSid = req.sessionID;
    if (sid === currentSid) {
      return res.status(400).json({ error: 'Cannot revoke current session — use sign-out instead.', code: 'CURRENT_SESSION' });
    }
    const deleted = await db
      .delete(sessionsTable)
      .where(
        and(
          sql`(${sessionsTable.sess}->'passport'->>'user')::text = ${String(userId)}`,
          eq(sessionsTable.sid, sid),
        ),
      )
      .returning({ sid: sessionsTable.sid });
    if (deleted.length === 0) {
      return res.status(404).json({ error: 'Session not found or does not belong to this account.', code: 'NOT_FOUND' });
    }
    await writeAudit(userId, 'session_revoked', req.ip ?? '', req.headers['user-agent'] ?? '', { revokedSid: sid });
    res.json({ message: 'Session signed out.' });
  } catch (err) {
    logger.error('Failed to revoke session', { err });
    res.status(500).json({ error: 'Internal server error', code: 'REVOKE_ERROR' });
  }
});

router.get('/security-events', ensureAuthenticated, apiRateLimit, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const events = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.userId, String(userId)))
      .orderBy(desc(auditLogs.timestamp))
      .limit(20);
    res.json({ events });
  } catch (err) {
    logger.error('Failed to fetch security events', { err });
    res.status(500).json({ error: 'Internal server error', code: 'FETCH_ERROR' });
  }
});

router.get('/connected-services', ensureAuthenticated, apiRateLimit, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const rows = await db
      .select({
        githubTokenCiphertext: usersTable.githubTokenCiphertext,
        githubUsername: usersTable.githubUsername,
        githubTokenCreatedAt: usersTable.githubTokenCreatedAt,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });
    res.json({
      services: [
        {
          id: 'github',
          name: 'GitHub',
          connected: !!user.githubTokenCiphertext,
          username: user.githubUsername ?? null,
          connectedAt: user.githubTokenCreatedAt?.toISOString() ?? null,
        },
      ],
    });
  } catch (err) {
    logger.error('Failed to fetch connected services', { err });
    res.status(500).json({ error: 'Internal server error', code: 'FETCH_ERROR' });
  }
});

router.delete('/connected-services/:serviceId', ensureAuthenticated, csrfProtection, authRateLimit, async (req: Request, res: Response) => {
  const { serviceId } = req.params;
  if (serviceId !== 'github') {
    return res.status(400).json({ error: 'Unknown service', code: 'INVALID_SERVICE' });
  }
  try {
    const userId = req.user!.id;
    await db
      .update(usersTable)
      .set({ githubTokenCiphertext: null, githubTokenIv: null, githubTokenCreatedAt: null })
      .where(eq(usersTable.id, userId));
    await writeAudit(userId, 'github_disconnected', req.ip ?? '', req.headers['user-agent'] ?? '');
    res.json({ message: 'GitHub disconnected.' });
  } catch (err) {
    logger.error('Failed to disconnect service', { err });
    res.status(500).json({ error: 'Internal server error', code: 'DISCONNECT_ERROR' });
  }
});

export default router;
