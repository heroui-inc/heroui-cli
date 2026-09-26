import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';

import {envAction} from 'src/actions/env-action';
import {afterEach, describe, expect, it, vi} from 'vitest';

import {ExitError, installExitMock} from 'test/helpers/exit';

const getCacheExecData = vi.hoisted(() => vi.fn(async () => 'docs'));
const getLatestVersion = vi.hoisted(() => vi.fn(async () => '3.2.0'));

vi.mock('src/scripts/cache/cache', () => ({
  getCacheExecData
}));

vi.mock('src/scripts/helpers', async () => {
  const actual = await vi.importActual('src/scripts/helpers');

  return {...actual, getLatestVersion};
});

describe('envAction', () => {
  let workspace = '';

  afterEach(() => {
    vi.restoreAllMocks();
    if (workspace) {
      rmSync(workspace, {force: true, recursive: true});
    }
  });

  function writePackage(pkg: unknown) {
    workspace = mkdtempSync(path.join(tmpdir(), 'heroui-env-'));
    const packagePath = path.join(workspace, 'package.json');

    writeFileSync(packagePath, JSON.stringify(pkg), 'utf-8');

    return packagePath;
  }

  it('prints the environment with and without HeroUI packages', async () => {
    installExitMock();

    await expect(envAction({packagePath: writePackage({dependencies: {}})})).rejects.toBeInstanceOf(
      ExitError
    );
    await expect(
      envAction({
        packagePath: writePackage({dependencies: {'@heroui/styles': '3.0.0'}})
      })
    ).rejects.toMatchObject({code: 0});
  });
});
