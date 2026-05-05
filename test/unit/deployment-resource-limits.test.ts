import { applyResourceLimits } from '../../server/services/deployment-resource-limits';

describe('applyResourceLimits', () => {
  it('returns the raw command unchanged when no limits are passed', () => {
    expect(applyResourceLimits('npm start', undefined)).toBe('npm start');
  });

  it('wraps with ulimit -v when memoryMb > 0', () => {
    const wrapped = applyResourceLimits('npm start', { memoryMb: 512, niceLevel: 0 });
    expect(wrapped).toContain('ulimit -v 524288');
    // 0-or-default nice means we don't insert a `nice -n` wrapper.
    expect(wrapped).not.toMatch(/nice -n/);
    // exec keeps the child as PID 1 of the shell so signals route correctly.
    expect(wrapped).toContain('exec');
  });

  it('wraps with nice -n when niceLevel > 0', () => {
    const wrapped = applyResourceLimits('node app.js', { memoryMb: 0, niceLevel: 10 });
    expect(wrapped).toContain('nice -n 10');
    // niceLevel > 0 implies the start command is escaped through `sh -c`.
    expect(wrapped).toContain('"node app.js"');
    // No memory cap requested — no ulimit line.
    expect(wrapped).not.toContain('ulimit -v');
  });

  it('combines memory cap and nice level when both are set', () => {
    const wrapped = applyResourceLimits('npm run start:prod', { memoryMb: 2048, niceLevel: 5 });
    expect(wrapped).toContain('ulimit -v 2097152');
    expect(wrapped).toContain('nice -n 5');
    expect(wrapped).toContain('"npm run start:prod"');
  });

  it('falls through ulimit failure with `|| true` so the command still runs', () => {
    // The ulimit guard is best-effort: if the shell rejects it (e.g. macOS
    // limits already at hard cap), the wrapper should still launch.
    const wrapped = applyResourceLimits('npm start', { memoryMb: 100, niceLevel: 0 });
    expect(wrapped).toMatch(/ulimit -v \d+ 2>\/dev\/null \|\| true/);
  });

  it('escapes commands with quotes safely via JSON.stringify', () => {
    const wrapped = applyResourceLimits('echo "hi"', { memoryMb: 0, niceLevel: 1 });
    // JSON.stringify on a string with double-quotes produces \"hi\" so the
    // command can be safely passed inside another set of quotes.
    expect(wrapped).toContain('"echo \\"hi\\""');
  });
});
