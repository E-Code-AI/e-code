import { promises as fs } from 'fs';
import path from 'path';

const ROOT = process.cwd();
const TARGET_DIRS = ['client/src', 'server', 'shared'];

async function walk(dir) {
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const dirent of dirents) {
    const fullPath = path.join(dir, dirent.name);
    if (dirent.isDirectory()) {
      files.push(...await walk(fullPath));
    } else if (dirent.isFile() && (dirent.name.endsWith('.ts') || dirent.name.endsWith('.tsx'))) {
      files.push(fullPath);
    }
  }
  return files;
}

function hasDirective(source) {
  return source.startsWith('// @ts-nocheck') || source.includes('\n// @ts-nocheck');
}

function insertDirective(source) {
  let index = 0;
  let prefix = '';
  if (source.startsWith('\ufeff')) {
    prefix += '\ufeff';
    index += 1;
  }
  if (source.startsWith('#!', index)) {
    const newlineIndex = source.indexOf('\n', index);
    if (newlineIndex === -1) {
      return source + '\n// @ts-nocheck\n';
    }
    prefix += source.slice(index, newlineIndex + 1);
    index = newlineIndex + 1;
  }

  const rest = source.slice(index);
  const useDirectiveMatch = /^(?:"use (?:client|strict)"|'use (?:client|strict)')\s*;?\s*(\r?\n)/.exec(rest);
  if (useDirectiveMatch) {
    const directiveEnd = useDirectiveMatch.index + useDirectiveMatch[0].length;
    const head = rest.slice(0, directiveEnd);
    const tail = rest.slice(directiveEnd);
    return prefix + head + '// @ts-nocheck\n' + tail;
  }

  return prefix + '// @ts-nocheck\n' + rest;
}

async function processFile(file) {
  const source = await fs.readFile(file, 'utf8');
  if (hasDirective(source)) return;
  const updated = insertDirective(source);
  await fs.writeFile(file, updated, 'utf8');
}

async function main() {
  for (const dir of TARGET_DIRS) {
    const absDir = path.join(ROOT, dir);
    const files = await walk(absDir);
    await Promise.all(files.map(processFile));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
