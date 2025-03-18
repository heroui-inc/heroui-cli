import type {CommandName, SAFE_ANY} from '@helpers/type';

import chalk from 'chalk';
import {Command} from 'commander';

import {isAddingHeroChatCodebase} from '@helpers/actions/add/heroui-chat/add-hero-chat-codebase';
import {Logger, gradientString} from '@helpers/logger';
import {findMostMatchText} from '@helpers/math-diff';
import {outputBox} from '@helpers/output-info';
import {getCommandDescAndLog} from '@helpers/utils';

import pkg from '../package.json';

import {addAction} from './actions/add-action';
import {doctorAction} from './actions/doctor-action';
import {envAction} from './actions/env-action';
import {initAction} from './actions/init-action';
import {listAction} from './actions/list-action';
import {removeAction} from './actions/remove-action';
import {upgradeAction} from './actions/upgrade-action';
import {initStoreComponentsData} from './constants/component';
import {getStore, store} from './constants/store';
import {getCacheExecData, initCache} from './scripts/cache/cache';
import {compareVersions, getComponents} from './scripts/helpers';

const commandList: CommandName[] = ['add', 'env', 'init', 'list', 'upgrade', 'doctor', 'remove'];

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
  .action(async (_, command) => {
    let isArgs = false;

    if (command) {
      const args = command.args?.[0];

      if (args && !commandList.includes(args as CommandName)) {
        isArgs = true;

        const matchCommand = findMostMatchText(commandList, args);

        if (matchCommand) {
          Logger.error(
            `Unknown command '${args}', Did you mean '${chalk.underline(matchCommand)}'?`
          );
        } else {
          Logger.error(`Unknown command '${args}'`);
        }
      }
    }

    if (!isArgs) {
      const helpInfo = (await getCacheExecData('heroui --help')) as string;

      let helpInfoArr = helpInfo.split('\n');

      helpInfoArr = helpInfoArr.filter((info) => info && !info.includes('HeroUI CLI v'));
      // Add command name color
      helpInfoArr = helpInfoArr.map((info) => {
        const command = info.match(/(\w+)\s\[/)?.[1];

        if (command) {
          return info.replace(command, chalk.cyan(command));
        }

        return info;
      });

      Logger.log(helpInfoArr.join('\n'));
    }
    process.exit(0);
  });

heroui
  .command('init')
  .description('Initializes a new project')
  .argument('[projectName]', 'Name of the project to initialize')
  .option('-t --template [string]', 'Specify a template for the new project, e.g., app, pages')
  .option('-p --package [string]', 'The package manager to use for the new project', 'npm')
  .action(initAction);

heroui
  .command('add')
  .description('1. Adds components to your project\n2. Adds hero chat codebase to your project')
  .argument('[targets...]', 'Names of components, hero chat codebase url to add')
  .option('-a --all [boolean]', 'Add all components', false)
  .option('-p --packagePath [string]', 'Specify the path to the package.json file')
  .option('-tw --tailwindPath [string]', 'Specify the path to the tailwind.config.js file')
  .option('-app --appPath [string]', 'Specify the path to the App.tsx file')
  .option('--prettier [boolean]', 'Apply Prettier formatting to the added content')
  .option('--addApp [boolean]', 'Include App.tsx file content that requires a provider', false)
  .option('-b --beta [boolean]', 'Add beta components', false)
  .option('--directory [string]', 'Add hero chat codebase to a specific directory')
  .action(addAction);

heroui
  .command('upgrade')
  .description('Upgrades project components to the latest versions')
  .argument('[components...]', 'Names of components to upgrade')
  .option('-p --packagePath [string]', 'Specify the path to the package.json file')
  .option('-a --all [boolean]', 'Upgrade all components', false)
  .option('-w --write [boolean]', 'Write the upgrade version to package.json file', false)
  .option('-b --beta [boolean]', 'Upgrade beta components', false)
  .action(upgradeAction);

heroui
  .command('remove')
  .description('Removes components from the project')
  .argument('[components...]', 'Names of components to remove')
  .option('-p --packagePath [string]', 'Specify the path to the package.json file')
  .option('-a --all [boolean]', 'Remove all components', false)
  .option('-tw --tailwindPath [string]', 'Specify the path to the tailwind.config.js file')
  .option('--prettier [boolean]', 'Apply Prettier formatting to the added content')
  .action(removeAction);

heroui
  .command('list')
  .description('Lists all components, showing status, descriptions, and versions')
  .option('-p --packagePath [string]', 'Specify the path to the package.json file')
  .option('-r --remote', 'List all components available remotely')
  .action(listAction);
heroui
  .command('env')
  .description('Displays debugging information for the local environment')
  .option('-p --packagePath [string]', 'Specify the path to the package.json file')
  .action(envAction);

heroui
  .command('doctor')
  .description('Checks for issues in the project')
  .option('-p --packagePath [string]', 'Specify the path to the package.json file')
  .option('-tw --tailwindPath [string]', 'Specify the path to the tailwind.config.js file')
  .option('-app --appPath [string]', 'Specify the path to the App.tsx file')
  .option('-ca --checkApp [boolean]', 'Check the App.tsx file', false)
  .option('-ct --checkTailwind [boolean]', 'Check the tailwind.config.js file', true)
  .option('-cp --checkPnpm [boolean]', 'Check for Pnpm', true)
  .action(doctorAction);

heroui.hook('preAction', async (command) => {
  const commandName = command.args?.[0];
  const options = (command as SAFE_ANY).rawArgs.slice(2);
  const noCache = options.includes('--no-cache');
  const debug = options.includes('--debug') || options.includes('-d');
  const targetsArgs = command.args?.slice(1);

  if (isAddingHeroChatCodebase(targetsArgs) || !commandName) {
    // Hero chat action don't need to init
    return;
  }

  // Init cache
  initCache(noCache);
  // Init debug
  store.debug = debug;
  store.beta = options.includes('-b') || options.includes('--beta');

  if (commandName && commandList.includes(commandName as CommandName)) {
    // Before run the command init the components.json
    const heroUIComponents = (await getComponents()).components;
    const heroUIComponentsBeta = (await getComponents()).betaComponents;

    initStoreComponentsData({beta: false, heroUIComponents: heroUIComponents});
    store.beta && initStoreComponentsData({beta: true, heroUIComponents: heroUIComponentsBeta});
  }

  const [cliLatestVersion, latestVersion] = await Promise.all([
    getStore('cliLatestVersion'),
    getStore('latestVersion')
  ]);

  // Init latest version
  store.latestVersion = latestVersion;
  store.cliLatestVersion = cliLatestVersion;

  // Add HeroUI CLI version check preAction
  const currentVersion = pkg.version;

  if (compareVersions(currentVersion, cliLatestVersion) === -1) {
    outputBox({
      center: true,
      color: 'yellow',
      padding: 1,
      text: `${chalk.gray(
        `Available upgrade: v${currentVersion} -> ${chalk.greenBright(
          `v${cliLatestVersion}`
        )}\nRun \`${chalk.cyan(
          'npm install -g heroui-cli@latest'
        )}\` to upgrade\nChangelog: ${chalk.underline(
          'https://github.com/heroui-inc/heroui-cli/releases'
        )}`
      )}`,
      title: gradientString('HeroUI CLI')
    });
    Logger.newLine();
  }
});

heroui.parseAsync(process.argv).catch(async (reason) => {
  Logger.newLine();
  Logger.error('Unexpected error. Please report it as a bug:');
  Logger.log(reason);
  Logger.newLine();
  process.exit(1);
});
