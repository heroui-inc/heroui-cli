import type {CommandOptions} from '@helpers/type';

import chalk from 'chalk';

import {detect} from '@helpers/detect';
import {Logger} from '@helpers/logger';
import {outputComponents} from '@helpers/output-info';
import {getPackageInfo, transformPackageDetail} from '@helpers/package';
import {removeDependencies} from '@helpers/remove';
import {resolver} from 'src/constants/path';
import {HEROUI_PACKAGES} from 'src/constants/required';
import {getSelect} from 'src/prompts';

export async function removeAction(options: CommandOptions) {
  const {packagePath = resolver('package.json')} = options;
  const {allDependencies, allDependenciesKeys} = getPackageInfo(packagePath);

  const installed = HEROUI_PACKAGES.filter((pkg) => allDependenciesKeys.has(pkg));

  if (!installed.length) {
    Logger.success('✅ No HeroUI packages to remove');
    process.exit(0);
  }

  const components = await transformPackageDetail(installed, allDependencies);

  outputComponents({
    components,
    message: chalk.yellowBright('❗️ Packages slated for removal:')
  });

  const isConfirmed = await getSelect('Confirm removal of these packages:', [
    {title: 'Yes', value: true},
    {title: 'No', value: false}
  ]);

  if (!isConfirmed) {
    process.exit(0);
  }

  const packageManager = await detect();

  await removeDependencies([...installed], packageManager);

  Logger.newLine();
  Logger.success(`✅ Successfully removed: ${installed.map((c) => chalk.underline(c)).join(', ')}`);
  process.exit(0);
}
