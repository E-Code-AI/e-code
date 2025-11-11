/**
 * Instrumented Lazy Loader
 * Wraps React.lazy to log module paths and catch empty errors
 */

import { lazy, ComponentType } from 'react';

export function instrumentedLazy<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  modulePath?: string
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    const path = modulePath || 'Unknown module';
    
    try {
      const module = await factory();
      return module;
    } catch (error) {
      // Enhanced error logging to capture actual error details
      console.error(`[LAZY] Failed to load module: ${path}`, {
        error,
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        errorMessage: error instanceof Error ? error.message : String(error),
        isEmptyObject: typeof error === 'object' && Object.keys(error || {}).length === 0
      });
      
      // Convert empty objects to proper Error instances
      if (typeof error === 'object' && error !== null && Object.keys(error).length === 0) {
        throw new Error(`Empty error thrown while loading module: ${path}`);
      }
      
      // Re-throw as proper Error if it's not already
      if (!(error instanceof Error)) {
        throw new Error(`Module load failed (${path}): ${String(error)}`);
      }
      
      throw error;
    }
  });
}
