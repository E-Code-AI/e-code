/**
 * Monaco Editor CDN Loader Configuration
 * 
 * This module configures @monaco-editor/react to load Monaco from CDN.
 * This reduces the bundle size by ~3.3MB while still being compatible with Vite.
 * 
 * Usage:
 * 1. Use initMonaco() to initialize and get the monaco instance
 * 2. Use getMonaco() to get the monaco instance synchronously (returns null if not loaded)
 * 3. Use type imports: `import type { editor, languages } from 'monaco-editor'`
 */

import { loader } from '@monaco-editor/react';

export type Monaco = typeof import('monaco-editor');

let monacoInstance: Monaco | null = null;
let initPromise: Promise<Monaco> | null = null;

// Configure loader to use CDN
loader.config({
  paths: {
    vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs'
  }
});

/**
 * Get the Monaco instance synchronously
 * @returns The Monaco instance or null if not yet initialized
 */
export function getMonaco(): Monaco | null {
  return monacoInstance;
}

/**
 * Initialize Monaco Editor from CDN
 * Safe to call multiple times - will only initialize once
 * @returns Promise resolving to the Monaco instance
 */
export async function initMonaco(): Promise<Monaco> {
  if (monacoInstance) {
    return monacoInstance;
  }
  
  if (initPromise) {
    return initPromise;
  }
  
  initPromise = loader.init().then((monaco) => {
    monacoInstance = monaco;
    (window as any).monaco = monaco; // Also set on window for compatibility
    return monaco;
  });
  
  return initPromise;
}

/**
 * Get the Monaco instance, initializing if needed
 * @returns Promise resolving to the Monaco instance
 */
export async function getMonacoAsync(): Promise<Monaco> {
  if (monacoInstance) {
    return monacoInstance;
  }
  return initMonaco();
}

/**
 * Check if Monaco is initialized
 */
export function isMonacoInitialized(): boolean {
  return monacoInstance !== null;
}
