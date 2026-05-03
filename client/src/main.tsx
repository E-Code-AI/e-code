import { createRoot } from "react-dom/client";
import App from "./App";
import ErrorBoundary from "@/components/ErrorBoundary";
import { assertReactSingleton } from "@/utils/assert-react-singleton";
import "./critical.css";

// Fail loudly in DEV if a second React copy is already present at bootstrap.
assertReactSingleton();

if (import.meta.env.VITE_SENTRY_DSN) {
  import('@sentry/react').then((Sentry) => {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      integrations: [
        Sentry.browserTracingIntegration(),
      ],
      tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
    });
  });
}

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
};

if (typeof window !== 'undefined') {
  if (window.requestIdleCallback) {
    window.requestIdleCallback(deferredInit, { timeout: 3000 });
  } else {
    requestAnimationFrame(() => setTimeout(deferredInit, 100));
  }
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

const initialLoader = document.getElementById('initial-loader');
if (initialLoader) {
  initialLoader.classList.add('hidden');
}
