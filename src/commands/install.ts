import type {Command} from 'commander';

import {installAction} from '../actions/install-action';

export function registerInstallCommand(cmd: Command) {
  cmd
    .command('install')
    .description('Installs @heroui/react and @heroui/styles in your project')
    .option('-p, --packagePath [string]', 'Specify the path to the package.json file')
    .action(installAction);
}
