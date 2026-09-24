import type {Command} from 'commander';

import {HEROUI_PACKAGES_LABEL} from 'src/constants/required';

import {upgradeAction} from '../actions/upgrade-action';

export function registerUpgradeCommand(cmd: Command) {
  cmd
    .command('upgrade')
    .description(`Upgrades ${HEROUI_PACKAGES_LABEL} to the latest versions`)
    .option('-p --packagePath [string]', 'Specify the path to the package.json file')
    .action(upgradeAction);
}
