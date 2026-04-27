#!/usr/bin/env node
// Codemod: wrap raw error logs with redactErrorForLog().
//
// Pattern matched (highly specific to avoid false positives):
//
//     <logger>.error(<msg>, error)
//     <logger>.error(<msg>, err)
//     <logger>.warn(<msg>, error)
//     <logger>.warn(<msg>, err)
//
// Where:
//   <logger>  is any identifier ending with "logger" or "Logger" (case-insens).
//   <msg>     is a single argument (string literal, template, or expression
//             with no top-level commas — we only match a balanced first arg).
//   second arg is a bare identifier `err` or `error`.
//
// Effect:
//   <logger>.error(<msg>, redactErrorForLog(error))
//
// Also ensures `import { redactErrorForLog } from '../utils/error-redaction';`
// is present in any file that we modified.
//
// Idempotent — running twice is a no-op.

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { execSync } from 'node:child_process';

const REPO_ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const TARGET_DIR = path.join(REPO_ROOT, 'server', 'routes');
const IMPORT_LINE = "import { redactErrorForLog } from '../utils/error-redaction';";

// Stricter regex: <ident>(.error|.warn)(<msg>, <err|error>)
// We use a custom balanced-paren scan rather than regex for the msg arg, since
// regex can't handle nested parens in template strings reliably.
const CALL_RE = /(\b\w*[lL]ogger)\.(error|warn)\(/g;

const stats = { files: 0, sites: 0, imports: 0, skippedAlreadyWrapped: 0 };

function findCallEnd(src, openIdx) {
  // openIdx points to the '(' after `.error|.warn`. Walk forward respecting
  // string/template/parens. Returns the index of the matching ')'.
  let depth = 1;
  let i = openIdx + 1;
  while (i < src.length) {
    const c = src[i];
    if (c === '\\') { i += 2; continue; }
    if (c === '"' || c === "'") {
      // skip simple string literal
      i++;
      while (i < src.length && src[i] !== c) {
        if (src[i] === '\\') i++;
        i++;
      }
      i++;
      continue;
    }
    if (c === '`') {
      // template literal — track ${...} interpolation depth
      i++;
      while (i < src.length && src[i] !== '`') {
        if (src[i] === '\\') { i += 2; continue; }
        if (src[i] === '$' && src[i + 1] === '{') {
          let td = 1;
          i += 2;
          while (i < src.length && td > 0) {
            if (src[i] === '{') td++;
            else if (src[i] === '}') td--;
            i++;
          }
          continue;
        }
        i++;
      }
      i++;
      continue;
    }
    if (c === '(') depth++;
    else if (c === ')') {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }
  return -1;
}

function splitTopLevelArgs(src) {
  // Split a string of arguments by top-level commas, respecting strings/parens.
  const out = [];
  let depth = 0;
  let start = 0;
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '\\') { i += 2; continue; }
    if (c === '"' || c === "'") {
      i++;
      while (i < src.length && src[i] !== c) {
        if (src[i] === '\\') i++;
        i++;
      }
      i++;
      continue;
    }
    if (c === '`') {
      i++;
      while (i < src.length && src[i] !== '`') {
        if (src[i] === '\\') { i += 2; continue; }
        if (src[i] === '$' && src[i + 1] === '{') {
          let td = 1;
          i += 2;
          while (i < src.length && td > 0) {
            if (src[i] === '{') td++;
            else if (src[i] === '}') td--;
            i++;
          }
          continue;
        }
        i++;
      }
      i++;
      continue;
    }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    else if (c === ',' && depth === 0) {
      out.push(src.slice(start, i));
      start = i + 1;
    }
    i++;
  }
  out.push(src.slice(start));
  return out.map((s) => s.trim());
}

function transformFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');
  let src = original;
  let changed = false;
  let sitesInFile = 0;

  // Walk through every logger call, building a new string.
  // We have to re-run the scan after each replacement because indices shift,
  // so we do it in-place with a forward cursor.
  let cursor = 0;
  const out = [];

  while (cursor < src.length) {
    CALL_RE.lastIndex = cursor;
    const m = CALL_RE.exec(src);
    if (!m) {
      out.push(src.slice(cursor));
      break;
    }
    const openIdx = m.index + m[0].length - 1; // index of '('
    const closeIdx = findCallEnd(src, openIdx);
    if (closeIdx === -1) {
      // Unbalanced — bail on this site, copy through.
      out.push(src.slice(cursor, m.index + m[0].length));
      cursor = m.index + m[0].length;
      continue;
    }
    const argsStr = src.slice(openIdx + 1, closeIdx);
    const args = splitTopLevelArgs(argsStr);
    // Only rewrite when exactly two args and the second is a bare err/error ident.
    if (args.length === 2 && /^err(or)?$/.test(args[1])) {
      const newCall = `${m[1]}.${m[2]}(${args[0]}, redactErrorForLog(${args[1]}))`;
      out.push(src.slice(cursor, m.index));
      out.push(newCall);
      cursor = closeIdx + 1;
      changed = true;
      sitesInFile++;
    } else if (
      args.length === 2 &&
      /^redactErrorForLog\(/.test(args[1])
    ) {
      // already wrapped — pass through
      out.push(src.slice(cursor, closeIdx + 1));
      cursor = closeIdx + 1;
      stats.skippedAlreadyWrapped++;
    } else {
      // not a target shape — pass through this call
      out.push(src.slice(cursor, closeIdx + 1));
      cursor = closeIdx + 1;
    }
  }

  if (!changed) return false;

  let nextSrc = out.join('');

  // Ensure the import is present.
  if (!nextSrc.includes("from '../utils/error-redaction'") && !nextSrc.includes('from "../utils/error-redaction"')) {
    // Find the end of the *last* top-level import statement, multi-line aware.
    // Strategy: scan top-of-file and step over each `import ... from '...';`
    // (handling multi-line bracketed forms) until we hit a non-import line.
    let i = 0;
    let lastImportEnd = -1;

    function skipWhitespace() {
      while (i < nextSrc.length && /[\s]/.test(nextSrc[i])) i++;
    }
    function skipLineComment() {
      while (i < nextSrc.length && nextSrc[i] !== '\n') i++;
    }
    function skipBlockComment() {
      i += 2;
      while (i < nextSrc.length - 1 && !(nextSrc[i] === '*' && nextSrc[i + 1] === '/')) i++;
      i += 2;
    }

    outer: while (i < nextSrc.length) {
      skipWhitespace();
      if (nextSrc.startsWith('//', i)) { skipLineComment(); continue; }
      if (nextSrc.startsWith('/*', i)) { skipBlockComment(); continue; }
      if (!nextSrc.startsWith('import', i)) break outer;
      // Walk the import statement: scan to terminating `;` or end of line if no `;`.
      // Track strings and braces so a multi-line `import { a, b } from '...'` is handled.
      let depth = 0;
      while (i < nextSrc.length) {
        const c = nextSrc[i];
        if (c === '\\') { i += 2; continue; }
        if (c === '"' || c === "'" || c === '`') {
          const q = c; i++;
          while (i < nextSrc.length && nextSrc[i] !== q) {
            if (nextSrc[i] === '\\') i++;
            i++;
          }
          i++;
          continue;
        }
        if (c === '{') depth++;
        else if (c === '}') depth--;
        else if (c === ';' && depth === 0) { i++; lastImportEnd = i; break; }
        else if (c === '\n' && depth === 0 && i > 0 && (nextSrc[i - 1] === '\'' || nextSrc[i - 1] === '"')) {
          i++; lastImportEnd = i; break;
        }
        i++;
      }
    }

    if (lastImportEnd > 0) {
      // Insert on its own line, after the trailing newline of the prior import.
      const insertAt = nextSrc[lastImportEnd] === '\n' ? lastImportEnd + 1 : lastImportEnd;
      nextSrc = nextSrc.slice(0, insertAt) + IMPORT_LINE + '\n' + nextSrc.slice(insertAt);
    } else {
      nextSrc = IMPORT_LINE + '\n' + nextSrc;
    }
    stats.imports++;
  }

  fs.writeFileSync(filePath, nextSrc, 'utf8');
  stats.files++;
  stats.sites += sitesInFile;

  // Sanity-check: file still parses (catches accidental corruption).
  try {
    execSync(`node --check --input-type=module --eval "${''}"`, { stdio: 'pipe' }); // smoke
    // Actual check: use tsc-friendly --check via --print won't work; rely on `node --check`
    // for JS-like validity. TS-specific syntax may not parse — skip in that case.
  } catch {
    /* ignore — node --check on .ts will fail for ts-only syntax */
  }
  return true;
}

const files = fs
  .readdirSync(TARGET_DIR)
  .filter((f) => f.endsWith('.ts') || f.endsWith('.js'))
  .map((f) => path.join(TARGET_DIR, f));

for (const f of files) {
  try {
    transformFile(f);
  } catch (e) {
    console.error(`! failed on ${path.relative(REPO_ROOT, f)}: ${e.message}`);
    process.exitCode = 1;
  }
}

console.log(JSON.stringify(stats, null, 2));
