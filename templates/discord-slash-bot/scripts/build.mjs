import { mkdir, writeFile } from 'node:fs/promises';

await mkdir('dist', { recursive: true });
await writeFile('dist/build.json', JSON.stringify({ template: "discord-slash-bot", builtAt: new Date().toISOString() }, null, 2));
console.log('build complete');
