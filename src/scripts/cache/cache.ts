import type {SAFE_ANY} from '@helpers/type';

import {existsSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';

import {resolve} from 'pathe';

import {oraExecCmd} from '../helpers';
import {CACHE_DIR, FALLBACK_CACHE_DIR} from '../path';

/**
 * Cache time-to-live in milliseconds (30 minutes)
 */
const CACHE_TTL_MS = 30 * 60_000;

/**
 * Global flag to disable caching
 */
let noCache = false;

/**
 * Directories tried in order when preparing the cache, the first writable one wins
 */
const CACHE_DIR_CANDIDATES = [...new Set([CACHE_DIR, FALLBACK_CACHE_DIR])];

/**
 * Resolved cache location, undefined until the cache has been prepared
 */
let cacheLocation: {dir: string; path: string} | undefined;

/**
 * Set once every candidate directory turned out to be unwritable
 */
let cacheUnavailable = false;

/**
 * Prepare the cache directory and data file.
 * @returns The cache location, or undefined when no writable location is available
 */
function ensureCache(): {dir: string; path: string} | undefined {
  if (cacheLocation || cacheUnavailable) {
    return cacheLocation;
  }

  for (const dir of CACHE_DIR_CANDIDATES) {
    const path = resolve(dir, 'data.json');

    try {
      if (!existsSync(dir)) {
        mkdirSync(dir, {recursive: true});
      }

      if (!existsSync(path)) {
        writeFileSync(path, JSON.stringify({}), 'utf8');
      }

      cacheLocation = {dir, path};

      return cacheLocation;
    } catch {
      // Try the next candidate, e.g. read-only filesystems under `yarn dlx`
    }
  }

  cacheUnavailable = true;

  return undefined;
}

/**
 * Structure of the cache data stored on disk
 */
export interface CacheData {
  [packageName: string]: {
    version: string;
    date: Date;
    formatDate: string;
    expiredDate: number;
    expiredFormatDate: string;
    execResult: SAFE_ANY;
  };
}

export function initCache(_noCache = noCache): void {
  noCache = Boolean(_noCache);

  ensureCache();
}

export function getCacheData(): CacheData {
  const cache = ensureCache();

  if (!cache) {
    return {};
  }

  try {
    return JSON.parse(readFileSync(cache.path, 'utf8'));
  } catch {
    return {};
  }
}

/**
 * Cache package data to disk with 30-minute expiration.
 * @param packageName - The package or cache key
 * @param packageData - The data to cache (version or execution result)
 * @param existingCache - Optional existing cache to update
 */
export function cacheData(
  packageName: string,
  packageData: {
    version?: string;
    execResult?: SAFE_ANY;
  },
  existingCache?: CacheData
): void {
  const cache = ensureCache();

  if (!cache) {
    return;
  }

  const data = existingCache ?? getCacheData();
  const now = new Date();
  const expiredDate = +now + CACHE_TTL_MS;

  data[packageName] = {
    ...(packageData as SAFE_ANY),
    date: now,
    expiredDate,
    expiredFormatDate: new Date(expiredDate).toString(),
    formatDate: now.toString()
  };

  try {
    writeFileSync(cache.path, JSON.stringify(data, undefined, 2), 'utf-8');
  } catch {
    // Caching is best-effort, never fail a command because the cache is unwritable
  }
}

export function removeCache() {
  for (const dir of CACHE_DIR_CANDIDATES) {
    rmSync(dir, {force: true, recursive: true});
  }

  cacheLocation = undefined;
  cacheUnavailable = false;
}

function now(): number {
  return Date.now();
}

/**
 * Check if a cached entry has expired.
 * @param packageName - The cache key to check
 * @param existingCache - Optional existing cache data
 * @returns True if expired or not found, false otherwise
 */
export function isExpired(packageName: string, existingCache?: CacheData): boolean {
  if (noCache) {
    return true;
  }

  const data = existingCache ?? getCacheData();
  const pkgData = data[packageName];

  if (!pkgData?.expiredDate) {
    return true;
  }

  return now() > pkgData.expiredDate;
}

/**
 * Get package version from cache or fetch from npm registry.
 * @param packageName - The npm package name
 * @returns Promise resolving to an object containing the version
 */
export async function getPackageVersion(packageName: string): Promise<{version: string}> {
  const data = getCacheData();
  const expired = isExpired(packageName, data);

  if (expired) {
    const version = await oraExecCmd(
      `npm view ${packageName} version`,
      `Fetching ${packageName} latest version`
    );

    const pkgVersion = {version};

    cacheData(packageName, pkgVersion, data);

    return pkgVersion;
  }

  return {version: data[packageName]!.version};
}

/**
 * Execute a command and cache the result, or return cached result if available.
 * @param key - The cache key (typically the command string)
 * @param execMessage - Optional message to display during execution
 * @returns Promise resolving to the cached or freshly executed result
 */
export async function getCacheExecData<T = SAFE_ANY>(
  key: string,
  execMessage?: string
): Promise<T> {
  const data = getCacheData();
  const expired = isExpired(key, data);

  if (expired) {
    const execResult = await oraExecCmd(key, execMessage);
    const result = {execResult};

    cacheData(key, result, data);

    return result.execResult as T;
  }

  return data[key]!.execResult as T;
}
