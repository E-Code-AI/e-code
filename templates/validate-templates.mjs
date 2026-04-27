import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';

const root = new URL('.', import.meta.url).pathname;
const catalog = JSON.parse(await readFile(path.join(root, 'catalog.json'), 'utf8'));

async function waitFor200(port) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const ok = await new Promise((resolve) => {
      const req = http.get(`http://127.0.0.1:${port}/health`, (res) => {
        res.resume();
        resolve(res.statusCode === 200);
      });
      req.on('error', () => resolve(false));
      req.setTimeout(1000, () => {
        req.destroy();
        resolve(false);
      });
    });
    if (ok) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`template did not return 200 on ${port}`);
}

for (const item of catalog) {
  const dir = path.join(root, item.id);
  const test = spawn('npm', ['test'], { cwd: dir, stdio: 'inherit' });
  const code = await new Promise((resolve) => test.on('exit', resolve));
  if (code !== 0) throw new Error(`${item.id} hello test failed`);

  const port = 19000 + catalog.indexOf(item);
  const server = spawn('node', ['server.mjs', '--port', String(port)], { cwd: dir, stdio: 'ignore' });
  try {
    await waitFor200(port);
  } finally {
    server.kill('SIGTERM');
  }
}

console.log(`validated ${catalog.length} templates`);
