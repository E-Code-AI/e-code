import { createRoot } from "react-dom/client";
import App from "./App";
import "./critical.css";

const deferredInit = () => {
  import('./index.css');
  import("./i18n");
  
  import("./utils/dynamic-vh").then(({ setupDynamicVH }) => {
    setupDynamicVH();
  });
  
  import("./lib/telemetry").then(({ initTelemetry }) => {
    initTelemetry({
      enabled: true,
      debug: import.meta.env.DEV,
      batchSize: 10,
      flushInterval: 5000,
    });
  });
  
  import("./utils/service-worker-registration").then(({ registerServiceWorker }) => {
    registerServiceWorker();
  });
  
  import("./lib/cache-reconciliation").then(({ cacheReconciliation }) => {
    cacheReconciliation.init();
  });
  
  if (import.meta.env.VITE_SENTRY_DSN) {
    import('@sentry/react').then((Sentry) => {
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
    });
  }
};

if (typeof window !== 'undefined') {
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(deferredInit, { timeout: 3000 });
  } else {
    requestAnimationFrame(() => setTimeout(deferredInit, 100));
  }
}

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

createRoot(document.getElementById("root")!).render(<App />);

const initialLoader = document.getElementById('initial-loader');
if (initialLoader) {
  initialLoader.classList.add('hidden');
}
