import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';

import {installAction} from 'src/actions/install-action';
import {afterEach, describe, expect, it, vi} from 'vitest';

import {ExitError, installExitMock} from 'test/helpers/exit';

const getCacheExecData = vi.hoisted(() =>
  vi.fn<(cmd: string) => Promise<string>>(async () => '{}')
);
const getLatestVersion = vi.hoisted(() => vi.fn(async () => '3.2.0'));
const getSelect = vi.hoisted(() => vi.fn(async () => true));
const detect = vi.hoisted(() => vi.fn(async () => 'pnpm' as const));
const exec = vi.hoisted(() => vi.fn(async () => ''));

vi.mock('src/scripts/cache/cache', () => ({
  getCacheExecData
}));

vi.mock('src/scripts/helpers', async () => {
  const actual = await vi.importActual('src/scripts/helpers');

  return {
    ...actual,
    getLatestVersion
  };
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

describe('installAction', () => {
  let workspace = '';

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    getSelect.mockResolvedValue(true);
    getCacheExecData.mockResolvedValue('{}');
    getLatestVersion.mockResolvedValue('3.2.0');
    if (workspace) {
      rmSync(workspace, {force: true, recursive: true});
    }
  });

  function writePackage(pkg: unknown) {
    workspace = mkdtempSync(path.join(tmpdir(), 'heroui-install-'));
    const packagePath = path.join(workspace, 'package.json');

    writeFileSync(packagePath, JSON.stringify(pkg), 'utf-8');

    return packagePath;
  }

  it('exits when both HeroUI packages are already installed', async () => {
    installExitMock();
    const packagePath = writePackage({
      dependencies: {'@heroui/react': '3.0.0', '@heroui/styles': '3.0.0'}
    });

    await expect(installAction({packagePath})).rejects.toMatchObject({code: 0});
    expect(exec).not.toHaveBeenCalled();
  });

  it('installs missing packages and peers after confirmation', async () => {
    installExitMock();
    getCacheExecData.mockImplementation(async (cmd: string) => {
      if (cmd.includes('peerDependencies')) {
        return JSON.stringify({react: '>=19.0.0'});
      }
      if (cmd.includes('homepage')) {
        return 'https://heroui.com';
      }
      if (cmd.includes('description')) {
        return 'components';
      }
      if (cmd.includes('version')) {
        return JSON.stringify('19.0.0');
      }

      return '{}';
    });
    const packagePath = writePackage({dependencies: {}});

    await expect(installAction({packagePath})).rejects.toBeInstanceOf(ExitError);
    expect(exec).toHaveBeenCalledWith('pnpm add @heroui/react @heroui/styles react@19.0.0');
  });

  it('stops when installation is declined', async () => {
    installExitMock();
    getSelect.mockResolvedValue(false);
    const packagePath = writePackage({dependencies: {}});

    await expect(installAction({packagePath})).rejects.toMatchObject({code: 0});
    expect(exec).not.toHaveBeenCalled();
  });
});
