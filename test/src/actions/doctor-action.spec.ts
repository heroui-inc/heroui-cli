import {mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
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
  let peerDependencies: Record<string, string> = {};

  beforeEach(() => {
    Object.defineProperty(process.versions, 'node', {value: '22.22.0'});
  });

  afterEach(() => {
    Object.defineProperty(process.versions, 'node', nodeVersionDescriptor);
    store.json = false;
    vi.clearAllMocks();
    vi.restoreAllMocks();
    peerDependencies = {};
    if (workspace) {
      rmSync(workspace, {force: true, recursive: true});
    }
  });

  function writePackage(pkg: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  }) {
    if (workspace) rmSync(workspace, {force: true, recursive: true});
    workspace = mkdtempSync(path.join(tmpdir(), 'heroui-doctor-'));
    const packagePath = path.join(workspace, 'package.json');

    writeFileSync(packagePath, JSON.stringify(pkg), 'utf-8');
    for (const [name, version] of Object.entries({...pkg.devDependencies, ...pkg.dependencies})) {
      installPackage(name, {
        peerDependencies: name === '@heroui/react' ? peerDependencies : {},
        version: version.startsWith('^') || version.startsWith('~') ? version.slice(1) : version
      });
    }

    return packagePath;
  }

  function installPackage(name: string, manifest: Record<string, unknown>, root = workspace) {
    const directory = path.join(root, 'node_modules', name);

    mkdirSync(directory, {recursive: true});
    writeFileSync(
      path.join(directory, 'package.json'),
      JSON.stringify({
        exports: './index.js',
        name,
        ...manifest
      })
    );
    writeFileSync(path.join(directory, 'index.js'), '');
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
    peerDependencies = {react: '>=19.0.0', tailwindcss: '>=4.0.0'};
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
          dependencies: ['react (>=19.0.0, required by: @heroui/react)'],
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
    peerDependencies = {tailwindcss: '>=4.0.0'};
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
        dependencies: ['tailwindcss (>=4.0.0, required by: @heroui/react, installed: 3.0.0)'],
        level: 'error',
        name: 'incompatibleDependencies'
      }
    ]);
  });

  it('accepts automatically installed peers absent from package.json without registry requests', async () => {
    peerDependencies = {react: '^19.0.0'};
    const packagePath = writePackage({
      dependencies: {'@heroui/react': '3.0.0', '@heroui/styles': '3.0.0', tailwindcss: '^4.0.0'}
    });

    installPackage('react', {version: '19.2.0'});
    await expect(doctorAction({packagePath})).resolves.toBeUndefined();
    expect(getCacheExecData).not.toHaveBeenCalled();
  });

  it('ignores absent optional peers', async () => {
    const packagePath = writePackage({
      dependencies: {'@heroui/react': '3.0.0', '@heroui/styles': '3.0.0', tailwindcss: '^4.0.0'}
    });

    installPackage('@heroui/react', {
      peerDependencies: {react: '^19.0.0'},
      peerDependenciesMeta: {react: {optional: true}},
      version: '3.0.0'
    });
    await expect(doctorAction({packagePath})).resolves.toBeUndefined();
  });

  it.each(['18.3.0', '20.0.0'])(
    'reports installed optional peer %s outside the full range as incompatible',
    async (version) => {
      const packagePath = writePackage({
        dependencies: {'@heroui/react': '3.0.0', '@heroui/styles': '3.0.0', tailwindcss: '^4.0.0'}
      });

      installPackage('@heroui/react', {
        peerDependencies: {react: '>=19.0.0 <20.0.0'},
        peerDependenciesMeta: {react: {optional: true}},
        version: '3.0.0'
      });
      installPackage('react', {version});
      installExitMock();
      const log = vi.spyOn(Logger, 'log').mockImplementation(() => {});

      await expect(doctorAction({packagePath})).rejects.toMatchObject({code: 1});
      expect(log).toHaveBeenCalledWith(
        'Installed peer dependencies do not satisfy the required version ranges:'
      );
      expect(log).not.toHaveBeenCalledWith('You have not installed the required dependencies');
      expect(log.mock.calls.flat().join('\n')).toContain(`installed: ${version}`);
    }
  );

  it('accepts an installed version matching the second branch of a peer range', async () => {
    peerDependencies = {react: '^18.0.0 || ^19.0.0'};
    const packagePath = writePackage({
      dependencies: {
        '@heroui/react': '3.0.0',
        '@heroui/styles': '3.0.0',
        react: '^18.0.0',
        tailwindcss: '^4.0.0'
      }
    });

    installPackage('react', {version: '19.2.0'});
    await expect(doctorAction({packagePath})).resolves.toBeUndefined();
  });

  it('reports a declared but uninstalled peer as missing', async () => {
    peerDependencies = {react: '^19.0.0'};
    const packagePath = writePackage({
      dependencies: {
        '@heroui/react': '3.0.0',
        '@heroui/styles': '3.0.0',
        react: '^19.0.0',
        tailwindcss: '^4.0.0'
      }
    });

    rmSync(path.join(workspace, 'node_modules/react'), {recursive: true});
    installExitMock();
    const log = vi.spyOn(Logger, 'log').mockImplementation(() => {});

    await expect(doctorAction({packagePath})).rejects.toMatchObject({code: 1});
    expect(log).toHaveBeenCalledWith(
      'Required peer dependencies could not be resolved from the installed HeroUI packages:'
    );
  });

  it('checks every installed consumer when their peer ranges differ', async () => {
    peerDependencies = {react: '^19.0.0'};
    const packagePath = writePackage({
      dependencies: {
        '@heroui/react': '3.0.0',
        '@heroui/styles': '3.0.0',
        react: '19.2.0',
        tailwindcss: '^4.0.0'
      }
    });

    installPackage('@heroui/styles', {peerDependencies: {react: '^18.0.0'}, version: '3.0.0'});
    installExitMock();
    store.json = true;
    const read = captureStdout();

    await expect(doctorAction({packagePath})).rejects.toMatchObject({code: 1});
    expect(JSON.parse(read()).issues).toEqual([
      {
        dependencies: ['react (^18.0.0, required by: @heroui/styles, installed: 19.2.0)'],
        level: 'error',
        name: 'incompatibleDependencies'
      }
    ]);
  });

  it('resolves peers from the real location of a symlinked HeroUI package', async () => {
    const packagePath = writePackage({
      dependencies: {'@heroui/react': '3.0.0', '@heroui/styles': '3.0.0', react: '18.0.0'}
    });
    const virtualRoot = path.join(workspace, 'node_modules/.pnpm/heroui');

    installPackage(
      '@heroui/react',
      {peerDependencies: {react: '^19.0.0', tailwindcss: '^4.0.0'}, version: '3.0.0'},
      virtualRoot
    );
    installPackage('react', {version: '19.2.0'}, virtualRoot);
    installPackage('tailwindcss', {version: '4.0.0'}, virtualRoot);
    rmSync(path.join(workspace, 'node_modules/@heroui/react'), {recursive: true});
    symlinkSync(
      path.join(virtualRoot, 'node_modules/@heroui/react'),
      path.join(workspace, 'node_modules/@heroui/react')
    );
    await expect(doctorAction({packagePath})).resolves.toBeUndefined();
  });

  it('resolves hoisted packages relative to a supplied project directory', async () => {
    peerDependencies = {react: '^19.0.0'};
    writePackage({
      dependencies: {'@heroui/react': '3.0.0', '@heroui/styles': '3.0.0', tailwindcss: '^4.0.0'}
    });
    installPackage('react', {version: '19.2.0'});
    const project = path.join(workspace, 'apps/web');

    mkdirSync(project, {recursive: true});
    writeFileSync(
      path.join(project, 'package.json'),
      JSON.stringify({dependencies: {'@heroui/react': '3.0.0'}})
    );
    await expect(doctorAction({packagePath: project})).resolves.toBeUndefined();
  });

  it('does not treat declared HeroUI packages as installed', async () => {
    const packagePath = writePackage({dependencies: {'@heroui/react': '3.0.0'}});

    rmSync(path.join(workspace, 'node_modules'), {recursive: true});
    installExitMock();
    await expect(doctorAction({packagePath})).rejects.toMatchObject({code: 1});
  });

  it('uses singular grammar when one issue is found', async () => {
    installExitMock();
    peerDependencies = {react: '>=19.0.0'};
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
    peerDependencies = {react: '>=19.0.0'};
    const error = vi.spyOn(Logger, 'error').mockImplementation(() => {});

    await expect(
      doctorAction({
        packagePath: writePackage({
          dependencies: {'@heroui/react': '3.0.0', react: '18.0.0'}
        })
      })
    ).rejects.toMatchObject({code: 1});
    expect(error.mock.calls.flat().join('\n')).toContain('issues that require attention');

    peerDependencies = {react: '>=19.0.0'};
    await expect(
      doctorAction({
        packagePath: writePackage({
          dependencies: {'@heroui/react': '3.0.0', '@heroui/styles': '3.0.0', tailwindcss: '^4.0.0'}
        })
      })
    ).rejects.toMatchObject({code: 1});
  });
});
