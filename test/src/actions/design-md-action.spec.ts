import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {Logger} from '@helpers/logger';
import {Command} from 'commander';
import {designMdAction} from 'src/actions/docs-action';
import {registerCommands} from 'src/commands';
import {store} from 'src/constants/store';
import {getConfirm, getSelect} from 'src/prompts';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {ExitError, installExitMock} from 'test/helpers/exit';
import {captureStdout} from 'test/helpers/stdout';

vi.mock('src/prompts', () => ({
  getConfirm: vi.fn(),
  getSelect: vi.fn()
}));

const markdown = '\uFEFF# HeroUI design\r\n\r\nUse semantic tokens. 🎨\r\n';

describe('designMdAction', () => {
  let workspace: string;
  const fetchMock = vi.fn<typeof fetch>();
  const originalArgv = process.argv;
  const stdinTty = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
  const stdoutTty = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY');

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'heroui-design-md-test-'));
    vi.spyOn(process, 'cwd').mockReturnValue(workspace);
    Object.defineProperty(process.stdin, 'isTTY', {configurable: true, value: true});
    Object.defineProperty(process.stdout, 'isTTY', {configurable: true, value: true});
    installExitMock();
    vi.spyOn(Logger, 'log').mockImplementation(() => {});
    vi.spyOn(Logger, 'success').mockImplementation(() => {});
    vi.spyOn(Logger, 'prefix').mockImplementation(() => {});
    vi.mocked(getSelect).mockResolvedValue('react');
    fetchMock.mockImplementation(
      async () =>
        new Response(markdown, {headers: {'content-type': 'text/markdown; charset=utf-8'}})
    );
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    store.json = false;
    process.argv = originalArgv;
    if (stdinTty) Object.defineProperty(process.stdin, 'isTTY', stdinTty);
    else Reflect.deleteProperty(process.stdin, 'isTTY');
    if (stdoutTty) Object.defineProperty(process.stdout, 'isTTY', stdoutTty);
    else Reflect.deleteProperty(process.stdout, 'isTTY');
    vi.restoreAllMocks();
    vi.resetAllMocks();
    vi.unstubAllGlobals();
    fs.rmSync(workspace, {force: true, recursive: true});
  });

  function writePackage(dependencies: Record<string, string>, directory = workspace) {
    fs.mkdirSync(directory, {recursive: true});
    fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify({dependencies}));
  }

  function destination() {
    return path.join(workspace, 'DESIGN.md');
  }

  it.each(['react', 'native'] as const)(
    'downloads %s without installed packages',
    async (selection) => {
      await expect(designMdAction({[selection]: true})).rejects.toMatchObject({code: 0});
      expect(fetchMock).toHaveBeenCalledWith(`https://heroui.com/${selection}/DESIGN.md`);
      expect(fs.readFileSync(destination())).toEqual(Buffer.from(markdown));
      expect(fs.readdirSync(workspace)).toEqual(['DESIGN.md']);
      expect(getSelect).not.toHaveBeenCalled();
      expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('Follow [DESIGN.md]'));
    }
  );

  it.each([
    ['@heroui/react', 'react'],
    ['heroui-native', 'native']
  ])('detects %s', async (packageName, selection) => {
    writePackage({[packageName!]: '3.0.0'});
    store.json = true;
    captureStdout();

    await expect(designMdAction({})).rejects.toMatchObject({code: 0});
    expect(fetchMock).toHaveBeenCalledWith(`https://heroui.com/${selection}/DESIGN.md`);
    expect(getSelect).not.toHaveBeenCalled();
  });

  it('uses workspace detection', async () => {
    writePackage({});
    fs.writeFileSync(path.join(workspace, 'pnpm-workspace.yaml'), "packages:\n  - 'apps/*'\n");
    writePackage({'heroui-native': '1.0.0'}, path.join(workspace, 'apps', 'mobile'));

    await expect(designMdAction({})).rejects.toMatchObject({code: 0});
    expect(fetchMock).toHaveBeenCalledWith('https://heroui.com/native/DESIGN.md');
  });

  it.each([false, true])(
    'prompts when platform is ambiguous (both installed: %s)',
    async (both) => {
      if (both) writePackage({'@heroui/react': '3.0.0', 'heroui-native': '1.0.0'});
      vi.mocked(getSelect).mockResolvedValue('native');

      await expect(designMdAction({})).rejects.toMatchObject({code: 0});
      expect(getSelect).toHaveBeenCalledOnce();
      expect(fetchMock).toHaveBeenCalledWith('https://heroui.com/native/DESIGN.md');
    }
  );

  it.each(['json', 'non-interactive'])('rejects ambiguous selection in %s mode', async (mode) => {
    store.json = mode === 'json';
    Object.defineProperty(process.stdin, 'isTTY', {configurable: true, value: false});
    const read = captureStdout();

    await expect(designMdAction({})).rejects.toMatchObject({code: 1});
    expect(getSelect).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    if (mode === 'json') {
      expect(JSON.parse(read())).toMatchObject({command: 'design-md', ok: false});
      expect(JSON.parse(read()).error).toContain('--react or --native');
    }
  });

  it('rejects conflicting flags before downloading', async () => {
    await expect(designMdAction({native: true, react: true})).rejects.toMatchObject({code: 1});
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('cancels platform selection without writing', async () => {
    vi.mocked(getSelect).mockResolvedValue(undefined);

    await expect(designMdAction({})).rejects.toMatchObject({code: 0});
    expect(fetchMock).not.toHaveBeenCalled();
    expect(fs.readdirSync(workspace)).toEqual([]);
  });

  it('propagates prompt cancellation without reporting an error', async () => {
    vi.mocked(getSelect).mockRejectedValue(new ExitError(0));

    await expect(designMdAction({})).rejects.toMatchObject({code: 0});
    expect(Logger.prefix).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    'supports custom output and parent creation (absolute: %s)',
    async (absolute) => {
      const outputFile = path.join(workspace, 'docs', 'mobile.md');

      await expect(
        designMdAction({native: true, output: absolute ? outputFile : 'docs/mobile.md'})
      ).rejects.toMatchObject({code: 0});
      expect(fs.readFileSync(outputFile)).toEqual(Buffer.from(markdown));
      expect(fs.readdirSync(path.dirname(outputFile))).toEqual(['mobile.md']);
      expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('<docs/mobile.md>'));
    }
  );

  it.each(['interactive', 'json', 'non-interactive'])(
    'replaces without confirmation in %s mode',
    async (mode) => {
      fs.writeFileSync(destination(), 'custom rules');
      store.json = mode === 'json';
      Object.defineProperty(process.stdin, 'isTTY', {
        configurable: true,
        value: mode === 'interactive'
      });
      const read = captureStdout();

      await expect(designMdAction({react: true})).rejects.toMatchObject({code: 0});
      expect(fs.readFileSync(destination())).toEqual(Buffer.from(markdown));
      expect(fetchMock).toHaveBeenCalledOnce();
      expect(getConfirm).not.toHaveBeenCalled();
      expect(getSelect).not.toHaveBeenCalled();
      if (mode === 'json')
        expect(JSON.parse(read())).toMatchObject({command: 'design-md', ok: true});
    }
  );

  it('refreshes on every run and emits only one JSON result per run', async () => {
    store.json = true;
    const read = captureStdout();

    for (let run = 0; run < 2; run++) {
      await expect(designMdAction({react: true})).rejects.toMatchObject({code: 0});
    }
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(read()).toBe(
      `${JSON.stringify(
        {
          command: 'design-md',
          ok: true,
          outputFile: destination(),
          selection: 'react',
          sourceUrl: 'https://heroui.com/react/DESIGN.md'
        },
        null,
        2
      )}\n`.repeat(2)
    );
    expect(getConfirm).not.toHaveBeenCalled();
    expect(getSelect).not.toHaveBeenCalled();
    expect(Logger.log).not.toHaveBeenCalled();
    expect(Logger.success).not.toHaveBeenCalled();
  });

  it.each([
    ['HTTP', () => new Response('missing', {status: 404, statusText: 'Not Found'})],
    ['empty', () => new Response(' \n')],
    [
      'HTML header',
      () => new Response('<div>Error</div>', {headers: {'content-type': 'text/html'}})
    ],
    ['HTML body', () => new Response(' \n<!DOCTYPE html><html>Error</html>')],
    [
      'network',
      () => {
        throw new Error('offline');
      }
    ]
  ] as const)('preserves existing content after %s failure', async (_name, response) => {
    fs.writeFileSync(destination(), 'custom rules');
    store.json = true;
    const read = captureStdout();

    fetchMock.mockImplementation(async () => response());
    await expect(designMdAction({react: true})).rejects.toMatchObject({code: 1});
    expect(fs.readFileSync(destination(), 'utf-8')).toBe('custom rules');
    expect(fs.readdirSync(workspace)).toEqual(['DESIGN.md']);
    expect(JSON.parse(read())).toMatchObject({command: 'design-md', ok: false});
    expect(JSON.parse(read()).error).toContain('https://heroui.com/react/DESIGN.md');
    expect(Logger.log).not.toHaveBeenCalled();
    expect(Logger.prefix).not.toHaveBeenCalled();
  });

  it.each(['writeFileSync', 'renameSync'] as const)(
    'cleans staging after %s failure',
    async (operation) => {
      fs.writeFileSync(destination(), 'custom rules');
      vi.spyOn(fs, operation).mockImplementationOnce(() => {
        throw new Error('disk failure');
      });

      await expect(designMdAction({react: true})).rejects.toMatchObject({code: 1});
      expect(fs.readFileSync(destination(), 'utf-8')).toBe('custom rules');
      expect(fs.readdirSync(workspace)).toEqual(['DESIGN.md']);
    }
  );

  it('rejects a directory destination', async () => {
    fs.mkdirSync(destination());

    await expect(designMdAction({react: true})).rejects.toMatchObject({code: 1});
    expect(fetchMock).not.toHaveBeenCalled();
    expect(fs.statSync(destination()).isDirectory()).toBe(true);
  });

  it('rejects an empty output path', async () => {
    await expect(designMdAction({output: ' ', react: true})).rejects.toMatchObject({code: 1});
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('parses command options and returns the JSON result', async () => {
    process.argv = ['node', 'heroui', 'design-md', '--native', '--json'];
    const read = captureStdout();
    const program = new Command();

    registerCommands(program);
    await expect(program.parseAsync(process.argv)).rejects.toMatchObject({code: 0});
    expect(JSON.parse(read())).toMatchObject({
      command: 'design-md',
      ok: true,
      outputFile: destination(),
      selection: 'native'
    });
  });
});
