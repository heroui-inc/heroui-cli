import type {CommandOptions} from '../helpers/type';

import {Logger} from '@helpers/logger';
import {outputComponents} from '@helpers/output-info';
import {getPackageInfo, transformPackageDetail} from '@helpers/package';

import {resolver} from '../../src/constants/path';

const PACKAGES = ['@heroui/react', '@heroui/styles'];

export async function listAction(options: CommandOptions) {
  const {packagePath = resolver('package.json')} = options;

  try {
    const {allDependencies, allDependenciesKeys} = getPackageInfo(packagePath);

    const installed = PACKAGES.filter((pkg) => allDependenciesKeys.has(pkg));

    if (!installed.length) {
      Logger.warn(
        'No HeroUI packages found. Run `heroui add` to install @heroui/react and @heroui/styles.'
      );

      return;
    }

    const components = await transformPackageDetail(installed, allDependencies);

    outputComponents({components, message: 'Installed HeroUI packages:\n'});
  } catch (error) {
    Logger.prefix('error', `An error occurred while listing packages: ${error}`);
  }

  process.exit(0);
}
