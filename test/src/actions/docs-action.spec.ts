import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {pullDocs} from '@helpers/agents-docs/heroui-agents-md';
import {docsAction} from 'src/actions/docs-action';
import {getConfirm, getSelect, getText} from 'src/prompts';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {ExitError, installExitMock} from 'test/helpers/exit';

vi.mock('@helpers/agents-docs/heroui-agents-md', async () => {
  const actual = await vi.importActual('@helpers/agents-docs/heroui-agents-md');

  return {
    ...actual,
    pullDocs: vi.fn(async ({docsDir, selection}: {docsDir: string; selection: string}) => {
      const folder = path.join(docsDir, selection);

      fs.mkdirSync(folder, {recursive: true});
      fs.writeFileSync(path.join(folder, 'intro.mdx'), '# intro');
      if (selection === 'react') {
        fs.mkdirSync(path.join(folder, 'demos'), {recursive: true});
        fs.writeFileSync(path.join(folder, 'demos', 'button.tsx'), 'export {}');
      }

      return {docsPath: docsDir, success: true};
    })
  };
});

vi.mock('src/prompts', () => ({
  getConfirm: vi.fn(async () => true),
  getSelect: vi.fn(),
  getText: vi.fn(async () => 'NOTES.md')
}));

describe('docsAction', () => {
  const previous = process.cwd();
  let workspace = '';

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'heroui-docs-action-'));
    process.chdir(workspace);
    vi.stubEnv('XDG_CONFIG_HOME', workspace);
    vi.mocked(getConfirm).mockResolvedValue(true);
    vi.mocked(getSelect).mockReset();
    vi.mocked(pullDocs).mockClear();
  });

  afterEach(() => {
    process.chdir(previous);
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    fs.rmSync(workspace, {force: true, recursive: true});
  });

  function writePackage(dependencies: Record<string, string>) {
    fs.writeFileSync(path.join(workspace, 'package.json'), JSON.stringify({dependencies}), 'utf-8');
  }

  it('rejects more than one library flag', async () => {
    installExitMock();

    await expect(docsAction({native: true, react: true})).rejects.toMatchObject({code: 1});
    expect(pullDocs).not.toHaveBeenCalled();
  });

  it('writes react docs when the project already meets the requirements', async () => {
    const exit = installExitMock();

    writePackage({'@heroui/react': '3.0.0', react: '19.0.0', tailwindcss: '4.0.0'});

    await expect(docsAction({output: 'AGENTS.md', react: true, ssh: true})).rejects.toBeInstanceOf(
      ExitError
    );
    expect(exit.mock.calls[0]?.[0]).toBe(0);
    expect(pullDocs).toHaveBeenCalledWith(
      expect.objectContaining({selection: 'react', useSsh: true})
    );
    expect(fs.readFileSync(path.join(workspace, 'AGENTS.md'), 'utf-8')).toContain(
      'HEROUI-REACT-AGENTS-MD-START'
    );
    expect(fs.readFileSync(path.join(workspace, '.gitignore'), 'utf-8')).toContain('.heroui-docs/');
  });

  it('stops when requirements are not accepted', async () => {
    const exit = installExitMock();

    writePackage({'@heroui/react': '2.0.0', react: '18.0.0', tailwindcss: '3.4.0'});
    vi.mocked(getConfirm).mockResolvedValue(false);

    await expect(docsAction({output: 'AGENTS.md', react: true})).rejects.toBeInstanceOf(ExitError);
    expect(exit.mock.calls[0]?.[0]).toBe(0);
    expect(pullDocs).not.toHaveBeenCalled();
  });

  it('exits when the docs download fails', async () => {
    installExitMock();
    writePackage({'@heroui/react': '3.0.0', react: '19.0.0'});
    vi.mocked(pullDocs).mockResolvedValueOnce({error: 'offline', success: false});

    await expect(docsAction({output: 'AGENTS.md', react: true})).rejects.toMatchObject({code: 1});
  });

  it('detects a single installed library', async () => {
    const exit = installExitMock();

    writePackage({'heroui-native': '1.0.0'});

    await expect(docsAction({output: 'AGENTS.md'})).rejects.toBeInstanceOf(ExitError);
    expect(exit.mock.calls[0]?.[0]).toBe(0);
    expect(pullDocs).toHaveBeenCalledWith(expect.objectContaining({selection: 'native'}));
  });

  it('prompts when neither library is installed', async () => {
    const exit = installExitMock();

    writePackage({react: '19.0.0'});
    vi.mocked(getSelect).mockResolvedValueOnce('migration').mockResolvedValueOnce('CLAUDE.md');

    await expect(docsAction({})).rejects.toBeInstanceOf(ExitError);
    expect(exit.mock.calls[0]?.[0]).toBe(0);
    expect(fs.existsSync(path.join(workspace, 'CLAUDE.md'))).toBe(true);
  });

  it('prompts when both libraries are installed and no output was given', async () => {
    const exit = installExitMock();

    writePackage({'@heroui/react': '3.0.0', 'heroui-native': '1.0.0', react: '19.0.0'});
    vi.mocked(getSelect).mockResolvedValueOnce('react').mockResolvedValueOnce('__both__');

    await expect(docsAction({})).rejects.toBeInstanceOf(ExitError);
    expect(exit.mock.calls[0]?.[0]).toBe(0);
    expect(fs.existsSync(path.join(workspace, 'AGENTS.md'))).toBe(true);
    expect(fs.existsSync(path.join(workspace, 'CLAUDE.md'))).toBe(true);
  });

  it('accepts a custom output path', async () => {
    const exit = installExitMock();

    writePackage({});
    vi.mocked(getSelect).mockResolvedValueOnce('native').mockResolvedValueOnce('__custom__');

    await expect(docsAction({})).rejects.toBeInstanceOf(ExitError);
    expect(exit.mock.calls[0]?.[0]).toBe(0);
    expect(getText).toHaveBeenCalled();
    expect(fs.existsSync(path.join(workspace, 'NOTES.md'))).toBe(true);
  });

  it('cancels when a prompt is dismissed', async () => {
    installExitMock();
    writePackage({});
    vi.mocked(getSelect).mockResolvedValueOnce(undefined);

    await expect(docsAction({})).rejects.toBeInstanceOf(ExitError);
  });

  it('continues a migration after confirmation', async () => {
    const exit = installExitMock();

    writePackage({});

    await expect(docsAction({migration: true, output: 'AGENTS.md'})).rejects.toBeInstanceOf(
      ExitError
    );
    expect(exit.mock.calls[0]?.[0]).toBe(0);
    expect(getConfirm).toHaveBeenCalled();
    expect(fs.readFileSync(path.join(workspace, 'AGENTS.md'), 'utf-8')).toContain(
      'HEROUI-MIGRATION-AGENTS-MD-START'
    );
  });
});
