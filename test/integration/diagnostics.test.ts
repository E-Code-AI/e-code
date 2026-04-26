import { ToolExecutor } from '../../server/agent/tool-executor';
import fs from 'fs/promises';
import path from 'path';

const TEST_DIR = path.join(process.cwd(), 'test', 'integration', '__fixtures__');

beforeAll(async () => {
  await fs.mkdir(TEST_DIR, { recursive: true });

  await fs.writeFile(
    path.join(TEST_DIR, 'good-file.ts'),
    `const greeting: string = "hello";\nconsole.log(greeting);\n`
  );

  await fs.writeFile(
    path.join(TEST_DIR, 'bad-file.ts'),
    `const num: number = "this is not a number";\nconsole.log(num);\n`
  );

  await fs.writeFile(
    path.join(TEST_DIR, 'sample.py'),
    `print("hello")\n`
  );
});

afterAll(async () => {
  await fs.rm(TEST_DIR, { recursive: true, force: true });
});

describe('getDiagnostics', () => {
  const executor = new ToolExecutor('default');

  it('returns diagnostics for a file with type errors', async () => {
    const result = await executor.execute('get_diagnostics', {
      file_path: 'test/integration/__fixtures__/bad-file.ts',
    });

    expect(result.success).toBe(true);
    expect(result.output.errors.length).toBeGreaterThan(0);

    const firstError = result.output.errors[0];
    expect(firstError.line).toBe(1);
    expect(firstError.severity).toBe('error');
    expect(firstError.message).toMatch(/not assignable|Type/);
    expect(typeof firstError.code).toBe('string');
    expect(firstError.code).toMatch(/^TS/);
    expect(firstError.source).toBe('typescript');
  }, 60000);

  it('returns empty diagnostics for a clean file', async () => {
    const result = await executor.execute('get_diagnostics', {
      file_path: 'test/integration/__fixtures__/good-file.ts',
    });

    expect(result.success).toBe(true);
    expect(result.output.errors).toHaveLength(0);
    expect(result.output.warnings).toHaveLength(0);
  }, 60000);

  it('returns not-supported message for Python files', async () => {
    const result = await executor.execute('get_diagnostics', {
      file_path: 'test/integration/__fixtures__/sample.py',
    });

    expect(result.success).toBe(true);
    expect(result.output.diagnostics).toHaveLength(0);
    expect(result.output.message).toContain('not supported');
  });

  it('returns not-supported message for CSS files', async () => {
    const result = await executor.execute('get_diagnostics', {
      file_path: 'styles/main.css',
    });

    expect(result.success).toBe(true);
    expect(result.output.diagnostics).toHaveLength(0);
    expect(result.output.message).toContain('not supported');
  });
});
