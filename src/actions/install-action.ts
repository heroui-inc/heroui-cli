import type {UpgradeOption} from '@helpers/actions/upgrade/upgrade-types';
import type {CommandOptions} from '@helpers/type';

import chalk from 'chalk';

import {detect} from '@helpers/detect';
import {exec} from '@helpers/exec';
import {Logger} from '@helpers/logger';
import {outputBox, outputComponents} from '@helpers/output-info';
import {getPackageInfo, transformPackageDetail} from '@helpers/package';
import {collectPeerDependencies} from '@helpers/peer-deps';
import {getUpgradeVersion} from '@helpers/upgrade';
import {getVersionAndMode, safeJsonParse, strip} from '@helpers/utils';
import {resolver} from 'src/constants/path';
import {HEROUI_PACKAGES, HEROUI_PACKAGES_LABEL} from 'src/constants/required';
import {getSelect} from 'src/prompts';
import {getCacheExecData} from 'src/scripts/cache/cache';
import {getLatestVersion} from 'src/scripts/helpers';

/**
 * Resolve the highest published version satisfying a peer range.
 *
 * Installing the `latest` dist-tag instead can violate the range the package
 * actually declares. The spec is quoted because ranges contain characters the
 * shell would otherwise interpret, and the resolved value is a plain version
 * so it stays safe to interpolate into the install command.
 */
async function resolvePeerVersion(pkg: string, range: string): Promise<string> {
  const raw = await getCacheExecData(
    `npm view ${JSON.stringify(`${pkg}@${range}`)} version --json`
  );
  const parsed = safeJsonParse<string | string[] | undefined>(raw, undefined);
  const resolved = Array.isArray(parsed) ? parsed.at(-1) : parsed;

  return resolved || (await getLatestVersion(pkg));
}

async function getPeerDepOptions(
  packages: string[],
  allDependencies: Record<string, string>
): Promise<UpgradeOption[]> {
  const peerDepOptions: UpgradeOption[] = [];

  for (const [peerPkg, peerRange] of await collectPeerDependencies(packages)) {
    const isInstalled = peerPkg in allDependencies;

    const {currentVersion = '', versionMode = ''} = isInstalled
      ? getVersionAndMode(allDependencies, peerPkg)
      : {};

    peerDepOptions.push({
      isLatest: isInstalled,
      latestVersion: isInstalled ? currentVersion : await resolvePeerVersion(peerPkg, peerRange),
      package: peerPkg,
      version: isInstalled ? currentVersion : 'Missing',
      versionMode
    });
  }

  return peerDepOptions;
}

export async function installAction(options: CommandOptions) {
  const {packagePath = resolver('package.json')} = options;

  const {allDependencies, allDependenciesKeys} = getPackageInfo(packagePath);

  const missing = HEROUI_PACKAGES.filter((pkg) => !allDependenciesKeys.has(pkg));

  if (!missing.length) {
    Logger.success(`✅ ${HEROUI_PACKAGES_LABEL} are already installed`);
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
  Logger.success(`✅ ${HEROUI_PACKAGES_LABEL} installed successfully`);
  process.exit(0);
}
