import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';

import {detect} from '@helpers/detect';
import {afterEach, describe, expect, it, vi} from 'vitest';

const getSelect = vi.hoisted(() => vi.fn(async () => 'yarn'));

vi.mock('src/prompts', () => ({
  getSelect
}));

describe('detect', () => {
  let workspace = '';

  afterEach(() => {
    if (workspace) {
      rmSync(workspace, {force: true, recursive: true});
      workspace = '';
    }
    getSelect.mockClear();
  });

  it('detects the package manager from a lockfile', async () => {
    workspace = mkdtempSync(path.join(tmpdir(), 'heroui-detect-'));
    writeFileSync(path.join(workspace, 'pnpm-lock.yaml'), '', 'utf-8');

    await expect(detect(workspace)).resolves.toBe('pnpm');
    expect(getSelect).not.toHaveBeenCalled();
  });

  it('asks for a package manager when no lockfile exists', async () => {
    workspace = mkdtempSync(path.join(tmpdir(), 'heroui-detect-'));

    await expect(detect(workspace)).resolves.toBe('yarn');
    expect(getSelect).toHaveBeenCalled();
  });
});
