import { expect, type APIRequestContext, type Page } from '@playwright/test';

export type SeedProject = {
  id: number;
  name: string;
  kind: 'fresh' | 'with-files';
};

export async function getCsrf(request: APIRequestContext) {
  const response = await request.get('/api/csrf-token');
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  return body.csrfToken || body.token || response.headers()['x-csrf-token'];
}

export async function login(request: APIRequestContext) {
  const csrf = await getCsrf(request);
  const response = await request.post('/api/login', {
    headers: { 'X-CSRF-Token': csrf },
    data: {
      email: process.env.TEST_USER_EMAIL || 'testuser@test.com',
      password: process.env.TEST_USER_PASSWORD || 'testpass123',
    },
  });
  expect(response.status(), await response.text()).toBe(200);
}

export async function createProject(
  request: APIRequestContext,
  options: { namePrefix: string; description: string; language?: string } = {
    namePrefix: 'panel-systematic',
    description: 'Panel systematic test workspace',
    language: 'html',
  },
) {
  const csrf = await getCsrf(request);
  const response = await request.post('/api/projects', {
    headers: { 'X-CSRF-Token': csrf },
    data: {
      name: `${options.namePrefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      description: options.description,
      language: options.language || 'html',
      visibility: 'private',
    },
  });
  expect(response.status(), await response.text()).toBe(200);
  const body = await response.json();
  return body.project || body;
}

export async function createFile(
  request: APIRequestContext,
  projectId: number,
  data: { name: string; path?: string; content?: string; isDirectory?: boolean; parentId?: number | null },
) {
  const csrf = await getCsrf(request);
  const response = await request.post(`/api/projects/${projectId}/files`, {
    headers: { 'X-CSRF-Token': csrf },
    data: {
      name: data.name,
      path: data.path || data.name,
      parentId: data.parentId ?? null,
      isDirectory: data.isDirectory || false,
      content: data.isDirectory ? '' : data.content || '',
    },
  });
  expect(response.status(), await response.text()).toBe(200);
  return response.json();
}

export async function seedStaticAssets(request: APIRequestContext, projectId: number) {
  await createFile(request, projectId, {
    name: 'style.css',
    path: 'style.css',
    content: 'body { font-family: system-ui, sans-serif; margin: 0; background: #101827; color: #f8fafc; }\n',
  }).catch(() => undefined);
  await createFile(request, projectId, {
    name: 'script.js',
    path: 'script.js',
    content: 'console.log("panel seed ready");\n',
  }).catch(() => undefined);
}

export async function seedProjectWithFiles(request: APIRequestContext) {
  const project = await createProject(request, {
    namePrefix: 'panel-files',
    description: 'Panel systematic test workspace with representative files',
    language: 'html',
  });
  const projectId = Number(project.id);
  expect(projectId).toBeGreaterThan(0);
  await seedStaticAssets(request, projectId);

  await createFile(request, projectId, {
    name: 'PANEL-SEED.md',
    path: 'PANEL-SEED.md',
    content: '# Panel test workspace\n\nThis project is seeded for IDE panel coverage.\n',
  });
  await createFile(request, projectId, {
    name: 'panel-src',
    path: 'panel-src',
    isDirectory: true,
  });
  await createFile(request, projectId, {
    name: 'app.js',
    path: 'panel-src/app.js',
    content: 'export function hello(name) { return `hello ${name}`; }\n',
  });
  await createFile(request, projectId, {
    name: 'app.test.js',
    path: 'panel-src/app.test.js',
    content: "import { hello } from './app.js';\nconsole.assert(hello('ecode') === 'hello ecode');\n",
  });

  return project;
}

export function parseSeedProjects(): SeedProject[] {
  const raw = process.env.PANEL_TEST_SEED;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.projects)) {
      return parsed.projects.map((project: any) => ({
        id: Number(project.id),
        name: String(project.name || project.id),
        kind: project.kind === 'fresh' ? 'fresh' : 'with-files',
      }));
    }
  } catch {
    return [];
  }
  return [];
}

export async function ensureSeedProjects(request: APIRequestContext): Promise<SeedProject[]> {
  const fromEnv = parseSeedProjects();
  if (fromEnv.length >= 2) return fromEnv;

  await login(request);
  const fresh = await createProject(request, {
    namePrefix: 'panel-fresh',
    description: 'Fresh workspace for panel systematic coverage',
    language: 'html',
  });
  await seedStaticAssets(request, Number(fresh.id));
  const withFiles = await seedProjectWithFiles(request);
  return [
    { id: Number(fresh.id), name: fresh.name || String(fresh.id), kind: 'fresh' },
    { id: Number(withFiles.id), name: withFiles.name || String(withFiles.id), kind: 'with-files' },
  ];
}

export async function openWorkspace(page: Page, projectId: number) {
  await page.addInitScript(([key, state]) => {
    window.sessionStorage.setItem(key as string, JSON.stringify(state));
  }, [
    `ide-state-${projectId}`,
    {
      activeTab: 'console',
      tabs: [
        { id: 'console', label: 'Console', closable: false },
        { id: 'shell', label: 'Shell', closable: false },
      ],
      selectedFileId: null,
      showFileExplorer: true,
    },
  ]);
  await page.goto(`/ide/${projectId}`);
  await expect(page.locator('[data-testid="ide-loading-auth"], [data-testid="ide-loading-layout"]')).toHaveCount(0, {
    timeout: 160_000,
  });
  await expect(page.locator('[data-testid="top-nav-bar"], [data-testid="status-bar"], [data-ide-layout="unified"], [data-testid="pane-left-dock"]').first()).toBeVisible({
    timeout: 60_000,
  });
}
