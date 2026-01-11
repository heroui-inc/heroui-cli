import type {Command} from 'commander';

import {addAction} from '../actions/add-action';

export function registerAddCommand(cmd: Command) {
  cmd
    .command('add')
    .description('1. Adds components to your project\n2. Adds HeroUI Chat codebase to your project')
    .argument('[targets...]', 'Names of components, HeroUI Chat codebase url to add')
    .option('-a, --all [boolean]', 'Add all components', false)
    .option('-p, --packagePath [string]', 'Specify the path to the package.json file')
    .option('--tw, --tailwindPath [string]', 'Specify the path to the tailwind.config.js file')
    .option('--app, --appPath [string]', 'Specify the path to the App.tsx file')
    .option('--prettier [boolean]', 'Apply Prettier formatting to the added content')
    .option('--addApp [boolean]', 'Include App.tsx file content that requires a provider', false)
    .option('-b, --beta [boolean]', 'Add beta components', false)
    .option('-d, --directory [string]', 'Add HeroUI Chat codebase to a specific directory')
    .action(addAction);
}
