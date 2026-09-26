import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';

import {Logger} from '@helpers/logger';
import {afterEach, describe, expect, it, vi} from 'vitest';

import {ExitError, installExitMock} from 'test/helpers/exit';

import {resolver} from '../../../packages/codemod/src/constants/path';
import {lintAffectedFiles} from '../../../packages/codemod/src/helpers/actions/lint-affected-files';
import {
  createMultiProgressBar,
  createSingleProgressBar
} from '../../../packages/codemod/src/helpers/bar';
import {DEBUG} from '../../../packages/codemod/src/helpers/debug';
import {findFiles} from '../../../packages/codemod/src/helpers/find-files';
import {fetchPackageLatestVersion} from '../../../packages/codemod/src/helpers/https';
import {
  lintWithESLint,
  lintWithPrettier,
  tryLintFile
} from '../../../packages/codemod/src/helpers/lint';
import {
  getOptionsValue,
  initOptions,
  setOptionsValue
} from '../../../packages/codemod/src/helpers/options';
import {parseContent, safeParseJson} from '../../../packages/codemod/src/helpers/parse';
import {
  affectedFiles,
  getStore,
  store,
  storeParsedContent,
  storePathsRawContent,
  updateAffectedFiles,
  updateStore,
  writeFileAndUpdateStore
} from '../../../packages/codemod/src/helpers/store';
import {transformPaths} from '../../../packages/codemod/src/helpers/transform';
import {
  filterNextuiFiles,
  getCanRunCodemod,
  getInstallCommand
} from '../../../packages/codemod/src/helpers/utils';

const detect = vi.hoisted(() => vi.fn(async () => 'yarn' as const));

vi.mock('@helpers/detect', () => ({
  detect
}));

vi.mock('ora', () => ({
  default: () => ({
    start: vi.fn(),
    stop: vi.fn()
  })
}));

vi.mock('async-retry', () => ({
  default: async (fn: () => Promise<string>) => fn()
}));

vi.mock('eslint', () => ({
  ESLint: class {
    static outputFixes = vi.fn(async () => undefined);

    lintFiles = vi.fn(async () => [{filePath: 'a.ts'}]);
  }
}));

vi.mock('prettier', () => ({
  format: vi.fn(async (content: string) => `${content}\n`),
  resolveConfig: vi.fn(async () => ({}))
}));

describe('codemod helpers', () => {
  const previous = process.cwd();
  let workspace = '';

  afterEach(() => {
    process.chdir(previous);
    for (const key of Object.keys(store)) {
      delete store[key];
    }
    affectedFiles.clear();
    setOptionsValue('format', false);
    DEBUG.enabled = false;
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    if (workspace) {
      rmSync(workspace, {force: true, recursive: true});
    }
  });

  it('resolves globs and finds project files', async () => {
    workspace = mkdtempSync(path.join(tmpdir(), 'heroui-find-'));
    process.chdir(workspace);
    writeFileSync(path.join(workspace, 'app.ts'), 'export const value = 1;\n', 'utf-8');
    writeFileSync(path.join(workspace, 'note.json'), '{}\n', 'utf-8');

    expect(resolver('app.ts')).toBe(path.join(process.cwd(), 'app.ts'));
    expect(transformPaths()).toEqual([`${process.cwd()}/**/*`]);
    expect(transformPaths(['app.ts'])[0]).toBe(path.join(process.cwd(), 'app.ts') + '/**/*');

    const files = await findFiles([path.join(workspace, '**/*')]);

    expect(files.some((file) => file.endsWith('app.ts'))).toBe(true);
    const withExt = await findFiles([path.join(workspace, '**/*')], {ext: 'ts'});

    expect(withExt.every((file) => file.endsWith('.ts'))).toBe(true);
  });

  it('stores, parses, and writes file contents', () => {
    workspace = mkdtempSync(path.join(tmpdir(), 'heroui-store-'));
    const file = path.join(workspace, 'app.tsx');
    const broken = path.join(workspace, 'broken.ts');
    const json = path.join(workspace, 'package.json');

    writeFileSync(file, 'export const value = 1;\n', 'utf-8');
    writeFileSync(broken, 'const =', 'utf-8');
    writeFileSync(json, '{"name":"app"}', 'utf-8');
    storePathsRawContent([file, broken, json]);
    storeParsedContent([file]);

    expect(getStore(file, 'rawContent')).toContain('value');
    expect(getStore(file, 'parsedContent')?.toSource()).toContain('value');
    expect(parseContent(json)).toBeUndefined();
    expect(parseContent(broken)).toBeUndefined();
    DEBUG.enabled = true;
    vi.spyOn(Logger, 'warn').mockImplementation(() => {});
    expect(parseContent(broken)).toBeUndefined();
    expect(Logger.warn).toHaveBeenCalled();

    writeFileAndUpdateStore(file, 'rawContent', 'export const value = 2;\n');
    expect(getStore(file, 'rawContent')).toContain('2');
    updateAffectedFiles(file);
    expect(affectedFiles.has(file)).toBe(true);
    expect(safeParseJson('{"a":1}')).toEqual({a: 1});
    expect(safeParseJson('nope')).toEqual({});
  });

  it('exits when a stored path cannot be read', () => {
    installExitMock();

    expect(() => storePathsRawContent([path.join(tmpdir(), 'missing-codemod-file.ts')])).toThrow(
      ExitError
    );
  });

  it('tracks codemod options and which steps can run', async () => {
    initOptions({format: true});
    expect(getOptionsValue('format')).toBe(true);
    setOptionsValue('format', false);
    expect(getOptionsValue('format')).toBe(false);
    expect(getCanRunCodemod(undefined as unknown as 'npmrc', 'npmrc')).toBe(true);
    expect(getCanRunCodemod('npmrc', 'npmrc')).toBe(true);
    expect(getCanRunCodemod('npmrc', 'css-variables')).toBe(false);

    workspace = mkdtempSync(path.join(tmpdir(), 'heroui-filter-'));
    const file = path.join(workspace, 'app.ts');

    writeFileSync(file, 'import "@nextui-org/react";\n', 'utf-8');
    updateStore(file, 'rawContent', 'import "@nextui-org/react";\n');
    expect(filterNextuiFiles([file])).toEqual([file]);
    await expect(getInstallCommand()).resolves.toEqual({
      cmd: 'yarn install',
      packageManager: 'yarn'
    });
  });

  it('fetches the latest package version', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        json: async () => ({version: '9.9.9'}),
        ok: true
      }))
    );

    await expect(fetchPackageLatestVersion('@heroui/react')).resolves.toBe('9.9.9');

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('fetch failed');
      })
    );
    await expect(fetchPackageLatestVersion('@heroui/react')).rejects.toThrow('Connection failed');

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 500
      }))
    );
    await expect(fetchPackageLatestVersion('@heroui/react')).rejects.toThrow('status 500');
  });

  it('builds progress bars', () => {
    expect(createSingleProgressBar()).toBeTruthy();
    expect(createMultiProgressBar()).toBeTruthy();
  });

  it('lints with eslint or prettier when those packages resolve', async () => {
    workspace = mkdtempSync(path.join(tmpdir(), 'heroui-lint-'));
    const file = path.join(workspace, 'app.ts');

    writeFileSync(file, 'export const value = 1', 'utf-8');
    updateStore(file, 'rawContent', 'export const value = 1');
    updateAffectedFiles(file);

    await expect(lintWithESLint([file])).resolves.toEqual([{filePath: 'a.ts'}]);
    initOptions({format: true});
    await lintWithPrettier([file]);
    expect(getStore(file, 'rawContent')).toContain('export const value = 1');
    await tryLintFile([file]);
    setOptionsValue('format', false);
    await tryLintFile([file]);
    await lintAffectedFiles();
  });
});
