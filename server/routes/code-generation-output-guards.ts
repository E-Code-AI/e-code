// Streaming output guards for /api/code-generation/generate.
//
// Two protections, both fire mid-stream so we abort on bad output before
// burning the whole token budget:
//
// 1. Total-bytes cap — runaway models can stream until they hit the timeout.
//    A single response should never exceed MAX_OUTPUT_BYTES; if it does,
//    abort with PROVIDER_UNAVAILABLE (not retryable as-is, but the client
//    can retry with a smaller scope).
//
// 2. Per-file path safety — the prompt contract emits "--- <path> ---"
//    headings above each fenced block. When we see one, validate the path
//    immediately. Models occasionally emit absolute paths or "../" segments;
//    if those reached the writer they could escape the project sandbox.
//
// The guard is *streaming*: it accepts chunks one at a time and keeps a small
// tail buffer so it can detect path markers that straddle a chunk boundary.

import type { GenerationErrorCode } from './code-generation-errors';

export const MAX_OUTPUT_BYTES = 5_000_000; // 5 MB
export const MAX_PATH_LENGTH = 256;
const PATH_MARKER = /^(?:---\s+(.+?)\s+---|#{1,4}\s+`?([^\n`]+?)`?\s*$|^\*\*([^\n*]+?)\*\*\s*$)/gm;

// Trailing window we keep so a path marker split across two chunks is still
// detected. Two full marker lines is a safe cushion.
const TAIL_KEEP = MAX_PATH_LENGTH + 16;

export interface GuardOk {
  ok: true;
}

export interface GuardFail {
  ok: false;
  code: GenerationErrorCode;
  userMessage: string;
  detail?: string;
}

export type GuardResult = GuardOk | GuardFail;

const OK: GuardOk = { ok: true };

export function validateGeneratedPath(path: string): GuardResult {
  if (!path || path.length === 0) {
    return { ok: false, code: 'GENERATION_FAILED', userMessage: 'Generated output contained an empty file path.', detail: 'empty_path' };
  }
  if (path.length > MAX_PATH_LENGTH) {
    return { ok: false, code: 'GENERATION_FAILED', userMessage: 'Generated output contained a path that exceeds the safety limit.', detail: 'path_too_long' };
  }
  for (let i = 0; i < path.length; i++) {
    const c = path.charCodeAt(i);
    if (c < 0x20) {
      return { ok: false, code: 'GENERATION_FAILED', userMessage: 'Generated output contained a path with control characters.', detail: 'control_chars' };
    }
  }
  if (path.startsWith('/') || /^[A-Za-z]:[\\/]/.test(path)) {
    return { ok: false, code: 'GENERATION_FAILED', userMessage: 'Generated output contained an absolute path.', detail: 'absolute_path' };
  }
  // Reject any ".." segment — splitting on both / and \ catches Windows-style.
  const segments = path.split(/[\\/]/);
  if (segments.some((s) => s === '..')) {
    return { ok: false, code: 'GENERATION_FAILED', userMessage: 'Generated output contained a path-traversal segment.', detail: 'parent_traversal' };
  }
  return OK;
}

export class OutputGuard {
  private bytes = 0;
  private tail = '';
  private readonly seenPaths = new Set<string>();

  bytesSeen(): number {
    return this.bytes;
  }

  paths(): readonly string[] {
    return Array.from(this.seenPaths);
  }

  feed(chunk: string): GuardResult {
    if (chunk.length === 0) return OK;

    this.bytes += Buffer.byteLength(chunk, 'utf8');
    if (this.bytes > MAX_OUTPUT_BYTES) {
      return {
        ok: false,
        code: 'PROVIDER_UNAVAILABLE',
        userMessage: 'Generated output exceeded the maximum allowed size. Try a narrower request.',
        detail: `bytes=${this.bytes}`,
      };
    }

    // Glue the prior tail to the new chunk so a marker spanning the boundary
    // is still matched, then keep only enough of the new tail for the next call.
    const window = this.tail + chunk;
    PATH_MARKER.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = PATH_MARKER.exec(window)) !== null) {
      const raw = (m[1] || m[2] || m[3] || '').trim();
      if (!raw || raw.length === 0) continue;
      // For non-dashed formats (## heading, **bold**), require a file extension
      // to avoid false positives on normal markdown headings
      const isDashedFormat = m[1] !== undefined;
      if (!isDashedFormat && !/\.[a-zA-Z]{1,10}$/.test(raw)) continue;
      if (this.seenPaths.has(raw)) continue;
      const v = validateGeneratedPath(raw);
      if (!v.ok) return v;
      this.seenPaths.add(raw);
    }
    this.tail = window.length > TAIL_KEEP ? window.slice(window.length - TAIL_KEEP) : window;

    return OK;
  }
}
