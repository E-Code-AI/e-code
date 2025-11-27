/**
 * Instrumented Lazy Loader
 * Wraps React.lazy to log module paths and catch empty errors
 * Includes retry mechanism for transient Vite HMR failures
 */

import { lazy, ComponentType } from 'react';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function instrumentedLazy<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  modulePath?: string
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    const path = modulePath || 'Unknown module';
    let lastError: unknown;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const module = await factory();
        if (attempt > 1) {
          console.log(`[LAZY] Successfully loaded module on attempt ${attempt}: ${path}`);
        }
        return module;
      } catch (error) {
        lastError = error;
        
        // Log the attempt failure
        if (attempt < MAX_RETRIES) {
          console.warn(`[LAZY] Attempt ${attempt}/${MAX_RETRIES} failed for module: ${path}`, {
            errorMessage: error instanceof Error ? error.message : String(error),
            isEmptyObject: typeof error === 'object' && Object.keys(error || {}).length === 0
          });
          await sleep(RETRY_DELAY * attempt);
        }
      }
    }
    
    // All retries exhausted - log and throw
    console.error(`[LAZY] Failed to load module after ${MAX_RETRIES} attempts: ${path}`, {
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
