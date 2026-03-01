#!/usr/bin/env node
/**
 * Production server build script
 *
 * Strategy: packages:'bundle' — all npm packages are inlined into dist/index.js.
 * Only native .node addons are marked external (bcrypt, node-pty).
 *
 * Result: self-contained single file → NO npm install required on VM →
 * deployment completes in <60s instead of timing out at 9min.
 *
 * Security scanner: 1 file to scan (vs 651 files with splitting) → no timeout.
 */

import * as esbuild from 'esbuild';
import { existsSync, rmSync, readdirSync } from 'fs';
import { join } from 'path';

async function cleanOldChunks() {
  if (!existsSync('dist')) return;
  const files = readdirSync('dist');
  let removed = 0;
  for (const f of files) {
    if (f !== 'index.js' && f !== 'public' && f.endsWith('.js')) {
      rmSync(join('dist', f));
      removed++;
    }
  }
  if (removed > 0) console.log(`  Cleaned ${removed} old chunk files`);
}

async function build() {
  console.log('Building server bundle (self-contained mode)...');

  try {
    const result = await esbuild.build({
      entryPoints: ['server/index.ts'],
      bundle: true,
      splitting: false,
      platform: 'node',
      target: 'node20',
      format: 'esm',
      outfile: 'dist/index.js',
      minify: true,
      treeShaking: true,
      sourcemap: false,
      metafile: true,
      legalComments: 'none',
      keepNames: false,
      drop: ['debugger'],
      // Mark only native .node addons and dev/build tools as external.
      // Everything else gets bundled — no npm install needed on the VM.
      external: [
        // Native addons (have .node binary files, cannot be bundled)
        'bcrypt',
        'node-pty',
        'ssh2',
        '@rollup/rollup-linux-x64-gnu',
        '@rollup/rollup-linux-x64-musl',
        // Optional cloudflare pg adapter (not needed on GCE VM)
        'pg-cloudflare',
        // Dev/build tools (not needed at runtime)
        'vite',
        'esbuild',
        'playwright',
        'electron',
        // Optional peer deps that may or may not be installed
        'fsevents',
        'canvas',
        'sharp',
      ],
      define: {
        'process.env.NODE_ENV': '"production"',
      },
      banner: {
        js: `
import { createRequire as __esbuild_createRequire } from 'module';
import { fileURLToPath as __esbuild_fileURLToPath } from 'url';
import { dirname as __esbuild_dirname } from 'path';
const require = __esbuild_createRequire(import.meta.url);
const __filename = __esbuild_fileURLToPath(import.meta.url);
const __dirname = __esbuild_dirname(__filename);
`
      }
    });

    const outputSize = Object.values(result.metafile.outputs)
      .reduce((acc, o) => acc + o.bytes, 0);

    console.log(`✅ Server bundle built successfully`);
    console.log(`   Output: dist/index.js (${(outputSize / 1024 / 1024).toFixed(2)} MB)`);
    console.log(`   Mode: self-contained (no npm install required on VM)`);

    await cleanOldChunks();

  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

build();
