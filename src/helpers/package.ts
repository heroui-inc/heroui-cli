import type {UpgradeOption} from './actions/upgrade/upgrade-types';

import {readFileSync} from 'node:fs';

import {HEROUI_PREFIX, HERO_UI} from 'src/constants/required';
import {getCacheExecData} from 'src/scripts/cache/cache';
import {getLatestVersion} from 'src/scripts/helpers';

import {Logger} from './logger';
import {colorMatchRegex} from './output-info';
import {getVersionAndMode} from './utils';

export type PackageComponent = {
  name: string;
  package: string;
  version: string;
  docs: string;
  description: string;
  status: string;
  style: string;
  peerDependencies: Record<string, string>;
  versionMode: string;
};

/**
 * Get the package information
 * @param packagePath string
 */
export function getPackageInfo(packagePath: string) {
  let pkg;

  try {
    pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
  } catch (error) {
    Logger.prefix('error', `Error reading package.json file: ${packagePath} \nError: ${error}`);
  }

  const devDependencies = pkg.devDependencies || {};
  const dependencies = pkg.dependencies || {};
  const allDependencies = {...devDependencies, ...dependencies};
  const allDependenciesKeys = new Set(Object.keys(allDependencies));
  const isAllComponents = allDependenciesKeys.has(HERO_UI);

  return {
    allDependencies,
    allDependenciesKeys,
    dependencies,
    devDependencies,
    isAllComponents,
    packageJson: pkg
  };
}

/**
 * Get installed @heroui/* packages from package.json
 */
export function getInstalledHeroUIPackages(
  allDependencies: Record<string, string>
): PackageComponent[] {
  return Object.keys(allDependencies)
    .filter((dep) => dep.startsWith(HEROUI_PREFIX))
    .map((dep) => {
      const {currentVersion, versionMode} = getVersionAndMode(allDependencies, dep);

      return {
        description: '',
        docs: '',
        name: dep,
        package: dep,
        peerDependencies: {},
        status: 'stable',
        style: '',
        version: currentVersion,
        versionMode
      };
    });
}

/**
 * Get the package detail information
 * @param components need package name
 * @param allDependencies
 * @param transformVersion boolean
 */
export async function transformPackageDetail(
  components: string[],
  allDependencies: Record<string, string>,
  transformVersion = true
): Promise<PackageComponent[]> {
  const result: PackageComponent[] = [];

  for (const component of components) {
    let {currentVersion} = getVersionAndMode(allDependencies, component);
    const {versionMode} = getVersionAndMode(allDependencies, component);
    const docs = (
      ((await getCacheExecData(`npm show ${component} homepage`)) || '') as string
    ).replace(/\n/, '');
    const description = (
      ((await getCacheExecData(`npm show ${component} description`)) || '') as string
    ).replace(/\n/, '');
    const latestVersion = await getLatestVersion(component);

    currentVersion = transformVersion ? `${currentVersion} new: ${latestVersion}` : currentVersion;

    const detailPackageInfo: PackageComponent = {
      description: description || '',
      docs: docs || '',
      name: component,
      package: component,
      peerDependencies: {},
      status: 'stable',
      style: '',
      version: currentVersion,
      versionMode
    };

    result.push(detailPackageInfo);
  }

  return result;
}

/**
 * Get the complete version
 * @example getCompleteVersion({latestVersion: '1.0.0', versionMode: '^'}) --> '^1.0.0'
 */
export function getCompleteVersion(upgradeOption: UpgradeOption) {
  return `${upgradeOption.versionMode || ''}${upgradeOption.latestVersion.replace(
    colorMatchRegex,
    ''
  )}`;
}
