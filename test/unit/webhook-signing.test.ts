import { signWebhookBody, verifyWebhookSignature } from '../../server/services/webhook-signing';
import * as crypto from 'crypto';

describe('signWebhookBody', () => {
  it('produces a stable sha256= prefixed signature', () => {
    const sig = signWebhookBody('hello', 'secret');
    expect(sig).toMatch(/^sha256=[0-9a-f]{64}$/);
    // Stable across runs.
    expect(signWebhookBody('hello', 'secret')).toBe(sig);
  });

  it('matches a manually computed HMAC-SHA256', () => {
    const body = '{"event":"deployment.succeeded"}';
    const secret = 'whsec_abc';
    const expected =
      'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
    expect(signWebhookBody(body, secret)).toBe(expected);
  });

  it('produces different signatures for different secrets', () => {
    expect(signWebhookBody('hello', 'a')).not.toBe(signWebhookBody('hello', 'b'));
  });

  it('produces different signatures for different bodies', () => {
    expect(signWebhookBody('a', 'secret')).not.toBe(signWebhookBody('b', 'secret'));
  });
});

describe('verifyWebhookSignature', () => {
  it('returns true for a matching signature', () => {
    const body = '{"x":1}';
    const sig = signWebhookBody(body, 'top-secret');
    expect(verifyWebhookSignature(body, 'top-secret', sig)).toBe(true);
  });

  it('returns false when the body has been tampered', () => {
    const sig = signWebhookBody('{"x":1}', 'top-secret');
    expect(verifyWebhookSignature('{"x":2}', 'top-secret', sig)).toBe(false);
  });

  it('returns false when the secret differs', () => {
    const sig = signWebhookBody('{"x":1}', 'top-secret');
    expect(verifyWebhookSignature('{"x":1}', 'other-secret', sig)).toBe(false);
  });

  it('returns false when the signature length differs (no timing oracle leak)', () => {
    expect(verifyWebhookSignature('hi', 's', 'sha256=short')).toBe(false);
  });
});
