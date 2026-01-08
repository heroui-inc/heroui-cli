import type {Command} from 'commander';

import {initAction, templatesMap} from '../actions/init-action';

export function registerInitCommand(cmd: Command) {
  cmd
    .command('init')
    .description('Initializes a new project')
    .argument('[projectName]', 'Name of the project to initialize')
    .option(
      '-t --template [string]',
      `Specify a template for the new project, e.g. ${Object.keys(templatesMap).join(', ')}`
    )
    .option('-p --package [string]', 'The package manager to use for the new project', 'npm')
    .action(initAction);
}
