import type {AppendKeyValue} from '@helpers/type';

import fs from 'node:fs';

import {catchPnpmExec} from '@helpers/actions/upgrade/catch-pnpm-exec';
import {getBetaVersion} from '@helpers/beta';
import {checkIllegalComponents} from '@helpers/check';
import {detect} from '@helpers/detect';
import {exec} from '@helpers/exec';
import {Logger} from '@helpers/logger';
import {colorMatchRegex} from '@helpers/output-info';
import {getPackageInfo} from '@helpers/package';
import {setupPnpm} from '@helpers/setup';
import {upgrade, writeUpgradeVersion} from '@helpers/upgrade';
import {getColorVersion, getPackageManagerInfo, transformPeerVersion} from '@helpers/utils';
import {type HeroUIComponents} from 'src/constants/component';
import {resolver} from 'src/constants/path';
import {HERO_UI} from 'src/constants/required';
import {store} from 'src/constants/store';
import {getAutocompleteMultiselect, getMultiselect, getSelect} from 'src/prompts';
import {compareVersions, getLatestVersion} from 'src/scripts/helpers';

interface UpgradeActionOptions {
  packagePath?: string;
  all?: boolean;
  major?: boolean;
  minor?: boolean;
  patch?: boolean;
  write?: boolean;
  beta?: boolean;
}

type TransformComponent = Required<
  AppendKeyValue<HeroUIComponents[0], 'latestVersion', string> & {isLatest: boolean}
>;

function betaCompareVersions(version: string, latestVersion: string, beta: boolean) {
  // compareResult(beta, 2.1.0) = 0
  // So we need to check if it is autoChangeTag like `beta` or `canary` and latestVersion is not match `beta` or `canary` then return false
  // Example: `beta` Compare `2.1.0` (not latest), `beta` Compare `2.1.0-beta.0` (latest)
  const autoChangeTag = version.match(/(^\w+$)/)?.[1];

  if (autoChangeTag) {
    return latestVersion.includes(autoChangeTag);
  }

  const compareResult = compareVersions(version, latestVersion);

  // Beta version is greater than latest version if beta is true
  // compareResult(2.1.0, 2.1.0-beta.0) = 1
  // Example: 2.1.0 < 2.1.0-beta.0
  return beta && compareResult === 1 && !version.includes('beta') ? false : compareResult >= 0;
}

export async function upgradeAction(components: string[], options: UpgradeActionOptions) {
  const {
    all = false,
    beta = false,
    packagePath = resolver('package.json'),
    write = false
  } = options;
  const {allDependencies, currentComponents, dependencies, devDependencies, packageJson} =
    getPackageInfo(packagePath, false);

  const isHeroUIAll = !!allDependencies[HERO_UI];

  const transformComponents: TransformComponent[] = [];

  await Promise.all(
    currentComponents.map(async (component) => {
      const latestVersion =
        store.heroUIComponentsMap[component.name]?.version ||
        (await getLatestVersion(component.package));
      const mergedVersion = beta ? await getBetaVersion(component.package) : latestVersion;
      const compareResult = betaCompareVersions(component.version, mergedVersion, beta);

      transformComponents.push({
        ...component,
        isLatest: compareResult,
        latestVersion: mergedVersion
      });
    })
  );

  // If no Installed HeroUI components then exit
  if (!transformComponents.length && !isHeroUIAll) {
    Logger.prefix('error', `No HeroUI components detected in your package.json at: ${packagePath}`);

    return;
  }

  if (all) {
    components = currentComponents.map((component) => component.package);
  } else if (!components.length) {
    // If have the main heroui then add
    if (isHeroUIAll) {
      const herouiData = {
        isLatest:
          compareVersions(store.latestVersion, transformPeerVersion(allDependencies[HERO_UI])) <= 0,
        latestVersion: store.latestVersion,
        package: HERO_UI,
        version: transformPeerVersion(allDependencies[HERO_UI])
      } as TransformComponent;

      transformComponents.push(herouiData);
    }

    // If all package is latest then pass
    if (transformComponents.every((component) => component.isLatest)) {
      Logger.success('✅ All HeroUI packages are up to date');
      process.exit(0);
    }

    components = await getAutocompleteMultiselect(
      'Select the components to upgrade',
      transformComponents.map((component) => {
        const isUpToDate = betaCompareVersions(component.version, component.latestVersion, beta);

        return {
          disabled: isUpToDate,
          disabledMessage: 'Already up to date',
          title: `${component.package}${
            isUpToDate
              ? ''
              : `@${component.version} -> ${getColorVersion(
                  component.version,
                  component.latestVersion
                )}`
          }`,
          value: component.package
        };
      })
    );
  } else {
    // Check if the components are valid
    if (!checkIllegalComponents(components)) {
      return;
    }
  }

  components = components.map((c) => {
    if (store.heroUIComponentsMap[c]?.package) {
      return store.heroUIComponentsMap[c]!.package;
    }

    return c;
  });

  /** ======================== Upgrade ======================== */
  const upgradeOptionList = transformComponents.filter((c) => components.includes(c.package));

  let result = await upgrade({
    all,
    allDependencies,
    isHeroUIAll,
    upgradeOptionList
  });
  let ignoreList: string[] = [];
  const packageManager = await detect();

  if (result.length) {
    const isExecute = await getSelect('Would you like to proceed with the upgrade?', [
      {
        title: 'Yes',
        value: true
      },
      {
        description: 'Select this if you wish to exclude certain packages from the upgrade',
        title: 'No',
        value: false
      }
    ]);

    const {install} = getPackageManagerInfo(packageManager);

    if (!isExecute) {
      // Ask whether need to remove some package not to upgrade
      const isNeedRemove = await getSelect(
        'Would you like to exclude any packages from the upgrade?',
        [
          {
            description: 'Select this to choose packages to exclude',
            title: 'Yes',
            value: true
          },
          {
            description: 'Select this to proceed without excluding any packages',
            title: 'No',
            value: false
          }
        ]
      );

      if (isNeedRemove) {
        ignoreList = await getMultiselect(
          'Select the packages you want to exclude from the upgrade:',
          result.map((c) => {
            return {
              description: `${c.version} -> ${getColorVersion(c.version, c.latestVersion)}`,
              title: c.package,
              value: c.package
            };
          })
        );
      }
    }

    // Remove the components that need to be ignored
    result = result.filter((r) => {
      return !ignoreList.some((ignore) => r.package === ignore);
    });

    if (write) {
      // Write the upgrade version to the package file
      writeUpgradeVersion({
        dependencies,
        devDependencies,
        upgradePackageList: result
      });

      fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2), 'utf-8');

      Logger.newLine();
      Logger.success('✅ Upgrade version written to package.json');
      process.exit(0);
    } else {
      await catchPnpmExec(() =>
        exec(
          `${packageManager} ${install} ${result.reduce((acc, component, index) => {
            return `${acc}${index === 0 ? '' : ' '}${
              component.package
            }@${component.latestVersion.replace(colorMatchRegex, '')}`;
          }, '')}`
        )
      );
    }
  }

  /** ======================== Setup Pnpm ======================== */
  setupPnpm(packageManager);

  Logger.newLine();
  Logger.success('✅ Upgrade complete. All components are up to date.');

  process.exit(0);
}
