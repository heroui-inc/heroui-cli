import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';

import {Logger} from '@helpers/logger';
import {doctorAction} from 'src/actions/doctor-action';
import {store} from 'src/constants/store';
import {afterEach, describe, expect, it, vi} from 'vitest';

import {installExitMock} from 'test/helpers/exit';
import {captureStdout} from 'test/helpers/stdout';

const getCacheExecData = vi.hoisted(() => vi.fn(async () => '{}'));

vi.mock('src/scripts/cache/cache', () => ({
  getCacheExecData
}));

describe('doctorAction', () => {
  let workspace = '';

  afterEach(() => {
    store.json = false;
    vi.clearAllMocks();
    vi.restoreAllMocks();
    getCacheExecData.mockResolvedValue('{}');
    if (workspace) {
      rmSync(workspace, {force: true, recursive: true});
    }
  });

  function writePackage(pkg: unknown) {
    workspace = mkdtempSync(path.join(tmpdir(), 'heroui-doctor-'));
    const packagePath = path.join(workspace, 'package.json');

    writeFileSync(packagePath, JSON.stringify(pkg), 'utf-8');

    return packagePath;
  }

  it('fails when no HeroUI packages are installed', async () => {
    installExitMock();

    await expect(
      doctorAction({packagePath: writePackage({dependencies: {}})})
    ).rejects.toMatchObject({
      code: 1
    });
  });

  it('prints a healthy project as JSON', async () => {
    installExitMock();
    store.json = true;
    const read = captureStdout();

    await expect(
      doctorAction({
        packagePath: writePackage({
          dependencies: {'@heroui/react': '3.0.0', '@heroui/styles': '3.0.0'}
        })
      })
    ).rejects.toMatchObject({code: 0});
    expect(JSON.parse(read())).toEqual({
      command: 'doctor',
      issues: [],
      ok: true
    });
  });

  it('reports a healthy project', async () => {
    const success = vi.spyOn(Logger, 'success').mockImplementation(() => {});

    await expect(
      doctorAction({
        packagePath: writePackage({
          dependencies: {'@heroui/react': '3.0.0', '@heroui/styles': '3.0.0'}
        })
      })
    ).resolves.toBeUndefined();
    expect(success).toHaveBeenCalledWith(expect.stringContaining('no detected issues'));
  });

  it('uses singular grammar when one issue is found', async () => {
    installExitMock();
    getCacheExecData.mockResolvedValue(JSON.stringify({react: '>=19.0.0'}));
    const error = vi.spyOn(Logger, 'error').mockImplementation(() => {});

    await expect(
      doctorAction({
        packagePath: writePackage({
          dependencies: {'@heroui/react': '3.0.0', '@heroui/styles': '3.0.0'}
        })
      })
    ).rejects.toMatchObject({code: 1});
    expect(error.mock.calls.flat().join('\n')).toContain('requires attention');
  });

  it('fails when a package or peer dependency is missing or too old', async () => {
    installExitMock();
    getCacheExecData.mockResolvedValue(JSON.stringify({react: '>=19.0.0'}));
    const error = vi.spyOn(Logger, 'error').mockImplementation(() => {});

    await expect(
      doctorAction({
        packagePath: writePackage({
          dependencies: {'@heroui/react': '3.0.0', react: '18.0.0'}
        })
      })
    ).rejects.toMatchObject({code: 1});
    expect(error.mock.calls.flat().join('\n')).toContain('issues that require attention');

    getCacheExecData.mockResolvedValue(JSON.stringify({react: '>=19.0.0'}));
    await expect(
      doctorAction({
        packagePath: writePackage({
          dependencies: {'@heroui/react': '3.0.0', '@heroui/styles': '3.0.0'}
        })
      })
    ).rejects.toMatchObject({code: 1});
  });
});
