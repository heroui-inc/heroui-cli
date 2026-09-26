import {Logger} from '@helpers/logger';
import {store} from 'src/constants/store';
import {
  handleParseError,
  handleUncaughtException,
  handleUnhandledRejection,
  runDefaultAction,
  runPreAction
} from 'src/program';
import {afterEach, describe, expect, it, vi} from 'vitest';

import {ExitError, installExitMock} from 'test/helpers/exit';

const getLatestVersion = vi.hoisted(() => vi.fn(async () => '9.0.0'));
const initCache = vi.hoisted(() => vi.fn());

vi.mock('src/scripts/helpers', () => ({
  compareVersions: (left = '', right = '') => {
    if (!left || !right || left === right) {
      return 0;
    }

    return left < right ? -1 : 1;
  },
  getLatestVersion
}));

vi.mock('src/scripts/cache/cache', () => ({
  initCache
}));

describe('cli program handlers', () => {
  const argv = process.argv;

  afterEach(() => {
    process.argv = argv;
    store.cliLatestVersion = '';
    store.debug = false;
    vi.clearAllMocks();
  });

  it('suggests a command and exits when the name is unknown', async () => {
    installExitMock();
    const error = vi.spyOn(Logger, 'error').mockImplementation(() => {});

    await expect(
      runDefaultAction({helpInformation: () => 'help'}, {args: ['instal']})
    ).rejects.toBeInstanceOf(ExitError);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('install'));
  });

  it('reports an unknown command with no close match', async () => {
    installExitMock();
    const error = vi.spyOn(Logger, 'error').mockImplementation(() => {});

    await expect(
      runDefaultAction({helpInformation: () => 'help'}, {args: ['zzzzzzzz']})
    ).rejects.toMatchObject({code: 1});
    expect(String(error.mock.calls[0]?.[0])).not.toContain('Did you mean');
  });

  it('prints colored help when no command was given', async () => {
    installExitMock();
    const log = vi.spyOn(Logger, 'log').mockImplementation(() => {});

    await expect(
      runDefaultAction({
        helpInformation: () => 'HeroUI CLI v1\n\ninit [name]\n'
      })
    ).rejects.toMatchObject({code: 0});
    expect(log.mock.calls.flat().join('\n')).toContain('init');
    expect(log.mock.calls.flat().join('\n')).not.toContain('HeroUI CLI v');
  });

  it('returns before touching the cache when no command name is present', async () => {
    await runPreAction({args: [], rawArgs: ['node', 'heroui']});

    expect(initCache).not.toHaveBeenCalled();
  });

  it('initializes cache and debug, then shows an upgrade notice', async () => {
    const log = vi.spyOn(Logger, 'log').mockImplementation(() => {});

    vi.spyOn(Logger, 'newLine').mockImplementation(() => {});
    await runPreAction({
      args: ['doctor'],
      rawArgs: ['node', 'heroui', 'doctor', '--no-cache', '-d']
    });

    expect(initCache).toHaveBeenCalledWith(true);
    expect(store.debug).toBe(true);
    expect(log).toHaveBeenCalled();
    expect(store.cliLatestVersion).toBe('9.0.0');
  });

  it('stops the upgrade lookup when the registry call fails', async () => {
    getLatestVersion.mockRejectedValueOnce(new Error('offline'));

    await expect(
      runPreAction({args: ['env'], rawArgs: ['node', 'heroui', 'env', '--debug']})
    ).resolves.toBeUndefined();
    expect(initCache).toHaveBeenCalledWith(false);
  });

  it('logs unhandled failures and exits', () => {
    installExitMock();
    vi.spyOn(Logger, 'error').mockImplementation(() => {});
    vi.spyOn(Logger, 'log').mockImplementation(() => {});
    vi.spyOn(Logger, 'newLine').mockImplementation(() => {});

    expect(() => handleUnhandledRejection(new Error('boom'))).toThrow(ExitError);
    expect(() => handleUnhandledRejection('boom')).toThrow(ExitError);
    expect(() => handleUncaughtException(new Error('crash'))).toThrow(ExitError);
  });

  it('reports a parse error and tracks agents-md when that command was used', async () => {
    installExitMock();
    process.argv = ['node', 'heroui', 'agents-md'];
    vi.spyOn(Logger, 'error').mockImplementation(() => {});
    vi.spyOn(Logger, 'log').mockImplementation(() => {});
    vi.spyOn(Logger, 'grey').mockImplementation(() => {});
    vi.spyOn(Logger, 'newLine').mockImplementation(() => {});

    await expect(handleParseError(new Error('parse'))).rejects.toBeInstanceOf(ExitError);

    process.argv = ['node', 'heroui', 'init'];
    await expect(handleParseError(new Error('parse'))).rejects.toBeInstanceOf(ExitError);
  });
});
