import type {Command} from 'commander';

import {removeAction} from '../actions/remove-action';

export function registerRemoveCommand(cmd: Command) {
  cmd
    .command('remove')
    .description('Removes components from the project')
    .argument('[components...]', 'Names of components to remove')
    .option('-p --packagePath [string]', 'Specify the path to the package.json file')
    .option('-a --all [boolean]', 'Remove all components', false)
    .option('-tw --tailwindPath [string]', 'Specify the path to the tailwind.config.js file')
    .option('--prettier [boolean]', 'Apply Prettier formatting to the added content')
    .action(removeAction);
}
