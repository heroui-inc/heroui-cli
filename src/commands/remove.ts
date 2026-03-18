import type {Command} from 'commander';

import {removeAction} from '../actions/remove-action';

export function registerRemoveCommand(cmd: Command) {
  cmd
    .command('remove')
    .description('Removes @heroui/react and @heroui/styles from the project')
    .option('-p, --packagePath [string]', 'Specify the path to the package.json file')
    .action(removeAction);
}
