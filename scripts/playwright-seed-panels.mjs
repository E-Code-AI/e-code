#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:5061';
const outFile = process.env.PANEL_TEST_SEED_FILE || '.tmp/playwright-panel-seed.json';
const email = process.env.TEST_USER_EMAIL || 'testuser@test.com';
const password = process.env.TEST_USER_PASSWORD || 'testpass123';

let cookie = '';

async function request(method, url, data, csrf) {
  const response = await fetch(`${baseUrl}${url}`, {
    method,
    headers: {
      ...(cookie ? { Cookie: cookie } : {}),
      ...(data ? { 'Content-Type': 'application/json' } : {}),
      ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    cookie = setCookie
      .split(',')
      .map((part) => part.split(';')[0])
      .join('; ');
  }
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch (error) {
    throw new Error(`${method} ${url} returned non-JSON ${response.status}: ${text.slice(0, 120)}`);
  }
  if (!response.ok) {
    throw new Error(`${method} ${url} failed ${response.status}: ${text}`);
  }
  return body;
}

async function csrf() {
  const body = await request('GET', '/api/csrf-token');
  return body.csrfToken || body.token;
}

async function login() {
  await request('POST', '/api/login', { email, password }, await csrf());
}

async function createProject(kind) {
  const body = await request('POST', '/api/projects', {
    name: `panel-${kind}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    description: `Seeded ${kind} project for systematic Playwright panel coverage`,
    language: 'html',
    visibility: 'private',
  }, await csrf());
  return body.project || body;
}

async function createFile(projectId, file) {
  return request('POST', `/api/projects/${projectId}/files`, file, await csrf());
}

async function seedStaticAssets(projectId) {
  await createFile(projectId, {
    name: 'index.html',
    path: 'index.html',
    parentId: null,
    isDirectory: false,
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>E-code Panel Preview</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; background: #101827; color: #f8fafc; }
    main { min-height: 100vh; display: grid; place-items: center; }
    section { max-width: 520px; padding: 32px; }
  </style>
</head>
<body>
  <main><section><h1>Panel preview ready</h1><p>Static preview smoke content loaded.</p></section></main>
  <script>console.log("panel seed ready");</script>
</body>
</html>
`,
  });
  await createFile(projectId, {
    name: 'style.css',
    path: 'style.css',
    parentId: null,
    isDirectory: false,
    content: 'body { font-family: system-ui, sans-serif; margin: 0; background: #101827; color: #f8fafc; }\n',
  }).catch(() => undefined);
  await createFile(projectId, {
    name: 'script.js',
    path: 'script.js',
    parentId: null,
    isDirectory: false,
    content: 'console.log("panel seed ready");\n',
  }).catch(() => undefined);
}

await login();

const fresh = await createProject('fresh');
const withFiles = await createProject('with-files');
await seedStaticAssets(Number(fresh.id));
const projectId = Number(withFiles.id);
await seedStaticAssets(projectId);

await createFile(projectId, {
  name: 'PANEL-SEED.md',
  path: 'PANEL-SEED.md',
  parentId: null,
  isDirectory: false,
  content: '# E-code panel test\n\nSeeded project for systematic IDE coverage.\n',
});
await createFile(projectId, {
  name: 'panel-src',
  path: 'panel-src',
  parentId: null,
  isDirectory: true,
  content: '',
});
await createFile(projectId, {
  name: 'app.js',
  path: 'panel-src/app.js',
  parentId: null,
  isDirectory: false,
  content: 'export const answer = 42;\nconsole.log(answer);\n',
});
await createFile(projectId, {
  name: 'app.test.js',
  path: 'panel-src/app.test.js',
  parentId: null,
  isDirectory: false,
  content: "import { answer } from './app.js';\nconsole.assert(answer === 42);\n",
});

const seed = {
  baseUrl,
  createdAt: new Date().toISOString(),
  projects: [
    { id: Number(fresh.id), name: fresh.name, kind: 'fresh' },
    { id: Number(withFiles.id), name: withFiles.name, kind: 'with-files' },
  ],
};

await mkdir(path.dirname(outFile), { recursive: true });
await writeFile(outFile, JSON.stringify(seed, null, 2));
console.log(JSON.stringify(seed));
