import { z } from 'zod';

export { redactErrorForLog } from '../utils/error-redaction';

export type GenerationErrorCode =
  | 'VALIDATION_FAILED'
  | 'PROVIDER_TIMEOUT'
  | 'PROVIDER_RATE_LIMIT'
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_AUTH'
  | 'GENERATION_FAILED';

export interface ClassifiedError {
  code: GenerationErrorCode;
  status: number;
  userMessage: string;
  retryable: boolean;
}

// Classify an unknown error from generation/streaming into a stable code,
// HTTP status, and a retryability hint. The userMessage is safe to surface
// to clients (no provider internals, no stack frames).
export function classifyGenerationError(error: unknown): ClassifiedError {
  if (error instanceof z.ZodError) {
    return {
      code: 'VALIDATION_FAILED',
      status: 400,
      userMessage: 'Invalid generation request. Check the request payload.',
      retryable: false,
    };
  }
  const e = (error ?? {}) as { name?: string; message?: string; status?: number; code?: string };
  const msg = (e.message || '').toLowerCase();
  const status = typeof e.status === 'number' ? e.status : undefined;
  if (status === 429 || msg.includes('rate limit') || msg.includes('too many requests')) {
    return { code: 'PROVIDER_RATE_LIMIT', status: 429, userMessage: 'AI provider rate limit reached. Try again shortly.', retryable: true };
  }
  if (status === 408 || /timeout|timed out|etimedout/.test(msg)) {
    return { code: 'PROVIDER_TIMEOUT', status: 504, userMessage: 'Generation timed out. Try again.', retryable: true };
  }
  if (status === 401 || status === 403 || msg.includes('unauthorized') || msg.includes('api key')) {
    return { code: 'PROVIDER_AUTH', status: 502, userMessage: 'AI provider authentication failed.', retryable: false };
  }
  if (status === 502 || status === 503 || msg.includes('unavailable') || msg.includes('overloaded')) {
    return { code: 'PROVIDER_UNAVAILABLE', status: 502, userMessage: 'AI provider unavailable. Try again shortly.', retryable: true };
  }
  return { code: 'GENERATION_FAILED', status: 500, userMessage: 'Code generation failed.', retryable: false };
}

