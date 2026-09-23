import type {UpgradeOption} from './actions/upgrade/upgrade-types';

import chalk from 'chalk';

import {VERSION_MODE_REGEX} from './constants';
import {colorMatchRegex} from './output-info';
import {fillAnsiLength} from './utils';

const DEFAULT_SPACE = ''.padEnd(7);

/**
 * Get upgrade version
 * @param upgradeOptionList
 * @param peer Use for peerDependencies change the latest to fulfillment
 */
export function getUpgradeVersion(upgradeOptionList: UpgradeOption[], peer = false) {
  if (!upgradeOptionList.length) {
    return '';
  }

  const output: string[] = [];

  const optionMaxLenMap = {
    latestVersion: 0,
    package: 0,
    version: 0
  };

  for (const upgradeOption of upgradeOptionList) {
    for (const key of Object.keys(optionMaxLenMap) as (keyof typeof optionMaxLenMap)[]) {
      const value = upgradeOption[key];

      if (!value) {
        continue;
      }

      if (key === 'version') {
        // Remove the duplicate character '^'
        upgradeOption[key] = value.replace(VERSION_MODE_REGEX, '');
      }

      const compareLength =
        key === 'version'
          ? upgradeOption[key].replace(colorMatchRegex, '').length
          : upgradeOption[key].length;

      optionMaxLenMap[key] = Math.max(optionMaxLenMap[key], compareLength);
    }
  }

  for (const upgradeOption of upgradeOptionList) {
    if (upgradeOption.isLatest) {
      if (peer) {
        // If it is peerDependencies, then skip output the latest version
        continue;
      }

      output.push(
        `  ${chalk.white(
          `${`${upgradeOption.package}@${upgradeOption.versionMode || ''}${
            upgradeOption.latestVersion
          }`.padEnd(optionMaxLenMap.package + DEFAULT_SPACE.length + DEFAULT_SPACE.length)}`
        )}${DEFAULT_SPACE}${chalk.greenBright('latest').padStart(optionMaxLenMap.version)}${DEFAULT_SPACE}`
      );
      continue;
    }
    output.push(
      `  ${chalk.white(
        `${upgradeOption.package.padEnd(
          optionMaxLenMap.package + DEFAULT_SPACE.length
        )}${DEFAULT_SPACE}${fillAnsiLength(
          `${upgradeOption.versionMode || ''}${upgradeOption.version}`,
          optionMaxLenMap.version
        )}  ->  ${upgradeOption.versionMode || ''}${upgradeOption.latestVersion}`
      )}${DEFAULT_SPACE}`
    );
  }

  return output.join('\n');
}
