// Log-safe error projection.
//
// Use this in `catch` blocks instead of passing the raw error to logger.error.
// Provider SDKs and database drivers occasionally include the full request
// (or response) on the error object — and that request body sometimes carries
// API keys, Authorization headers, or sensitive user input. Stack frames can
// reveal SDK internals that aren't useful for ops anyway.
//
// What we keep: name, code, status, and a hard-truncated message.
// What we drop:  stack, cause chains, request/response payloads, headers.
//
// When NOT to use: deep-debug code paths where you genuinely need the stack
// to localize a regression. In that case prefer logging at debug level so the
// signal stays out of production logs.

import { ZodError } from 'zod';

const MAX_MESSAGE_LENGTH = 200;

export function redactErrorForLog(error: unknown): Record<string, unknown> {
  if (error instanceof ZodError) {
    return { name: 'ZodError', issueCount: error.issues.length };
  }
  const e = (error ?? {}) as { name?: string; message?: string; status?: number; code?: string };
  return {
    name: e.name || 'Error',
    status: e.status,
    code: e.code,
    message: typeof e.message === 'string' ? e.message.slice(0, MAX_MESSAGE_LENGTH) : undefined,
  };
}
