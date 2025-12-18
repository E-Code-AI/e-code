import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./lib/monaco-config";
import "./i18n"; // Initialize i18n for internationalization
import { monitoring } from "./lib/monitoring";
import { initTelemetry } from "./lib/telemetry";
import { registerServiceWorker } from "./utils/service-worker-registration";
import { cacheReconciliation } from "./lib/cache-reconciliation";
import { setupDynamicVH } from "./utils/dynamic-vh";

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

// FIXED: Removed duplicate ThemeProvider - already wrapped in App.tsx
createRoot(document.getElementById("root")!).render(<App />);

// Hide initial loader once React has rendered
const initialLoader = document.getElementById('initial-loader');
if (initialLoader) {
  initialLoader.classList.add('hidden');
}
