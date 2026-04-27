import { z } from 'zod';
import {
  classifyGenerationError,
  redactErrorForLog,
} from '../../server/routes/code-generation-errors';

describe('code-generation error classifier', () => {
  it('classifies ZodError as 400 VALIDATION_FAILED, not retryable', () => {
    const schema = z.object({ x: z.string() });
    let zodErr: z.ZodError | undefined;
    try {
      schema.parse({ x: 1 });
    } catch (e) {
      zodErr = e as z.ZodError;
    }
    const c = classifyGenerationError(zodErr);
    expect(c.code).toBe('VALIDATION_FAILED');
    expect(c.status).toBe(400);
    expect(c.retryable).toBe(false);
  });

  it('classifies HTTP 429 as PROVIDER_RATE_LIMIT and retryable', () => {
    const c = classifyGenerationError({ status: 429, message: 'rate limit' });
    expect(c.code).toBe('PROVIDER_RATE_LIMIT');
    expect(c.status).toBe(429);
    expect(c.retryable).toBe(true);
  });

  it('classifies timeout messages as PROVIDER_TIMEOUT and retryable', () => {
    const c = classifyGenerationError({ message: 'request timed out after 60s' });
    expect(c.code).toBe('PROVIDER_TIMEOUT');
    expect(c.status).toBe(504);
    expect(c.retryable).toBe(true);
  });

  it('classifies 401 as PROVIDER_AUTH and not retryable', () => {
    const c = classifyGenerationError({ status: 401, message: 'invalid api key' });
    expect(c.code).toBe('PROVIDER_AUTH');
    expect(c.retryable).toBe(false);
  });

  it('classifies 503/overloaded as PROVIDER_UNAVAILABLE and retryable', () => {
    const c = classifyGenerationError({ status: 503, message: 'service unavailable' });
    expect(c.code).toBe('PROVIDER_UNAVAILABLE');
    expect(c.retryable).toBe(true);
  });

  it('falls back to GENERATION_FAILED for unknown errors', () => {
    const c = classifyGenerationError(new Error('something exploded'));
    expect(c.code).toBe('GENERATION_FAILED');
    expect(c.status).toBe(500);
    expect(c.retryable).toBe(false);
  });

  it('userMessage never echoes raw provider error text', () => {
    const c = classifyGenerationError({ message: 'sk-ant-secret-token-leaked-by-provider' });
    expect(c.userMessage.toLowerCase()).not.toContain('sk-ant');
  });
});

describe('redactErrorForLog', () => {
  it('does not include stack traces', () => {
    const err = new Error('boom');
    const redacted = redactErrorForLog(err);
    expect(JSON.stringify(redacted)).not.toContain('at ');
    expect(redacted.message).toBe('boom');
  });

  it('truncates long messages to 200 chars', () => {
    const long = 'x'.repeat(1000);
    const redacted = redactErrorForLog({ message: long }) as { message: string };
    expect(redacted.message.length).toBe(200);
  });

  it('reduces ZodError to issue count', () => {
    const schema = z.object({ a: z.string(), b: z.number() });
    let zodErr: z.ZodError | undefined;
    try {
      schema.parse({});
    } catch (e) {
      zodErr = e as z.ZodError;
    }
    const r = redactErrorForLog(zodErr);
    expect(r.name).toBe('ZodError');
    expect(typeof r.issueCount).toBe('number');
  });

  it('handles null/undefined safely', () => {
    expect(() => redactErrorForLog(null)).not.toThrow();
    expect(() => redactErrorForLog(undefined)).not.toThrow();
  });
});
