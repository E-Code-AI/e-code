import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ThemeProvider } from "next-themes";
import "./lib/monaco-config";
import { monitoring } from "./lib/monitoring";
import { pwaManager } from "./lib/pwa";

// Initialize production monitoring
// This will automatically capture errors and performance metrics
console.log('[MONITORING] Initializing production monitoring service...');

// Initialize PWA functionality
console.log('[PWA] Initializing Progressive Web App features...');

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="dark">
    <App />
  </ThemeProvider>
);
