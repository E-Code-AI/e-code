// Retry-with-exponential-backoff for the AI streaming call backing
// /api/code-generation/generate.
//
// Retries are *only* safe before the first chunk has been forwarded to
// the client. Once any output has been written to the SSE stream, the
// client has consumed it and we cannot roll back — at that point a mid-
// stream error must surface as an error event, never as a transparent
// retry. This wrapper enforces that invariant: it retries failures during
// iterator construction and on the very first .next(), then switches to
// pass-through mode.
//
// "Retryable" is decided by classifyGenerationError: PROVIDER_TIMEOUT,
// PROVIDER_RATE_LIMIT, PROVIDER_UNAVAILABLE. Validation/auth failures
// never retry (would just fail the same way again).

import type { ClassifiedError, GenerationErrorCode } from './code-generation-errors';

export interface RetryOptions {
  maxAttempts: number; // total attempts including the first try
  baseDelayMs: number;
  factor: number;
  jitter: number; // 0..1, fraction of delay randomized
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  factor: 2,
  jitter: 0.25,
};

export interface RetryEvent {
  attempt: number; // 1-indexed; "we are about to make attempt N"
  delayMs: number;
  code: GenerationErrorCode;
}

export interface RetryDeps {
  classify: (err: unknown) => ClassifiedError;
  // Override-able for tests.
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function* streamWithRetry(
  factory: () => AsyncIterable<string>,
  deps: RetryDeps,
  options: RetryOptions = DEFAULT_RETRY_OPTIONS,
  onRetry?: (event: RetryEvent) => void,
): AsyncGenerator<string> {
  const sleep = deps.sleep ?? defaultSleep;
  const random = deps.random ?? Math.random;
  let attempt = 0;
  let lastErr: unknown = null;

  while (attempt < options.maxAttempts) {
    attempt++;
    let iter: AsyncIterator<string> | null = null;
    let firstChunk: IteratorResult<string> | null = null;

    try {
      const source = factory();
      iter = source[Symbol.asyncIterator]();
      firstChunk = await iter.next();
    } catch (err) {
      lastErr = err;
      const c = deps.classify(err);
      if (!c.retryable || attempt >= options.maxAttempts) {
        throw err;
      }
      const delay = backoffDelay(attempt, options, random);
      onRetry?.({ attempt: attempt + 1, delayMs: delay, code: c.code });
      await sleep(delay);
      continue;
    }

    // From here on we have an open iterator. We've committed: yield the
    // first chunk (if any) and then pass through. Any subsequent error
    // propagates to the caller — no retry.
    if (firstChunk.done) {
      return;
    }
    yield firstChunk.value;
    while (true) {
      const next = await iter.next();
      if (next.done) return;
      yield next.value;
    }
  }

  // Unreachable in practice: the loop either yields or throws. Keep TS happy.
  throw lastErr ?? new Error('streamWithRetry: exhausted attempts');
}

export function backoffDelay(attempt: number, opts: RetryOptions, random: () => number): number {
  // attempt is 1-indexed; the first retry uses baseDelay, the next uses
  // baseDelay * factor, etc.
  const base = opts.baseDelayMs * Math.pow(opts.factor, attempt - 1);
  const jitterRange = base * opts.jitter;
  const jitter = (random() * 2 - 1) * jitterRange;
  return Math.max(0, Math.round(base + jitter));
}
