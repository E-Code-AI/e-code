import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const catalog = JSON.parse(await readFile(new URL('../../catalog.json', import.meta.url), 'utf8'));
assert.equal(catalog.length >= 30, true);
assert.equal(catalog.every((item) => item.author === 'Official'), true);
assert.equal(catalog.every((item) => Array.isArray(item.ports) && item.ports.length > 0), true);
console.log('catalog test passed');
