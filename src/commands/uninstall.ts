import type {Command} from 'commander';

import {uninstallAction} from '../actions/uninstall-action';

export function registerUninstallCommand(cmd: Command) {
  cmd
    .command('uninstall')
    .description('Uninstalls @heroui/react and @heroui/styles from the project')
    .option('-p, --packagePath [string]', 'Specify the path to the package.json file')
    .action(uninstallAction);
}
