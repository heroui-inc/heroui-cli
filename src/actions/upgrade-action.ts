import type {CommandOptions, SAFE_ANY} from '@helpers/type';

import chalk from 'chalk';

import {detect} from '@helpers/detect';
import {exec} from '@helpers/exec';
import {Logger} from '@helpers/logger';
import {getPackageInfo} from '@helpers/package';
import {
  getColorVersion,
  getPackageManagerInfo,
  getVersionAndMode,
  transformPeerVersion
} from '@helpers/utils';
import {resolver} from 'src/constants/path';
import {HEROUI_PACKAGES} from 'src/constants/required';
import {getSelect} from 'src/prompts';
import {getCacheExecData} from 'src/scripts/cache/cache';
import {compareVersions, getLatestVersion} from 'src/scripts/helpers';

export async function upgradeAction(options: CommandOptions) {
  const {packagePath = resolver('package.json')} = options;
  const {allDependencies, allDependenciesKeys} = getPackageInfo(packagePath);

  const installed = HEROUI_PACKAGES.filter((pkg) => allDependenciesKeys.has(pkg));

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

  const peerUpgradable: {pkg: string; current: string; latest: string}[] = [];
  const seenPeers = new Set<string>();

  for (const pkg of installed) {
    const raw = await getCacheExecData(`npm show ${pkg} peerDependencies --json`);
    const peerDeps: Record<string, string> = raw ? JSON.parse(raw as SAFE_ANY) : {};

    for (const [peerPkg, peerVersion] of Object.entries(peerDeps)) {
      if (seenPeers.has(peerPkg) || upgradable.some((u) => u.pkg === peerPkg)) continue;
      seenPeers.add(peerPkg);

      if (!(peerPkg in allDependencies)) continue;

      const {currentVersion} = getVersionAndMode(allDependencies, peerPkg);
      const requiredMinVersion = transformPeerVersion(peerVersion);

      if (compareVersions(currentVersion, requiredMinVersion) < 0) {
        const latestVersion = await getLatestVersion(peerPkg);

        peerUpgradable.push({current: currentVersion, latest: latestVersion, pkg: peerPkg});
      }
    }
  }

  if (!upgradable.length && !peerUpgradable.length) {
    Logger.success('✅ All packages are up to date');
    process.exit(0);
  }

  if (upgradable.length) {
    Logger.info('The following packages can be upgraded:');
    for (const {current, latest, pkg} of upgradable) {
      Logger.log(`  ${chalk.underline(pkg)} ${current} -> ${getColorVersion(current, latest)}`);
    }
    Logger.newLine();
  }

  if (peerUpgradable.length) {
    Logger.info('The following peer dependencies need upgrading:');
    for (const {current, latest, pkg} of peerUpgradable) {
      Logger.log(`  ${chalk.underline(pkg)} ${current} -> ${getColorVersion(current, latest)}`);
    }
    Logger.newLine();
  }

  const isConfirmed = await getSelect('Proceed with upgrade?', [
    {title: 'Yes', value: true},
    {title: 'No', value: false}
  ]);

  if (!isConfirmed) {
    process.exit(0);
  }

  const packageManager = await detect();
  const {install} = getPackageManagerInfo(packageManager);
  const allUpgradable = [...upgradable, ...peerUpgradable];
  const installCmd = allUpgradable.map((u) => `${u.pkg}@${u.latest}`).join(' ');

  await exec(`${packageManager} ${install} ${installCmd}`);

  Logger.newLine();
  Logger.success('✅ Upgrade complete');
  process.exit(0);
}
