import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';

import {Logger} from '@helpers/logger';
import {listAction} from 'src/actions/list-action';
import {afterEach, describe, expect, it, vi} from 'vitest';

import {installExitMock} from 'test/helpers/exit';

const getCacheExecData = vi.hoisted(() => vi.fn(async () => 'docs'));
const getLatestVersion = vi.hoisted(() => vi.fn(async () => '3.2.0'));

vi.mock('src/scripts/cache/cache', () => ({
  getCacheExecData
}));

vi.mock('src/scripts/helpers', async () => {
  const actual = await vi.importActual('src/scripts/helpers');

  return {...actual, getLatestVersion};
});

describe('listAction', () => {
  let workspace = '';

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    getLatestVersion.mockResolvedValue('3.2.0');
    if (workspace) {
      rmSync(workspace, {force: true, recursive: true});
    }
  });

  function writePackage(pkg: unknown) {
    workspace = mkdtempSync(path.join(tmpdir(), 'heroui-list-'));
    const packagePath = path.join(workspace, 'package.json');

    writeFileSync(packagePath, JSON.stringify(pkg), 'utf-8');

    return packagePath;
  }

  it('warns when no HeroUI packages are installed', async () => {
    const warn = vi.spyOn(Logger, 'warn').mockImplementation(() => {});

    await expect(
      listAction({packagePath: writePackage({dependencies: {}})})
    ).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('No HeroUI packages'));
  });

  it('lists installed packages', async () => {
    installExitMock();

    await expect(
      listAction({
        packagePath: writePackage({dependencies: {'@heroui/react': '^3.0.0'}})
      })
    ).rejects.toMatchObject({code: 0});
  });

  it('exits when package details cannot be loaded', async () => {
    installExitMock();
    getLatestVersion.mockRejectedValue(new Error('offline'));
    const error = vi.spyOn(Logger, 'prefix').mockImplementation(() => {});

    await expect(
      listAction({
        packagePath: writePackage({dependencies: {'@heroui/react': '^3.0.0'}})
      })
    ).rejects.toMatchObject({code: 1});
    expect(error).toHaveBeenCalled();
  });
});
