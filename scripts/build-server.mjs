#!/usr/bin/env node
/**
 * Production server build script
 *
 * Strategy: packages:'external' — npm packages stay in node_modules (installed
 * during the build phase by `npm install`). Only application TypeScript code is
 * compiled into dist/index.js.
 *
 * Result: small dist/index.js (~400KB instead of 19MB) → security scanner
 * finishes in seconds instead of timing out. node_modules/ installed by the
 * build step is available on the same filesystem at runtime.
 *
 * Native .node addons (bcrypt, node-pty) are handled separately: they live in
 * node_modules and are resolved at runtime via the normal require() path.
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
  console.log('Building server bundle (external-packages mode)...');

  try {
    const result = await esbuild.build({
      entryPoints: ['server/index.ts'],
      bundle: true,
      splitting: false,
      platform: 'node',
      target: 'node20',
      format: 'esm',
      outfile: 'dist/index.js',
      // Mark ALL npm packages as external — they live in node_modules at runtime.
      packages: 'external',
      minify: true,
      treeShaking: true,
      sourcemap: false,
      metafile: true,
      legalComments: 'none',
      keepNames: false,
      drop: ['debugger'],
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
    console.log(`   Mode: external-packages (node_modules resolved at runtime)`);

    await cleanOldChunks();

  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

build();
