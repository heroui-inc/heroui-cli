import {Command} from 'commander';

import {JSON_OPTION_DESCRIPTION} from '@helpers/json-output';
import {getCommandDescAndLog} from '@helpers/utils';

import pkg from '../package.json';

import {registerCommands} from './commands';
import {
  handleParseError,
  handleUncaughtException,
  handleUnhandledRejection,
  runDefaultAction,
  runPreAction
} from './program';

const heroui = new Command();

heroui
  .name('heroui')
  .usage('[command]')
  .description(getCommandDescAndLog(`\nHeroUI CLI v${pkg.version}\n`, ''))
  .version(pkg.version, '-v, --version', 'Output the current version')
  .helpOption('-h, --help', 'Display help for command')
  .allowUnknownOption()
  .option(
    '--no-cache',
    'Disable cache, by default data will be cached for 30m after the first request'
  )
  .option('-d, --debug', 'Debug mode will not install dependencies')
  .option('--json', JSON_OPTION_DESCRIPTION, false)
  .action(async (_, command) => {
    await runDefaultAction(heroui, command);
  });

registerCommands(heroui);

heroui.hook('preAction', async (command) => {
  await runPreAction(command);
});

// parseAsync only sees rejections from the command it ran. Anything thrown from
// a detached promise or a callback would otherwise exit silently.
process.on('unhandledRejection', handleUnhandledRejection);

process.on('uncaughtException', handleUncaughtException);

heroui.parseAsync(process.argv).catch(async (error: Error) => {
  await handleParseError(error);
});
