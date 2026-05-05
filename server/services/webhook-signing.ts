/**
 * Webhook payload signing — HMAC-SHA256 with the subscription's shared
 * secret. The wire format is `sha256=<hex>` so consumers can use the same
 * verification pattern GitHub/Stripe document.
 *
 * Pulled into its own module so the pure crypto can be unit-tested without
 * importing the rest of the dispatcher (which talks to the DB).
 */

import * as crypto from 'crypto';

export function signWebhookBody(body: string, secret: string): string {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
}

/**
 * Constant-time comparison so callers verifying inbound signatures don't
 * leak the secret via timing.
 */
export function verifyWebhookSignature(body: string, secret: string, signature: string): boolean {
  const expected = signWebhookBody(body, secret);
  const expectedBuf = Buffer.from(expected);
  const givenBuf = Buffer.from(signature);
  if (expectedBuf.length !== givenBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, givenBuf);
}
