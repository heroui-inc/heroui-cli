import type {Command} from 'commander';

import {listAction} from '../actions/list-action';

export function registerListCommand(cmd: Command) {
  cmd
    .command('list')
    .description('Lists all components, showing status, descriptions, and versions')
    .option('-p --packagePath [string]', 'Specify the path to the package.json file')
    .option('-r --remote', 'List all components available remotely')
    .action(listAction);
}
