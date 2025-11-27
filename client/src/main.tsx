import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./lib/monaco-config";
import { monitoring } from "./lib/monitoring";
import { initTelemetry } from "./lib/telemetry";

// Initialize production monitoring
// This will automatically capture errors and performance metrics

// Initialize Fortune 500 centralized telemetry
initTelemetry({
  enabled: true,
  debug: import.meta.env.DEV,
  batchSize: 10,
  flushInterval: 5000,
});

// FIXED: Removed duplicate ThemeProvider - already wrapped in App.tsx
createRoot(document.getElementById("root")!).render(<App />);
