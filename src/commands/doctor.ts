import type {Command} from 'commander';

import {doctorAction} from '../actions/doctor-action';

export function registerDoctorCommand(cmd: Command) {
  cmd
    .command('doctor')
    .description('Checks for issues in the project')
    .option('-p --packagePath [string]', 'Specify the path to the package.json file')
    .option('-tw --tailwindPath [string]', 'Specify the path to the tailwind.config.js file')
    .option('-app --appPath [string]', 'Specify the path to the App.tsx file')
    .option('-ca --checkApp [boolean]', 'Check the App.tsx file', false)
    .option('-ct --checkTailwind [boolean]', 'Check the tailwind.config.js file')
    .option('-cp --checkPnpm [boolean]', 'Check for Pnpm', true)
    .action(doctorAction);
}
