import { createRoot } from "react-dom/client";
import * as Sentry from '@sentry/react';
import App from "./App";
import "./index.css";
import "./lib/monaco-config";
import "./i18n"; // Initialize i18n for internationalization
import { monitoring } from "./lib/monitoring";
import { initTelemetry } from "./lib/telemetry";
import { registerServiceWorker } from "./utils/service-worker-registration";
import { cacheReconciliation } from "./lib/cache-reconciliation";
import { setupDynamicVH } from "./utils/dynamic-vh";

// Initialize Sentry before React renders
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

// Initialize production monitoring
// This will automatically capture errors and performance metrics

// Initialize Fortune 500 centralized telemetry
initTelemetry({
  enabled: true,
  debug: import.meta.env.DEV,
  batchSize: 10,
  flushInterval: 5000,
});

// Register PWA Service Worker
registerServiceWorker();

// Initialize dynamic viewport height for mobile devices
setupDynamicVH();

// Initialize Fortune 500 Cache Reconciliation Layer
// Coordinates Service Worker cache with TanStack Query for seamless offline UX
cacheReconciliation.init();

// Error fallback component for Sentry
function ErrorFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full px-6 py-8 text-center">
        <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
        <p className="text-muted-foreground mb-4">
          We encountered an unexpected error. Please try refreshing the page.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
}

// FIXED: Removed duplicate ThemeProvider - already wrapped in App.tsx
createRoot(document.getElementById("root")!).render(
  <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
    <App />
  </Sentry.ErrorBoundary>
);

// Hide initial loader once React has rendered
const initialLoader = document.getElementById('initial-loader');
if (initialLoader) {
  initialLoader.classList.add('hidden');
}
