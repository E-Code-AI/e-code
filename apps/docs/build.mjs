import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';

const src = new URL('./src/', import.meta.url);
const dist = new URL('./dist/', import.meta.url);
await mkdir(dist, { recursive: true });
await cp(src, dist, { recursive: true });
const pages = (await readdir(dist)).filter((file) => file.endsWith('.html'));
const index = [];
for (const page of pages) {
  const html = await readFile(new URL(`./${page}`, dist), 'utf8');
  index.push({ title: html.match(/<title>(.*?)<\/title>/)?.[1] ?? page, path: `/${page}`, body: html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() });
}
await writeFile(new URL('./search-index.json', dist), JSON.stringify(index));
console.log(`docs build complete: ${pages.length} pages`);
