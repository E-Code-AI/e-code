#!/usr/bin/env tsx

import { spawn } from 'child_process';

process.env.ROLLUP_WASM = '1';
process.env.ROLLUP_SKIP_NODE_RESOLUTION = '1';

const mode = process.argv[2] || 'dev';

console.log('[ROLLUP-WASM] Forcing Rollup to use WASM implementation');
console.log('[ROLLUP-WASM] ROLLUP_WASM=1');
console.log('[ROLLUP-WASM] ROLLUP_SKIP_NODE_RESOLUTION=1');
console.log(`[ROLLUP-WASM] Running: npm run ${mode}-internal`);
console.log('');

const child = spawn('npm', ['run', `${mode}-internal`], {
  stdio: 'inherit',
  env: {
    ...process.env,
    ROLLUP_WASM: '1',
    ROLLUP_SKIP_NODE_RESOLUTION: '1'
  }
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
