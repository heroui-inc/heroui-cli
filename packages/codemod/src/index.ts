import type {SAFE_ANY} from '@helpers/type';

import {Logger} from '@helpers/logger';
import {getCommandDescAndLog} from '@helpers/utils';
import {Command} from 'commander';

import pkg from '../package.json';

import {codemodAction} from './actions/codemod-action';
import {migrateAction} from './actions/migrate-action';
import {DEBUG} from './helpers/debug';
import {initOptions} from './helpers/options';
import {codemods} from './types';

const heroui = new Command();

heroui
  .name(pkg.name)
  .usage('[command]')
  .description(getCommandDescAndLog(`\nHeroUI Codemod v${pkg.version}\n`, pkg.description))
  .version(pkg.version, '-v, --version', 'Output the current version')
  .helpOption('-h, --help', 'Display help for command')
  .argument('[codemod]', `Specify which codemod to run\nCodemods: ${codemods.join(', ')}`)
  .allowUnknownOption()
  .option('-d, --debug', 'Enable debug mode')
  .option('-f, --format', 'Format the affected files with Prettier')
  .action(codemodAction);

heroui
  .command('migrate')
  .description('Migrates your codebase to use the heroui')
  .argument('[projectPath]', 'Path to the project to migrate')
  .action(migrateAction);

heroui.hook('preAction', async (command) => {
  const options = (command as SAFE_ANY).rawArgs.slice(2);
  const debug = options.includes('--debug') || options.includes('-d');
  const format = options.includes('--format') || options.includes('-f');

  initOptions({format});

  DEBUG.enabled = debug;
});

heroui.parseAsync(process.argv).catch(async (reason) => {
  Logger.newLine();
  Logger.error('Unexpected error. Please report it as a bug:');
  Logger.log(reason);
  Logger.newLine();
  process.exit(1);
});
