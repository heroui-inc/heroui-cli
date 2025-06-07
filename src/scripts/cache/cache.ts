import type {SAFE_ANY} from '@helpers/type';

import {existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync} from 'node:fs';

import {oraExecCmd} from '../helpers';
import {CACHE_DIR, CACHE_PATH} from '../path';

const cacheTTL = 30 * 60_000; // 30min
let noCache = false;

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

export function initCache(_noCache = noCache) {
  noCache = !!_noCache;

  const isExistCache = existsSync(CACHE_DIR);

  if (isExistCache) return;

  mkdirSync(CACHE_DIR, {recursive: true});
  writeFileSync(CACHE_PATH, JSON.stringify({}), 'utf8');
}

export function getCacheData(): CacheData {
  if (!existsSync(CACHE_DIR)) {
    initCache();
  }
  const data = readFileSync(CACHE_PATH, 'utf8');

  return JSON.parse(data);
}

/**
 * Used to cache unknown npm package expired time 30m
 * @packageName string
 */
export function cacheData(
  packageName: string,
  packageData: {
    version?: string;
    execResult?: SAFE_ANY;
  },
  cacheData?: CacheData
) {
  initCache();

  const data = cacheData ?? getCacheData();
  const now = new Date();
  const expiredDate = +now + cacheTTL;

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

function now() {
  return +new Date();
}

function ttl(n: number) {
  return now() - n;
}

export function isExpired(packageName: string, cacheData?: CacheData) {
  // If noCache then always return true
  if (noCache) return true;

  const data = cacheData ?? getCacheData();
  const pkgData = data[packageName];

  if (!pkgData?.expiredDate) return true;

  return ttl(pkgData.expiredDate) > 0;
}

export async function getPackageVersion(packageName: string) {
  const data = getCacheData();
  const isExpiredPkg = isExpired(packageName, data);

  // If expired or don't exist then init data
  if (isExpiredPkg) {
    const version = await oraExecCmd(
      `npm view ${packageName} version`,
      `Fetching ${packageName} latest version`
    );

    const pkgVersion = {version};

    cacheData(packageName, pkgVersion, data);

    return pkgVersion;
  }

  return data[packageName]!;
}

export async function getCacheExecData<T extends SAFE_ANY>(
  key: string,
  execMessage?: string
): Promise<T> {
  const data = getCacheData();
  const isExpiredPkg = isExpired(key, data);

  // If expired or don't exist then init data
  if (isExpiredPkg) {
    const execResult = await oraExecCmd(key, execMessage);

    const result = {execResult};

    cacheData(key, result, data);

    return result.execResult;
  }

  return data[key]!.execResult;
}
