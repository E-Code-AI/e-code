/**
 * Instrumented Lazy Loader
 * Wraps React.lazy to log module paths and catch empty errors
 * Includes retry mechanism for transient Vite HMR failures
 * With full page reload fallback for mobile devices with WebSocket issues
 */

import { lazy, ComponentType } from 'react';
import { assertReactSingleton } from './assert-react-singleton';

const MAX_RETRIES = 3;
const MAX_RETRIES_REPLIT = 50;
const RETRY_DELAY = 200;
const RETRY_DELAY_REPLIT = 3000;
const RELOAD_KEY = 'lazy-load-reload-attempted';

export interface LazyChunkLoadError extends Error {
  isChunkLoadError: true;
  modulePath: string;
  retryAttempts: number;
  maxRetries: number;
  originalError: unknown;
}

export function isLazyChunkLoadError(error: unknown): error is LazyChunkLoadError {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as LazyChunkLoadError).isChunkLoadError === true
  );
}

function looksLikeChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const name = (error as any)?.name || '';
  const message = (error as any)?.message || String(error);
  return (
    name === 'ChunkLoadError' ||
    /Loading chunk \d+ failed/i.test(message) ||
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /dynamically imported module/i.test(message)
  );
}

function buildChunkLoadError(
  originalError: unknown,
  path: string,
  attempts: number,
  maxRetries: number
): LazyChunkLoadError {
  const baseMessage =
    originalError instanceof Error
      ? originalError.message
      : String(originalError ?? 'unknown');
  const err = new Error(
    `Failed to load module after ${attempts} attempt(s): ${path} (${baseMessage})`
  ) as LazyChunkLoadError;
  err.name = 'ChunkLoadError';
  err.isChunkLoadError = true;
  err.modulePath = path;
  err.retryAttempts = attempts;
  err.maxRetries = maxRetries;
  err.originalError = originalError;
  if (originalError instanceof Error && originalError.stack) {
    err.stack = originalError.stack;
  }
  return err;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isMobileOrReplitApp(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  return /iphone|ipad|android|mobile/i.test(ua) || /replit/i.test(ua) ||
    hostname.includes('replit.dev') || hostname.includes('repl.co');
}

export function instrumentedLazy<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  modulePath?: string
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    const path = modulePath || 'Unknown module';
    let lastError: unknown;
    const isReplit = isMobileOrReplitApp();
    const maxRetries = isReplit ? MAX_RETRIES_REPLIT : MAX_RETRIES;
    const retryDelay = isReplit ? RETRY_DELAY_REPLIT : RETRY_DELAY;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const module = await factory();
        if (attempt > 1) {
          console.log(`[LAZY] Successfully loaded module on attempt ${attempt}: ${path}`);
        }
        sessionStorage.removeItem(RELOAD_KEY);
        // Verify no duplicate React sneaked in via this chunk.
        assertReactSingleton();
        return module;
      } catch (error) {
        lastError = error;

        if (attempt < maxRetries) {
          console.warn(`[LAZY] Attempt ${attempt}/${maxRetries} failed for module: ${path}`, {
            errorMessage: error instanceof Error ? error.message : String(error),
            isEmptyObject: typeof error === 'object' && Object.keys(error || {}).length === 0
          });
          await sleep(isReplit ? retryDelay : retryDelay * attempt);
        }
      }
    }

    const alreadyReloaded = sessionStorage.getItem(RELOAD_KEY);

    if (!alreadyReloaded && isMobileOrReplitApp()) {
      console.log(`[LAZY] Attempting full page reload to recover from module load failure: ${path}`);
      sessionStorage.setItem(RELOAD_KEY, 'true');
      window.location.reload();
      return new Promise(() => {});
    }

    sessionStorage.removeItem(RELOAD_KEY);

    console.error(`[LAZY] Failed to load module after ${maxRetries} attempts: ${path}`, {
      error: lastError,
      errorType: typeof lastError,
      errorConstructor: (lastError as any)?.constructor?.name,
      errorMessage: lastError instanceof Error ? lastError.message : String(lastError),
      isEmptyObject: typeof lastError === 'object' && Object.keys(lastError || {}).length === 0
    });

    // Treat any final lazy-load failure (including empty errors and chunk load
    // errors) as a recoverable chunk load error so the ErrorBoundary can offer
    // a cache-busting reload.
    if (
      looksLikeChunkLoadError(lastError) ||
      (typeof lastError === 'object' && lastError !== null && Object.keys(lastError).length === 0) ||
      !(lastError instanceof Error)
    ) {
      throw buildChunkLoadError(lastError, path, maxRetries, maxRetries);
    }

    throw buildChunkLoadError(lastError, path, maxRetries, maxRetries);
  });
}
