import {
  MAX_OUTPUT_BYTES,
  MAX_PATH_LENGTH,
  OutputGuard,
  validateGeneratedPath,
} from '../../server/routes/code-generation-output-guards';

describe('validateGeneratedPath', () => {
  it.each([
    'src/App.tsx',
    'tailwind.config.ts',
    'components.json',
    'src/lib/utils.ts',
    'a/b/c/d/e/f.ts',
  ])('accepts safe relative path %s', (p) => {
    expect(validateGeneratedPath(p)).toEqual({ ok: true });
  });

  it('rejects empty paths', () => {
    expect(validateGeneratedPath('')).toMatchObject({ ok: false, detail: 'empty_path' });
  });

  it('rejects paths over MAX_PATH_LENGTH', () => {
    const long = 'a/'.repeat(MAX_PATH_LENGTH);
    expect(validateGeneratedPath(long)).toMatchObject({ ok: false, detail: 'path_too_long' });
  });

  it('rejects POSIX absolute paths', () => {
    expect(validateGeneratedPath('/etc/passwd')).toMatchObject({ ok: false, detail: 'absolute_path' });
  });

  it('rejects Windows absolute paths', () => {
    expect(validateGeneratedPath('C:\\Windows\\System32')).toMatchObject({ ok: false, detail: 'absolute_path' });
    expect(validateGeneratedPath('D:/data/x.ts')).toMatchObject({ ok: false, detail: 'absolute_path' });
  });

  it('rejects parent traversal in any segment', () => {
    expect(validateGeneratedPath('src/../../etc/passwd')).toMatchObject({ ok: false, detail: 'parent_traversal' });
    expect(validateGeneratedPath('..')).toMatchObject({ ok: false, detail: 'parent_traversal' });
    expect(validateGeneratedPath('a\\..\\b')).toMatchObject({ ok: false, detail: 'parent_traversal' });
  });

  it('rejects control characters and null bytes', () => {
    expect(validateGeneratedPath('src/foo\x00.ts')).toMatchObject({ ok: false, detail: 'control_chars' });
    expect(validateGeneratedPath('src/foo\nbar.ts')).toMatchObject({ ok: false, detail: 'control_chars' });
  });
});

describe('OutputGuard', () => {
  it('passes through normal multi-file output and records paths', () => {
    const g = new OutputGuard();
    const stream = [
      'Some preamble.\n\n',
      '--- src/App.tsx ---\n',
      '```tsx\nexport default function App() { return null; }\n```\n\n',
      '--- tailwind.config.ts ---\n',
      '```ts\nexport default {};\n```\n',
    ];
    for (const c of stream) expect(g.feed(c)).toEqual({ ok: true });
    expect(new Set(g.paths())).toEqual(new Set(['src/App.tsx', 'tailwind.config.ts']));
  });

  it('detects a path marker that straddles a chunk boundary', () => {
    const g = new OutputGuard();
    expect(g.feed('--- src/A')).toEqual({ ok: true });
    expect(g.feed('pp.tsx ---\n')).toEqual({ ok: true });
    expect(g.paths()).toContain('src/App.tsx');
  });

  it('rejects an absolute path mid-stream', () => {
    const g = new OutputGuard();
    expect(g.feed('preamble\n')).toEqual({ ok: true });
    const v = g.feed('--- /etc/passwd ---\n');
    expect(v.ok).toBe(false);
    if (!v.ok) {
      expect(v.code).toBe('GENERATION_FAILED');
      expect(v.detail).toBe('absolute_path');
    }
  });

  it('rejects a parent-traversal path mid-stream', () => {
    const g = new OutputGuard();
    const v = g.feed('--- ../etc/x.ts ---\n');
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.detail).toBe('parent_traversal');
  });

  it('rejects when total output exceeds MAX_OUTPUT_BYTES', () => {
    const g = new OutputGuard();
    const half = 'a'.repeat(Math.floor(MAX_OUTPUT_BYTES / 2));
    expect(g.feed(half)).toEqual({ ok: true });
    const v = g.feed(half + 'a'.repeat(100));
    expect(v.ok).toBe(false);
    if (!v.ok) {
      expect(v.code).toBe('PROVIDER_UNAVAILABLE');
      expect(v.detail).toMatch(/^bytes=/);
    }
  });

  it('does not double-count repeated path markers', () => {
    const g = new OutputGuard();
    g.feed('--- src/App.tsx ---\nbody1\n');
    g.feed('--- src/App.tsx ---\nbody2\n');
    expect(g.paths()).toEqual(['src/App.tsx']);
  });

  it('handles empty chunks safely', () => {
    const g = new OutputGuard();
    expect(g.feed('')).toEqual({ ok: true });
    expect(g.bytesSeen()).toBe(0);
  });
});
