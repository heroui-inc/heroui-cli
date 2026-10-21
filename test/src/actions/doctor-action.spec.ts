import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';

import {Logger} from '@helpers/logger';
import {doctorAction} from 'src/actions/doctor-action';
import {store} from 'src/constants/store';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {installExitMock} from 'test/helpers/exit';
import {captureStdout} from 'test/helpers/stdout';

const nodeVersionDescriptor = Object.getOwnPropertyDescriptor(process.versions, 'node')!;

const getCacheExecData = vi.hoisted(() => vi.fn(async () => '{}'));

vi.mock('src/scripts/cache/cache', () => ({
  getCacheExecData
}));

describe('doctorAction', () => {
  let workspace = '';

  beforeEach(() => {
    Object.defineProperty(process.versions, 'node', {value: '22.22.0'});
  });

  afterEach(() => {
    Object.defineProperty(process.versions, 'node', nodeVersionDescriptor);
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
          dependencies: {'@heroui/react': '3.0.0', '@heroui/styles': '3.0.0', tailwindcss: '^4.0.0'}
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
          dependencies: {'@heroui/react': '3.0.0', '@heroui/styles': '3.0.0', tailwindcss: '^4.0.0'}
        })
      })
    ).resolves.toBeUndefined();
    expect(success).toHaveBeenCalledWith(expect.stringContaining('no detected issues'));
  });

  it.each(['18.20.0', '20.19.0', '22.0.0', '22.21.1'])(
    'reports unsupported Node.js %s with upgrade instructions',
    async (nodeVersion) => {
      Object.defineProperty(process.versions, 'node', {value: nodeVersion});
      installExitMock();
      const log = vi.spyOn(Logger, 'log').mockImplementation(() => {});

      await expect(
        doctorAction({
          packagePath: writePackage({
            dependencies: {
              '@heroui/react': '3.0.0',
              '@heroui/styles': '3.0.0',
              tailwindcss: '^4.0.0'
            }
          })
        })
      ).rejects.toMatchObject({code: 1});
      expect(log.mock.calls.flat().join('\n')).toContain(`Node.js v${nodeVersion}`);
      expect(log.mock.calls.flat().join('\n')).toContain('>=22.22.0');
      expect(log.mock.calls.flat().join('\n')).toContain('https://nodejs.org/');
    }
  );

  it.each(['22.22.0', '24.0.0', '26.0.0'])(
    'accepts Node.js %s and Tailwind in devDependencies',
    async (nodeVersion) => {
      Object.defineProperty(process.versions, 'node', {value: nodeVersion});
      const success = vi.spyOn(Logger, 'success').mockImplementation(() => {});

      await expect(
        doctorAction({
          packagePath: writePackage({
            dependencies: {'@heroui/react': '3.0.0', '@heroui/styles': '3.0.0'},
            devDependencies: {tailwindcss: '^4.0.0'}
          })
        })
      ).resolves.toBeUndefined();
      expect(success).toHaveBeenCalledWith(expect.stringContaining('no detected issues'));
    }
  );

  it('reports missing Tailwind with v4 installation instructions', async () => {
    installExitMock();
    const log = vi.spyOn(Logger, 'log').mockImplementation(() => {});

    await expect(
      doctorAction({
        packagePath: writePackage({
          dependencies: {'@heroui/react': '3.0.0', '@heroui/styles': '3.0.0'}
        })
      })
    ).rejects.toMatchObject({code: 1});
    expect(log).toHaveBeenCalledWith('Tailwind CSS is not installed.');
    expect(log).toHaveBeenCalledWith('HeroUI v3 requires Tailwind CSS v4.');
    expect(log).toHaveBeenCalledWith('Install it with: npm install tailwindcss@^4');
  });

  it('reports new diagnostics in JSON without duplicating missing Tailwind peers', async () => {
    Object.defineProperty(process.versions, 'node', {value: '20.19.0'});
    installExitMock();
    store.json = true;
    getCacheExecData.mockResolvedValue(JSON.stringify({react: '>=19.0.0', tailwindcss: '>=4.0.0'}));
    const read = captureStdout();

    await expect(
      doctorAction({
        packagePath: writePackage({
          dependencies: {'@heroui/react': '3.0.0', '@heroui/styles': '3.0.0'}
        })
      })
    ).rejects.toMatchObject({code: 1});
    expect(JSON.parse(read())).toEqual({
      command: 'doctor',
      issues: [
        {
          currentVersion: '20.19.0',
          level: 'error',
          name: 'unsupportedNodeVersion',
          requiredVersion: '>=22.22.0'
        },
        {level: 'error', name: 'missingTailwindCSS', packages: ['tailwindcss']},
        {
          dependencies: ['react (>=19.0.0)'],
          level: 'error',
          name: 'missingDependencies'
        }
      ],
      ok: false
    });
  });

  it('preserves peer version validation for installed Tailwind', async () => {
    installExitMock();
    store.json = true;
    getCacheExecData.mockResolvedValue(JSON.stringify({tailwindcss: '>=4.0.0'}));
    const read = captureStdout();

    await expect(
      doctorAction({
        packagePath: writePackage({
          dependencies: {'@heroui/react': '3.0.0', '@heroui/styles': '3.0.0', tailwindcss: '^3.0.0'}
        })
      })
    ).rejects.toMatchObject({code: 1});
    expect(JSON.parse(read()).issues).toEqual([
      {
        dependencies: ['tailwindcss (>=4.0.0, current: 3.0.0)'],
        level: 'error',
        name: 'missingDependencies'
      }
    ]);
  });

  it('uses singular grammar when one issue is found', async () => {
    installExitMock();
    getCacheExecData.mockResolvedValue(JSON.stringify({react: '>=19.0.0'}));
    const error = vi.spyOn(Logger, 'error').mockImplementation(() => {});

    await expect(
      doctorAction({
        packagePath: writePackage({
          dependencies: {'@heroui/react': '3.0.0', '@heroui/styles': '3.0.0', tailwindcss: '^4.0.0'}
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
          dependencies: {'@heroui/react': '3.0.0', '@heroui/styles': '3.0.0', tailwindcss: '^4.0.0'}
        })
      })
    ).rejects.toMatchObject({code: 1});
  });
});
