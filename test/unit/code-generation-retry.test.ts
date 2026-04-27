import {
  DEFAULT_RETRY_OPTIONS,
  backoffDelay,
  streamWithRetry,
  type RetryEvent,
  type RetryOptions,
} from '../../server/routes/code-generation-retry';
import { classifyGenerationError } from '../../server/routes/code-generation-errors';

const OPTS: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 10,
  factor: 2,
  jitter: 0,
};

function makeIter(steps: Array<{ yield?: string; throw?: unknown }>): AsyncIterable<string> {
  return {
    [Symbol.asyncIterator]() {
      let i = 0;
      return {
        async next() {
          if (i >= steps.length) return { done: true, value: undefined };
          const step = steps[i++];
          if (step.throw) throw step.throw;
          return { done: false, value: step.yield ?? '' };
        },
      };
    },
  };
}

describe('backoffDelay', () => {
  it('grows exponentially with no jitter', () => {
    const opts: RetryOptions = { maxAttempts: 5, baseDelayMs: 100, factor: 2, jitter: 0 };
    expect(backoffDelay(1, opts, () => 0.5)).toBe(100);
    expect(backoffDelay(2, opts, () => 0.5)).toBe(200);
    expect(backoffDelay(3, opts, () => 0.5)).toBe(400);
  });

  it('applies symmetric jitter', () => {
    const opts: RetryOptions = { maxAttempts: 5, baseDelayMs: 100, factor: 1, jitter: 0.5 };
    expect(backoffDelay(1, opts, () => 0)).toBe(50); // -50% of 100
    expect(backoffDelay(1, opts, () => 1)).toBe(150); // +50% of 100
  });

  it('clamps to 0 if negative jitter would underflow', () => {
    const opts: RetryOptions = { maxAttempts: 5, baseDelayMs: 10, factor: 1, jitter: 5 };
    expect(backoffDelay(1, opts, () => 0)).toBe(0);
  });
});

describe('streamWithRetry', () => {
  const noSleep = () => Promise.resolve();
  const noJitter = () => 0.5;

  it('passes through a successful stream unchanged', async () => {
    const factory = () => makeIter([{ yield: 'a' }, { yield: 'b' }, { yield: 'c' }]);
    const out: string[] = [];
    for await (const c of streamWithRetry(factory, { classify: classifyGenerationError, sleep: noSleep, random: noJitter }, OPTS)) {
      out.push(c);
    }
    expect(out).toEqual(['a', 'b', 'c']);
  });

  it('retries a retryable failure on the first .next() and succeeds', async () => {
    let calls = 0;
    const factory = () => {
      calls++;
      if (calls === 1) {
        return makeIter([{ throw: { status: 503, message: 'service unavailable' } }]);
      }
      return makeIter([{ yield: 'ok' }]);
    };
    const events: RetryEvent[] = [];
    const out: string[] = [];
    for await (const c of streamWithRetry(
      factory,
      { classify: classifyGenerationError, sleep: noSleep, random: noJitter },
      OPTS,
      (e) => events.push(e),
    )) {
      out.push(c);
    }
    expect(out).toEqual(['ok']);
    expect(calls).toBe(2);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ attempt: 2, code: 'PROVIDER_UNAVAILABLE' });
    expect(events[0].delayMs).toBe(10);
  });

  it('retries up to maxAttempts and then re-throws the last error', async () => {
    let calls = 0;
    const factory = () => {
      calls++;
      return makeIter([{ throw: { status: 429, message: 'rate limit' } }]);
    };
    await expect(async () => {
      for await (const _ of streamWithRetry(
        factory,
        { classify: classifyGenerationError, sleep: noSleep, random: noJitter },
        OPTS,
      )) {
        // drain
      }
    }).rejects.toMatchObject({ status: 429 });
    expect(calls).toBe(3);
  });

  it('does NOT retry once a chunk has been yielded', async () => {
    let calls = 0;
    const factory = () => {
      calls++;
      return makeIter([
        { yield: 'first' },
        { throw: { status: 503, message: 'mid-stream collapse' } },
      ]);
    };
    const yielded: string[] = [];
    await expect(async () => {
      for await (const c of streamWithRetry(
        factory,
        { classify: classifyGenerationError, sleep: noSleep, random: noJitter },
        OPTS,
      )) {
        yielded.push(c);
      }
    }).rejects.toMatchObject({ status: 503 });
    expect(yielded).toEqual(['first']);
    expect(calls).toBe(1);
  });

  it('does not retry non-retryable errors', async () => {
    let calls = 0;
    const factory = () => {
      calls++;
      return makeIter([{ throw: { status: 401, message: 'invalid api key' } }]);
    };
    await expect(async () => {
      for await (const _ of streamWithRetry(
        factory,
        { classify: classifyGenerationError, sleep: noSleep, random: noJitter },
        OPTS,
      )) {
        // drain
      }
    }).rejects.toMatchObject({ status: 401 });
    expect(calls).toBe(1);
  });

  it('exposes a sane default config', () => {
    expect(DEFAULT_RETRY_OPTIONS.maxAttempts).toBeGreaterThanOrEqual(2);
    expect(DEFAULT_RETRY_OPTIONS.baseDelayMs).toBeGreaterThan(0);
    expect(DEFAULT_RETRY_OPTIONS.factor).toBeGreaterThan(1);
  });
});
