// E2E inspector — scores a generated workspace against the modern-design
// quality contract. Reads the artifacts produced by e2e-generate-demo.ts and
// emits a 0-6 score plus a JSON report at <dir>/inspection.json.
//
// Score axes (one point each, max 6):
//   1. shadcn import      — references @/components/ui/* OR a documented use
//   2. framer-motion      — imports framer-motion AND uses motion.<tag>
//   3. HSL palette        — declares HSL CSS vars or hsl(var(--...)) tokens
//   4. dark mode          — has a real toggle (next-themes / class strategy)
//   5. components.json    — shadcn config or equivalent doc
//   6. tsc clean          — generated TSX parses + typechecks at the file level
//
// Usage:
//   tsx scripts/e2e-inspect.ts <dir>

import { readFileSync, existsSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { mkdirSync as _mkdir } from 'node:fs';
import { execaSync } from 'execa';

interface ExtractedFile {
  relativePath: string;
  content: string;
  language: string;
}

/**
 * Extract code blocks emitted by the LLM. Supports two common patterns:
 *   1. A heading line like "app/page.tsx" or "**File:** app/page.tsx" followed
 *      by a fenced ```lang block.
 *   2. A leading filename line inside the fence comment (e.g. "// app/page.tsx").
 * Returns the extracted files. When the LLM regenerates the same path multiple
 * times, the LAST FULLY-FENCED occurrence wins (later iterations supersede
 * earlier ones); a path that only appears with an unterminated fence is
 * silently dropped in favor of the previous complete version.
 */
function extractCodeBlocks(blob: string): ExtractedFile[] {
  interface Raw extends ExtractedFile { closed: boolean }
  const raw: Raw[] = [];
  const lines = blob.split('\n');
  let i = 0;
  let pendingPath: string | null = null;
  while (i < lines.length) {
    const line = lines[i];
    const fenceMatch = line.match(/^```([a-zA-Z0-9_+-]*)\s*$/);
    if (!fenceMatch) {
      const heading = line.match(/^\s*(?:\*\*File:?\*\*\s*)?([a-zA-Z0-9_./-]+\.(?:tsx?|css|json|js|jsx|html|cjs|mjs))\s*$/);
      if (heading) pendingPath = heading[1];
      i++;
      continue;
    }
    const lang = (fenceMatch[1] || '').toLowerCase();
    const blockLines: string[] = [];
    i++;
    let closed = false;
    while (i < lines.length) {
      if (/^```\s*$/.test(lines[i])) { closed = true; i++; break; }
      blockLines.push(lines[i]);
      i++;
    }
    let fp = pendingPath;
    pendingPath = null;
    if (!fp && blockLines.length > 0) {
      const head = blockLines[0].match(/^\s*(?:\/\/|#|\/\*)\s*([a-zA-Z0-9_./-]+\.(?:tsx?|css|json|js|jsx|html))\b/);
      if (head) fp = head[1];
    }
    if (!fp) {
      const extByLang: Record<string, string> = {
        css: 'globals.css', scss: 'styles.scss', json: 'config.json',
        html: 'index.html', sh: 'snippet.sh', bash: 'snippet.sh',
        text: 'snippet.txt', '': 'snippet.txt',
      };
      const fallback = extByLang[lang] ?? (['ts', 'tsx', 'js', 'jsx'].includes(lang) ? `snippet.${lang}` : 'snippet.txt');
      fp = `__unnamed_${raw.length}_${fallback}`;
    }
    raw.push({ relativePath: fp, content: blockLines.join('\n'), language: lang, closed });
  }
  // Coalesce: last CLOSED occurrence wins. If a path only has unclosed
  // versions, take the last unclosed (best-effort partial). This handles
  // LLM regenerations where a later truncated rewrite would otherwise
  // clobber an earlier complete version.
  const byPath = new Map<string, Raw>();
  for (const r of raw) {
    const prev = byPath.get(r.relativePath);
    if (!prev) { byPath.set(r.relativePath, r); continue; }
    if (r.closed) byPath.set(r.relativePath, r);
    else if (!prev.closed) byPath.set(r.relativePath, r);
  }
  return Array.from(byPath.values()).map(({ relativePath, content, language }) => ({ relativePath, content, language }));
}

interface InspectionResult {
  axis: string;
  passed: boolean;
  detail: string;
}

function scoreShadcnImport(blob: string): InspectionResult {
  const importRe = /from\s+['"]@\/components\/ui\/[^'"]+['"]/;
  const passed = importRe.test(blob);
  return {
    axis: 'shadcn-import',
    passed,
    detail: passed
      ? 'imports detected from @/components/ui/*'
      : 'no @/components/ui/* import found',
  };
}

function scoreFramerMotion(blob: string): InspectionResult {
  const importRe = /from\s+['"]framer-motion['"]/;
  const usageRe = /motion\.(?:div|button|span|li|ul|section|header|footer|nav|article|p|h\d|img|svg)\b|<motion\./;
  const passed = importRe.test(blob) && usageRe.test(blob);
  return {
    axis: 'framer-motion',
    passed,
    detail: passed
      ? 'framer-motion imported and motion.* JSX used'
      : `framer-motion import:${importRe.test(blob)} usage:${usageRe.test(blob)}`,
  };
}

function scoreHslTokens(blob: string): InspectionResult {
  const hslVarRe = /hsl\(\s*var\(--[a-z0-9-]+\)\s*\)/i;
  const hslDeclRe = /--(?:background|foreground|primary|accent|muted|border|ring)\s*:\s*\d{1,3}\s+\d{1,3}%\s+\d{1,3}%/i;
  const passed = hslVarRe.test(blob) || hslDeclRe.test(blob);
  return {
    axis: 'hsl-tokens',
    passed,
    detail: passed
      ? `HSL tokens present (var:${hslVarRe.test(blob)} decl:${hslDeclRe.test(blob)})`
      : 'no hsl(var(--...)) tokens or HSL CSS variable declarations',
  };
}

function scoreDarkMode(blob: string): InspectionResult {
  const nextThemes = /from\s+['"]next-themes['"]/;
  const useTheme = /\buseTheme\s*\(/;
  // Accept any classList mutation on documentElement that toggles "dark":
  // toggle("dark"), add("dark"), remove("dark") all count as a real toggle wiring.
  const classStrategy = /document\.documentElement\.classList\.(?:toggle|add|remove)\(\s*['"]dark['"]/;
  const dataTheme = /data-theme\s*=/;
  const tailwindDark = /\b(?:dark:bg-|dark:text-|className=.*\bdark\b)/;
  const passed =
    (nextThemes.test(blob) || useTheme.test(blob)) ||
    (classStrategy.test(blob) || dataTheme.test(blob));
  return {
    axis: 'dark-mode-toggle',
    passed,
    detail: passed
      ? `toggle path detected (next-themes:${nextThemes.test(blob)} useTheme:${useTheme.test(blob)} classStrategy:${classStrategy.test(blob)} dataTheme:${dataTheme.test(blob)})`
      : `tailwindDarkClasses:${tailwindDark.test(blob)} but no real toggle wiring`,
  };
}

function scoreComponentsJson(blob: string): InspectionResult {
  // Single-file generation rarely emits components.json directly. Accept either:
  //   (a) the literal string "components.json" in commentary,
  //   (b) a shadcn-style "// add via npx shadcn-ui add" hint,
  //   (c) explicit cn() helper from "@/lib/utils" which is the shadcn convention.
  const literal = /components\.json/;
  const cnHelper = /from\s+['"]@\/lib\/utils['"]/;
  const cliHint = /shadcn(?:-ui)?\s+(?:init|add)/i;
  const passed = literal.test(blob) || cnHelper.test(blob) || cliHint.test(blob);
  return {
    axis: 'shadcn-config',
    passed,
    detail: passed
      ? `shadcn signal present (literal:${literal.test(blob)} cn:${cnHelper.test(blob)} cli:${cliHint.test(blob)})`
      : 'no components.json reference, no @/lib/utils import, no shadcn CLI hint',
  };
}

function scoreTscClean(dir: string, files: ExtractedFile[]): InspectionResult {
  // Pick TSX files (skip CSS/JSON/MD) and write them flat into dir/_tsc/<basename>.
  // We do an isolatedModules pass — pure syntactic + structural check, no module
  // resolution against a missing node_modules.
  const tsxFiles = files.filter((f) => /\.tsx?$/.test(f.relativePath));
  if (tsxFiles.length === 0) {
    return { axis: 'tsc-clean', passed: false, detail: 'no .ts/.tsx blocks extracted' };
  }
  const tscDir = resolve(dir, '_tsc');
  rmSync(tscDir, { recursive: true, force: true });
  mkdirSync(tscDir, { recursive: true });
  const written: string[] = [];
  for (const f of tsxFiles) {
    const target = resolve(tscDir, f.relativePath.replace(/[\\/]/g, '__'));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, f.content);
    written.push(target);
  }
  try {
    execaSync(
      'npx',
      [
        'tsc',
        '--noEmit',
        '--target',
        'es2020',
        '--module',
        'esnext',
        '--moduleResolution',
        'bundler',
        '--jsx',
        'react-jsx',
        '--skipLibCheck',
        '--isolatedModules',
        '--allowImportingTsExtensions',
        'false',
        '--noResolve',
        ...written,
      ],
      { reject: true, timeout: 90_000 },
    );
    return {
      axis: 'tsc-clean',
      passed: true,
      detail: `isolatedModules tsc clean across ${written.length} extracted .ts/.tsx files`,
    };
  } catch (err: any) {
    const out = String(err?.stdout || err?.stderr || err?.shortMessage || err?.message || '');
    const errors = out
      .split('\n')
      .filter((l) => /error TS\d+/.test(l))
      .slice(0, 4);
    return {
      axis: 'tsc-clean',
      passed: false,
      detail: errors.length
        ? `tsc failed: ${errors.join(' | ')}`
        : `tsc failed (no parseable diagnostics): ${out.split('\n').slice(0, 2).join(' | ')}`,
    };
  }
}

function main() {
  const dir = process.argv[2];
  if (!dir) {
    console.error('usage: tsx scripts/e2e-inspect.ts <dir>');
    process.exit(2);
  }
  const generatedPath = resolve(dir, 'generated.tsx');
  if (!existsSync(generatedPath)) {
    console.error(`no generated.tsx in ${dir}`);
    process.exit(2);
  }
  const blob = readFileSync(generatedPath, 'utf8');
  const extracted = extractCodeBlocks(blob);
  // Persist the extracted files for downstream build/screenshot steps.
  const extractedDir = resolve(dir, 'extracted');
  rmSync(extractedDir, { recursive: true, force: true });
  mkdirSync(extractedDir, { recursive: true });
  for (const f of extracted) {
    const target = resolve(extractedDir, f.relativePath);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, f.content);
  }
  console.log(`  extracted ${extracted.length} code blocks into ${extractedDir}`);

  const results = [
    scoreShadcnImport(blob),
    scoreFramerMotion(blob),
    scoreHslTokens(blob),
    scoreDarkMode(blob),
    scoreComponentsJson(blob),
    scoreTscClean(dir, extracted),
  ];

  const score = results.filter((r) => r.passed).length;
  const total = results.length;

  for (const r of results) {
    console.log(`  ${r.passed ? '✓' : '✗'} ${r.axis} — ${r.detail}`);
  }
  console.log(`SCORE ${score}/${total}`);

  mkdirSync(dir, { recursive: true });
  writeFileSync(
    resolve(dir, 'inspection.json'),
    JSON.stringify({ score, total, results, generatedPath, blobLength: blob.length }, null, 2),
  );

  if (score < 5) process.exit(1);
}

main();
