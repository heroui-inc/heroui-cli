import type {Agent} from './detect';
import type {PascalCase, SAFE_ANY} from './type';

import chalk from 'chalk';
import {compareVersions} from 'compare-versions';

import {VERSION_MODE_GLOBAL_REGEX, VERSION_MODE_REGEX} from './constants';
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
  const spec = allDependencies[packageName];

  if (typeof spec !== 'string') {
    return {currentVersion: '', versionMode: ''};
  }

  const currentVersion = spec.replace(VERSION_MODE_GLOBAL_REGEX, '');
  const versionMode = spec.match(VERSION_MODE_REGEX)?.[1] || '';

  return {
    currentVersion,
    versionMode
  };
}

/**
 * Parse JSON produced by a subprocess. npm interleaves warnings, proxy errors
 * and `npm error` banners with its `--json` output, so a parse failure is an
 * expected runtime condition rather than a bug worth crashing over.
 */
export function safeJsonParse<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string' || !raw.trim()) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
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
