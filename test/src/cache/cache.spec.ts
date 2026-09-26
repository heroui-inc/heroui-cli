import {existsSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';

import {join, resolve, sep} from 'pathe';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

vi.mock('../../../src/scripts/helpers', () => ({
  oraExecCmd: vi.fn().mockResolvedValue('')
}));

let workspace: string;

/** Root of the installed package, which the cache must never be written into */
const PACKAGE_ROOT = resolve(__dirname, '../../..');

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

    expect(
      path.CACHE_DIR === PACKAGE_ROOT || path.CACHE_DIR.startsWith(`${PACKAGE_ROOT}${sep}`)
    ).toBe(false);
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

describe('cache contents', () => {
  it('prefers HEROUI_CACHE_DIR over XDG_CACHE_HOME', async () => {
    const cacheDir = join(workspace, 'custom-cache');
    const {path} = await importCache({
      HEROUI_CACHE_DIR: cacheDir,
      XDG_CACHE_HOME: join(workspace, 'xdg')
    });

    expect(path.CACHE_DIR).toBe(resolve(cacheDir));
  });

  it('skips reads and writes when caching is disabled', async () => {
    const {cache} = await importCache({HEROUI_CACHE_DIR: join(workspace, 'custom-cache')});

    cache.initCache(true);
    cache.cacheData('@heroui/react', {version: '3.0.0'});

    expect(cache.getCacheData()).toEqual({});
    expect(cache.isExpired('@heroui/react')).toBe(true);
  });

  it('treats a fresh entry as current and a past expiry as expired', async () => {
    const cacheDir = join(workspace, 'custom-cache');
    const {cache} = await importCache({HEROUI_CACHE_DIR: cacheDir});

    cache.initCache();
    cache.cacheData('@heroui/react', {version: '3.0.0'});

    expect(cache.isExpired('@heroui/react')).toBe(false);

    const data = cache.getCacheData();

    data['@heroui/react']!.expiredDate = Date.now() - 1;
    writeFileSync(join(cacheDir, 'data.json'), JSON.stringify(data), 'utf8');

    expect(cache.isExpired('@heroui/react')).toBe(true);
  });

  it('drops already expired entries when writing a new one', async () => {
    const cacheDir = join(workspace, 'custom-cache');
    const {cache} = await importCache({HEROUI_CACHE_DIR: cacheDir});

    cache.initCache();
    cache.cacheData('old', {version: '1.0.0'});

    const data = cache.getCacheData();

    data['old']!.expiredDate = Date.now() - 1;
    writeFileSync(join(cacheDir, 'data.json'), JSON.stringify(data), 'utf8');
    cache.cacheData('next', {version: '2.0.0'});

    const next = cache.getCacheData();

    expect(next['old']).toBeUndefined();
    expect(next['next']?.version).toBe('2.0.0');
  });

  it('returns an empty cache when the file is corrupt', async () => {
    const cacheDir = join(workspace, 'custom-cache');
    const {cache} = await importCache({HEROUI_CACHE_DIR: cacheDir});

    cache.initCache();
    writeFileSync(join(cacheDir, 'data.json'), '{', 'utf8');

    expect(cache.getCacheData()).toEqual({});
  });

  it('fetches a package version and then reuses it', async () => {
    const {cache} = await importCache({HEROUI_CACHE_DIR: join(workspace, 'custom-cache')});
    const {oraExecCmd} = await import('../../../src/scripts/helpers');

    vi.mocked(oraExecCmd).mockClear();
    cache.initCache();

    await expect(cache.getPackageVersion('@heroui/react')).resolves.toEqual({version: ''});
    await expect(cache.getPackageVersion('@heroui/react')).resolves.toEqual({version: ''});
    expect(oraExecCmd).toHaveBeenCalledTimes(1);
  });

  it('caches command output', async () => {
    const {cache} = await importCache({HEROUI_CACHE_DIR: join(workspace, 'custom-cache')});

    cache.initCache();

    await expect(cache.getCacheExecData('npm view heroui-cli version')).resolves.toBe('');
    await expect(cache.getCacheExecData('npm view heroui-cli version')).resolves.toBe('');
  });

  it('removes the stubbed cache directories', async () => {
    const cacheDir = join(workspace, 'custom-cache');
    const fallbackDir = join(workspace, 'fallback');
    const {cache} = await importCache({
      HEROUI_CACHE_DIR: cacheDir,
      TEMP: fallbackDir,
      TMP: fallbackDir,
      TMPDIR: fallbackDir
    });

    cache.initCache();
    cache.cacheData('@heroui/react', {version: '3.0.0'});
    cache.removeCache();

    expect(existsSync(cacheDir)).toBe(false);
  });
});
