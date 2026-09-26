import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';

import {changeNpmrc} from '@helpers/actions/init/change-npmrc';
import {afterEach, describe, expect, it} from 'vitest';

describe('changeNpmrc', () => {
  let workspace = '';

  afterEach(() => {
    if (workspace) {
      rmSync(workspace, {force: true, recursive: true});
    }
  });

  it('creates an npmrc that enables the package lock', () => {
    workspace = mkdtempSync(path.join(tmpdir(), 'heroui-npmrc-'));
    const file = path.join(workspace, '.npmrc');

    changeNpmrc(file);

    expect(readFileSync(file, 'utf-8')).toBe('package-lock=true\n');
  });

  it('replaces an existing package-lock setting', () => {
    workspace = mkdtempSync(path.join(tmpdir(), 'heroui-npmrc-'));
    const file = path.join(workspace, '.npmrc');

    writeFileSync(file, 'package-lock=false\nregistry=https://example.com\n', 'utf-8');
    changeNpmrc(file);

    expect(readFileSync(file, 'utf-8')).toBe('package-lock=true\nregistry=https://example.com\n');
  });

  it('inserts a newline before appending to a file that does not end with one', () => {
    workspace = mkdtempSync(path.join(tmpdir(), 'heroui-npmrc-'));
    const file = path.join(workspace, '.npmrc');

    writeFileSync(file, 'fund=false', 'utf-8');
    changeNpmrc(file);

    expect(readFileSync(file, 'utf-8')).toBe('fund=false\npackage-lock=true\n');
  });
});
