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

    if (typeof lastError === 'object' && lastError !== null && Object.keys(lastError).length === 0) {
      throw new Error(`Empty error thrown while loading module: ${path}`);
    }

    if (!(lastError instanceof Error)) {
      throw new Error(`Module load failed (${path}): ${String(lastError)}`);
    }

    throw lastError;
  });
}
