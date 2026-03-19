import type {PartialKey, SAFE_ANY} from './type';

import {HERO_UI} from 'src/constants/required';
import {store} from 'src/constants/store';
import {compareVersions} from 'src/scripts/helpers';

import {getPackagePeerDep} from './upgrade';
import {strip} from './utils';

export type CheckType = 'all' | 'partial';

type CheckResult<T extends SAFE_ANY[] = SAFE_ANY[]> = [boolean, ...T];
interface CheckPeerDependenciesConfig {
  peerDependencies?: boolean;
  allDependencies?: Record<string, SAFE_ANY>;
  packageNames?: string[];
  beta?: boolean;
}

/**
 * Check if the required content is installed
 * @example return result and missing required [false, '@heroui/react', 'framer-motion']
 */
export async function checkRequiredContentInstalled<
  T extends CheckPeerDependenciesConfig = CheckPeerDependenciesConfig
>(
  type: CheckType,
  dependenciesKeys: Set<string>,
  checkPeerDependenciesConfig?: T extends {peerDependencies: infer P}
    ? P extends true
      ? PartialKey<Required<CheckPeerDependenciesConfig>, 'beta'>
      : T
    : T
): Promise<CheckResult> {
  const result = [] as unknown as CheckResult;
  const {allDependencies, beta, packageNames, peerDependencies} = (checkPeerDependenciesConfig ??
    {}) as Required<CheckPeerDependenciesConfig>;
  const peerDependenciesList: string[] = [];

  if (peerDependencies) {
    const peerDepList = await checkPeerDependencies({allDependencies, packageNames});

    peerDependenciesList.push(...peerDepList);
  }

  if (type === 'all') {
    const hasAllComponents = dependenciesKeys.has(HERO_UI);

    if (hasAllComponents && !peerDependenciesList.length) {
      return [true];
    }
    !hasAllComponents && result.push(beta ? `${HERO_UI}@${store.latestVersion}` : HERO_UI);
  }

  return [false, ...result, ...(peerDependencies ? peerDependenciesList : [])];
}

export async function checkPeerDependencies(
  config: Required<Pick<CheckPeerDependenciesConfig, 'allDependencies' | 'packageNames'>>
) {
  const {allDependencies, packageNames} = config;
  const peerDepList: string[] = [];

  for (const packageName of packageNames) {
    const result = await getPackagePeerDep(packageName, allDependencies, new Set());

    for (const peerData of result) {
      if (!peerData.isLatest) {
        const findPeerDepIndex = peerDepList.findIndex((peerDep) =>
          peerDep.includes(peerData.package)
        );
        const findPeerDep = strip(peerDepList[findPeerDepIndex] || '');
        const findPeerDepVersion = findPeerDep?.match(/@([\d.]+)/)?.[1];

        if (
          findPeerDepVersion &&
          compareVersions(findPeerDepVersion, strip(peerData.latestVersion)) <= 0
        ) {
          peerDepList.splice(findPeerDepIndex, 1);
        }
        peerDepList.push(`${peerData.package}@${peerData.latestVersion}`);
      }
    }
  }

  return peerDepList;
}
