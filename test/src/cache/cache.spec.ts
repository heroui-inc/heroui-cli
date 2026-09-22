import {existsSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';

import {join, resolve} from 'pathe';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

vi.mock('../../../src/scripts/helpers', () => ({
  oraExecCmd: vi.fn().mockResolvedValue('')
}));

let workspace: string;

/** A path that can never be created, `unwritable` is a file, not a directory */
function unwritablePath(): string {
  const file = join(workspace, 'unwritable');

  writeFileSync(file, '', 'utf8');

  return join(file, 'cache');
}

async function importCache(env: Record<string, string>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) {
    vi.stubEnv(key, value);
  }

  return {
    cache: await import('../../../src/scripts/cache/cache'),
    path: await import('../../../src/scripts/path')
  };
}

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'heroui-cli-cache-test-'));
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(workspace, {force: true, recursive: true});
});

describe('cache location', () => {
  it('stores the cache outside of the package directory', async () => {
    const {path} = await importCache({});

    expect(path.CACHE_DIR.startsWith(path.ROOT)).toBe(false);
  });

  it('honors HEROUI_CACHE_DIR', async () => {
    const cacheDir = join(workspace, 'custom-cache');
    const {cache, path} = await importCache({HEROUI_CACHE_DIR: cacheDir});

    cache.initCache();

    expect(path.CACHE_DIR).toBe(resolve(cacheDir));
    expect(existsSync(join(cacheDir, 'data.json'))).toBe(true);
  });

  it('honors XDG_CACHE_HOME', async () => {
    const xdgCacheHome = join(workspace, 'xdg');
    const {path} = await importCache({XDG_CACHE_HOME: xdgCacheHome});

    expect(path.CACHE_DIR).toBe(resolve(xdgCacheHome, 'heroui-cli'));
  });
});

describe('unwritable cache location', () => {
  it('falls back to the temporary directory', async () => {
    const fallbackDir = join(workspace, 'fallback');
    const {cache} = await importCache({
      HEROUI_CACHE_DIR: unwritablePath(),
      TEMP: fallbackDir,
      TMP: fallbackDir,
      TMPDIR: fallbackDir
    });

    cache.cacheData('@heroui/react', {version: '3.0.0'});

    expect(existsSync(join(fallbackDir, 'heroui-cli', 'data.json'))).toBe(true);
    expect(cache.getCacheData()['@heroui/react']?.version).toBe('3.0.0');
  });

  it('degrades to no caching when no location is writable', async () => {
    const unwritable = unwritablePath();
    const {cache} = await importCache({
      HEROUI_CACHE_DIR: unwritable,
      TEMP: unwritable,
      TMP: unwritable,
      TMPDIR: unwritable
    });

    expect(() => cache.initCache()).not.toThrow();
    expect(() => cache.cacheData('@heroui/react', {version: '3.0.0'})).not.toThrow();
    expect(cache.getCacheData()).toEqual({});
  });
});
