import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';

import {join} from 'pathe';
import {afterEach, describe, expect, it, vi} from 'vitest';

const exec = vi.hoisted(() => vi.fn());

vi.mock('ora', () => ({
  default: () => ({
    start: vi.fn(),
    stop: vi.fn()
  })
}));

vi.mock('node:child_process', async () => {
  const actual = await vi.importActual('node:child_process');

  return {
    ...actual,
    exec
  };
});

describe('scripts/helpers', () => {
  let workspace = '';

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    if (workspace) {
      rmSync(workspace, {force: true, recursive: true});
    }
  });

  async function loadHelpers() {
    workspace = mkdtempSync(join(tmpdir(), 'heroui-helpers-'));
    vi.resetModules();
    vi.stubEnv('HEROUI_CACHE_DIR', join(workspace, 'cache'));
    vi.stubEnv('TMPDIR', join(workspace, 'tmp'));
    vi.stubEnv('TMP', join(workspace, 'tmp'));
    vi.stubEnv('TEMP', join(workspace, 'tmp'));

    return import('src/scripts/helpers');
  }

  it('orders semver and treats non-semver specs as equal', async () => {
    const {compareVersions} = await loadHelpers();

    expect(compareVersions('1.0.0', '1.0.1')).toBe(-1);
    expect(compareVersions('1.0.1', '1.0.0')).toBe(1);
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    expect(compareVersions('workspace:*', '1.0.0')).toBe(0);
    expect(compareVersions()).toBe(0);
  });

  it('runs a command behind a spinner and returns stdout', async () => {
    exec.mockImplementation(
      (_cmd: string, cb: (error: null, stdout: string, stderr: string) => void) => {
        cb(null, '9.9.9\n', '');
      }
    );
    const {getLatestVersion, oraExecCmd} = await loadHelpers();

    await expect(oraExecCmd('npm view heroui-cli version', 'Fetching')).resolves.toBe('9.9.9');
    await expect(getLatestVersion('heroui-cli')).resolves.toBe('9.9.9');
  });

  it('rejects when the command fails', async () => {
    exec.mockImplementation(
      (_cmd: string, cb: (error: Error, stdout: string, stderr: string) => void) => {
        cb(new Error('nope'), '', 'registry down');
      }
    );
    const {oraExecCmd} = await loadHelpers();

    await expect(oraExecCmd('npm view missing version')).rejects.toThrow('registry down');
  });

  it('uses the default spinner text when none is provided', async () => {
    exec.mockImplementation(
      (_cmd: string, cb: (error: null, stdout: string, stderr: string) => void) => {
        cb(null, 'ok\n', '');
      }
    );
    const {oraExecCmd} = await loadHelpers();

    await expect(oraExecCmd('echo ok')).resolves.toBe('ok');
  });
});
