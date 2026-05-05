/**
 * Webhook subscription CRUD for end-users.
 *
 *   POST   /api/webhooks            create
 *   GET    /api/webhooks            list mine
 *   PUT    /api/webhooks/:id        update (toggle, change events/url/secret)
 *   DELETE /api/webhooks/:id        revoke
 *   GET    /api/webhooks/:id/deliveries  recent delivery log
 *   POST   /api/webhooks/:id/test   fire a test event
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import * as crypto from 'crypto';
import { db } from '../db';
import { webhookSubscriptions, webhookDeliveries } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { ensureAuthenticated } from '../middleware/auth';
import { webhookDispatcher } from '../services/webhook-dispatcher.service';
import { createLogger } from '../utils/logger';

const logger = createLogger('webhooks-router');
const router = Router();

const CreateSchema = z.object({
  url: z.string().url().max(2048),
  events: z.string().default('*'),
  secret: z.string().max(128).optional(),
});

const UpdateSchema = z.object({
  url: z.string().url().max(2048).optional(),
  events: z.string().optional(),
  secret: z.string().max(128).nullable().optional(),
  active: z.boolean().optional(),
});

router.post('/', ensureAuthenticated, async (req: Request, res: Response) => {
  const userId = (req.user as { id: number }).id;
  const parsed = CreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid body', errors: parsed.error.errors });

  // Auto-generate a secret if the caller doesn't supply one — signing is
  // strongly recommended so consumers can verify authenticity.
  const secret = parsed.data.secret ?? crypto.randomBytes(24).toString('base64url');

  try {
    const [row] = await db
      .insert(webhookSubscriptions)
      .values({
        userId,
        url: parsed.data.url,
        events: parsed.data.events,
        secret,
      })
      .returning();
    res.status(201).json(row);
  } catch (err) {
    logger.error('create failed', { error: String(err), userId });
    res.status(500).json({ message: 'Failed to create webhook' });
  }
});

router.get('/', ensureAuthenticated, async (req: Request, res: Response) => {
  const userId = (req.user as { id: number }).id;
  const rows = await db
    .select()
    .from(webhookSubscriptions)
    .where(eq(webhookSubscriptions.userId, userId));
  res.json({ subscriptions: rows });
});

router.put('/:id', ensureAuthenticated, async (req: Request, res: Response) => {
  const userId = (req.user as { id: number }).id;
  const parsed = UpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid body', errors: parsed.error.errors });

  const [existing] = await db
    .select()
    .from(webhookSubscriptions)
    .where(and(eq(webhookSubscriptions.id, req.params.id), eq(webhookSubscriptions.userId, userId)));
  if (!existing) return res.status(404).json({ message: 'Not found' });

  const updates: Partial<typeof webhookSubscriptions.$inferInsert> = {};
  if (parsed.data.url !== undefined) updates.url = parsed.data.url;
  if (parsed.data.events !== undefined) updates.events = parsed.data.events;
  if (parsed.data.secret !== undefined) updates.secret = parsed.data.secret;
  if (parsed.data.active !== undefined) {
    updates.active = parsed.data.active;
    // Re-enabling resets the failure counter so the auto-disable doesn't
    // fire immediately again.
    if (parsed.data.active) updates.failureCount = 0;
  }

  await db.update(webhookSubscriptions).set(updates).where(eq(webhookSubscriptions.id, req.params.id));
  res.json({ ok: true });
});

router.delete('/:id', ensureAuthenticated, async (req: Request, res: Response) => {
  const userId = (req.user as { id: number }).id;
  const result = await db
    .delete(webhookSubscriptions)
    .where(and(eq(webhookSubscriptions.id, req.params.id), eq(webhookSubscriptions.userId, userId)))
    .returning();
  if (result.length === 0) return res.status(404).json({ message: 'Not found' });
  res.json({ ok: true });
});

router.get('/:id/deliveries', ensureAuthenticated, async (req: Request, res: Response) => {
  const userId = (req.user as { id: number }).id;
  const [sub] = await db
    .select()
    .from(webhookSubscriptions)
    .where(and(eq(webhookSubscriptions.id, req.params.id), eq(webhookSubscriptions.userId, userId)));
  if (!sub) return res.status(404).json({ message: 'Not found' });

  const rows = await db
    .select()
    .from(webhookDeliveries)
    .where(eq(webhookDeliveries.subscriptionId, sub.id))
    .orderBy(desc(webhookDeliveries.attemptedAt))
    .limit(50);
  res.json({ deliveries: rows });
});

router.post('/:id/test', ensureAuthenticated, async (req: Request, res: Response) => {
  const userId = (req.user as { id: number }).id;
  const [sub] = await db
    .select()
    .from(webhookSubscriptions)
    .where(and(eq(webhookSubscriptions.id, req.params.id), eq(webhookSubscriptions.userId, userId)));
  if (!sub) return res.status(404).json({ message: 'Not found' });

  await webhookDispatcher.publish(userId, 'deployment.created', {
    test: true,
    message: 'This is a test delivery from your E-Code webhook settings.',
  });
  res.json({ ok: true, hint: 'Test event scheduled. Check the deliveries log in a few seconds.' });
});

export default router;
