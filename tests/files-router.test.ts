import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = {
  files: [] as any[],
  nextId: 1,
};

const previewEmitter = {
  emit: vi.fn(),
};

const storageMock = {
  getProject: vi.fn(async (projectId: number) => ({
    id: projectId,
    ownerId: 1,
    visibility: 'private',
  })),
  getProjectCollaborators: vi.fn(async () => []),
  getFilesByProjectId: vi.fn(async () => state.files),
};

vi.mock('../server/middleware/auth', () => ({
  ensureAuthenticated: (req: any, _res: any, next: any) => {
    req.user = { id: 1 };
    req.isAuthenticated = () => true;
    next();
  },
}));

vi.mock('../server/middleware/csrf', () => ({
  csrfProtection: (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../server/preview/preview-websocket', () => ({
  previewEvents: previewEmitter,
}));

vi.mock('../server/utils/project-fs-sync', () => ({
  syncFileToDisc: vi.fn().mockResolvedValue(undefined),
  removeFileFromDisk: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../server/utils/secrets-manager', () => ({
  getJwtSecret: () => 'test-secret',
}));

vi.mock('../server/services/ai-security.service', () => ({
  aiSecurityService: {
    validatePath: (candidate: string) => ({ valid: true, sanitized: candidate }),
    logAction: vi.fn(),
  },
}));

vi.mock('../server/services/persistence-engine', () => ({
  withScopedTransaction: async (_tenantId: number, _userId: number, callback: any) => {
    const scopedQueries = {
      getFilesByProject: async () => state.files,
      getFileById: async (_projectId: number, fileId: number) =>
        state.files.find((file) => file.id === fileId) || null,
      createFile: async (projectId: number, data: any) => {
        const file = {
          id: state.nextId++,
          projectId,
          name: data.name ?? data.path.split('/').pop(),
          path: data.path,
          content: data.content ?? '',
          parentId: data.parentId ?? null,
          isDirectory: !!data.isDirectory,
        };
        state.files.push(file);
        return file;
      },
      updateFile: async (_projectId: number, fileId: number, patch: any) => {
        const index = state.files.findIndex((file) => file.id === fileId);
        if (index === -1) return null;
        state.files[index] = { ...state.files[index], ...patch };
        return state.files[index];
      },
      deleteFile: async (_projectId: number, fileId: number) => {
        const index = state.files.findIndex((file) => file.id === fileId);
        if (index !== -1) {
          state.files.splice(index, 1);
        }
        return true;
      },
    };

    try {
      const data = await callback(scopedQueries);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error };
    }
  },
}));

function createMockReq({
  method,
  url,
  params = {},
  body = {},
}: {
  method: string;
  url: string;
  params?: Record<string, any>;
  body?: any;
}) {
  return {
    method,
    url,
    originalUrl: url,
    path: url,
    params,
    body,
    query: {},
    headers: {},
    user: { id: 1 },
    isAuthenticated: () => true,
  } as any;
}

function createMockRes() {
  const res: any = {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    },
    send(payload: any) {
      this.body = payload;
      return this;
    },
    set(field: string, value: any) {
      this.headers[field] = value;
      return this;
    },
  };

  return res;
}

async function invokeRoute(
  router: any,
  method: string,
  path: string,
  req: any,
  res: any
) {
  const layer = router.stack.find((entry: any) => entry.route?.path === path && entry.route.methods[method]);
  if (!layer) {
    throw new Error(`Route not found: ${method.toUpperCase()} ${path}`);
  }

  const handlers = layer.route.stack.map((entry: any) => entry.handle);

  for (const handler of handlers) {
    if (handler.length >= 3) {
      await new Promise<void>((resolve, reject) => {
        const next = (error?: any) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        };

        try {
          handler(req, res, next);
        } catch (error) {
          reject(error);
        }
      });
    } else {
      await handler(req, res);
    }
  }
}

describe('FilesRouter CRUD routes', () => {
  beforeEach(() => {
    state.files = [];
    state.nextId = 1;
    previewEmitter.emit.mockReset();
  });

  it('creates, lists, updates, and deletes project files through mounted API handlers', async () => {
    const { FilesRouter } = await import('../server/routes/files.router');
    const router = new FilesRouter(storageMock as any).getRouter();

    const createReq = createMockReq({
      method: 'post',
      url: '/1/files',
      params: { projectId: '1' },
      body: {
        name: 'index.tsx',
        path: 'src/index.tsx',
        content: 'console.log("hello")',
      },
    });
    const createRes = createMockRes();
    await invokeRoute(router, 'post', '/:projectId/files', createReq, createRes);

    expect(createRes.statusCode).toBe(200);
    expect(createRes.body.file.path).toBe('src/index.tsx');

    const listReq = createMockReq({
      method: 'get',
      url: '/1/files',
      params: { projectId: '1' },
    });
    const listRes = createMockRes();
    await invokeRoute(router, 'get', '/:projectId/files', listReq, listRes);

    expect(listRes.statusCode).toBe(200);
    expect(listRes.body).toHaveLength(1);

    const patchReq = createMockReq({
      method: 'patch',
      url: '/1/files/by-id/1',
      params: { projectId: '1', fileId: '1' },
      body: {
        name: 'main.tsx',
        path: 'src/main.tsx',
        content: 'console.log("updated")',
      },
    });
    const patchRes = createMockRes();
    await invokeRoute(router, 'patch', '/:projectId/files/by-id/:fileId', patchReq, patchRes);

    expect(patchRes.statusCode).toBe(200);
    expect(patchRes.body.name).toBe('main.tsx');
    expect(patchRes.body.path).toBe('src/main.tsx');

    const deleteReq = createMockReq({
      method: 'delete',
      url: '/1/files/by-id/1',
      params: { projectId: '1', fileId: '1' },
    });
    const deleteRes = createMockRes();
    await invokeRoute(router, 'delete', '/:projectId/files/by-id/:fileId', deleteReq, deleteRes);

    expect(deleteRes.statusCode).toBe(200);
    expect(state.files).toHaveLength(0);
    expect(previewEmitter.emit).toHaveBeenCalledWith(
      'preview:file-change',
      expect.objectContaining({ projectId: 1 })
    );
  });
});
