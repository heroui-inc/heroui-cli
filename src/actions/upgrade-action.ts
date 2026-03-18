import type {CommandOptions} from '@helpers/type';

import chalk from 'chalk';

import {detect} from '@helpers/detect';
import {exec} from '@helpers/exec';
import {Logger} from '@helpers/logger';
import {getPackageInfo} from '@helpers/package';
import {getColorVersion, getPackageManagerInfo, getVersionAndMode} from '@helpers/utils';
import {resolver} from 'src/constants/path';
import {compareVersions, getLatestVersion} from 'src/scripts/helpers';

const PACKAGES = ['@heroui/react', '@heroui/styles'];

export async function upgradeAction(options: CommandOptions) {
  const {packagePath = resolver('package.json')} = options;
  const {allDependencies, allDependenciesKeys} = getPackageInfo(packagePath);

  const installed = PACKAGES.filter((pkg) => allDependenciesKeys.has(pkg));

  if (!installed.length) {
    Logger.prefix(
      'error',
      'No HeroUI packages found. Run `heroui add` to install @heroui/react and @heroui/styles.'
    );

    return;
  }

  const upgradable: {pkg: string; current: string; latest: string}[] = [];

  await Promise.all(
    installed.map(async (pkg) => {
      const {currentVersion} = getVersionAndMode(allDependencies, pkg);
      const latestVersion = await getLatestVersion(pkg);

      if (compareVersions(currentVersion, latestVersion) < 0) {
        upgradable.push({current: currentVersion, latest: latestVersion, pkg});
      }
    })
  );

  if (!upgradable.length) {
    Logger.success('✅ @heroui/react and @heroui/styles are up to date');
    process.exit(0);
  }

  Logger.info('The following packages can be upgraded:');
  for (const {current, latest, pkg} of upgradable) {
    Logger.log(`  ${chalk.underline(pkg)} ${current} -> ${getColorVersion(current, latest)}`);
  }
  Logger.newLine();

  const packageManager = await detect();
  const {install} = getPackageManagerInfo(packageManager);
  const installCmd = upgradable.map((u) => `${u.pkg}@${u.latest}`).join(' ');

  Logger.info(`Upgrading ${upgradable.map((u) => chalk.underline(u.pkg)).join(', ')}...`);

  await exec(`${packageManager} ${install} ${installCmd}`);

  Logger.newLine();
  Logger.success('✅ Upgrade complete');
  process.exit(0);
}
