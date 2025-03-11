import type {RequiredKey, SAFE_ANY} from './type';

import chalk from 'chalk';

import {HERO_UI, THEME_UI} from 'src/constants/required';
import {store} from 'src/constants/store';
import {getCacheExecData} from 'src/scripts/cache/cache';
import {type Dependencies, compareVersions, getLatestVersion} from 'src/scripts/helpers';

import {Logger} from './logger';
import {colorMatchRegex, outputBox} from './output-info';
import {
  fillAnsiLength,
  getColorVersion,
  getVersionAndMode,
  isMajorUpdate,
  isMinorUpdate,
  strip,
  transformPeerVersion,
  versionModeRegex
} from './utils';

export interface UpgradeOption {
  package: string;
  version: string;
  latestVersion: string;
  isLatest: boolean;
  versionMode: string;
  peerDependencies?: Dependencies;
}

const DEFAULT_SPACE = ''.padEnd(7);

const MISSING = 'Missing';

interface Upgrade {
  isHeroUIAll: boolean;
  allDependencies?: Record<string, SAFE_ANY>;
  upgradeOptionList?: UpgradeOption[];
  all?: boolean;
}

type ExtractUpgrade<T extends Upgrade> = T extends {isHeroUIAll: infer U}
  ? U extends true
    ? RequiredKey<Upgrade, 'allDependencies' | 'all'>
    : RequiredKey<Upgrade, 'upgradeOptionList'>
  : T;

type MissingDepSetType = {
  name: string;
  version: string;
};

export async function upgrade<T extends Upgrade = Upgrade>(options: ExtractUpgrade<T>) {
  const {all, allDependencies, isHeroUIAll, upgradeOptionList} = options as Required<Upgrade>;
  let result: UpgradeOption[] = [];
  const missingDepSet = new Set<MissingDepSetType>();

  const allOutputData = await getAllOutputData(all, isHeroUIAll, allDependencies, missingDepSet);

  const transformUpgradeOptionList = upgradeOptionList.map((c) => ({
    ...c,
    latestVersion: getColorVersion(c.version, c.latestVersion)
  }));

  const upgradePeerList = await Promise.all(
    upgradeOptionList.map((upgradeOption) =>
      getPackagePeerDep(
        upgradeOption.package,
        allDependencies,
        missingDepSet,
        upgradeOption.peerDependencies
      )
    )
  );

  const missingDepList = await getPackageUpgradeData([...missingDepSet]);

  const outputList = [...transformUpgradeOptionList, ...allOutputData.allOutputList];
  const peerDepList = [
    ...upgradePeerList.flat(),
    ...allOutputData.allPeerDepList,
    ...missingDepList
  ].filter(
    (upgradeOption, index, arr) =>
      index === arr.findIndex((c) => c.package === upgradeOption.package)
  );

  // Output dependencies box
  outputDependencies(outputList, peerDepList);

  result = [...outputList, ...peerDepList].filter(
    (upgradeOption, index, arr) =>
      !upgradeOption.isLatest && index === arr.findIndex((c) => c.package === upgradeOption.package)
  );

  // Output upgrade count
  outputUpgradeCount(result);

  return result;
}

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
    for (const key in upgradeOption) {
      if (!Object.prototype.hasOwnProperty.call(upgradeOption, key) || !upgradeOption[key]) {
        continue;
      }

      if (key === 'version') {
        // Remove the duplicate character '^'
        upgradeOption[key] = upgradeOption[key].replace(versionModeRegex, '');
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
        )}${chalk.greenBright('latest').padStart(optionMaxLenMap.version)}${DEFAULT_SPACE}`
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

export async function getPackagePeerDep(
  packageName: string,
  allDependencies: Dependencies,
  missingDepList: Set<MissingDepSetType>,
  peerDependencies?: Dependencies
): Promise<UpgradeOption[]> {
  peerDependencies =
    peerDependencies ||
    JSON.parse(
      (await getCacheExecData(`npm show ${packageName} peerDependencies --json`)) as SAFE_ANY
    ) ||
    {};

  if (!peerDependencies || !Object.keys(peerDependencies).length) {
    return [];
  }

  const upgradeOptionList: UpgradeOption[] = [];

  for (const [peerPackage, peerVersion] of Object.entries(peerDependencies)) {
    if (upgradeOptionList.some((c) => c.package === peerPackage)) {
      // Avoid duplicate
      continue;
    }

    const currentVersion = allDependencies[peerPackage];
    let formatPeerVersion = transformPeerVersion(peerVersion);

    if (!currentVersion) {
      missingDepList.add({name: peerPackage, version: formatPeerVersion});
      continue;
    }
    const {versionMode} = getVersionAndMode(allDependencies, peerPackage);
    const isLatest = compareVersions(currentVersion, formatPeerVersion) >= 0;

    if (isLatest) {
      formatPeerVersion = transformPeerVersion(currentVersion);
    } else {
      // If the current version is not the latest version, then get the latest version in upgrade command
      formatPeerVersion = await getLatestVersion(peerPackage);
    }

    upgradeOptionList.push({
      isLatest,
      latestVersion: isLatest
        ? formatPeerVersion
        : getColorVersion(currentVersion, formatPeerVersion),
      package: peerPackage,
      version: currentVersion,
      versionMode
    });
  }

  return upgradeOptionList;
}

function outputDependencies(outputList: UpgradeOption[], peerDepList: UpgradeOption[]) {
  const componentName = outputList.length === 1 ? 'Component' : 'Components';
  const outputDefault = {
    components: {color: 'blue', text: '', title: chalk.blue(componentName)},
    peerDependencies: {color: 'yellow', text: '', title: chalk.yellow('PeerDependencies')}
  } as const;

  const outputInfo = getUpgradeVersion(outputList);
  const outputPeerDepInfo = getUpgradeVersion(peerDepList, true);
  const filterPeerDepList = peerDepList.filter((c) => !c.isLatest);

  outputInfo.length && outputBox({...outputDefault.components, text: outputInfo});
  Logger.newLine();
  filterPeerDepList.length &&
    Logger.log(
      chalk.gray(
        `Required min version: ${filterPeerDepList
          .map((c) => {
            return `${c.package}>=${c.latestVersion.replace(colorMatchRegex, '')}`;
          })
          .join(', ')}`
      )
    );
  outputPeerDepInfo.length &&
    outputBox({...outputDefault.peerDependencies, text: outputPeerDepInfo});
}

/**
 * Get all output data
 * @example
 * getAllOutputData(true, allDependencies, missingDepSet) --> {allOutputList: [], allPeerDepList: []}
 */
export async function getAllOutputData(
  all: boolean,
  isHeroUIAll: boolean,
  allDependencies: Record<string, SAFE_ANY>,
  missingDepSet: Set<MissingDepSetType>
) {
  if (!all || !isHeroUIAll) {
    return {
      allOutputList: [],
      allPeerDepList: []
    };
  }

  const latestVersion = store.latestVersion;

  const {currentVersion, versionMode} = getVersionAndMode(allDependencies, HERO_UI);
  const colorVersion = getColorVersion(currentVersion, latestVersion);
  const isLatest = compareVersions(currentVersion, latestVersion) >= 0;

  const heroUIPeerDepList = await getPackagePeerDep(HERO_UI, allDependencies, missingDepSet);
  const heroUIThemePeerDepList = await getPackagePeerDep(THEME_UI, allDependencies, missingDepSet);

  const allOutputList = [
    {
      isLatest,
      latestVersion: colorVersion,
      package: HERO_UI,
      version: currentVersion,
      versionMode
    }
  ];
  const allPeerDepList = [...heroUIPeerDepList, ...heroUIThemePeerDepList];
  const allOutputData = {
    allOutputList,
    allPeerDepList
  };

  return allOutputData;
}

export async function getPackageUpgradeData(missingDepList: MissingDepSetType[]) {
  const result: UpgradeOption[] = [];

  for (const missingDep of missingDepList) {
    const allOutputList = {
      isLatest: false,
      latestVersion: missingDep.version,
      package: missingDep.name,
      version: chalk.red(MISSING),
      versionMode: ''
    };

    result.push(allOutputList);
  }

  return result;
}

function outputUpgradeCount(outputList: UpgradeOption[]) {
  const count = {
    major: 0,
    minor: 0,
    patch: 0
  };

  for (const component of outputList) {
    if (component.version === MISSING) {
      count.major++;
      continue;
    }
    const stripLatestVersion = strip(component.latestVersion);

    if (isMajorUpdate(component.version, stripLatestVersion)) {
      count.major++;
    } else if (isMinorUpdate(component.version, stripLatestVersion)) {
      count.minor++;
    } else {
      count.patch++;
    }
  }

  const outputInfo = Object.entries(count)
    .reduce((acc, [key, value]) => {
      if (!value) {
        return acc;
      }

      return `${acc}${chalk.yellowBright(value)} ${key}, `;
    }, '')
    .replace(/, $/, '');

  if (outputInfo) {
    Logger.log(outputInfo);
    Logger.newLine();
  }

  return count;
}

export function writeUpgradeVersion({
  dependencies,
  devDependencies,
  upgradePackageList
}: {
  dependencies: Dependencies;
  devDependencies: Dependencies;
  upgradePackageList: UpgradeOption[];
}) {
  for (const upgradePackage of upgradePackageList) {
    const latestVersion = strip(upgradePackage.latestVersion);

    if (devDependencies[upgradePackage.package]) {
      devDependencies[upgradePackage.package] = latestVersion;
      continue;
    }
    dependencies[upgradePackage.package] = latestVersion;
  }
}
