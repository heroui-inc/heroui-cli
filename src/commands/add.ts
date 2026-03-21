import type {Command} from 'commander';

import {addAction} from '../actions/add-action';

export function registerAddCommand(cmd: Command) {
  cmd
    .command('add')
    .description('Adds @heroui/react and @heroui/styles to your project')
    .option('-p, --packagePath [string]', 'Specify the path to the package.json file')
    .action(addAction);
}
