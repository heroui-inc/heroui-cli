import type {CommandName, SAFE_ANY} from '@helpers/type';

import chalk from 'chalk';
import {Command} from 'commander';

import {isAddingHeroChatCodebase} from '@helpers/actions/add/heroui-chat/add-hero-chat-codebase';
import {Logger, gradientString} from '@helpers/logger';
import {findMostMatchText} from '@helpers/math-diff';
import {outputBox} from '@helpers/output-info';
import {getCommandDescAndLog} from '@helpers/utils';

import pkg from '../package.json';

import {registerCommands} from './commands';
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

registerCommands(heroui);

heroui.hook('preAction', async (command) => {
  const commandName = command.args?.[0];
  const options = (command as SAFE_ANY).rawArgs.slice(2);
  const noCache = options.includes('--no-cache');
  const debug = options.includes('--debug') || options.includes('-d');
  const targetsArgs = command.args?.slice(1);

  if (isAddingHeroChatCodebase(targetsArgs) || !commandName) {
    // HeroUI chat action don't need to init
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
    if (store.beta) {
      initStoreComponentsData({beta: true, heroUIComponents: heroUIComponentsBeta});
    }
  }

  const [cliLatestVersion] = await Promise.all([getStore('cliLatestVersion')]);

  // Init latest version
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
