#!/usr/bin/env node
/**
 * Production server build script
 * Bundles all dependencies except native modules that can't run in Replit production
 */

import * as esbuild from 'esbuild';

const nativeModules = [
  'node-pty',
  'dockerode',
  'playwright',
  'playwright-core',
  '@playwright/test',
  'sharp',
  'bcrypt',
  'cpu-features',
  'ssh2',
  'pg-cloudflare',
  'lightningcss',
  '@babel/preset-typescript',
  '@babel/core',
  'jsdom',
  'isomorphic-dompurify',
  'canvas',
  // Note: dotenv is NOT externalized - it's eliminated via dead code elimination
  // because we define process.env.NODE_ENV='production' at build time
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

async function build() {
  console.log('Building server bundle...');
  console.log('External modules:', nativeModules.join(', '));
  
  try {
    const result = await esbuild.build({
      entryPoints: ['server/index.ts'],
      bundle: true,
      platform: 'node',
      target: 'node20',
      format: 'esm',
      outdir: 'dist',
      external,
      minify: false,
      sourcemap: true,
      metafile: true,
      // Define NODE_ENV at build time to enable dead code elimination
      // This removes the dotenv import block entirely from production builds
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
    console.log(`   Output size: ${(outputSize / 1024 / 1024).toFixed(2)} MB`);
    
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

build();
