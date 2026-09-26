import {getCommandDescAndLog} from '@helpers/utils';
import {Command} from 'commander';

import pkg from '../package.json';

import {codemodAction} from './actions/codemod-action';
import {migrateAction} from './actions/migrate-action';
import {handleCodemodParseError, runCodemodPreAction} from './program';
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
  await runCodemodPreAction(command);
});

heroui.parseAsync(process.argv).catch(async (reason) => {
  await handleCodemodParseError(reason);
});
