import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./lib/monaco-config";
import { monitoring } from "./lib/monitoring";

// Initialize production monitoring
// This will automatically capture errors and performance metrics
console.log('[MONITORING] Initializing production monitoring service...');

// FIXED: Removed duplicate ThemeProvider - already wrapped in App.tsx
createRoot(document.getElementById("root")!).render(<App />);
