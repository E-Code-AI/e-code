// e2e-build-and-shoot — takes a generated /tmp/e-code-e2e/<ts>/ directory
// (single-file mode: generated.tsx contains an `src/App.tsx` block and an
// `src/index.css` block), assembles a minimal Vite scaffold around it,
// installs deps, builds, serves on a free port, and captures Playwright
// screenshots in light + dark mode.
//
// Output: docs/demo-screenshot.png and docs/demo-screenshot-dark.png.
//
// Usage:
//   tsx scripts/e2e-build-and-shoot.ts <generatedDir>

import { mkdirSync, writeFileSync, existsSync, rmSync, readFileSync, copyFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { execaSync, execaCommand } from 'execa';
import net from 'node:net';
import { chromium } from 'playwright';

interface Block { path: string; lang: string; body: string }

function extract(blob: string): Block[] {
  const out: Block[] = [];
  const lines = blob.split('\n');
  let i = 0;
  let pending: string | null = null;
  while (i < lines.length) {
    const m = lines[i].match(/^```([a-zA-Z0-9_+-]*)\s*$/);
    if (!m) {
      const h = lines[i].match(/^\s*([a-zA-Z0-9_./-]+\.(?:tsx?|css|json|js|jsx|html))\s*$/);
      if (h) pending = h[1];
      i++;
      continue;
    }
    const lang = (m[1] || '').toLowerCase();
    const body: string[] = [];
    i++;
    while (i < lines.length && !/^```\s*$/.test(lines[i])) { body.push(lines[i]); i++; }
    i++;
    let p = pending; pending = null;
    if (!p && body[0]) {
      const hh = body[0].match(/^\s*(?:\/\/|#|\/\*)\s*([a-zA-Z0-9_./-]+\.(?:tsx?|css|json|js|jsx|html))\b/);
      if (hh) p = hh[1];
    }
    if (!p) p = lang === 'css' ? 'src/index.css' : lang === 'tsx' ? 'src/App.tsx' : `__unnamed.${lang || 'txt'}`;
    out.push({ path: p, lang, body: body.join('\n') });
  }
  return out;
}

async function pickFreePort(): Promise<number> {
  return new Promise((res, rej) => {
    const s = net.createServer().listen(0, '127.0.0.1');
    s.on('listening', () => {
      const p = (s.address() as any).port;
      s.close(() => res(p));
    });
    s.on('error', rej);
  });
}

async function main() {
  const genDir = process.argv[2];
  if (!genDir) { console.error('usage: tsx scripts/e2e-build-and-shoot.ts <dir>'); process.exit(2); }
  const blob = readFileSync(resolve(genDir, 'generated.tsx'), 'utf8');
  const blocks = extract(blob).filter((b) => /\.(tsx?|css)$/.test(b.path));
  // Take last occurrence per path (latest LLM revision wins).
  const byPath = new Map<string, Block>();
  for (const b of blocks) byPath.set(b.path, b);
  const final = Array.from(byPath.values());
  console.log(`[shoot] extracted blocks: ${final.map((b) => b.path).join(', ')}`);

  const appBlock = final.find((b) => /\/App\.tsx$/.test(b.path)) || final.find((b) => b.lang === 'tsx');
  const cssBlock = final.find((b) => /\/index\.css$/.test(b.path)) || final.find((b) => b.lang === 'css');
  if (!appBlock) throw new Error('no App.tsx block found in generated output');

  const project = resolve(genDir, 'project');
  rmSync(project, { recursive: true, force: true });
  mkdirSync(resolve(project, 'src'), { recursive: true });

  // Scaffold a minimal Vite + React + Tailwind project.
  writeFileSync(resolve(project, 'package.json'), JSON.stringify({
    name: 'e-code-demo', private: true, type: 'module',
    scripts: { build: 'vite build', preview: 'vite preview --host 127.0.0.1' },
    dependencies: {
      react: '^18.3.1', 'react-dom': '^18.3.1', 'framer-motion': '^11.3.0', 'lucide-react': '^0.452.0',
    },
    devDependencies: {
      '@types/react': '^18.3.0', '@types/react-dom': '^18.3.0',
      '@vitejs/plugin-react': '^4.3.0', vite: '^5.4.0',
      tailwindcss: '^3.4.0', autoprefixer: '^10.4.0', postcss: '^8.5.10', typescript: '^5.5.0',
    },
  }, null, 2));
  writeFileSync(resolve(project, 'vite.config.ts'),
    `import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\nexport default defineConfig({ plugins: [react()], build: { sourcemap: false } });\n`);
  writeFileSync(resolve(project, 'tsconfig.json'), JSON.stringify({
    compilerOptions: {
      target: 'ES2020', lib: ['ES2020', 'DOM', 'DOM.Iterable'],
      module: 'ESNext', moduleResolution: 'bundler', jsx: 'react-jsx',
      strict: false, skipLibCheck: true, isolatedModules: true,
      esModuleInterop: true, allowSyntheticDefaultImports: true,
      resolveJsonModule: true, useDefineForClassFields: true,
      noEmit: true,
    },
    include: ['src'],
  }, null, 2));
  writeFileSync(resolve(project, 'tailwind.config.js'),
    `export default { darkMode: 'class', content: ['./index.html', './src/**/*.{ts,tsx}'], theme: { extend: { colors: { border: 'hsl(var(--border))', background: 'hsl(var(--background))', foreground: 'hsl(var(--foreground))', card: 'hsl(var(--card))', 'card-foreground': 'hsl(var(--card-foreground))', primary: 'hsl(var(--primary))', 'primary-foreground': 'hsl(var(--primary-foreground))', muted: 'hsl(var(--muted))', 'muted-foreground': 'hsl(var(--muted-foreground))', accent: 'hsl(var(--accent))', 'accent-foreground': 'hsl(var(--accent-foreground))', destructive: 'hsl(var(--destructive))', 'destructive-foreground': 'hsl(var(--destructive-foreground))', ring: 'hsl(var(--ring))', input: 'hsl(var(--input))' } } }, plugins: [] };\n`);
  writeFileSync(resolve(project, 'postcss.config.js'),
    `export default { plugins: { tailwindcss: {}, autoprefixer: {} } };\n`);
  writeFileSync(resolve(project, 'index.html'),
    `<!doctype html><html lang="en"><head><meta charset="utf-8"/><title>E-code demo</title><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>\n`);
  writeFileSync(resolve(project, 'src/main.tsx'),
    `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\nimport './index.css';\nReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);\n`);
  writeFileSync(resolve(project, 'src/App.tsx'), appBlock.body);
  writeFileSync(resolve(project, 'src/index.css'), cssBlock?.body ?? `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n:root { --background: 220 20% 97%; --foreground: 224 28% 12%; }\n.dark { --background: 224 28% 8%; --foreground: 220 20% 97%; }\nhtml, body, #root { height: 100%; }\n`);

  console.log('[shoot] installing deps (npm install)…');
  execaSync('npm', ['install', '--no-audit', '--no-fund', '--prefer-offline'],
    { cwd: project, stdio: 'inherit', timeout: 240_000 });

  console.log('[shoot] building (vite build)…');
  execaSync('npx', ['vite', 'build'], { cwd: project, stdio: 'inherit', timeout: 240_000 });

  const port = await pickFreePort();
  console.log(`[shoot] preview on 127.0.0.1:${port}`);
  const preview = execaCommand(`npx vite preview --host 127.0.0.1 --port ${port}`, { cwd: project });
  preview.stdout?.on('data', (d) => process.stdout.write(`[preview] ${d}`));
  preview.stderr?.on('data', (d) => process.stderr.write(`[preview] ${d}`));

  // Wait until preview accepts connections.
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/`);
      if (r.ok) break;
    } catch {}
    await new Promise((res) => setTimeout(res, 500));
  }

  console.log('[shoot] launching Playwright Chromium');
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.waitForTimeout(1500);
  const lightOut = resolve('/Users/hb/dev/e-code/docs/demo-screenshot.png');
  mkdirSync(dirname(lightOut), { recursive: true });
  await page.screenshot({ path: lightOut, fullPage: false });
  console.log(`[shoot] saved ${lightOut}`);

  // Toggle dark mode by adding the class to <html>.
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForTimeout(700);
  const darkOut = resolve('/Users/hb/dev/e-code/docs/demo-screenshot-dark.png');
  await page.screenshot({ path: darkOut, fullPage: false });
  console.log(`[shoot] saved ${darkOut}`);

  await browser.close();
  preview.kill('SIGTERM');
}

main().catch((e) => { console.error(e?.stack || e); process.exit(1); });
