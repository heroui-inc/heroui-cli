import {execSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {cloneDocsFolder} from '@helpers/agents-docs/clone-docs';
import {beforeEach, describe, expect, it, vi} from 'vitest';

vi.mock('node:child_process', () => ({
  execSync: vi.fn()
}));

const DOCS_ROOT = path.join('apps', 'docs', 'content', 'docs', 'en');

function seedCheckout(cwd: string) {
  const reactDir = path.join(cwd, DOCS_ROOT, 'react');
  const nativeDir = path.join(cwd, DOCS_ROOT, 'native');
  const migrationDir = path.join(reactDir, 'migration');
  const workflowsDir = path.join(migrationDir, '(workflows)');
  const componentsDir = path.join(migrationDir, '(components)');
  const agentsDir = path.join(migrationDir, '(migration-for-agents)');
  const demosDir = path.join(cwd, 'apps', 'docs', 'src', 'demos');

  fs.mkdirSync(workflowsDir, {recursive: true});
  fs.mkdirSync(componentsDir, {recursive: true});
  fs.mkdirSync(agentsDir, {recursive: true});
  fs.mkdirSync(nativeDir, {recursive: true});
  fs.mkdirSync(demosDir, {recursive: true});
  fs.writeFileSync(path.join(reactDir, 'intro.mdx'), '# intro');
  fs.writeFileSync(path.join(nativeDir, 'intro.mdx'), '# native');
  fs.writeFileSync(path.join(demosDir, 'button.tsx'), 'export {}');
  fs.writeFileSync(
    path.join(migrationDir, 'hooks.mdx'),
    '<section id="usage">\nuse the hook\n</section>'
  );
  fs.writeFileSync(path.join(migrationDir, 'agent-index.mdx'), '# index');
  fs.writeFileSync(path.join(migrationDir, 'styling.mdx'), '# styling');
  fs.writeFileSync(
    path.join(workflowsDir, 'agent-guide.mdx'),
    'before <include>../hooks.mdx#usage</include> after'
  );
  fs.writeFileSync(path.join(workflowsDir, 'skip-me.mdx'), 'skip');
  fs.writeFileSync(path.join(componentsDir, 'button.mdx'), '# button');
  fs.writeFileSync(path.join(agentsDir, 'skill.mdx'), '# skill');
}

describe('cloneDocsFolder', () => {
  let dest = '';

  beforeEach(() => {
    dest = fs.mkdtempSync(path.join(os.tmpdir(), 'heroui-docs-dest-'));
    vi.mocked(execSync).mockReset();
  });

  it('copies react docs and demos after a sparse clone', async () => {
    const commands: string[] = [];

    vi.mocked(execSync).mockImplementation(((cmd: string, options?: {cwd?: string}) => {
      commands.push(cmd);
      if (cmd.includes('git clone') && options?.cwd) {
        seedCheckout(options.cwd);
      }

      return Buffer.from('');
    }) as typeof execSync);

    await cloneDocsFolder('v3', dest, 'react', true);

    expect(commands[0]).toContain('git@github.com:heroui-inc/heroui.git');
    expect(fs.readFileSync(path.join(dest, 'react', 'intro.mdx'), 'utf-8')).toBe('# intro');
    expect(fs.existsSync(path.join(dest, 'react', 'demos', 'button.tsx'))).toBe(true);
    fs.rmSync(dest, {force: true, recursive: true});
  });

  it('uses https when ssh is disabled', async () => {
    vi.mocked(execSync).mockImplementation(((cmd: string, options?: {cwd?: string}) => {
      if (cmd.includes('git clone') && options?.cwd) {
        seedCheckout(options.cwd);
      }

      return Buffer.from('');
    }) as typeof execSync);

    await cloneDocsFolder('v3', dest, 'native', false);

    expect(String(vi.mocked(execSync).mock.calls[0]?.[0])).toContain(
      'https://github.com/heroui-inc/heroui.git'
    );
    expect(fs.readFileSync(path.join(dest, 'native', 'intro.mdx'), 'utf-8')).toBe('# native');
    fs.rmSync(dest, {force: true, recursive: true});
  });

  it('resolves migration include tags and skips non-agent workflow files', async () => {
    vi.mocked(execSync).mockImplementation(((cmd: string, options?: {cwd?: string}) => {
      if (cmd.includes('git clone') && options?.cwd) {
        seedCheckout(options.cwd);
      }

      return Buffer.from('');
    }) as typeof execSync);

    await cloneDocsFolder('v3', dest, 'migration', false);

    const guide = fs.readFileSync(
      path.join(dest, 'migration', '(workflows)', 'agent-guide.mdx'),
      'utf-8'
    );

    expect(guide).toContain('use the hook');
    expect(guide).not.toContain('<include>');
    expect(fs.existsSync(path.join(dest, 'migration', '(workflows)', 'skip-me.mdx'))).toBe(false);
    expect(fs.existsSync(path.join(dest, 'migration', 'agent-index.mdx'))).toBe(true);
    expect(fs.existsSync(path.join(dest, 'migration', '(components)', 'button.mdx'))).toBe(true);
    expect(fs.existsSync(path.join(dest, 'migration', '(migration-for-agents)', 'skill.mdx'))).toBe(
      true
    );
    fs.rmSync(dest, {force: true, recursive: true});
  });

  it('explains a missing branch', async () => {
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('Remote branch v3 not found');
    });

    await expect(cloneDocsFolder('v3', dest, 'react', false)).rejects.toThrow(
      'Could not find documentation'
    );
    fs.rmSync(dest, {force: true, recursive: true});
  });

  it('explains a missing docs directory', async () => {
    vi.mocked(execSync).mockImplementation(() => Buffer.from(''));

    await expect(cloneDocsFolder('v3', dest, 'react', false)).rejects.toThrow(
      'Expected React docs'
    );
    await expect(cloneDocsFolder('v3', dest, 'native', false)).rejects.toThrow(
      'Expected Native docs'
    );
    await expect(cloneDocsFolder('v3', dest, 'migration', false)).rejects.toThrow(
      'Expected Migration docs'
    );
    fs.rmSync(dest, {force: true, recursive: true});
  });

  it('rethrows clone errors that are not a missing ref', async () => {
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('permission denied');
    });

    await expect(cloneDocsFolder('v3', dest, 'react', false)).rejects.toThrow('permission denied');
    fs.rmSync(dest, {force: true, recursive: true});
  });
});
