import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

await access(new URL('./dist/index.html', import.meta.url));
const search = JSON.parse(await readFile(new URL('./dist/search-index.json', import.meta.url), 'utf8'));
assert.ok(search.length >= 6);
assert.ok(search.some((entry) => entry.body.includes('Cloud Run')));
assert.ok(search.some((entry) => entry.path.includes('fr')));
console.log('docs contract test passed');
