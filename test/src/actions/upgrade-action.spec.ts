import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';

import {Logger} from '@helpers/logger';
import {upgradeAction} from 'src/actions/upgrade-action';
import {store} from 'src/constants/store';
import {afterEach, describe, expect, it, vi} from 'vitest';

import {ExitError, installExitMock} from 'test/helpers/exit';
import {captureStdout} from 'test/helpers/stdout';

const getCacheExecData = vi.hoisted(() => vi.fn(async () => '{}'));
const getLatestVersion = vi.hoisted(() =>
  vi.fn<(pkg: string) => Promise<string>>(async () => '3.0.0')
);
const getSelect = vi.hoisted(() => vi.fn(async () => true));
const detect = vi.hoisted(() => vi.fn(async () => 'pnpm' as const));
const exec = vi.hoisted(() => vi.fn(async () => ''));

vi.mock('src/scripts/cache/cache', () => ({
  getCacheExecData
}));

vi.mock('src/scripts/helpers', async () => {
  const actual = await vi.importActual('src/scripts/helpers');

  return {...actual, getLatestVersion};
});

vi.mock('src/prompts', () => ({
  getSelect
}));

vi.mock('@helpers/detect', () => ({
  detect
}));

vi.mock('@helpers/exec', () => ({
  exec
}));

describe('upgradeAction', () => {
  let workspace = '';

  afterEach(() => {
    store.json = false;
    vi.clearAllMocks();
    vi.restoreAllMocks();
    getCacheExecData.mockResolvedValue('{}');
    getLatestVersion.mockResolvedValue('3.0.0');
    getSelect.mockResolvedValue(true);
    if (workspace) {
      rmSync(workspace, {force: true, recursive: true});
    }
  });

  function writePackage(pkg: unknown) {
    workspace = mkdtempSync(path.join(tmpdir(), 'heroui-upgrade-'));
    const packagePath = path.join(workspace, 'package.json');

    writeFileSync(packagePath, JSON.stringify(pkg), 'utf-8');

    return packagePath;
  }

  it('returns when no HeroUI packages are installed', async () => {
    const error = vi.spyOn(Logger, 'prefix').mockImplementation(() => {});

    await expect(
      upgradeAction({packagePath: writePackage({dependencies: {}})})
    ).resolves.toBeUndefined();
    expect(error).toHaveBeenCalled();
    expect(exec).not.toHaveBeenCalled();
  });

  it('exits when every package is current', async () => {
    installExitMock();

    await expect(
      upgradeAction({
        packagePath: writePackage({
          dependencies: {'@heroui/react': '3.0.0', '@heroui/styles': '3.0.0'}
        })
      })
    ).rejects.toMatchObject({code: 0});
    expect(exec).not.toHaveBeenCalled();
  });

  it('upgrades confirmed packages and outdated peers', async () => {
    installExitMock();
    getLatestVersion.mockImplementation(async (pkg: string) =>
      pkg === 'react' ? '19.0.0' : '4.0.0'
    );
    getCacheExecData.mockResolvedValue(JSON.stringify({react: '>=19.0.0'}));

    await expect(
      upgradeAction({
        packagePath: writePackage({
          dependencies: {'@heroui/react': '^3.0.0', '@heroui/styles': '^3.0.0', react: '18.0.0'}
        })
      })
    ).rejects.toBeInstanceOf(ExitError);
    expect(exec).toHaveBeenCalledWith(
      'pnpm add @heroui/react@4.0.0 @heroui/styles@4.0.0 react@19.0.0'
    );
  });

  it('prints upgraded packages as JSON', async () => {
    installExitMock();
    store.json = true;
    const read = captureStdout();

    getLatestVersion.mockImplementation(async (pkg: string) =>
      pkg === 'react' ? '19.0.0' : '4.0.0'
    );
    getCacheExecData.mockResolvedValue(JSON.stringify({react: '>=19.0.0'}));

    await expect(
      upgradeAction({
        packagePath: writePackage({
          dependencies: {'@heroui/react': '^3.0.0', '@heroui/styles': '^3.0.0', react: '18.0.0'}
        })
      })
    ).rejects.toMatchObject({code: 0});
    expect(JSON.parse(read())).toEqual({
      command: 'upgrade',
      ok: true,
      packages: [
        {from: '3.0.0', package: '@heroui/react', to: '4.0.0'},
        {from: '3.0.0', package: '@heroui/styles', to: '4.0.0'},
        {from: '18.0.0', package: 'react', to: '19.0.0'}
      ],
      upgraded: true
    });
  });

  it('stops when the upgrade is declined', async () => {
    installExitMock();
    getLatestVersion.mockResolvedValue('4.0.0');
    getSelect.mockResolvedValue(false);

    await expect(
      upgradeAction({
        packagePath: writePackage({dependencies: {'@heroui/react': '3.0.0'}})
      })
    ).rejects.toMatchObject({code: 0});
    expect(exec).not.toHaveBeenCalled();
  });
});
