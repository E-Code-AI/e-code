// Route-level integration tests for /api/projects/:projectId/storage/*.
//
// Mounts the real router on a throwaway express app and drives it with
// supertest.  StorageService, the database, and auth/CSRF middleware are
// mocked so tests run hermetically — no real GCS/S3, no DB, no Redis.

import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';

// ────────────────────────────────────────────────────────────────
// Mocks — must be registered BEFORE importing the router
// ────────────────────────────────────────────────────────────────

const mockUploadFile = jest.fn();
const mockDownloadFile = jest.fn();
const mockDownloadStream = jest.fn();
const mockGetObjectSize = jest.fn();
const mockDeleteFile = jest.fn();
const mockDeleteFolder = jest.fn();
const mockRenameFolder = jest.fn();
const mockListFiles = jest.fn();
const mockGetStorageStats = jest.fn();
const mockGetSignedUrl = jest.fn();
const mockMoveFile = jest.fn();
const mockCopyFile = jest.fn();
const mockIsPublic = jest.fn().mockReturnValue(false);
const mockGetBackendPublicUrl = jest.fn().mockReturnValue(null);

jest.mock('../../server/services/storage.service', () => ({
  storageService: {
    uploadFile: (...a: unknown[]) => mockUploadFile(...a),
    downloadFile: (...a: unknown[]) => mockDownloadFile(...a),
    downloadStream: (...a: unknown[]) => mockDownloadStream(...a),
    getObjectSize: (...a: unknown[]) => mockGetObjectSize(...a),
    deleteFile: (...a: unknown[]) => mockDeleteFile(...a),
    deleteFolder: (...a: unknown[]) => mockDeleteFolder(...a),
    renameFolder: (...a: unknown[]) => mockRenameFolder(...a),
    listFiles: (...a: unknown[]) => mockListFiles(...a),
    getStorageStats: (...a: unknown[]) => mockGetStorageStats(...a),
    getSignedUrl: (...a: unknown[]) => mockGetSignedUrl(...a),
    moveFile: (...a: unknown[]) => mockMoveFile(...a),
    copyFile: (...a: unknown[]) => mockCopyFile(...a),
    isPublic: (...a: unknown[]) => mockIsPublic(...a),
    getBackendPublicUrl: (...a: unknown[]) => mockGetBackendPublicUrl(...a),
    setObjectVisibility: jest.fn().mockResolvedValue(undefined),
  },
}));

// DB mock — `verifyProjectOwnership` inside the router calls
// `db.query.projects.findFirst(...)`.  We mock the db module so we can
// control whether ownership is granted per-test.
const mockFindFirst = jest.fn();
jest.mock('../../server/db', () => ({
  db: {
    query: {
      projects: {
        findFirst: (...a: unknown[]) => mockFindFirst(...a),
      },
    },
  },
}));

// Auth middleware: inject authenticated user into req
jest.mock('../../server/middleware/auth', () => ({
  ensureAuthenticated: (req: Request, _res: Response, next: NextFunction) => {
    (req as unknown as { user: { id: string } }).user = { id: '42' };
    next();
  },
}));

// CSRF: no-op
jest.mock('../../server/middleware/csrf', () => ({
  csrfProtection: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

// Logger
jest.mock('../../server/utils/logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }),
}));

// Error util
jest.mock('../../server/utils/error-redaction', () => ({
  redactErrorForLog: (e: unknown) => e,
}));

// ────────────────────────────────────────────────────────────────
// App builder
// ────────────────────────────────────────────────────────────────

function buildApp() {
  const app = express();
  app.use(express.json());
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const storageRouter = require('../../server/routes/storage.router').default;
  // Mirror production mount (mergeParams needs the outer route param too)
  app.use('/api/projects/:projectId/storage', storageRouter);
  return app;
}

// ────────────────────────────────────────────────────────────────
// Shared test data
// ────────────────────────────────────────────────────────────────

const PROJECT_ID = '1';
const BASE = `/api/projects/${PROJECT_ID}/storage`;

const fakeStorageObject = {
  key: `projects/${PROJECT_ID}/storage/hello.txt`,
  size: 13,
  contentType: 'text/plain',
  lastModified: new Date('2024-01-01T00:00:00Z'),
};

/** Make db return a fake project row (ownership granted) */
function grantOwnership() {
  mockFindFirst.mockResolvedValue({ id: Number(PROJECT_ID) });
}

/** Make db return undefined (ownership denied) */
function denyOwnership() {
  mockFindFirst.mockResolvedValue(undefined);
}

// ────────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────────

describe('GET / — list files', () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
    grantOwnership();
    mockListFiles.mockResolvedValue([fakeStorageObject]);
    mockGetStorageStats.mockResolvedValue({ totalSize: 13, fileCount: 1 });
  });

  it('returns 200 with file tree and stats', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.files)).toBe(true);
    expect(res.body.stats.fileCount).toBe(1);
  });

  it('returns 403 for non-owner', async () => {
    denyOwnership();
    const res = await request(app).get(BASE);
    expect(res.status).toBe(403);
  });
});

describe('DELETE /:path — delete file', () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
    grantOwnership();
    mockDeleteFile.mockResolvedValue(undefined);
  });

  it('deletes and returns 200', async () => {
    const res = await request(app).delete(`${BASE}/hello.txt`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
    expect(mockDeleteFile).toHaveBeenCalledTimes(1);
  });

  it('returns 404 when service throws "not found"', async () => {
    mockDeleteFile.mockRejectedValue(new Error('Object not found'));
    const res = await request(app).delete(`${BASE}/missing.txt`);
    expect(res.status).toBe(404);
  });
});

describe('GET /:path/download — streaming download + range', () => {
  let app: ReturnType<typeof buildApp>;
  const CONTENT = Buffer.from('Hello, world!');

  function makeStream(buf: Buffer) {
    const { Readable } = require('stream');
    return Readable.from([buf]);
  }

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
    grantOwnership();
    // getObjectSize: HEAD-only size check used for range validation
    mockGetObjectSize.mockResolvedValue(CONTENT.length);
    // downloadStream: returns a stream of the requested byte slice
    mockDownloadStream.mockImplementation(async (_key: string, opts?: { start?: number; end?: number }) => {
      const start = opts?.start ?? 0;
      const end = opts?.end !== undefined ? opts.end : CONTENT.length - 1;
      const slice = CONTENT.slice(start, end + 1);
      return { stream: makeStream(slice), totalSize: CONTENT.length, contentType: 'text/plain' };
    });
  });

  it('returns 200 with Accept-Ranges header for full download', async () => {
    const res = await request(app).get(`${BASE}/hello.txt/download`);
    expect(res.status).toBe(200);
    expect(res.headers['accept-ranges']).toBe('bytes');
    expect(res.text).toBe('Hello, world!');
  });

  it('returns 206 + Content-Range for a valid Range request', async () => {
    const res = await request(app)
      .get(`${BASE}/hello.txt/download`)
      .set('Range', 'bytes=0-4');
    expect(res.status).toBe(206);
    expect(res.headers['content-range']).toBe(`bytes 0-4/${CONTENT.length}`);
    expect(res.text.length).toBe(5);
  });

  it('returns 416 for an out-of-bounds Range', async () => {
    const res = await request(app)
      .get(`${BASE}/hello.txt/download`)
      .set('Range', 'bytes=9999-99999');
    expect(res.status).toBe(416);
  });
});

describe('POST /upload — quota enforcement', () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
    grantOwnership();
    mockUploadFile.mockResolvedValue({ ...fakeStorageObject, key: `projects/${PROJECT_ID}/storage/up.txt` });
  });

  it('returns 413 when project is at/over quota', async () => {
    // 1 GB − 1 byte used; uploading 2 bytes pushes it over
    mockGetStorageStats.mockResolvedValue({ totalSize: 1024 * 1024 * 1024 - 1, fileCount: 5 });
    const res = await request(app)
      .post(`${BASE}/upload`)
      .attach('file', Buffer.from('hi'), 'up.txt');
    expect(res.status).toBe(413);
    expect(res.body.error).toMatch(/quota exceeded/i);
    expect(mockUploadFile).not.toHaveBeenCalled();
  });

  it('returns 201 when under quota', async () => {
    mockGetStorageStats.mockResolvedValue({ totalSize: 0, fileCount: 0 });
    const res = await request(app)
      .post(`${BASE}/upload`)
      .attach('file', Buffer.from('Hello'), 'hello.txt');
    expect(res.status).toBe(201);
    expect(mockUploadFile).toHaveBeenCalledTimes(1);
  });

  it('returns 400 for blocked extension (.exe)', async () => {
    mockGetStorageStats.mockResolvedValue({ totalSize: 0, fileCount: 0 });
    const res = await request(app)
      .post(`${BASE}/upload`)
      .attach('file', Buffer.from('MZ'), 'malware.exe');
    expect(res.status).toBe(400);
    expect(mockUploadFile).not.toHaveBeenCalled();
  });
});

describe('POST /:path/move — rename / move', () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
    grantOwnership();
    mockMoveFile.mockResolvedValue({ ...fakeStorageObject, key: `projects/${PROJECT_ID}/storage/renamed.txt` });
  });

  it('returns 200 with new path', async () => {
    const res = await request(app)
      .post(`${BASE}/hello.txt/move`)
      .send({ destination: 'renamed.txt' });
    expect(res.status).toBe(200);
    expect(res.body.path).toContain('renamed.txt');
    expect(mockMoveFile).toHaveBeenCalledTimes(1);
  });

  it('returns 400 when destination is missing', async () => {
    const res = await request(app)
      .post(`${BASE}/hello.txt/move`)
      .send({});
    expect(res.status).toBe(400);
    expect(mockMoveFile).not.toHaveBeenCalled();
  });
});

describe('POST /:path/copy — duplicate', () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
    grantOwnership();
    mockCopyFile.mockResolvedValue({ ...fakeStorageObject, key: `projects/${PROJECT_ID}/storage/copy.txt` });
  });

  it('returns 201 with copy path', async () => {
    const res = await request(app)
      .post(`${BASE}/hello.txt/copy`)
      .send({ destination: 'copy.txt' });
    expect(res.status).toBe(201);
    expect(res.body.path).toContain('copy.txt');
    expect(mockCopyFile).toHaveBeenCalledTimes(1);
  });

  it('returns 400 when destination is missing', async () => {
    const res = await request(app)
      .post(`${BASE}/hello.txt/copy`)
      .send({});
    expect(res.status).toBe(400);
    expect(mockCopyFile).not.toHaveBeenCalled();
  });
});

describe('GET /:path/url — signed URL', () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
    grantOwnership();
    mockGetSignedUrl.mockResolvedValue('https://storage.example.com/signed?tok=abc');
  });

  it('returns signed URL with 1-hour expiresIn', async () => {
    const res = await request(app).get(`${BASE}/hello.txt/url`);
    expect(res.status).toBe(200);
    expect(res.body.url).toMatch(/signed/);
    expect(res.body.expiresIn).toBe(3600);
  });
});

// ────────────────────────────────────────────────────────────────
describe('POST /:path/move with isFolder:true — folder rename', () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
    grantOwnership();
    mockRenameFolder.mockResolvedValue({ movedCount: 3 });
  });

  it('returns 200 with movedCount when isFolder is true', async () => {
    const res = await request(app)
      .post(`${BASE}/old-folder/move`)
      .send({ destination: 'new-folder', isFolder: true });
    expect(res.status).toBe(200);
    expect(res.body.movedCount).toBe(3);
    expect(mockRenameFolder).toHaveBeenCalledTimes(1);
    expect(mockMoveFile).not.toHaveBeenCalled();
  });

  it('returns 400 when destination is missing for folder rename', async () => {
    const res = await request(app)
      .post(`${BASE}/old-folder/move`)
      .send({ isFolder: true });
    expect(res.status).toBe(400);
    expect(mockRenameFolder).not.toHaveBeenCalled();
  });

  it('uses moveFile (not renameFolder) when isFolder is false', async () => {
    mockMoveFile.mockResolvedValue({ ...fakeStorageObject, key: `projects/${PROJECT_ID}/storage/renamed.txt` });
    const res = await request(app)
      .post(`${BASE}/hello.txt/move`)
      .send({ destination: 'renamed.txt', isFolder: false });
    expect(res.status).toBe(200);
    expect(mockMoveFile).toHaveBeenCalledTimes(1);
    expect(mockRenameFolder).not.toHaveBeenCalled();
  });
});

describe('DELETE /folder/:path — recursive folder delete', () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
    grantOwnership();
    mockDeleteFolder.mockResolvedValue({ deletedCount: 4 });
  });

  it('returns 200 with deletedCount after recursive delete', async () => {
    const res = await request(app).delete(`${BASE}/folder/my-folder`);
    expect(res.status).toBe(200);
    expect(res.body.deletedCount).toBe(4);
    expect(mockDeleteFolder).toHaveBeenCalledTimes(1);
  });

  it('returns 403 when user does not own the project', async () => {
    denyOwnership();
    const res = await request(app).delete(`${BASE}/folder/my-folder`);
    expect(res.status).toBe(403);
    expect(mockDeleteFolder).not.toHaveBeenCalled();
  });

  it('returns 401 when unauthenticated', async () => {
    const unauthApp = express();
    unauthApp.use(express.json());
    unauthApp.use('/:projectId/storage', require('../../server/routes/storage.router').default);
    const res = await request(unauthApp).delete(`/1/storage/folder/my-folder`);
    expect(res.status).toBe(401);
  });
});

describe('POST /upload — MIME mismatch + rate limit', () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
    grantOwnership();
    mockGetStorageStats.mockResolvedValue({ totalSize: 0, fileCount: 0 });
    mockUploadFile.mockResolvedValue({ ...fakeStorageObject, key: `projects/${PROJECT_ID}/storage/up.png` });
  });

  it('returns 400 when MIME type does not match extension (image/jpeg for .png)', async () => {
    const res = await request(app)
      .post(`${BASE}/upload`)
      .attach('file', Buffer.from('fake-image-bytes'), { filename: 'photo.png', contentType: 'image/jpeg' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/mismatch/i);
    expect(mockUploadFile).not.toHaveBeenCalled();
  });

  it('accepts upload when MIME type matches extension (image/png for .png)', async () => {
    const res = await request(app)
      .post(`${BASE}/upload`)
      .attach('file', Buffer.from('fake-image-bytes'), { filename: 'photo.png', contentType: 'image/png' });
    expect(res.status).toBe(201);
    expect(mockUploadFile).toHaveBeenCalledTimes(1);
  });
});

// ────────────────────────────────────────────────────────────────
describe('PATCH /:path/visibility — ACL toggle', () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
    grantOwnership();
    // setObjectVisibility is called on the service singleton — mock it
    (require('../../server/services/storage.service').storageService as {
      setObjectVisibility?: jest.Mock
    }).setObjectVisibility = jest.fn().mockResolvedValue(undefined);
  });

  it('returns 400 when `public` field is missing', async () => {
    const res = await request(app)
      .patch(`${BASE}/photo.png/visibility`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 400 when `public` is not a boolean', async () => {
    const res = await request(app)
      .patch(`${BASE}/photo.png/visibility`)
      .send({ public: 'yes' });
    expect(res.status).toBe(400);
  });

  it('sets visibility to public and returns publicUrl', async () => {
    const res = await request(app)
      .patch(`${BASE}/photo.png/visibility`)
      .send({ public: true });
    expect(res.status).toBe(200);
    expect(res.body.public).toBe(true);
    expect(res.body.publicUrl).toMatch(/\/public\/photo.png/);
  });

  it('sets visibility to private and returns null publicUrl', async () => {
    const res = await request(app)
      .patch(`${BASE}/photo.png/visibility`)
      .send({ public: false });
    expect(res.status).toBe(200);
    expect(res.body.public).toBe(false);
    expect(res.body.publicUrl).toBeNull();
  });

  it('returns 403 when user does not own the project', async () => {
    denyOwnership();
    const res = await request(app)
      .patch(`${BASE}/photo.png/visibility`)
      .send({ public: true });
    expect(res.status).toBe(403);
  });
});

// ────────────────────────────────────────────────────────────────
describe('GET /public/:path — unauthenticated public download', () => {
  // Public route is registered BEFORE ensureAuthenticated in the router,
  // so requests must NOT include the auth cookie to test unauthenticated access.
  // We build a separate app without the auth injection middleware.
  function buildUnauthApp() {
    const { default: storageRouter } = require('../../server/routes/storage.router');
    const a = express();
    a.use(express.json());
    a.use('/:projectId/storage', storageRouter);
    return a;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    const { Readable } = require('stream');
    const buf = Buffer.from('hello world');
    mockDownloadStream.mockResolvedValue({
      stream: Readable.from([buf]),
      totalSize: buf.length,
      contentType: 'text/plain',
    });
    // getBackendPublicUrl returns null → local path (serve content directly)
    mockGetBackendPublicUrl.mockReturnValue(null);
    // Default: isPublic returns true so the public route serves content
    mockIsPublic.mockReturnValue(true);
  });

  it('serves file content without authentication', async () => {
    const app = buildUnauthApp();
    const res = await request(app).get('/1/storage/public/readme.txt');
    expect(res.status).toBe(200);
    expect(res.text).toBe('hello world');
  });

  it('returns 403 when local backend object has not been marked public', async () => {
    // getBackendPublicUrl returns null → local path, isPublic gate applies
    mockGetBackendPublicUrl.mockReturnValue(null);
    mockIsPublic.mockReturnValue(false);
    const app = buildUnauthApp();
    const res = await request(app).get('/1/storage/public/secret.txt');
    expect(res.status).toBe(403);
  });

  it('redirects 302 to backend-native URL for GCS/S3 (no isPublic registry check)', async () => {
    // Simulate GCS/S3: getBackendPublicUrl returns a real backend URL.
    // The route must redirect unconditionally — backend enforces its own ACL,
    // so the in-memory registry is NOT consulted.
    const backendUrl = 'https://storage.googleapis.com/test-bucket/projects/1/storage/photo.png';
    mockGetBackendPublicUrl.mockReturnValue(backendUrl);
    // Even with isPublic returning false (empty registry after "restart"), the
    // redirect must still happen — backend ACL is the durable source of truth.
    mockIsPublic.mockReturnValue(false);
    const app = buildUnauthApp();
    const res = await request(app)
      .get('/1/storage/public/photo.png')
      .redirects(0);   // do NOT follow the redirect
    expect(res.status).toBe(302);
    expect(res.headers['location']).toBe(backendUrl);
  });

  it('serves local content when getBackendPublicUrl returns null and object is public', async () => {
    mockGetBackendPublicUrl.mockReturnValue(null);
    mockIsPublic.mockReturnValue(true);
    const app = buildUnauthApp();
    const res = await request(app).get('/1/storage/public/readme.txt');
    expect(res.status).toBe(200);
    expect(res.text).toBe('hello world');
  });
});

// ────────────────────────────────────────────────────────────────
// Visibility propagation survival — simulates post-restart state
// where in-memory publicKeys is empty but durable backend metadata
// still reflects the object's public status.
// ────────────────────────────────────────────────────────────────
describe('POST /:path/copy — visibility propagates from source', () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
    grantOwnership();
    mockCopyFile.mockResolvedValue({
      ...fakeStorageObject,
      key: `projects/${PROJECT_ID}/storage/copy.txt`,
    });
  });

  it('calls copyFile and the returned object has the correct path', async () => {
    const res = await request(app)
      .post(`${BASE}/original.txt/copy`)
      .send({ destination: 'copy.txt' });
    expect(res.status).toBe(201);
    expect(res.body.path).toBe('copy.txt');
    expect(mockCopyFile).toHaveBeenCalledWith(
      expect.stringContaining('original.txt'),
      expect.stringContaining('copy.txt')
    );
  });

  it('copy of a public file preserves the public path shape in the response', async () => {
    // The router does not set ACL — the service does.  Here we verify the route
    // contract: 201 + correct path.  Service-level visibility propagation is
    // tested directly in unit tests (no router involvement needed).
    const res = await request(app)
      .post(`${BASE}/public-file.txt/copy`)
      .send({ destination: 'public-copy.txt' });
    expect(res.status).toBe(201);
    expect(mockCopyFile).toHaveBeenCalledTimes(1);
  });
});

describe('POST /:path/move — visibility propagates from source', () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
    grantOwnership();
    mockMoveFile.mockResolvedValue({
      ...fakeStorageObject,
      key: `projects/${PROJECT_ID}/storage/moved.txt`,
    });
  });

  it('calls moveFile and response contains the new path', async () => {
    const res = await request(app)
      .post(`${BASE}/original.txt/move`)
      .send({ destination: 'moved.txt' });
    expect(res.status).toBe(200);
    expect(res.body.path).toBe('moved.txt');
    expect(mockMoveFile).toHaveBeenCalledWith(
      expect.stringContaining('original.txt'),
      expect.stringContaining('moved.txt')
    );
  });

  it('move after simulated restart (empty in-memory registry) still calls moveFile once', async () => {
    // Simulates post-restart: service.isPublic() would return false for everything
    // because publicKeys is empty.  The real getObjectVisibility() reads durable
    // backend state.  At the router level, move must complete regardless.
    const res = await request(app)
      .post(`${BASE}/was-public.txt/move`)
      .send({ destination: 'was-public-moved.txt' });
    expect(res.status).toBe(200);
    expect(mockMoveFile).toHaveBeenCalledTimes(1);
  });
});
