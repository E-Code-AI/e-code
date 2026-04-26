// Single-file E2E generator — used as a fallback when the multi-file path
// runs into LLM regeneration / truncation issues. Asks the model for a
// complete, self-contained App.tsx + index.css pair that can be dropped into
// a minimal Vite scaffold and built immediately.
//
// Usage:
//   tsx scripts/e2e-generate-singlefile.ts [--server ...] [--model ...] [--timeout ...]

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface CliOptions { server: string; model: string; timeoutMs: number; }
function parseCli(argv: string[]): CliOptions {
  const opts: CliOptions = {
    server: 'http://127.0.0.1:5057',
    model: 'claude-sonnet-4-6',
    timeoutMs: 6 * 60 * 1000,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], n = argv[i + 1];
    if (a === '--server' && n) { opts.server = n; i++; }
    else if (a === '--model' && n) { opts.model = n; i++; }
    else if (a === '--timeout' && n) { opts.timeoutMs = Number(n); i++; }
  }
  return opts;
}

const PROMPT =
  'Build a modern minimalist todo app with dark mode toggle, smooth Framer Motion ' +
  'animations on item add/remove, glassmorphism navbar, and HSL palette via Tailwind theme. ' +
  '\n\nOutput EXACTLY two files and nothing else:\n' +
  '1. A heading line "src/App.tsx" then a fenced ```tsx block containing a single ' +
  'self-contained App component. Inline all sub-components inside this file. Import ' +
  'framer-motion (motion.* + AnimatePresence), use a useState-based todos list with ' +
  'add/remove/toggle, render a glassmorphism navbar, and wire the dark toggle via ' +
  'document.documentElement.classList.toggle("dark"). Do not import from @/components/ui ' +
  'or any path alias — keep everything in this one file. Use only React, react-dom, ' +
  'framer-motion (no other deps).\n' +
  '2. A heading line "src/index.css" then a fenced ```css block declaring the HSL ' +
  'design tokens under :root and .dark, plus @tailwind base/components/utilities. ' +
  'Variables MUST follow the form "--background: 220 20% 97%;" so they can be consumed ' +
  'as hsl(var(--background)).\n' +
  '\nDo NOT regenerate or rewrite either file. Emit each file exactly once. Stop after ' +
  'the closing fence of the second file.';

async function main() {
  const opts = parseCli(process.argv.slice(2));
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = resolve('/tmp/e-code-e2e', ts);
  mkdirSync(outDir, { recursive: true });
  console.log(`[e2e-single] server=${opts.server} model=${opts.model} outDir=${outDir}`);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('client-side timeout')), opts.timeoutMs);
  const t0 = Date.now();
  let generatedCode = '';
  let chunks = 0;
  let completed = false;
  let lastError: string | undefined;

  const persist = (note?: string) => {
    writeFileSync(resolve(outDir, 'generated.tsx'), generatedCode);
    writeFileSync(resolve(outDir, 'metadata.json'), JSON.stringify({
      prompt: PROMPT, model: opts.model, completed,
      chunkCount: chunks, bytes: generatedCode.length,
      durationMs: Date.now() - t0,
      error: lastError ?? note ?? null,
      server: opts.server, timestamp: ts,
      partial: !completed, mode: 'singlefile',
    }, null, 2));
  };

  try {
    const resp = await fetch(`${opts.server}/api/code-generation/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
      body: JSON.stringify({ prompt: PROMPT, language: 'typescript', modelId: opts.model }),
      signal: controller.signal,
    });
    if (!resp.ok || !resp.body) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
    const reader = resp.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf('\n\n')) >= 0) {
        const raw = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 2);
        if (!raw.startsWith('data:')) continue;
        const json = raw.slice(5).trim();
        if (!json) continue;
        try {
          const e = JSON.parse(json);
          if (e.type === 'chunk' && typeof e.content === 'string') { generatedCode += e.content; chunks++; }
          else if (e.type === 'complete') completed = true;
          else if (e.type === 'error') lastError = String(e.message || 'unknown');
        } catch {}
      }
    }
  } finally {
    clearTimeout(timer);
    persist();
  }
  console.log(`[e2e-single] chunks=${chunks} bytes=${generatedCode.length} duration=${((Date.now() - t0)/1000).toFixed(1)}s completed=${completed}`);
  if (!completed) {
    console.error(`[e2e-single] stream did not complete${lastError ? `: ${lastError}` : ''}`);
    process.exit(1);
  }
  console.log(outDir);
}

main().catch((err) => { console.error(err?.stack || err); process.exit(1); });
