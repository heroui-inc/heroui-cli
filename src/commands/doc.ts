import type {Command} from 'commander';

import {docAction} from '../actions/doc-action';

export function registerDocCommand(cmd: Command) {
  cmd
    .command('doc')
    .description('Shows the documentation for a HeroUI React component')
    .argument('<component>', 'Component name, for example button or button-group')
    .action(docAction);
}
