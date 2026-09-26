import * as fs from 'node:fs';
import path from 'node:path';

import * as p from '@clack/prompts';
import {downloadTemplate} from '@helpers/fetch';
import {initAction} from 'src/actions/init-action';
import {ROOT} from 'src/constants/path';
import {selectClack, taskClack, textClack} from 'src/prompts/clack';
import {afterEach, describe, expect, it, vi} from 'vitest';

import {ExitError, installExitMock} from 'test/helpers/exit';

const fsState = vi.hoisted(() => ({
  existsSync: undefined as ((target: unknown) => boolean) | undefined,
  realExistsSync: undefined as ((target: unknown) => boolean) | undefined,
  realRenameSync: undefined as ((from: unknown, to: unknown) => void) | undefined,
  renameSync: undefined as ((from: unknown, to: unknown) => void) | undefined
}));

vi.mock('node:fs', async () => {
  const actual = (await vi.importActual('node:fs')) as {
    existsSync: (target: unknown) => boolean;
    renameSync: (from: unknown, to: unknown) => void;
  };

  fsState.realExistsSync = (target) => actual.existsSync(target);
  fsState.realRenameSync = (from, to) => actual.renameSync(from, to);

  return {
    ...actual,
    existsSync: (target: unknown) =>
      fsState.existsSync ? fsState.existsSync(target) : (fsState.realExistsSync?.(target) ?? false),
    renameSync: (from: unknown, to: unknown) => {
      if (fsState.renameSync) {
        fsState.renameSync(from, to);

        return;
      }

      fsState.realRenameSync?.(from, to);
    }
  };
});

vi.mock('@helpers/fetch', () => ({
  downloadTemplate: vi.fn(async () => undefined)
}));

vi.mock('src/prompts/clack', () => ({
  selectClack: vi.fn(),
  taskClack: vi.fn(async (opts: {task: Promise<unknown>}) => opts.task),
  textClack: vi.fn()
}));

vi.mock('@clack/prompts', () => ({
  cancel: vi.fn(),
  intro: vi.fn(),
  note: vi.fn(),
  outro: vi.fn()
}));

describe('initAction', () => {
  const created: string[] = [];

  afterEach(() => {
    vi.clearAllMocks();
    fsState.existsSync = undefined;
    fsState.renameSync = undefined;
    for (const dir of created.splice(0)) {
      fs.rmSync(dir, {force: true, recursive: true});
    }
  });

  function allowProject(projectName: string, extractDir: string) {
    const projectPath = path.join(ROOT, projectName);
    const extractPath = path.join(ROOT, extractDir);
    const exists = fsState.realExistsSync ?? ((target: unknown) => fs.existsSync(target as never));

    created.push(projectPath, extractPath);
    fsState.existsSync = (target) => {
      const value = String(target);

      if (value === projectPath || value === extractPath) {
        return false;
      }

      return exists(target);
    };
    fsState.renameSync = (_from, to) => {
      fs.mkdirSync(String(to), {recursive: true});
    };
  }

  it('rejects an empty, relative, or path-like project name', async () => {
    installExitMock();

    await expect(initAction('.', {package: 'pnpm', template: 'vite'})).rejects.toBeInstanceOf(
      ExitError
    );
    await expect(initAction('..', {package: 'pnpm', template: 'vite'})).rejects.toBeInstanceOf(
      ExitError
    );
    await expect(initAction('', {package: 'pnpm', template: 'vite'})).rejects.toBeInstanceOf(
      ExitError
    );
    await expect(
      initAction('nested/app', {package: 'pnpm', template: 'vite'})
    ).rejects.toBeInstanceOf(ExitError);
    expect(downloadTemplate).not.toHaveBeenCalled();
  });

  it('creates each template and enables the npm lockfile', async () => {
    installExitMock();
    const cases = [
      ['app', 'next-app-template-main'],
      ['pages', 'next-pages-template-main'],
      ['vite', 'vite-template-main'],
      ['react-router', 'react-router-template-main']
    ] as const;

    for (const [template, extractDir] of cases) {
      allowProject(`heroui-init-${template}`, extractDir);
      await expect(
        initAction(`heroui-init-${template}`, {package: 'pnpm', template})
      ).rejects.toMatchObject({code: 0});
      fsState.existsSync = undefined;
      fsState.renameSync = undefined;
    }

    expect(downloadTemplate).toHaveBeenCalledTimes(4);
    expect(p.outro).toHaveBeenCalled();
  });

  it('prompts for missing template, name, and package manager', async () => {
    installExitMock();
    vi.mocked(selectClack)
      .mockResolvedValueOnce('vite' as never)
      .mockResolvedValueOnce('bun' as never);
    vi.mocked(textClack).mockResolvedValueOnce('prompted-app' as never);
    allowProject('prompted-app', 'vite-template-main');

    await expect(initAction()).rejects.toMatchObject({code: 0});
    expect(selectClack).toHaveBeenCalled();
    expect(textClack).toHaveBeenCalled();
    expect(taskClack).toHaveBeenCalled();
  });

  it('exits when the project or extract directory already exists', async () => {
    installExitMock();
    const projectPath = path.join(ROOT, 'taken-app');

    created.push(projectPath);
    fs.mkdirSync(projectPath, {recursive: true});

    await expect(initAction('taken-app', {package: 'npm', template: 'app'})).rejects.toMatchObject({
      code: 1
    });

    fsState.existsSync = (target) => String(target).endsWith('next-app-template-main');
    await expect(initAction('fresh-app', {package: 'npm', template: 'app'})).rejects.toMatchObject({
      code: 1
    });
  });

  it('exits when renaming the template fails', async () => {
    installExitMock();
    allowProject('rename-fail', 'next-app-template-main');
    fsState.renameSync = () => {
      throw new Error('busy');
    };

    await expect(
      initAction('rename-fail', {package: 'npm', template: 'app'})
    ).rejects.toMatchObject({code: 1});
  });

  it('exits for an unknown template before downloading', async () => {
    installExitMock();

    await expect(
      initAction('bad-template', {package: 'npm', template: 'nope' as 'app'})
    ).rejects.toBeInstanceOf(ExitError);
    expect(downloadTemplate).not.toHaveBeenCalled();
  });
});
