import type {Command} from 'commander';

import {doctorAction} from '../actions/doctor-action';

export function registerDoctorCommand(cmd: Command) {
  cmd
    .command('doctor')
    .description('Checks for issues in the project')
    .option('-p, --packagePath [string]', 'Specify the path to the package.json file')
    .action(doctorAction);
}
