import type {Agent} from './detect';
import type {PascalCase, SAFE_ANY} from './type';

import chalk from 'chalk';
import {compareVersions} from 'compare-versions';
import fg, {type Options} from 'fast-glob';

import {ROOT} from 'src/constants/path';

import {DEFAULT_FILE_IGNORE_PATTERNS, VERSION_MODE_REGEX} from './constants';
import {Logger} from './logger';
import {colorMatchRegex} from './output-info';

export function getCommandDescAndLog(log: string, desc: string) {
  Logger.gradient(log);

  return desc;
}

/**
 * Convert a kebab-case string to PascalCase.
 * @param str - The string to convert
 * @returns The PascalCase version of the string
 * @example
 * ```ts
 * PasCalCase('test-test') // 'TestTest'
 * PasCalCase('my-component') // 'MyComponent'
 * ```
 */
export function PasCalCase<T extends string>(str: T): PascalCase<T> {
  return str
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('') as PascalCase<T>;
}

/**
 * Find files by glob pattern with default ignore patterns.
 * @param glob - The glob pattern to match files
 * @param options - Additional fast-glob options
 * @returns Array of absolute file paths
 * @example
 * ```ts
 * findFiles('**\/*.ts')
 * findFiles('src/**\/*.tsx', { deep: 3 })
 * ```
 */
export const findFiles = (glob: string, options?: Options): string[] => {
  return fg.sync(glob, {
    absolute: true,
    cwd: ROOT,
    deep: 5,
    ignore: [...DEFAULT_FILE_IGNORE_PATTERNS],
    onlyFiles: true,
    ...options
  });
};

export function transformOption(options: boolean | 'false') {
  if (options === 'false') return false;

  return !!options;
}

export function omit<T extends Record<string, SAFE_ANY>>(obj: T, keys: string[]): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([key]) => !keys.includes(key))
  ) as Partial<T>;
}

export function getUpgradeType({
  major,
  minor,
  patch
}: {
  major: boolean;
  minor: boolean;
  patch: boolean;
}) {
  if (major) return 'major';
  if (minor) return 'minor';
  if (patch) return 'patch';

  return 'minor';
}

export function getColorVersion(currentVersion: string, latestVersion: string) {
  currentVersion = transformPeerVersion(currentVersion);
  latestVersion = transformPeerVersion(latestVersion);

  if (isMajorUpdate(currentVersion, latestVersion)) {
    return isMajorUpdate(currentVersion, latestVersion);
  } else if (isMinorUpdate(currentVersion, latestVersion)) {
    return isMinorUpdate(currentVersion, latestVersion);
  } else if (isPatchUpdate(currentVersion, latestVersion)) {
    return isPatchUpdate(currentVersion, latestVersion);
  }

  return latestVersion;
}

export function isMajorUpdate(currentVersion: string, latestVersion: string) {
  const currentVersionArr = currentVersion.split('.');
  const latestVersionArr = latestVersion.split('.');

  if (currentVersionArr[0] !== latestVersionArr[0]) {
    return chalk.redBright(latestVersionArr.join('.'));
  }

  return '';
}

export function isMinorUpdate(currentVersion: string, latestVersion: string) {
  const currentVersionArr = currentVersion.split('.');
  const latestVersionArr = latestVersion.split('.');

  if (currentVersionArr[1] !== latestVersionArr[1]) {
    return `${chalk.white(latestVersionArr[0])}${chalk.white('.')}${chalk.cyanBright(
      latestVersionArr.slice(1).join('.')
    )}`;
  }

  return '';
}

export function isPatchUpdate(currentVersion: string, latestVersion: string) {
  const currentVersionArr = currentVersion.split('.');
  const latestVersionArr = latestVersion.split('.');

  if (currentVersionArr[2] !== latestVersionArr[2]) {
    return `${chalk.white(latestVersionArr.slice(0, 2).join('.'))}${chalk.white(
      '.'
    )}${chalk.greenBright(latestVersionArr.slice(2).join('.'))}`;
  }

  return '';
}

export function getVersionAndMode(allDependencies: Record<string, SAFE_ANY>, packageName: string) {
  const currentVersion = allDependencies[packageName].replace(VERSION_MODE_REGEX, '');
  const versionMode = allDependencies[packageName].match(VERSION_MODE_REGEX)?.[1] || '';

  return {
    currentVersion,
    versionMode
  };
}

export function getPackageManagerInfo<T extends Agent = Agent>(packageManager: T) {
  const packageManagerInfo = {
    bun: {
      install: 'add',
      remove: 'remove',
      run: 'run'
    },
    npm: {
      install: 'install',
      remove: 'uninstall',
      run: 'run'
    },
    pnpm: {
      install: 'add',
      remove: 'remove',
      run: 'run'
    },
    yarn: {
      install: 'add',
      remove: 'remove',
      run: 'run'
    }
  } as const;

  return packageManagerInfo[packageManager] as (typeof packageManagerInfo)[T];
}

/**
 * Transform a peer dependency version string to a clean version number.
 * Handles complex version ranges and returns the appropriate version.
 * @param version - The version string to transform (e.g., '>=1.0.0', '>=11.5.6 || >=12.0.0-alpha.1')
 * @param isLatest - Whether to return the latest or earliest version from ranges
 * @returns The cleaned version string
 * @example
 * ```ts
 * transformPeerVersion('>=1.0.0') // '1.0.0'
 * transformPeerVersion('>=11.5.6 || >=12.0.0-alpha.1') // '11.5.6'
 * transformPeerVersion('>=11.5.6 || >=12.0.0', true) // '12.0.0'
 * ```
 */
export function transformPeerVersion(version: string, isLatest = false): string {
  const ranges = version.split('||').map((r) => r.trim());
  const result = ranges
    .map((range) => range.replace(/^[<=>^~]+\s*/, '').trim())
    .sort((a, b) => (isLatest ? compareVersions(b, a) : compareVersions(a, b)));

  return result[0] ?? version;
}

export function fillAnsiLength(str: string, length: number) {
  const stripStr = str.replace(colorMatchRegex, '');
  const fillSpace = length - stripStr.length > 0 ? ' '.repeat(length - stripStr.length) : '';

  return `${str}${fillSpace}`;
}

export function strip(str: string) {
  return str.replace(colorMatchRegex, '');
}
