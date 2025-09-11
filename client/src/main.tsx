import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles/utilities.css";
import { ThemeProvider } from "next-themes";
import "./lib/monaco-config";
import { monitoring } from "./lib/monitoring";

// Initialize production monitoring
// This will automatically capture errors and performance metrics
console.log('[MONITORING] Initializing production monitoring service...');

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="dark">
    <App />
  </ThemeProvider>
);
