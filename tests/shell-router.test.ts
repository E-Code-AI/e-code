import { describe, expect, it, vi } from 'vitest';

vi.mock('../server/storage', () => ({
  storage: {},
  sessionStore: { get: vi.fn() },
}));

vi.mock('../server/websocket/central-upgrade-dispatcher', () => ({
  centralUpgradeDispatcher: {
    register: vi.fn(),
  },
}));

const { handleShellClientMessage } = await import('../server/routes/shell');

describe('handleShellClientMessage', () => {
  it('writes terminal input payloads to the PTY', () => {
    const shell = {
      write: vi.fn(),
      resize: vi.fn(),
    };

    const result = handleShellClientMessage(
      JSON.stringify({ type: 'input', data: 'ls -la\n' }),
      shell
    );

    expect(result).toBe('input');
    expect(shell.write).toHaveBeenCalledWith('ls -la\n');
    expect(shell.resize).not.toHaveBeenCalled();
  });

  it('resizes the PTY for resize control messages', () => {
    const shell = {
      write: vi.fn(),
      resize: vi.fn(),
    };

    const result = handleShellClientMessage(
      JSON.stringify({ type: 'resize', cols: 120, rows: 40 }),
      shell
    );

    expect(result).toBe('resize');
    expect(shell.resize).toHaveBeenCalledWith(120, 40);
    expect(shell.write).not.toHaveBeenCalled();
  });

  it('falls back to raw writes for legacy non-JSON payloads', () => {
    const shell = {
      write: vi.fn(),
      resize: vi.fn(),
    };

    const result = handleShellClientMessage('pwd\n', shell);

    expect(result).toBe('raw');
    expect(shell.write).toHaveBeenCalledWith('pwd\n');
  });
});
