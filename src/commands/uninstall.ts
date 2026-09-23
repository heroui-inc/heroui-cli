import type {Command} from 'commander';

import {HEROUI_PACKAGES_LABEL} from 'src/constants/required';

import {uninstallAction} from '../actions/uninstall-action';

export function registerUninstallCommand(cmd: Command) {
  cmd
    .command('uninstall')
    .description(`Uninstalls ${HEROUI_PACKAGES_LABEL} from the project`)
    .option('-p, --packagePath [string]', 'Specify the path to the package.json file')
    .action(uninstallAction);
}
