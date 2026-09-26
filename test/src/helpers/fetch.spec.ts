import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {Writable} from 'node:stream';

import {downloadTemplate} from '@helpers/fetch';
import {afterEach, describe, expect, it, vi} from 'vitest';

vi.mock('async-retry', () => ({
  default: async (fn: () => Promise<void>) => fn()
}));

vi.mock('tar', () => ({
  x: () =>
    new Writable({
      write(_chunk, _encoding, callback) {
        callback();
      }
    })
}));

describe('downloadTemplate', () => {
  let workspace = '';

  afterEach(() => {
    vi.unstubAllGlobals();
    if (workspace) {
      rmSync(workspace, {force: true, recursive: true});
    }
  });

  it('extracts a successful response', async () => {
    workspace = mkdtempSync(path.join(tmpdir(), 'heroui-fetch-'));
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('template', {status: 200, statusText: 'OK'}))
    );

    await expect(
      downloadTemplate(workspace, 'https://example.com/template.tar.gz')
    ).resolves.toBeUndefined();
  });

  it('throws when the response is not ok', async () => {
    workspace = mkdtempSync(path.join(tmpdir(), 'heroui-fetch-'));
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('nope', {status: 404, statusText: 'Not Found'}))
    );

    await expect(downloadTemplate(workspace, 'https://example.com/missing.tar.gz')).rejects.toThrow(
      '404'
    );
  });

  it('throws when the response has no body', async () => {
    workspace = mkdtempSync(path.join(tmpdir(), 'heroui-fetch-'));
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        body: null,
        ok: true,
        status: 200,
        statusText: 'OK'
      }))
    );

    await expect(downloadTemplate(workspace, 'https://example.com/empty.tar.gz')).rejects.toThrow(
      'Failed to download'
    );
  });
});
