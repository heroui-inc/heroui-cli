import type {UpgradeOption} from './upgrade-types';
import type {SAFE_ANY} from '@helpers/type';

import {getConditionVersion} from '@helpers/condition-value';
import {getColorVersion, getVersionAndMode} from '@helpers/utils';
import {HEROUI_PREFIX} from 'src/constants/required';
import {store} from 'src/constants/store';
import {compareVersions} from 'src/scripts/helpers';

export async function getLibsData(
  allDependencies: Record<string, SAFE_ANY>
): Promise<UpgradeOption[]> {
  const allDependenciesKeys = Object.keys(allDependencies);

  const allLibs = allDependenciesKeys.filter((dependency) => {
    return (
      !store.heroUIcomponentsPackages.includes(dependency) && dependency.startsWith(HEROUI_PREFIX)
    );
  });

  if (!allLibs.length) {
    return [];
  }

  const libsData: UpgradeOption[] = await Promise.all(
    allLibs.map(async (lib) => {
      const {currentVersion, versionMode} = getVersionAndMode(allDependencies, lib);
      const conditionVersion = await getConditionVersion(lib);
      const isLatest = compareVersions(currentVersion, conditionVersion) >= 0;

      return {
        isLatest,
        latestVersion: getColorVersion(
          currentVersion,
          isLatest ? currentVersion : conditionVersion
        ),
        package: lib,
        version: currentVersion,
        versionMode
      };
    })
  );

  return libsData;
}
