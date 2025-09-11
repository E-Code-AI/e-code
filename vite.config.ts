import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { PluginOption } from "vite";

// Custom plugin to build service worker
function serviceWorkerPlugin(): PluginOption {
  return {
    name: 'service-worker-build',
    generateBundle() {
      // The service worker will be built separately using the build command
    },
    writeBundle() {
      // Copy service worker to the output directory during build
      if (process.env.NODE_ENV === 'production') {
        console.log('[PWA] Service worker will be built in post-build step');
      }
    }
  };
}

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    serviceWorkerPlugin(),
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
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      // Exclude service worker from main bundle
      external: ['/src/service-worker.ts']
    }
  },
});
