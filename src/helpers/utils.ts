import type {Agent} from './detect';
import type {PascalCase, SAFE_ANY} from './type';

import chalk from 'chalk';
import {compareVersions} from 'compare-versions';
import fg, {type Options} from 'fast-glob';

import {ROOT} from 'src/constants/path';

import {Logger} from './logger';
import {colorMatchRegex} from './output-info';

export const versionModeRegex = /([\^~])/;

export function getCommandDescAndLog(log: string, desc: string) {
  Logger.gradient(log);

  return desc;
}

/**
 * Convert a string to PascalCase.
 * @example 'test-test' => 'TestTest'
 * @param str
 */
export function PasCalCase<T extends string>(str: T) {
  return str
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('') as PascalCase<T>;
}

/**
 * Find files by glob pattern.
 * @param glob
 * @param options
 */
export const findFiles = (glob: string, options?: Options) => {
  const file = fg.sync(glob, {
    absolute: true,
    cwd: ROOT,
    deep: 5,
    ignore: ['node_modules/**', 'dist/**', 'build/**', 'coverage/**', 'public/**', 'out/**'],
    onlyFiles: true,
    ...options
  });

  return file;
};

export function transformOption(options: boolean | 'false') {
  if (options === 'false') return false;

  return !!options;
}

export function omit(obj: Record<string, SAFE_ANY>, keys: string[]) {
  return Object.fromEntries(Object.entries(obj).filter(([key]) => !keys.includes(key)));
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
  const currentVersion = allDependencies[packageName].replace(versionModeRegex, '');
  const versionMode = allDependencies[packageName].match(versionModeRegex)?.[1] || '';

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
 * @example transformPeerVersion('>=1.0.0') // '1.0.0'
 * @example transformPeerVersion(">=11.5.6 || >=12.0.0-alpha.1") // 11.5.6
 * @param version
 */
export function transformPeerVersion(version: string, isLatest = false) {
  const ranges = version.split('||').map((r) => r.trim());
  const result = ranges
    .map((range) => {
      return range.replace(/^[<=>^~]+\s*/, '').trim();
    })
    .sort((a, b) => {
      if (isLatest) {
        return compareVersions(b, a);
      }

      return compareVersions(a, b);
    });

  return result[0]!;
}

export function fillAnsiLength(str: string, length: number) {
  const stripStr = str.replace(colorMatchRegex, '');
  const fillSpace = length - stripStr.length > 0 ? ' '.repeat(length - stripStr.length) : '';

  return `${str}${fillSpace}`;
}

export function strip(str: string) {
  return str.replace(colorMatchRegex, '');
}
