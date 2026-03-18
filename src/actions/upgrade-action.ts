import type {AppendKeyValue, UpgradeOptions} from '@helpers/type';

import fs from 'node:fs';

import {catchPnpmExec} from '@helpers/actions/upgrade/catch-pnpm-exec';
import {getConditionVersion} from '@helpers/condition-value';
import {detect} from '@helpers/detect';
import {exec} from '@helpers/exec';
import {Logger} from '@helpers/logger';
import {colorMatchRegex} from '@helpers/output-info';
import {type PackageComponent, getInstalledHeroUIPackages, getPackageInfo} from '@helpers/package';
import {setupPnpm} from '@helpers/setup';
import {upgrade, writeUpgradeVersion} from '@helpers/upgrade';
import {getColorVersion, getPackageManagerInfo, transformPeerVersion} from '@helpers/utils';
import {resolver} from 'src/constants/path';
import {HERO_UI} from 'src/constants/required';
import {getAutocompleteMultiselect, getMultiselect, getSelect} from 'src/prompts';
import {compareVersions} from 'src/scripts/helpers';

type TransformComponent = Required<
  AppendKeyValue<PackageComponent, 'latestVersion', string> & {isLatest: boolean}
>;

function betaCompareVersions(version: string, latestVersion: string, beta: boolean) {
  const autoChangeTag = version.match(/(^\w+$)/)?.[1];

  if (autoChangeTag) {
    return latestVersion.includes(autoChangeTag);
  }

  const compareResult = compareVersions(version, latestVersion);

  return beta && compareResult === 1 && !version.includes('beta') ? false : compareResult >= 0;
}

export async function upgradeAction(components: string[], options: UpgradeOptions) {
  const {
    all = false,
    beta = false,
    packagePath = resolver('package.json'),
    write = false
  } = options;
  const {allDependencies, dependencies, devDependencies, packageJson} = getPackageInfo(packagePath);

  const currentComponents = getInstalledHeroUIPackages(allDependencies);
  const isHeroUIAll = !!allDependencies[HERO_UI];

  const transformComponents: TransformComponent[] = [];

  await Promise.all(
    currentComponents.map(async (component) => {
      const mergedVersion = await getConditionVersion(component.package);
      const compareResult = betaCompareVersions(component.version, mergedVersion, beta);

      transformComponents.push({
        ...component,
        isLatest: compareResult,
        latestVersion: mergedVersion
      });
    })
  );

  if (!transformComponents.length && !isHeroUIAll) {
    Logger.prefix('error', `No HeroUI components detected in your package.json at: ${packagePath}`);

    return;
  }

  if (all) {
    components = currentComponents.map((component) => component.package);
  } else if (!components.length) {
    if (isHeroUIAll) {
      const latestVersion = await getConditionVersion(HERO_UI);
      const herouiData = {
        isLatest:
          compareVersions(latestVersion, transformPeerVersion(allDependencies[HERO_UI])) <= 0,
        latestVersion,
        package: HERO_UI,
        version: transformPeerVersion(allDependencies[HERO_UI])
      } as TransformComponent;

      transformComponents.push(herouiData);
    }

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
  }

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

    result = result.filter((r) => {
      return !ignoreList.some((ignore) => r.package === ignore);
    });

    if (write) {
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
