/**
 * Monaco Editor CDN Loader Configuration
 * 
 * This module configures Monaco Editor to load from jsDelivr CDN instead of bundling,
 * reducing the bundle size by ~3.3MB.
 * 
 * Usage:
 * 1. Import and call initMonaco() at app startup or in lazy wrapper
 * 2. Use getMonaco() to get the monaco instance after initialization
 * 3. Use type imports: `import type { editor, languages } from 'monaco-editor'`
 */

import { loader } from "@monaco-editor/react";
import type * as MonacoEditor from "monaco-editor";

const MONACO_CDN_VERSION = "0.45.0";
const MONACO_CDN_URL = `https://cdn.jsdelivr.net/npm/monaco-editor@${MONACO_CDN_VERSION}/min/vs`;

let monacoInstance: typeof MonacoEditor | null = null;
let initPromise: Promise<typeof MonacoEditor> | null = null;

loader.config({
  paths: {
    vs: MONACO_CDN_URL
  },
  "vs/nls": {
    availableLanguages: {
      "*": "en"
    }
  }
});

/**
 * Initialize Monaco Editor from CDN
 * Safe to call multiple times - will only initialize once
 * @returns Promise resolving to the Monaco instance
 */
export async function initMonaco(): Promise<typeof MonacoEditor> {
  if (monacoInstance) {
    return monacoInstance;
  }
  
  if (initPromise) {
    return initPromise;
  }
  
  initPromise = loader.init().then((monaco) => {
    monacoInstance = monaco as typeof MonacoEditor;
    console.log('[Monaco CDN] Initialized from CDN:', MONACO_CDN_URL);
    return monacoInstance;
  });
  
  return initPromise;
}

/**
 * Get the Monaco instance synchronously
 * @returns The Monaco instance or null if not yet initialized
 */
export function getMonaco(): typeof MonacoEditor | null {
  return monacoInstance;
}

/**
 * Get the Monaco instance, initializing if needed
 * @returns Promise resolving to the Monaco instance
 */
export async function getMonacoAsync(): Promise<typeof MonacoEditor> {
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

export { loader };
export type Monaco = typeof MonacoEditor;
