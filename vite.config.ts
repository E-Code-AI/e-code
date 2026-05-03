import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// react, react-dom, scheduler, and wouter must land in the same output chunk.
// Splitting them apart causes Rollup's CJS→ESM live-binding interop to expose
// partially-initialised module objects (null) at import time, which is the
// root cause of: TypeError: Cannot read properties of null (reading 'useContext')
const REACT_CHUNK_PACKAGES = new Set(["react", "react-dom", "scheduler", "wouter"]);

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      // Use directory paths (not index.js) so sub-path imports like
      // "react/jsx-runtime" continue to resolve via the package exports map.
      "react": path.resolve(import.meta.dirname, "node_modules/react"),
      "react-dom": path.resolve(import.meta.dirname, "node_modules/react-dom"),
      "scheduler": path.resolve(import.meta.dirname, "node_modules/scheduler"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "scheduler", "wouter"],
  },
  server: {
    headers: {
      // Prevent stale browser chunks from mixing React versions after restarts.
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  },
  optimizeDeps: {
    force: true,
    include: ["react", "react-dom", "react/jsx-runtime", "scheduler", "wouter"],
  },
  base: process.env.CDN_BASE_URL || process.env.ASSET_BASE_URL || '/',
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          const [, afterNodeModules] = id.split("node_modules/");
          if (!afterNodeModules) return;

          const segments = afterNodeModules.split("/");
          const packageName = segments[0].startsWith("@")
            ? `${segments[0]}/${segments[1]}`
            : segments[0];

          if (REACT_CHUNK_PACKAGES.has(packageName)) return "vendor-react";

          if (packageName.includes("xterm")) return "vendor-xterm";

          return `vendor-${packageName.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
        },
      },
    },
  },
});
