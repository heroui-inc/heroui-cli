import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';

import {uninstallAction} from 'src/actions/uninstall-action';
import {afterEach, describe, expect, it, vi} from 'vitest';

import {ExitError, installExitMock} from 'test/helpers/exit';

const getCacheExecData = vi.hoisted(() => vi.fn(async () => 'docs'));
const getLatestVersion = vi.hoisted(() => vi.fn(async () => '3.2.0'));
const getSelect = vi.hoisted(() => vi.fn(async () => true));
const detect = vi.hoisted(() => vi.fn(async () => 'npm' as const));
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

describe('uninstallAction', () => {
  let workspace = '';

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    getSelect.mockResolvedValue(true);
    if (workspace) {
      rmSync(workspace, {force: true, recursive: true});
    }
  });

  function writePackage(pkg: unknown) {
    workspace = mkdtempSync(path.join(tmpdir(), 'heroui-uninstall-'));
    const packagePath = path.join(workspace, 'package.json');

    writeFileSync(packagePath, JSON.stringify(pkg), 'utf-8');

    return packagePath;
  }

  it('exits when nothing is installed', async () => {
    installExitMock();

    await expect(
      uninstallAction({packagePath: writePackage({dependencies: {}})})
    ).rejects.toMatchObject({
      code: 0
    });
    expect(exec).not.toHaveBeenCalled();
  });

  it('uninstalls confirmed packages', async () => {
    installExitMock();

    await expect(
      uninstallAction({
        packagePath: writePackage({
          dependencies: {'@heroui/react': '3.0.0', '@heroui/styles': '3.0.0'}
        })
      })
    ).rejects.toBeInstanceOf(ExitError);
    expect(exec).toHaveBeenCalledWith('npm uninstall @heroui/react @heroui/styles');
  });

  it('stops when uninstallation is declined', async () => {
    installExitMock();
    getSelect.mockResolvedValue(false);

    await expect(
      uninstallAction({
        packagePath: writePackage({dependencies: {'@heroui/react': '3.0.0'}})
      })
    ).rejects.toMatchObject({code: 0});
    expect(exec).not.toHaveBeenCalled();
  });
});
