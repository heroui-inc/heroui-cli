import type {UpgradeOption} from '@helpers/actions/upgrade/upgrade-types';
import type {CommandOptions} from '@helpers/type';

import chalk from 'chalk';

import {detect} from '@helpers/detect';
import {exec} from '@helpers/exec';
import {exitWithJson, isJsonMode, printJson} from '@helpers/json-output';
import {Logger} from '@helpers/logger';
import {outputBox} from '@helpers/output-info';
import {getPackageInfo} from '@helpers/package';
import {collectPeerDependencies} from '@helpers/peer-deps';
import {getUpgradeVersion} from '@helpers/upgrade';
import {
  getColorVersion,
  getPackageManagerInfo,
  getVersionAndMode,
  transformPeerVersion
} from '@helpers/utils';
import {resolver} from 'src/constants/path';
import {HEROUI_PACKAGES, HEROUI_PACKAGES_LABEL} from 'src/constants/required';
import {getSelect} from 'src/prompts';
import {compareVersions, getLatestVersion} from 'src/scripts/helpers';

export async function upgradeAction(options: CommandOptions) {
  const {packagePath = resolver('package.json')} = options;
  const {allDependencies, allDependenciesKeys} = getPackageInfo(packagePath);

  const installed = HEROUI_PACKAGES.filter((pkg) => allDependenciesKeys.has(pkg));

  if (!installed.length) {
    const message = `No HeroUI packages found. Run \`heroui install\` to install ${HEROUI_PACKAGES_LABEL}.`;

    if (isJsonMode()) {
      printJson({command: 'upgrade', error: message, ok: false});

      return;
    }

    Logger.prefix('error', message);

    return;
  }

  // Collect results positionally rather than pushing from concurrent callbacks,
  // otherwise the row order of the upgrade table varies between runs
  const checked = await Promise.all(
    installed.map(async (pkg) => {
      const {currentVersion} = getVersionAndMode(allDependencies, pkg);
      const latestVersion = await getLatestVersion(pkg);

      return {current: currentVersion, latest: latestVersion, pkg};
    })
  );

  const upgradable = checked.filter((u) => compareVersions(u.current, u.latest) < 0);

  const peerUpgradable: {pkg: string; current: string; latest: string}[] = [];

  for (const [peerPkg, peerVersion] of await collectPeerDependencies(installed)) {
    if (upgradable.some((u) => u.pkg === peerPkg)) continue;
    if (!(peerPkg in allDependencies)) continue;

    const {currentVersion} = getVersionAndMode(allDependencies, peerPkg);
    const requiredMinVersion = transformPeerVersion(peerVersion);

    if (compareVersions(currentVersion, requiredMinVersion) < 0) {
      const latestVersion = await getLatestVersion(peerPkg);

      peerUpgradable.push({current: currentVersion, latest: latestVersion, pkg: peerPkg});
    }
  }

  const packages = [...upgradable, ...peerUpgradable].map((item) => ({
    from: item.current,
    package: item.pkg,
    to: item.latest
  }));

  if (!upgradable.length && !peerUpgradable.length) {
    exitWithJson({command: 'upgrade', ok: true, packages: [], upgraded: false}, 0);
    Logger.success('✅ All packages are up to date');
    process.exit(0);
  }

  if (!isJsonMode() && upgradable.length) {
    const upgradeOptions: UpgradeOption[] = upgradable.map((u) => ({
      isLatest: false,
      latestVersion: getColorVersion(u.current, u.latest),
      package: u.pkg,
      version: u.current,
      versionMode: getVersionAndMode(allDependencies, u.pkg).versionMode
    }));

    const output = getUpgradeVersion(upgradeOptions);

    output.length && outputBox({color: 'blue', text: output, title: chalk.blue('Upgrade')});
    Logger.newLine();
  }

  if (!isJsonMode() && peerUpgradable.length) {
    const peerOptions: UpgradeOption[] = peerUpgradable.map((u) => ({
      isLatest: false,
      latestVersion: getColorVersion(u.current, u.latest),
      package: u.pkg,
      version: u.current,
      versionMode: getVersionAndMode(allDependencies, u.pkg).versionMode
    }));

    const output = getUpgradeVersion(peerOptions);

    output.length &&
      outputBox({color: 'yellow', text: output, title: chalk.yellow('PeerDependencies')});
    Logger.newLine();
  }

  const isConfirmed = await getSelect('Would you like to proceed with the upgrade?', [
    {title: 'Yes', value: true},
    {title: 'No', value: false}
  ]);

  if (!isConfirmed) {
    exitWithJson({cancelled: true, command: 'upgrade', ok: true, packages}, 0);
    process.exit(0);
  }

  const packageManager = await detect();
  const {install} = getPackageManagerInfo(packageManager);
  const allUpgradable = [...upgradable, ...peerUpgradable];
  const installCmd = allUpgradable.map((u) => `${u.pkg}@${u.latest}`).join(' ');

  await exec(`${packageManager} ${install} ${installCmd}`);

  exitWithJson({command: 'upgrade', ok: true, packages, upgraded: true}, 0);
  Logger.newLine();
  Logger.success('✅ Upgrade complete');
  process.exit(0);
}
