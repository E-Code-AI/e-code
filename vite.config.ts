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
const REACT_CHUNK_NAME = "vendor-react";

// Build-time guard: ensures React (and the packages that share its module
// identity) only ever appear in the dedicated `vendor-react` chunk. If a
// regression in `manualChunks` or a stray dynamic import causes Rollup to
// duplicate React source into another chunk, the production build will fail
// here with a clear message — preventing the duplicate-React runtime crash
// (`Cannot read properties of null (reading 'useContext')`) from ever shipping.
// The runtime equivalent lives in `client/src/main.tsx` (assertReactSingleton)
// but only runs in development.
function assertSingleReactChunkPlugin() {
  return {
    name: "assert-single-react-chunk",
    apply: "build" as const,
    enforce: "post" as const,
    generateBundle(_options: unknown, bundle: Record<string, any>) {
      const offenders: Array<{ chunk: string; modules: string[] }> = [];

      for (const [fileName, asset] of Object.entries(bundle)) {
        if (asset.type !== "chunk") continue;

        const chunkName: string = asset.name || "";
        if (chunkName === REACT_CHUNK_NAME) continue;

        const reactModules: string[] = [];
        for (const moduleId of Object.keys(asset.modules || {})) {
          const idx = moduleId.lastIndexOf("node_modules/");
          if (idx === -1) continue;
          const after = moduleId.slice(idx + "node_modules/".length);
          const segments = after.split("/");
          const pkg = segments[0].startsWith("@")
            ? `${segments[0]}/${segments[1]}`
            : segments[0];
          if (REACT_CHUNK_PACKAGES.has(pkg)) {
            reactModules.push(moduleId);
          }
        }

        if (reactModules.length > 0) {
          offenders.push({ chunk: fileName, modules: reactModules });
        }
      }

      if (offenders.length > 0) {
        const details = offenders
          .map(
            (o) =>
              `  - ${o.chunk}\n${o.modules
                .map((m) => `      • ${m}`)
                .join("\n")}`,
          )
          .join("\n");
        const packages = Array.from(REACT_CHUNK_PACKAGES).join(", ");
        this.error(
          `Duplicate React detected in production bundle.\n` +
            `The following chunks contain source from {${packages}} ` +
            `but only "${REACT_CHUNK_NAME}" is allowed to:\n${details}\n\n` +
            `This usually indicates a regression in build.rollupOptions.output.manualChunks ` +
            `in vite.config.ts. Shipping duplicate copies of React causes ` +
            `"Cannot read properties of null (reading 'useContext')" at runtime.`,
        );
      }
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    assertSingleReactChunkPlugin(),
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
