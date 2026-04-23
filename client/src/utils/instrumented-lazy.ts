/**
 * Instrumented Lazy Loader
 * Wraps React.lazy to log module paths and catch empty errors
 * Includes retry mechanism for transient Vite HMR failures
 * With full page reload fallback for mobile devices with WebSocket issues
 */

import { lazy, ComponentType } from 'react';

const MAX_RETRIES = 3;
// Replit Vite dev: force:true means optimization takes 60-120s; give it time
const MAX_RETRIES_REPLIT = 50;
const RETRY_DELAY = 200; // Fast first retry (was 1000ms)
const RETRY_DELAY_REPLIT = 3000; // Fixed 3s per attempt on Replit = up to 150s
const RELOAD_KEY = 'lazy-load-reload-attempted';

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Detect if we're on a mobile device or in the Replit app/dev environment
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
    // On Replit dev (force:true re-optimizes on every start), give Vite up to 60s to finish
    const isReplit = isMobileOrReplitApp();
    const maxRetries = isReplit ? MAX_RETRIES_REPLIT : MAX_RETRIES;
    const retryDelay = isReplit ? RETRY_DELAY_REPLIT : RETRY_DELAY;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const module = await factory();
        if (attempt > 1) {
          console.log(`[LAZY] Successfully loaded module on attempt ${attempt}: ${path}`);
        }
        // Clear reload flag on success
        sessionStorage.removeItem(RELOAD_KEY);
        return module;
      } catch (error) {
        lastError = error;

        // Log the attempt failure
        if (attempt < maxRetries) {
          console.warn(`[LAZY] Attempt ${attempt}/${maxRetries} failed for module: ${path}`, {
            errorMessage: error instanceof Error ? error.message : String(error),
            isEmptyObject: typeof error === 'object' && Object.keys(error || {}).length === 0
          });
          // On Replit: fixed 3s delay. Otherwise: exponential 200ms, 400ms, 600ms
          await sleep(isReplit ? retryDelay : retryDelay * attempt);
        }
      }
    }
    
    // All retries exhausted - check if we should try a full page reload
    // This helps with mobile devices where Vite HMR WebSocket fails
    const alreadyReloaded = sessionStorage.getItem(RELOAD_KEY);
    
    if (!alreadyReloaded && isMobileOrReplitApp()) {
      console.log(`[LAZY] Attempting full page reload to recover from module load failure: ${path}`);
      sessionStorage.setItem(RELOAD_KEY, 'true');
      window.location.reload();
      // Return a never-resolving promise to prevent error boundary from showing
      return new Promise(() => {});
    }
    
    // Clear reload flag so user can retry later
    sessionStorage.removeItem(RELOAD_KEY);
    
    // All retries exhausted - log and throw
    console.error(`[LAZY] Failed to load module after ${maxRetries} attempts: ${path}`, {
      error: lastError,
      errorType: typeof lastError,
      errorConstructor: (lastError as any)?.constructor?.name,
      errorMessage: lastError instanceof Error ? lastError.message : String(lastError),
      isEmptyObject: typeof lastError === 'object' && Object.keys(lastError || {}).length === 0
    });
    
    // Convert empty objects to proper Error instances
    if (typeof lastError === 'object' && lastError !== null && Object.keys(lastError).length === 0) {
      throw new Error(`Empty error thrown while loading module: ${path}`);
    }
    
    // Re-throw as proper Error if it's not already
    if (!(lastError instanceof Error)) {
      throw new Error(`Module load failed (${path}): ${String(lastError)}`);
    }
    
    throw lastError;
  });
}
