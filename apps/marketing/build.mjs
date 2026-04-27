import { mkdir, readdir, readFile, writeFile, cp } from 'node:fs/promises';
import { join } from 'node:path';

const src = new URL('./src/', import.meta.url);
const dist = new URL('./dist/', import.meta.url);
await mkdir(dist, { recursive: true });
await cp(src, dist, { recursive: true });

const pages = (await readdir(dist)).filter((file) => file.endsWith('.html'));
const urls = pages.map((file) => `https://ecode.app/${file === 'index.html' ? '' : file.replace(/\.html$/, '')}`);
await writeFile(new URL('./sitemap.xml', dist), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${url}</loc></url>`).join('')}</urlset>`);
await writeFile(new URL('./robots.txt', dist), 'User-agent: *\nAllow: /\nSitemap: https://ecode.app/sitemap.xml\n');

const index = await readFile(join(dist.pathname, 'index.html'), 'utf8');
if (!index.includes('application/ld+json')) throw new Error('landing missing JSON-LD');
console.log(`marketing build complete: ${pages.length} pages`);
