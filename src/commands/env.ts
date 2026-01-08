import type {Command} from 'commander';

import {envAction} from '../actions/env-action';

export function registerEnvCommand(cmd: Command) {
  cmd
    .command('env')
    .description('Displays debugging information for the local environment')
    .option('-p --packagePath [string]', 'Specify the path to the package.json file')
    .action(envAction);
}
