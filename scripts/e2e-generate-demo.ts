// E2E generation demo — drives POST /api/code-generation/generate over SSE
// against a running e-code server, captures the streamed output, and writes
// the result + metadata into /tmp/e-code-e2e/<timestamp>/.
//
// Usage:
//   tsx scripts/e2e-generate-demo.ts [--server http://127.0.0.1:5057]
//                                    [--model claude-opus-4-7]
//                                    [--timeout 300000]
//
// Exits non-zero if the stream fails, times out, or ends without "complete".

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface CliOptions {
  server: string;
  model: string;
  timeoutMs: number;
}

function parseCli(argv: string[]): CliOptions {
  const opts: CliOptions = {
    server: 'http://127.0.0.1:5057',
    model: 'claude-opus-4-7',
    timeoutMs: 5 * 60 * 1000,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = argv[i + 1];
    if (a === '--server' && next) { opts.server = next; i++; }
    else if (a === '--model' && next) { opts.model = next; i++; }
    else if (a === '--timeout' && next) { opts.timeoutMs = Number(next); i++; }
  }
  return opts;
}

const PROMPT =
  'Build a modern minimalist todo app with dark mode toggle, smooth Framer Motion ' +
  'animations on item add/remove, glassmorphism navbar, and HSL palette via Tailwind theme.';

async function main() {
  const opts = parseCli(process.argv.slice(2));
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = resolve('/tmp/e-code-e2e', ts);
  mkdirSync(outDir, { recursive: true });

  console.log(`[e2e] server=${opts.server}`);
  console.log(`[e2e] model=${opts.model}`);
  console.log(`[e2e] outDir=${outDir}`);
  console.log(`[e2e] prompt=${PROMPT}`);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('client-side timeout')), opts.timeoutMs);

  const t0 = Date.now();
  let generatedCode = '';
  let chunkCount = 0;
  let completed = false;
  let lastError: string | undefined;

  const persistPartial = (reason: string) => {
    try {
      writeFileSync(resolve(outDir, 'generated.tsx'), generatedCode);
      writeFileSync(
        resolve(outDir, 'metadata.json'),
        JSON.stringify(
          {
            prompt: PROMPT,
            model: opts.model,
            completed,
            chunkCount,
            bytes: generatedCode.length,
            durationMs: Date.now() - t0,
            error: lastError ?? reason,
            server: opts.server,
            timestamp: ts,
            partial: !completed,
          },
          null,
          2,
        ),
      );
    } catch (e) {
      // ignore — best-effort persistence
    }
  };

  let resp: Response;
  try {
    resp = await fetch(`${opts.server}/api/code-generation/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({
        prompt: PROMPT,
        language: 'typescript',
        modelId: opts.model,
      }),
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timer);
    persistPartial(`fetch failed: ${err?.message || err}`);
    throw err;
  }

  if (!resp.ok || !resp.body) {
    clearTimeout(timer);
    throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
   while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Parse SSE events: each event is "data: {...}\n\n"
    let idx;
    while ((idx = buffer.indexOf('\n\n')) >= 0) {
      const raw = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 2);
      if (!raw.startsWith('data:')) continue;
      const json = raw.slice(5).trim();
      if (!json) continue;
      try {
        const evt = JSON.parse(json);
        if (evt.type === 'chunk' && typeof evt.content === 'string') {
          generatedCode += evt.content;
          chunkCount++;
        } else if (evt.type === 'complete') {
          completed = true;
        } else if (evt.type === 'error') {
          lastError = String(evt.message || 'unknown error');
        }
      } catch (e) {
        // Skip malformed events
      }
    }
   }
  } catch (err: any) {
    clearTimeout(timer);
    persistPartial(`stream aborted: ${err?.message || err}`);
    throw err;
  }
  clearTimeout(timer);
  const durationMs = Date.now() - t0;

  // Persist outputs
  writeFileSync(resolve(outDir, 'generated.tsx'), generatedCode);
  writeFileSync(
    resolve(outDir, 'metadata.json'),
    JSON.stringify(
      {
        prompt: PROMPT,
        model: opts.model,
        completed,
        chunkCount,
        bytes: generatedCode.length,
        durationMs,
        error: lastError ?? null,
        server: opts.server,
        timestamp: ts,
      },
      null,
      2,
    ),
  );

  console.log(`[e2e] chunks=${chunkCount} bytes=${generatedCode.length} duration=${(durationMs / 1000).toFixed(1)}s completed=${completed}`);

  if (!completed) {
    console.error(`[e2e] stream ended without 'complete' event${lastError ? `: ${lastError}` : ''}`);
    process.exit(1);
  }
  console.log(`[e2e] saved → ${outDir}/generated.tsx`);
  console.log(outDir);
}

main().catch((err) => {
  console.error(`[e2e] fatal:`, err?.stack || err);
  process.exit(1);
});
