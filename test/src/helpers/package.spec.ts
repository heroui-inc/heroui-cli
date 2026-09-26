import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';

import {getCompleteVersion, getPackageInfo, transformPackageDetail} from '@helpers/package';
import {strip} from '@helpers/utils';
import {afterEach, describe, expect, it, vi} from 'vitest';

import {ExitError, installExitMock} from 'test/helpers/exit';

vi.mock('src/scripts/cache/cache', () => ({
  getCacheExecData: vi.fn(async (cmd: string) => {
    if (String(cmd).includes('homepage')) {
      return 'https://heroui.com\n';
    }

    if (String(cmd).includes('description')) {
      return 'React components\n';
    }

    return '{}';
  })
}));

vi.mock('src/scripts/helpers', () => ({
  getLatestVersion: vi.fn(async () => '3.2.0')
}));

describe('package helpers', () => {
  let workspace = '';

  afterEach(() => {
    vi.restoreAllMocks();
    if (workspace) {
      rmSync(workspace, {force: true, recursive: true});
      workspace = '';
    }
  });

  function writePackage(pkg: unknown) {
    workspace = mkdtempSync(path.join(tmpdir(), 'heroui-pkg-'));
    writeFileSync(path.join(workspace, 'package.json'), JSON.stringify(pkg), 'utf-8');

    return path.join(workspace, 'package.json');
  }

  it('reads dependencies from a package.json file or its directory', () => {
    const packagePath = writePackage({
      dependencies: {'@heroui/react': '^3.0.0'},
      devDependencies: {typescript: '~5.0.0'}
    });

    const fromFile = getPackageInfo(packagePath);

    expect(fromFile.isAllComponents).toBe(true);
    expect(fromFile.allDependencies['@heroui/react']).toBe('^3.0.0');
    expect(fromFile.devDependencies.typescript).toBe('~5.0.0');

    const fromDir = getPackageInfo(workspace);

    expect(fromDir.packageJson.dependencies['@heroui/react']).toBe('^3.0.0');
  });

  it('exits when the path is missing or unreadable', () => {
    installExitMock();

    expect(() => getPackageInfo('')).toThrow(ExitError);
    expect(() => getPackageInfo(path.join(tmpdir(), 'missing-package.json'))).toThrow(ExitError);
  });

  it('loads docs, description, and the latest version for each component', async () => {
    const details = await transformPackageDetail(['@heroui/react'], {'@heroui/react': '^3.0.0'});

    expect(details[0]).toMatchObject({
      description: 'React components',
      docs: 'https://heroui.com',
      name: '@heroui/react',
      version: '3.0.0 new: 3.2.0',
      versionMode: '^'
    });

    const latestOnly = await transformPackageDetail(['@heroui/styles'], {}, false);

    expect(latestOnly[0]?.version).toBe('3.2.0');
  });

  it('joins the version mode and latest version', () => {
    expect(
      getCompleteVersion({
        isLatest: false,
        latestVersion: '1.2.3',
        package: '@heroui/react',
        version: '1.0.0',
        versionMode: '^'
      })
    ).toBe('^1.2.3');
    expect(
      strip(
        getCompleteVersion({
          isLatest: false,
          latestVersion: '\u001b[32m2.0.0\u001b[0m',
          package: '@heroui/react',
          version: '1.0.0',
          versionMode: ''
        })
      )
    ).toBe('2.0.0');
  });

  it('still reads a package when a parent directory check fails', () => {
    const packagePath = writePackage({dependencies: {}});
    const nested = path.join(workspace, 'nested');

    mkdirSync(nested);
    writeFileSync(
      path.join(nested, 'package.json'),
      JSON.stringify({dependencies: {react: '19.0.0'}})
    );

    expect(getPackageInfo(path.join(nested, 'package.json')).allDependencies.react).toBe('19.0.0');
    expect(packagePath).toContain('package.json');
  });
});
