import {mkdtempSync, readdirSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {Writable} from 'node:stream';

import {downloadTemplate} from '@helpers/fetch';
import {afterEach, describe, expect, it, vi} from 'vitest';

vi.mock('async-retry', () => ({
  default: async (fn: () => Promise<void>) => fn()
}));

const tarExtract = vi.hoisted(() => vi.fn());

vi.mock('tar', () => ({
  x: tarExtract
}));

describe('downloadTemplate', () => {
  let workspace = '';

  function successfulExtract() {
    tarExtract.mockImplementation(
      () =>
        new Writable({
          write(_chunk, _encoding, callback) {
            callback();
          }
        })
    );
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    tarExtract.mockReset();
    if (workspace) {
      rmSync(workspace, {force: true, recursive: true});
    }
  });

  it('extracts a successful response', async () => {
    successfulExtract();
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
    successfulExtract();
    workspace = mkdtempSync(path.join(tmpdir(), 'heroui-fetch-'));
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('nope', {status: 404, statusText: 'Not Found'}))
    );

    await expect(downloadTemplate(workspace, 'https://example.com/missing.tar.gz')).rejects.toThrow(
      '404'
    );
  });

  it('removes a partial extract when extraction fails', async () => {
    workspace = mkdtempSync(path.join(tmpdir(), 'heroui-fetch-'));
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('template', {status: 200, statusText: 'OK'}))
    );
    tarExtract.mockImplementation((options: {cwd: string}) => {
      writeFileSync(path.join(options.cwd, 'partial'), 'x');
      throw new Error('truncated');
    });

    await expect(downloadTemplate(workspace, 'https://example.com/broken.tar.gz')).rejects.toThrow(
      'truncated'
    );
    expect(readdirSync(workspace)).toEqual([]);
  });

  it('throws when the response has no body', async () => {
    successfulExtract();
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
