import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {cloneDocsFolder} from '@helpers/agents-docs/clone-docs';
import {pullDocs} from '@helpers/agents-docs/heroui-agents-md';
import {afterEach, describe, expect, it, vi} from 'vitest';

vi.mock('@helpers/agents-docs/clone-docs', () => ({
  cloneDocsFolder: vi.fn()
}));

describe('pullDocs', () => {
  let cwd = '';

  afterEach(() => {
    vi.mocked(cloneDocsFolder).mockReset();
    if (cwd && fs.existsSync(cwd)) {
      fs.rmSync(cwd, {recursive: true});
    }
  });

  it('clones the v3 docs branch into .heroui-docs', async () => {
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'heroui-pull-'));
    vi.mocked(cloneDocsFolder).mockResolvedValue();

    const result = await pullDocs({cwd, selection: 'react', useSsh: true});

    expect(result.success).toBe(true);
    expect(result.docsPath).toBe(path.join(cwd, '.heroui-docs'));
    expect(cloneDocsFolder).toHaveBeenCalledWith(
      'v3',
      path.join(cwd, '.heroui-docs'),
      'react',
      true
    );
  });

  it('honors a custom docs directory and defaults ssh to false', async () => {
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'heroui-pull-'));
    const docsDir = path.join(cwd, 'custom-docs');

    vi.mocked(cloneDocsFolder).mockResolvedValue();

    const result = await pullDocs({cwd, docsDir, selection: 'native'});

    expect(result.docsPath).toBe(docsDir);
    expect(cloneDocsFolder).toHaveBeenCalledWith('v3', docsDir, 'native', false);
  });

  it('returns a failure when the clone throws', async () => {
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'heroui-pull-'));
    vi.mocked(cloneDocsFolder).mockRejectedValueOnce(new Error('boom'));

    await expect(pullDocs({cwd, selection: 'migration'})).resolves.toEqual({
      error: 'boom',
      success: false
    });
  });

  it('stringifies a non-error failure', async () => {
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'heroui-pull-'));
    vi.mocked(cloneDocsFolder).mockRejectedValueOnce('offline');

    await expect(pullDocs({cwd, selection: 'react'})).resolves.toEqual({
      error: 'offline',
      success: false
    });
  });
});
