import type {SAFE_ANY} from '@helpers/type';

import {existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync} from 'node:fs';

import {oraExecCmd} from '../helpers';
import {CACHE_DIR, CACHE_PATH} from '../path';

/**
 * Cache time-to-live in milliseconds (30 minutes)
 */
const CACHE_TTL_MS = 30 * 60_000;

/**
 * Global flag to disable caching
 */
let noCache = false;

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

  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, {recursive: true});
  }

  if (!existsSync(CACHE_PATH)) {
    writeFileSync(CACHE_PATH, JSON.stringify({}), 'utf8');
  }
}

export function getCacheData(): CacheData {
  if (!existsSync(CACHE_DIR) || !existsSync(CACHE_PATH)) {
    initCache();
  }
  const data = readFileSync(CACHE_PATH, 'utf8');

  return JSON.parse(data);
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
  initCache();

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

  writeFileSync(CACHE_PATH, JSON.stringify(data, undefined, 2), 'utf-8');
}

export function removeCache() {
  unlinkSync(CACHE_DIR);
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
