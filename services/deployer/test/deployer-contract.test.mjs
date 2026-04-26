import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const deployer = await readFile(new URL('../src/deployer.ts', import.meta.url), 'utf8');
const cloudRun = await readFile(new URL('../src/cloud-run.ts', import.meta.url), 'utf8');
const cloudBuild = await readFile(new URL('../src/cloud-build.ts', import.meta.url), 'utf8');
const gcp = await readFile(new URL('../src/gcp.ts', import.meta.url), 'utf8');

assert.match(deployer, /detectApplication/);
assert.match(gcp, /cloudbuild.googleapis.com/);
assert.match(cloudBuild, /artifactRepository/);
assert.match(cloudRun, /run.googleapis.com/);
assert.match(cloudRun, /traffic/);
assert.match(cloudRun, /secretKeyRef/);

console.log('deployer contract test passed');
