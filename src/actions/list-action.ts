import type {CommandOptions} from '../helpers/type';

import {Logger} from '@helpers/logger';
import {outputComponents} from '@helpers/output-info';
import {getPackageInfo, transformPackageDetail} from '@helpers/package';
import {HEROUI_PACKAGES, HEROUI_PACKAGES_LABEL} from 'src/constants/required';

import {resolver} from '../../src/constants/path';

export async function listAction(options: CommandOptions) {
  const {packagePath = resolver('package.json')} = options;

  try {
    const {allDependencies, allDependenciesKeys} = getPackageInfo(packagePath);

    const installed = HEROUI_PACKAGES.filter((pkg) => allDependenciesKeys.has(pkg));

    if (!installed.length) {
      Logger.warn(
        `No HeroUI packages found. Run \`heroui install\` to install ${HEROUI_PACKAGES_LABEL}.`
      );

      return;
    }

    const components = await transformPackageDetail(installed, allDependencies);

    outputComponents({components, message: 'Installed HeroUI packages:\n'});
  } catch (error) {
    Logger.prefix('error', `An error occurred while listing packages: ${error}`);

    process.exit(1);
  }

  process.exit(0);
}
