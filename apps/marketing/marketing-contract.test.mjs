import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

await access(new URL('./dist/index.html', import.meta.url));
await access(new URL('./dist/sitemap.xml', import.meta.url));
const landing = await readFile(new URL('./dist/index.html', import.meta.url), 'utf8');
assert.match(landing, /application\/ld\+json/);
assert.match(landing, /Cloud Run/);
assert.match(landing, /Replit/);
console.log('marketing contract test passed');
