import {homedir, tmpdir} from 'node:os';

import {resolve} from 'pathe';

const CACHE_DIR_NAME = 'heroui-cli';

/**
 * Resolve the per-user cache directory.
 *
 * The cache must never live next to the package itself, runners such as `yarn dlx` execute
 * the CLI from a read-only zip mount (Yarn PnP `ZipFS`), so writing there fails with `EROFS`.
 */
function resolveCacheDir(): string {
  const {HEROUI_CACHE_DIR, LOCALAPPDATA, XDG_CACHE_HOME} = process.env;

  if (HEROUI_CACHE_DIR) {
    return resolve(HEROUI_CACHE_DIR);
  }

  if (XDG_CACHE_HOME) {
    return resolve(XDG_CACHE_HOME, CACHE_DIR_NAME);
  }

  if (process.platform === 'win32' && LOCALAPPDATA) {
    return resolve(LOCALAPPDATA, CACHE_DIR_NAME, 'Cache');
  }

  const home = homedir();

  if (home) {
    return process.platform === 'darwin'
      ? resolve(home, 'Library/Caches', CACHE_DIR_NAME)
      : resolve(home, '.cache', CACHE_DIR_NAME);
  }

  return resolve(tmpdir(), CACHE_DIR_NAME);
}

export const CACHE_DIR = resolveCacheDir();

export const FALLBACK_CACHE_DIR = resolve(tmpdir(), CACHE_DIR_NAME);
