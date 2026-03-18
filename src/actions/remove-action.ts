import type {CommandOptions} from '@helpers/type';

import chalk from 'chalk';

import {detect} from '@helpers/detect';
import {Logger} from '@helpers/logger';
import {getPackageInfo} from '@helpers/package';
import {removeDependencies} from '@helpers/remove';
import {resolver} from 'src/constants/path';
import {HEROUI_PACKAGES} from 'src/constants/required';

export async function removeAction(options: CommandOptions) {
  const {packagePath = resolver('package.json')} = options;
  const {allDependenciesKeys} = getPackageInfo(packagePath);

  const installed = HEROUI_PACKAGES.filter((pkg) => allDependenciesKeys.has(pkg));

  if (!installed.length) {
    Logger.success('✅ No HeroUI packages to remove');
    process.exit(0);
  }

  const packageManager = await detect();

  Logger.info(`Removing ${installed.map((c) => chalk.underline(c)).join(', ')}`);

  await removeDependencies([...installed], packageManager);

  Logger.newLine();
  Logger.success(`✅ Successfully removed: ${installed.map((c) => chalk.underline(c)).join(', ')}`);
  process.exit(0);
}
