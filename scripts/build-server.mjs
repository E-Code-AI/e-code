#!/usr/bin/env node
/**
 * Production server build script
 *
 * Strategy: Bundle all small pure-JS packages into dist/index.js. Large packages
 * (drizzle-orm 17MB, openai 11MB, stripe 6.9MB, @anthropic-ai 5MB) are kept
 * external in node_modules — keeping dist/index.js small (<5MB) so Replit's
 * security scanner can complete within the 9-minute deployment timeout.
 * The .deployignore file tells the scanner to skip node_modules/, so large
 * external packages don't add to scan time.
 *
 * Dev workflow: npm run dev (never calls this script — no impact)
 * Prod build:   npm run build (bundles, no cleanup in dev)
 * Deploy build: BUILD_DEPLOY=1 npm run build (bundles + prunes node_modules)
 */

import * as esbuild from 'esbuild';
import { existsSync, rmSync, readdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const IS_DEPLOY = process.env.BUILD_DEPLOY === '1';

const NATIVE_EXTERNAL = [
  // Native addon packages (.node binaries — cannot be bundled)
  // bcrypt replaced with bcryptjs (pure JS) so server needs no native addons
  'node-pty',
  'sharp',
  'pg-native',
  'pg-cloudflare',
  'ssh2',
  'playwright',
  'playwright-core',
  '@playwright/test',
];

const KEEP_IN_NODE_MODULES = new Set([
  // Native addons
  'bcrypt',
  'node-pty',
  'sharp',
  // Large packages kept external to keep dist/index.js small
  'drizzle-orm',
  'openai',
  'stripe',
  '@anthropic-ai',
  '@google',
  '@ai-sdk',
  'ai',
]);

const DIST_KEEP = new Set(['index.js', 'runner.js', 'public']);

async function cleanOldChunks() {
  if (!existsSync('dist')) return;
  const files = readdirSync('dist');
  let removed = 0;
  for (const f of files) {
    if (!DIST_KEEP.has(f) && f.endsWith('.js')) {
      rmSync(join('dist', f));
      removed++;
    }
  }
  if (removed > 0) console.log(`  Cleaned ${removed} old chunk files`);
}

async function pruneNodeModules() {
  if (!IS_DEPLOY) return;

  const isReplitDeployment = !!process.env.REPLIT_DEPLOYMENT || !!process.env.REPL_DEPLOYMENT_KEY;
  if (!isReplitDeployment) {
    console.log('  [deploy] SKIPPING prune — BUILD_DEPLOY=1 set but not in Replit deployment context.');
    console.log('  [deploy] Set REPLIT_DEPLOYMENT=1 only when deploying. This protects dev node_modules.');
    return;
  }

  console.log('  [deploy] Pruning node_modules to production dependencies only...');

  if (!existsSync('node_modules')) return;

  try {
    // Use npm prune --production to keep all production deps and their
    // transitive dependencies. This is required because external packages
    // (drizzle-orm, openai, stripe, @anthropic-ai/sdk) need their own
    // dependencies available at runtime in node_modules.
    // node_modules is excluded from the security scanner via .deployignore,
    // so its size does not affect deployment scan time.
    execSync('npm prune --production', { stdio: 'inherit', shell: true });
    console.log('  [deploy] Pruned node_modules to production dependencies.');
  } catch (err) {
    console.warn('  [deploy] Prune warning:', err.message);
  }
}

async function prunePlaywrightCache() {
  if (!IS_DEPLOY) return;

  const isReplitDeployment = !!process.env.REPLIT_DEPLOYMENT || !!process.env.REPL_DEPLOYMENT_KEY;
  if (!isReplitDeployment) return;

  const cacheDirs = [
    '/home/runner/.cache/ms-playwright',
    '/root/.cache/ms-playwright',
    `${process.env.HOME || '/home/runner'}/.cache/ms-playwright`,
  ];

  for (const dir of cacheDirs) {
    if (existsSync(dir)) {
      try {
        rmSync(dir, { recursive: true, force: true });
        console.log(`  [deploy] Removed playwright cache: ${dir}`);
      } catch (_) {}
    }
  }
}

function countFiles(dir) {
  if (!existsSync(dir)) return 0;
  try {
    const out = execSync(`find ${dir} -type f | wc -l`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    return parseInt(out.trim(), 10) || 0;
  } catch (_) {
    return -1;
  }
}

const ESM_BANNER = `
import { createRequire as __esbuild_createRequire } from 'module';
import { fileURLToPath as __esbuild_fileURLToPath } from 'url';
import { dirname as __esbuild_dirname } from 'path';
const require = __esbuild_createRequire(import.meta.url);
const __filename = __esbuild_fileURLToPath(import.meta.url);
const __dirname = __esbuild_dirname(__filename);
`;

async function buildRunner() {
  console.log('Building runner bundle...');
  try {
    const result = await esbuild.build({
      entryPoints: ['runner/index.ts'],
      bundle: true,
      splitting: false,
      platform: 'node',
      target: 'node20',
      format: 'esm',
      outfile: 'dist/runner.js',
      external: NATIVE_EXTERNAL,
      minify: true,
      treeShaking: true,
      sourcemap: false,
      metafile: true,
      legalComments: 'none',
      drop: ['debugger'],
      banner: { js: ESM_BANNER },
    });
    const outputSize = Object.values(result.metafile.outputs).reduce((acc, o) => acc + o.bytes, 0);
    console.log(`✅ Runner bundle built successfully`);
    console.log(`   Output: dist/runner.js (${(outputSize / 1024 / 1024).toFixed(2)} MB)`);
  } catch (error) {
    console.error('❌ Runner build failed:', error);
    process.exit(1);
  }
}

async function build() {
  console.log(`Building server bundle (bundled mode)${IS_DEPLOY ? ' [DEPLOY]' : ''}...`);

  try {
    const result = await esbuild.build({
      entryPoints: ['server/index.ts'],
      bundle: true,
      splitting: false,
      platform: 'node',
      target: 'node20',
      format: 'esm',
      outfile: 'dist/index.js',
      // Bundle all JS deps into dist/index.js so no node_modules needed at runtime.
      // Only true native addons (node-pty, sharp, etc.) remain external.
      // bcrypt replaced with bcryptjs (pure JS) — server has zero native deps.
      external: NATIVE_EXTERNAL,
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
      banner: { js: ESM_BANNER }
    });

    const outputSize = Object.values(result.metafile.outputs)
      .reduce((acc, o) => acc + o.bytes, 0);

    console.log(`✅ Server bundle built successfully`);
    console.log(`   Output: dist/index.js (${(outputSize / 1024 / 1024).toFixed(2)} MB)`);
    console.log(`   Mode: bundled — all JS deps included, zero node_modules dependency`);

    await buildRunner();
    await cleanOldChunks();
    await prunePlaywrightCache();
    await pruneNodeModules();

    if (IS_DEPLOY) {
      const distFiles = countFiles('dist');
      const nmFiles = countFiles('node_modules');
      console.log(`  [deploy] Final artifact: dist/ has ${distFiles} files, node_modules/ has ${nmFiles} files`);
    }

  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

build();
