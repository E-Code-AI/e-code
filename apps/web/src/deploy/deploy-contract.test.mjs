import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const api = await readFile(new URL('./api.ts', import.meta.url), 'utf8');
const panel = await readFile(new URL('./DeployPanel.tsx', import.meta.url), 'utf8');

assert.match(api, /\/api\/deploy\/releases/);
assert.match(api, /promote/);
assert.match(api, /rollback/);
assert.match(api, /EventSource/);
assert.match(panel, /Cloud Build/);
assert.match(panel, /Artifact Registry/);
assert.match(panel, /Cloud Run/);

console.log('deploy ui contract test passed');
