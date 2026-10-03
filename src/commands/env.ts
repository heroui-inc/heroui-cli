import type {Command} from 'commander';

import {envAction} from '../actions/env-action';

export function registerEnvCommand(cmd: Command) {
  cmd
    .command('env')
    .description('Displays debugging information for the local environment')
    .action(envAction);
}
