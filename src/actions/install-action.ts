import type {UpgradeOption} from '@helpers/actions/upgrade/upgrade-types';
import type {CommandOptions, SAFE_ANY} from '@helpers/type';

import chalk from 'chalk';

import {detect} from '@helpers/detect';
import {exec} from '@helpers/exec';
import {Logger} from '@helpers/logger';
import {outputBox, outputComponents} from '@helpers/output-info';
import {getPackageInfo, transformPackageDetail} from '@helpers/package';
import {getUpgradeVersion} from '@helpers/upgrade';
import {getVersionAndMode, strip} from '@helpers/utils';
import {resolver} from 'src/constants/path';
import {HEROUI_PACKAGES} from 'src/constants/required';
import {getSelect} from 'src/prompts';
import {getCacheExecData} from 'src/scripts/cache/cache';
import {getLatestVersion} from 'src/scripts/helpers';

async function getPeerDepOptions(
  packages: string[],
  allDependencies: Record<string, string>
): Promise<UpgradeOption[]> {
  const seen = new Set<string>();
  const peerDepOptions: UpgradeOption[] = [];

  for (const pkg of packages) {
    const raw = await getCacheExecData(`npm show ${pkg} peerDependencies --json`);
    const peerDeps: Record<string, string> = raw ? JSON.parse(raw as SAFE_ANY) : {};

    for (const peerPkg of Object.keys(peerDeps)) {
      if (seen.has(peerPkg)) continue;
      seen.add(peerPkg);

      const isInstalled = peerPkg in allDependencies;

      const {currentVersion = '', versionMode = ''} = isInstalled
        ? getVersionAndMode(allDependencies, peerPkg)
        : {};

      peerDepOptions.push({
        isLatest: isInstalled,
        latestVersion: isInstalled ? currentVersion : await getLatestVersion(peerPkg),
        package: peerPkg,
        version: isInstalled ? currentVersion : 'Missing',
        versionMode
      });
    }
  }

  return peerDepOptions;
}

export async function installAction(options: CommandOptions) {
  const {packagePath = resolver('package.json')} = options;

  const {allDependencies, allDependenciesKeys} = getPackageInfo(packagePath);

  const missing = HEROUI_PACKAGES.filter((pkg) => !allDependenciesKeys.has(pkg));

  if (!missing.length) {
    Logger.success('✅ @heroui/react and @heroui/styles are already installed');
    process.exit(0);
  }

  const components = await transformPackageDetail([...missing], allDependencies);

  outputComponents({
    components,
    message: chalk.cyanBright('📦 Packages to be installed:')
  });

  const peerDepOptions = await getPeerDepOptions([...missing], allDependencies);

  if (peerDepOptions.length) {
    const peerDepOutput = getUpgradeVersion(peerDepOptions);

    if (peerDepOutput.length) {
      Logger.newLine();
      outputBox({color: 'yellow', text: peerDepOutput, title: chalk.yellow('PeerDependencies')});
    }
  }

  const isConfirmed = await getSelect('Proceed with installation?', [
    {title: 'Yes', value: true},
    {title: 'No', value: false}
  ]);

  if (!isConfirmed) {
    process.exit(0);
  }

  const currentPkgManager = await detect();
  const runCmd = currentPkgManager === 'npm' ? 'install' : 'add';

  const missingPeerDeps = peerDepOptions
    .filter((p) => !p.isLatest)
    .map((p) => `${p.package}@${strip(p.latestVersion)}`);

  const installTargets = [...missing, ...missingPeerDeps];

  await exec(`${currentPkgManager} ${runCmd} ${installTargets.join(' ')}`);

  Logger.newLine();
  Logger.success('✅ @heroui/react and @heroui/styles installed successfully');
  process.exit(0);
}
