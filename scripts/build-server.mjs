#!/usr/bin/env node
/**
 * Production server build script
 *
 * Strategy: packages:'external' — all npm packages are loaded from node_modules
 * at runtime (node_modules is included in the GCE deployment workspace).
 * Only the server TypeScript application code is compiled into dist/index.js.
 *
 * Result: ~1-3 MB bundle (vs 14 MB fully-bundled) → security scan completes
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
  console.log('Building server bundle (packages-external mode)...');

  try {
    const result = await esbuild.build({
      entryPoints: ['server/index.ts'],
      bundle: true,
      packages: 'external',
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
    console.log(`   Mode: packages=external (npm packages loaded from node_modules at runtime)`);

    await cleanOldChunks();

  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

build();
