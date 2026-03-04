#!/usr/bin/env node
/**
 * Production server build script
 *
 * Strategy: Bundle all pure-JS packages into dist/index.js. Only packages with
 * native .node binaries (bcrypt, node-pty, sharp) remain external and stay in
 * node_modules. When BUILD_DEPLOY=1 is set (Replit deployment context), the
 * post-build cleanup deletes everything from node_modules except the 3 native
 * addon packages — reducing 40,000+ files to ~200, which the security scanner
 * can process in seconds instead of timing out.
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
  'bcrypt',
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
  'bcrypt',
  'node-pty',
  'sharp',
]);

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

async function pruneNodeModules() {
  if (!IS_DEPLOY) return;

  // Safety: only prune when actually deploying (REPLIT_DEPLOYMENT set by Replit infra)
  // This prevents accidental pruning during local dev builds with BUILD_DEPLOY=1
  const isReplitDeployment = !!process.env.REPLIT_DEPLOYMENT || !!process.env.REPL_DEPLOYMENT_KEY;
  if (!isReplitDeployment) {
    console.log('  [deploy] SKIPPING prune — BUILD_DEPLOY=1 set but not in Replit deployment context.');
    console.log('  [deploy] Set REPLIT_DEPLOYMENT=1 only when deploying. This protects dev node_modules.');
    return;
  }

  console.log('  [deploy] Pruning node_modules to native addon packages only...');

  if (!existsSync('node_modules')) return;

  try {
    execSync(
      `cd node_modules && ls | grep -vE "^(${Array.from(KEEP_IN_NODE_MODULES).join('|')})$" | xargs -r rm -rf`,
      { stdio: 'inherit', shell: true }
    );
    console.log(`  [deploy] Pruned node_modules — kept: ${Array.from(KEEP_IN_NODE_MODULES).join(', ')}`);
  } catch (err) {
    console.warn('  [deploy] Prune warning:', err.message);
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

async function build() {
  console.log(`Building server bundle (bundle-all-except-native mode)${IS_DEPLOY ? ' [DEPLOY]' : ''}...`);

  try {
    const result = await esbuild.build({
      entryPoints: ['server/index.ts'],
      bundle: true,
      splitting: false,
      platform: 'node',
      target: 'node20',
      format: 'esm',
      outfile: 'dist/index.js',
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
    console.log(`   Bundled: all pure-JS packages  |  External: ${NATIVE_EXTERNAL.join(', ')}`);

    await cleanOldChunks();
    await pruneNodeModules();

  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

build();
