import type {Command} from 'commander';

import {HEROUI_PACKAGES_LABEL} from 'src/constants/required';

import {installAction} from '../actions/install-action';

export function registerInstallCommand(cmd: Command) {
  cmd
    .command('install')
    .description(`Installs ${HEROUI_PACKAGES_LABEL} in your project`)
    .option('-p, --packagePath [string]', 'Specify the path to the package.json file')
    .action(installAction);
}
