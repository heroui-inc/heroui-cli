import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';

import {exec} from '@helpers/exec';
import {confirmClack} from 'src/prompts/clack';
import {afterEach, describe, expect, it, vi} from 'vitest';

import {migrateAction} from '../../../packages/codemod/src/actions/migrate-action';
import {lintAffectedFiles} from '../../../packages/codemod/src/helpers/actions/lint-affected-files';
import {fetchPackageLatestVersion} from '../../../packages/codemod/src/helpers/https';
import {affectedFiles, store} from '../../../packages/codemod/src/helpers/store';

const detect = vi.hoisted(() => vi.fn(async () => 'pnpm' as const));

vi.mock('@helpers/detect', () => ({
  LOCKS: {'pnpm-lock.yaml': 'pnpm'},
  detect
}));

vi.mock('@helpers/exec', () => ({
  exec: vi.fn(async () => '')
}));

vi.mock('../../../packages/codemod/src/helpers/https', () => ({
  fetchPackageLatestVersion: vi.fn(async () => '2.6.0')
}));

vi.mock('../../../packages/codemod/src/helpers/actions/lint-affected-files', () => ({
  lintAffectedFiles: vi.fn(async () => undefined)
}));

vi.mock('src/prompts/clack', () => ({
  confirmClack: vi.fn(async () => true)
}));

vi.mock('@clack/prompts', () => ({
  intro: vi.fn(),
  log: {
    error: vi.fn(),
    info: vi.fn(),
    step: vi.fn()
  },
  note: vi.fn(),
  outro: vi.fn()
}));

describe('migrateAction', () => {
  const previous = process.cwd();
  let workspace = '';

  afterEach(() => {
    process.chdir(previous);
    for (const key of Object.keys(store)) {
      delete store[key];
    }
    affectedFiles.clear();
    vi.clearAllMocks();
    vi.mocked(confirmClack).mockResolvedValue(true as never);
    if (workspace) {
      rmSync(workspace, {force: true, recursive: true});
    }
  });

  function scaffold() {
    workspace = mkdtempSync(path.join(tmpdir(), 'heroui-migrate-'));
    process.chdir(workspace);
    writeFileSync(
      path.join(workspace, 'package.json'),
      JSON.stringify({
        dependencies: {'@nextui-org/react': '2.0.0'},
        devDependencies: {}
      }),
      'utf-8'
    );
    writeFileSync(
      path.join(workspace, 'app.tsx'),
      'import {NextUIProvider} from "@nextui-org/react";\nexport const view = <NextUIProvider></NextUIProvider>;\nconst color = "var(--nextui-primary)";\n',
      'utf-8'
    );
    writeFileSync(
      path.join(workspace, 'tailwind.config.ts'),
      'const {nextui} = require("@nextui-org/theme");\nexport default {plugins: [nextui()]};\n',
      'utf-8'
    );
    writeFileSync(
      path.join(workspace, '.npmrc'),
      '@nextui-org:registry=https://example.com\n',
      'utf-8'
    );
    writeFileSync(
      path.join(workspace, 'notes.ts'),
      'leftover @nextui-org text and nextui plugin\n',
      'utf-8'
    );
  }

  it('migrates a project when every step is confirmed', async () => {
    scaffold();

    await migrateAction();

    const pkg = JSON.parse(readFileSync(path.join(workspace, 'package.json'), 'utf-8'));

    expect(pkg.dependencies['@heroui/react']).toBe('2.6.0');
    expect(readFileSync(path.join(workspace, 'app.tsx'), 'utf-8')).toContain('@heroui/react');
    expect(readFileSync(path.join(workspace, '.npmrc'), 'utf-8')).toContain('@heroui');
    expect(fetchPackageLatestVersion).toHaveBeenCalled();
    expect(exec).toHaveBeenCalledWith('pnpm install');
    expect(lintAffectedFiles).toHaveBeenCalled();
  });

  it('skips work that is declined and a single codemod that does not match', async () => {
    scaffold();
    vi.mocked(confirmClack).mockResolvedValue(false as never);

    await migrateAction(undefined, {codemod: 'css-variables'});

    expect(readFileSync(path.join(workspace, 'package.json'), 'utf-8')).toContain(
      '@nextui-org/react'
    );
    expect(exec).not.toHaveBeenCalled();
  });

  it('formats affected files without asking when format is enabled', async () => {
    scaffold();
    const {initOptions} = await import('../../../packages/codemod/src/helpers/options');

    initOptions({format: true});
    vi.mocked(confirmClack).mockResolvedValue(false as never);
    await migrateAction();
    expect(lintAffectedFiles).toHaveBeenCalled();
    initOptions({format: false});
  });
});
