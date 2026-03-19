import type {CommandOptions} from '@helpers/type';

import chalk from 'chalk';

import {detect} from '@helpers/detect';
import {exec} from '@helpers/exec';
import {Logger} from '@helpers/logger';
import {outputComponents} from '@helpers/output-info';
import {getPackageInfo, transformPackageDetail} from '@helpers/package';
import {resolver} from 'src/constants/path';
import {HEROUI_PACKAGES} from 'src/constants/required';
import {getSelect} from 'src/prompts';

export async function addAction(options: CommandOptions) {
  const {packagePath = resolver('package.json')} = options;

  const {allDependencies, allDependenciesKeys} = getPackageInfo(packagePath);

  const missing = HEROUI_PACKAGES.filter((pkg) => !allDependenciesKeys.has(pkg));

  if (!missing.length) {
    Logger.success('✅ @heroui/react and @heroui/styles are already installed');
    process.exit(0);
  }

  const components = await transformPackageDetail(missing, allDependencies);

  outputComponents({
    components,
    message: chalk.cyanBright('📦 Packages to be installed:')
  });

  const isConfirmed = await getSelect('Proceed with installation?', [
    {title: 'Yes', value: true},
    {title: 'No', value: false}
  ]);

  if (!isConfirmed) {
    process.exit(0);
  }

  const currentPkgManager = await detect();
  const runCmd = currentPkgManager === 'npm' ? 'install' : 'add';

  await exec(`${currentPkgManager} ${runCmd} ${missing.join(' ')}`);

  Logger.newLine();
  Logger.success('✅ @heroui/react and @heroui/styles added successfully');
  process.exit(0);
}
