import type {CommandOptions} from '@helpers/type';

import chalk from 'chalk';

import {detect} from '@helpers/detect';
import {exec} from '@helpers/exec';
import {Logger} from '@helpers/logger';
import {getPackageInfo} from '@helpers/package';
import {resolver} from 'src/constants/path';

const PACKAGES = ['@heroui/react', '@heroui/styles'];

export async function addAction(options: CommandOptions) {
  const {packagePath = resolver('package.json')} = options;

  const {allDependenciesKeys} = getPackageInfo(packagePath);

  const missing = PACKAGES.filter((pkg) => !allDependenciesKeys.has(pkg));

  if (!missing.length) {
    Logger.success('✅ @heroui/react and @heroui/styles are already installed');
    process.exit(0);
  }

  const currentPkgManager = await detect();
  const runCmd = currentPkgManager === 'npm' ? 'install' : 'add';

  Logger.info(`Adding ${missing.map((c) => chalk.underline(c)).join(', ')}`);

  await exec(`${currentPkgManager} ${runCmd} ${missing.join(' ')}`);

  Logger.newLine();
  Logger.success('✅ @heroui/react and @heroui/styles added successfully');
  process.exit(0);
}
