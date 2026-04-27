#!/usr/bin/env node
// Lints release-adjacent artifacts that the main typecheck/eslint pipeline
// doesn't reach: Grafana dashboard JSON files and k6/Detox JS configs.
//
// Designed to be cheap (no services, no network) so it runs in CI on every PR.

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { execSync } from 'node:child_process';

const REPO_ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');

let failures = 0;
function fail(file, msg) {
  console.error(`✗ ${file}: ${msg}`);
  failures++;
}
function pass(file, msg) {
  console.log(`✓ ${file}: ${msg}`);
}

// --- Grafana dashboards ---
function lintDashboard(filePath) {
  const rel = path.relative(REPO_ROOT, filePath);
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    return fail(rel, `unreadable (${e.message})`);
  }
  let json;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    return fail(rel, `invalid JSON (${e.message})`);
  }
  const required = ['title', 'uid', 'schemaVersion', 'panels'];
  for (const k of required) {
    if (!(k in json)) return fail(rel, `missing required field "${k}"`);
  }
  if (typeof json.uid !== 'string' || json.uid.length < 3) {
    return fail(rel, `uid must be a non-trivial string`);
  }
  if (!Array.isArray(json.panels) || json.panels.length === 0) {
    return fail(rel, `panels must be a non-empty array`);
  }
  let nonRowPanels = 0;
  for (const p of json.panels) {
    if (!p.type) return fail(rel, `panel missing type: ${JSON.stringify(p).slice(0, 80)}`);
    if (p.type === 'row') continue;
    nonRowPanels++;
    if (!p.gridPos) return fail(rel, `non-row panel "${p.title || p.id}" missing gridPos`);
    if (!Array.isArray(p.targets) || p.targets.length === 0) {
      return fail(rel, `non-row panel "${p.title || p.id}" must have at least one target`);
    }
    for (const t of p.targets) {
      if (typeof t.expr !== 'string' || t.expr.trim().length === 0) {
        return fail(rel, `panel "${p.title}" has a target without expr`);
      }
    }
  }
  if (nonRowPanels === 0) return fail(rel, `dashboard has no data panels (only rows)`);
  pass(rel, `${nonRowPanels} data panel(s), schemaVersion ${json.schemaVersion}`);
}

const dashboardDir = path.join(REPO_ROOT, 'observability', 'grafana');
if (fs.existsSync(dashboardDir)) {
  const files = fs.readdirSync(dashboardDir).filter((f) => f.endsWith('.json'));
  if (files.length === 0) {
    fail(path.relative(REPO_ROOT, dashboardDir), 'no dashboard JSON files found');
  }
  for (const f of files) lintDashboard(path.join(dashboardDir, f));
} else {
  console.log('(no observability/grafana directory — skipping dashboard lint)');
}

// --- k6 + Detox JS configs (syntax check only; full k6 inspect is opt-in) ---
const jsTargets = [
  'test/load/sessions-100.k6.js',
  'test/load/api-load.test.js',
  'e2e-mobile/.detoxrc.js',
  'e2e-mobile/jest.config.js',
];
for (const rel of jsTargets) {
  const p = path.join(REPO_ROOT, rel);
  if (!fs.existsSync(p)) {
    console.log(`(skip ${rel} — not present)`);
    continue;
  }
  try {
    execSync(`node --check ${JSON.stringify(p)}`, { stdio: 'pipe' });
    pass(rel, 'syntax OK');
  } catch (e) {
    fail(rel, `syntax error: ${(e.stderr || e.message || '').toString().split('\n')[0]}`);
  }
}

if (failures > 0) {
  console.error(`\n${failures} artifact lint failure(s).`);
  process.exit(1);
}
console.log('\nAll release artifacts passed lint.');
