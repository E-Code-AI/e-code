import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

const storageMock = {
  getFileByPath: vi.fn(),
  createFile: vi.fn(),
};

vi.mock('../server/storage', () => ({
  storage: storageMock,
}));

describe('SpeculativeScaffoldService', () => {
  let tmpRoot: string;

  beforeEach(async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ecode-scaffold-'));
    storageMock.getFileByPath.mockReset();
    storageMock.createFile.mockReset();
    storageMock.getFileByPath.mockResolvedValue(null);
    storageMock.createFile.mockResolvedValue({ id: 1 });
  });

  afterEach(async () => {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  });

  it('creates runnable scaffold files and persists them to storage for prompt-to-app bootstrap', async () => {
    const { SpeculativeScaffoldService } = await import('../server/services/speculative-scaffold.service');
    const service = new SpeculativeScaffoldService(tmpRoot);

    const result = await service.createScaffold({
      projectId: 'p1',
      prompt: 'Build a react frontend dashboard app',
    });

    expect(result.success).toBe(true);
    expect(result.filesCreated.length).toBeGreaterThan(0);

    const packageJsonPath = path.join(tmpRoot, 'p1', 'package.json');
    const appPath = path.join(tmpRoot, 'p1', 'src', 'App.tsx');

    await expect(fs.readFile(packageJsonPath, 'utf8')).resolves.toContain('"vite"');
    await expect(fs.readFile(appPath, 'utf8')).resolves.toContain('export default function App');

    expect(storageMock.createFile).toHaveBeenCalled();
    expect(storageMock.createFile.mock.calls.some(([arg]) => arg.path === 'package.json')).toBe(true);
  });
});
