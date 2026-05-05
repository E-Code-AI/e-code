import * as ReactModule from "react";

declare global {
  interface Window {
    __REACT_INSTANCE__?: typeof ReactModule;
  }
}

/**
 * Throws in DEV if more than one React module object is active on the page.
 * Called at bootstrap and after every lazy chunk loads so regressions are
 * caught before reaching Sentry.
 */
export function assertReactSingleton(): void {
  if (!import.meta.env.DEV) return;
  if (window.__REACT_INSTANCE__ === undefined) {
    window.__REACT_INSTANCE__ = ReactModule;
  } else if (window.__REACT_INSTANCE__ !== ReactModule) {
    throw new Error(
      "[DUPLICATE REACT] Two React instances detected — hooks will fail. " +
      "Check vite.config.ts resolve.alias / resolve.dedupe / manualChunks."
    );
  }
}
