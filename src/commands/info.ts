import type {Command} from 'commander';

import {infoAction} from '../actions/info-action';

export function registerInfoCommand(cmd: Command) {
  cmd
    .command('info')
    .description('Shows the API Reference for a HeroUI React component')
    .argument('<component>', 'Component name, for example button or button-group')
    .action(infoAction);
}
