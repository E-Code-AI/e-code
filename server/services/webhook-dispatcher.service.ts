/**
 * WebhookDispatcher — fire user-configured webhooks on platform events.
 *
 * Other services call `webhookDispatcher.publish(userId, event, payload)`.
 * The dispatcher loads matching subscriptions and POSTs the payload with an
 * HMAC-SHA256 signature in `X-E-Code-Signature`. Failures are persisted and
 * the subscription's failure counter is incremented; after `MAX_FAILURES`
 * consecutive failures the subscription is auto-disabled to avoid hammering
 * a dead endpoint.
 *
 * This is a fire-and-forget API: callers never block on delivery.
 */

import * as crypto from 'crypto';
import { db } from '../db';
import { webhookSubscriptions, webhookDeliveries } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { createLogger } from '../utils/logger';

const logger = createLogger('webhook-dispatcher');

const DELIVERY_TIMEOUT_MS = 10_000;
const MAX_FAILURES = 10;

export type WebhookEvent =
  | 'deployment.created'
  | 'deployment.succeeded'
  | 'deployment.failed'
  | 'deployment.stopped'
  | 'deployment.slept'
  | 'project.shared'
  | 'project.deleted'
  | 'share_link.created'
  | 'share_link.revoked';

class WebhookDispatcher {
  /**
   * Publish an event for a given user. Synchronous up to the DB read; the
   * actual HTTP requests are scheduled on the next tick so callers don't
   * block on slow/unreachable subscribers.
   */
  async publish(userId: number, event: WebhookEvent, payload: Record<string, unknown>): Promise<void> {
    let subs;
    try {
      subs = await db
        .select()
        .from(webhookSubscriptions)
        .where(and(eq(webhookSubscriptions.userId, userId), eq(webhookSubscriptions.active, true)));
    } catch (err) {
      logger.error('failed to load subscriptions', { error: String(err), userId });
      return;
    }

    for (const sub of subs) {
      if (!this.matches(sub.events, event)) continue;
      // Fire-and-forget per sub, but isolate errors so one bad URL doesn't
      // affect the others.
      setImmediate(() => {
        this.deliver(sub, event, payload).catch((err) =>
          logger.error('delivery error', { error: String(err), subscriptionId: sub.id })
        );
      });
    }
  }

  private matches(eventsField: string, event: WebhookEvent): boolean {
    const list = eventsField.split(',').map((s) => s.trim()).filter(Boolean);
    return list.includes('*') || list.includes(event);
  }

  private async deliver(
    sub: typeof webhookSubscriptions.$inferSelect,
    event: WebhookEvent,
    payload: Record<string, unknown>
  ): Promise<void> {
    const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
    const signature = sub.secret ? this.sign(body, sub.secret) : null;

    let statusCode: number | null = null;
    let responseBody = '';
    let succeeded = false;

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), DELIVERY_TIMEOUT_MS);
    try {
      const res = await fetch(sub.url, {
        method: 'POST',
        signal: ac.signal,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'E-Code-Webhooks/1',
          'X-E-Code-Event': event,
          ...(signature ? { 'X-E-Code-Signature': signature } : {}),
        },
        body,
      });
      statusCode = res.status;
      responseBody = (await res.text()).slice(0, 2000);
      succeeded = res.ok;
    } catch (err: any) {
      responseBody = String(err?.message || err).slice(0, 2000);
    } finally {
      clearTimeout(timer);
    }

    await db.insert(webhookDeliveries).values({
      subscriptionId: sub.id,
      event,
      payload: { event, payload },
      statusCode,
      responseBody,
      succeeded,
    });

    if (succeeded) {
      await db
        .update(webhookSubscriptions)
        .set({ lastDeliveryAt: new Date(), lastStatusCode: statusCode, failureCount: 0 })
        .where(eq(webhookSubscriptions.id, sub.id));
    } else {
      const nextFailures = (sub.failureCount ?? 0) + 1;
      await db
        .update(webhookSubscriptions)
        .set({
          lastDeliveryAt: new Date(),
          lastStatusCode: statusCode,
          failureCount: nextFailures,
          // Auto-disable after consistent failures so we stop hammering.
          active: nextFailures >= MAX_FAILURES ? false : sub.active,
        })
        .where(eq(webhookSubscriptions.id, sub.id));
      if (nextFailures >= MAX_FAILURES) {
        logger.warn('auto-disabled webhook after repeated failures', { subscriptionId: sub.id, failures: nextFailures });
      }
    }
  }

  private sign(body: string, secret: string): string {
    return 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
  }
}

export const webhookDispatcher = new WebhookDispatcher();
