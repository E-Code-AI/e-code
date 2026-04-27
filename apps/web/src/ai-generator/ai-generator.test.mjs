import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const apiSource = await readFile(new URL('./api.ts', import.meta.url), 'utf8');
const pageSource = await readFile(new URL('./AiGeneratorPage.tsx', import.meta.url), 'utf8');
const stateSource = await readFile(new URL('./state.ts', import.meta.url), 'utf8');

assert.match(apiSource, /\/api\/ai-generator\/generations/);
assert.match(apiSource, /resumable-url/);
assert.match(apiSource, /EventSource/);
assert.match(pageSource, /Undo last AI change/);
assert.match(pageSource, /Generate and boot/);
assert.match(pageSource, /FileDropzone/);
assert.match(stateSource, /correction_attempt/);

console.log('ai-generator contract test passed');
