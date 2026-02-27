#!/usr/bin/env node
/**
 * Production server build script
 * Bundles all dependencies into a SINGLE file to avoid security scan timeouts
 * splitting: false + outfile = one dist/index.js instead of 600+ chunks
 */

import * as esbuild from 'esbuild';
import { execSync } from 'child_process';
import { existsSync, rmSync, readdirSync } from 'fs';
import { join } from 'path';

const nativeModules = [
  'node-pty',
  'bcrypt',
  'canvas',
  'cpu-features',
  'pg-cloudflare',
  'sharp',
  'playwright',
  'playwright-core',
  '@playwright/test',
  'ssh2',
  'dockerode',
  'jsdom',
  'isomorphic-dompurify',
];

const nodeBuiltins = [
  'fs', 'path', 'os', 'crypto', 'http', 'https', 'net', 'tls', 'stream',
  'util', 'events', 'buffer', 'url', 'querystring', 'zlib', 'child_process',
  'cluster', 'dgram', 'dns', 'readline', 'repl', 'tty', 'v8', 'vm', 'worker_threads',
  'assert', 'async_hooks', 'console', 'constants', 'domain', 'inspector',
  'module', 'perf_hooks', 'process', 'punycode', 'string_decoder', 'timers',
  'trace_events', 'wasi'
];

const external = [
  ...nativeModules,
  ...nodeBuiltins.map(m => `node:${m}`),
];

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
  if (removed > 0) console.log(`  Removed ${removed} old chunk files`);
}

async function build() {
  console.log('Building server bundle (single-file mode)...');
  console.log('External modules:', nativeModules.join(', '));

  try {
    const result = await esbuild.build({
      entryPoints: ['server/index.ts'],
      bundle: true,
      splitting: false,
      platform: 'node',
      target: 'node20',
      format: 'esm',
      outfile: 'dist/index.js',
      external,
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

    await cleanOldChunks();

  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

build();
