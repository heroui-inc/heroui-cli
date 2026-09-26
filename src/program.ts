import type {CommandName, SAFE_ANY} from '@helpers/type';

import chalk from 'chalk';

import {Logger, gradientString} from '@helpers/logger';
import {findMostMatchText} from '@helpers/math-diff';
import {outputBox} from '@helpers/output-info';
import {getAnalytics, shutdown} from 'src/analytics';
import {getStore, store} from 'src/constants/store';
import {initCache} from 'src/scripts/cache/cache';
import {compareVersions} from 'src/scripts/helpers';

import pkg from '../package.json';

const commandList: CommandName[] = [
  'install',
  'agents-md',
  'env',
  'init',
  'list',
  'upgrade',
  'doctor',
  'uninstall'
];

/**
 * Root command action: print a suggestion for an unknown command, otherwise help.
 */
export async function runDefaultAction(
  program: {helpInformation: () => string},
  command?: {args?: string[]}
): Promise<void> {
  let isArgs = false;

  if (command) {
    const args = command.args?.[0];

    if (args && !commandList.includes(args as CommandName)) {
      isArgs = true;

      const matchCommand = findMostMatchText(commandList, args);

      if (matchCommand) {
        Logger.error(`Unknown command '${args}', Did you mean '${chalk.underline(matchCommand)}'?`);
      } else {
        Logger.error(`Unknown command '${args}'`);
      }
    }
  }

  if (!isArgs) {
    const helpInfo = program.helpInformation();

    let helpInfoArr = helpInfo.split('\n');

    helpInfoArr = helpInfoArr.filter((info) => info && !info.includes('HeroUI CLI v'));
    helpInfoArr = helpInfoArr.map((info) => {
      const commandName = info.match(/(\w+)\s\[/)?.[1];

      if (commandName) {
        return info.replace(commandName, chalk.cyan(commandName));
      }

      return info;
    });

    Logger.log(helpInfoArr.join('\n'));
  }
  process.exit(isArgs ? 1 : 0);
}

/**
 * Prepare cache, debug, and the upgrade notice before a subcommand runs.
 */
export async function runPreAction(command: {args?: string[]; rawArgs?: string[]}): Promise<void> {
  const commandName = command.args?.[0];
  const options = ((command as SAFE_ANY).rawArgs ?? []).slice(2);
  const noCache = options.includes('--no-cache');
  const debug = options.includes('--debug') || options.includes('-d');

  if (!commandName) {
    return;
  }

  initCache(noCache);
  store.debug = debug;

  let cliLatestVersion = '';

  try {
    cliLatestVersion = await getStore('cliLatestVersion');
  } catch {
    return;
  }

  store.cliLatestVersion = cliLatestVersion;

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
}

export function handleUnhandledRejection(reason: unknown): void {
  Logger.newLine();
  Logger.error('Unhandled promise rejection:');
  Logger.log(reason instanceof Error ? reason.message : String(reason));
  process.exit(1);
}

export function handleUncaughtException(error: Error): void {
  Logger.newLine();
  Logger.error('Uncaught exception:');
  Logger.log(error.message);
  process.exit(1);
}

export async function handleParseError(error: Error): Promise<void> {
  const isAgentsMd = process.argv.includes('agents-md');

  if (isAgentsMd) {
    const analytics = getAnalytics();

    analytics?.trackError({
      error,
      errorEvent: 'AGENTS_MD_ERROR',
      fallbackMessage: 'Unexpected error in agents-md',
      properties: {}
    });
    await shutdown();
  }

  Logger.newLine();
  Logger.error('Unexpected error. Please report it as a bug:');
  Logger.log(error.message);
  if (error.stack) {
    Logger.grey(error.stack);
  }
  Logger.newLine();
  process.exit(1);
}
