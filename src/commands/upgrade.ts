import type {Command} from 'commander';

import {upgradeAction} from '../actions/upgrade-action';

export function registerUpgradeCommand(cmd: Command) {
  cmd
    .command('upgrade')
    .description('Upgrades project components to the latest versions')
    .argument('[components...]', 'Names of components to upgrade')
    .option('-p --packagePath [string]', 'Specify the path to the package.json file')
    .option('-a --all [boolean]', 'Upgrade all components', false)
    .option('-w --write [boolean]', 'Write the upgrade version to package.json file', false)
    .option('-b --beta [boolean]', 'Upgrade beta components', false)
    .action(upgradeAction);
}
